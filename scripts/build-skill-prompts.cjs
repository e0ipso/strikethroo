#!/usr/bin/env node
/**
 * Assembles SKILL.md files from composable source templates.
 *
 * Source templates live in src/skill-prompts/*.md with YAML frontmatter
 * declaring the target skill, description, and template variables.
 * Shared sections live in src/skill-prompts/sections/.
 *
 * Processing pipeline per template:
 *   1. Read file and parse YAML frontmatter
 *   2. Resolve {{include path}} directives (recursive, cycle-safe)
 *   3. Substitute {{variable}} placeholders from the vars map
 *   4. Reassemble frontmatter (name + description only) with processed body
 *   5. Write to templates/harness/skills/<target>/SKILL.md
 *   6. Run validation assertions
 */

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const SRC_DIR = path.join(REPO_ROOT, 'src', 'skill-prompts');
const SKILLS_ROOT = path.join(REPO_ROOT, 'templates', 'harness', 'skills');

const MAX_INCLUDE_DEPTH = 3;

// ---------------------------------------------------------------------------
// YAML frontmatter parsing (lightweight, no external deps)
// ---------------------------------------------------------------------------

/**
 * Splits a file into { frontmatter: string, body: string }.
 * Expects the file to start with `---\n`.
 */
function splitFrontmatter(content) {
  if (!content.startsWith('---')) {
    throw new Error('Missing YAML frontmatter (file must start with ---)');
  }
  const end = content.indexOf('\n---', 3);
  if (end === -1) {
    throw new Error('Unterminated YAML frontmatter (no closing ---)');
  }
  const frontmatter = content.slice(4, end); // skip opening "---\n"
  const body = content.slice(end + 4); // skip closing "\n---"
  return { frontmatter, body };
}

/**
 * Parses the frontmatter block into { name, description, target, vars }.
 */
function parseFrontmatter(raw) {
  const result = { name: '', description: '', target: '', vars: {} };
  const lines = raw.split('\n');
  let inVars = false;

  for (const line of lines) {
    // Blank lines reset nested context
    if (line.trim() === '') {
      inVars = false;
      continue;
    }

    // Indented line inside vars block
    if (inVars && /^\s+/.test(line)) {
      const m = line.match(/^\s+(\w+)\s*:\s*"?([^"]*)"?\s*$/);
      if (m) {
        result.vars[m[1]] = m[2];
      }
      continue;
    }

    // Top-level key
    inVars = false;
    const kv = line.match(/^(\w+)\s*:\s*(.*?)\s*$/);
    if (!kv) continue;

    const key = kv[1];
    let value = kv[2];
    // Strip surrounding quotes
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (key === 'vars') {
      inVars = true;
      continue;
    }

    if (key === 'name') result.name = value;
    else if (key === 'description') result.description = value;
    else if (key === 'target') result.target = value;
  }

  return result;
}

// ---------------------------------------------------------------------------
// Include resolution
// ---------------------------------------------------------------------------

/**
 * Recursively resolves {{include <relPath>}} directives.
 *
 * @param {string} content   - Text content to process
 * @param {string} basePath  - Directory for resolving relative include paths
 * @param {number} depth     - Current recursion depth
 * @param {Set<string>} seen - Absolute paths already in the include chain
 * @returns {string} Content with all includes resolved
 */
function resolveIncludes(content, basePath, depth = 0, seen = new Set()) {
  if (depth > MAX_INCLUDE_DEPTH) {
    throw new Error(
      `Max include depth (${MAX_INCLUDE_DEPTH}) exceeded. Check for deep or circular includes.`
    );
  }

  return content.replace(
    /^\{\{include (.+?)\}\}$/gm,
    (_match, relPath) => {
      const absPath = path.resolve(basePath, relPath.trim());

      if (seen.has(absPath)) {
        throw new Error(`Include cycle detected: ${absPath}`);
      }

      if (!fs.existsSync(absPath)) {
        throw new Error(`Include file not found: ${absPath}`);
      }

      const childSeen = new Set(seen);
      childSeen.add(absPath);

      const included = fs.readFileSync(absPath, 'utf8').trimEnd();
      return resolveIncludes(
        included,
        path.dirname(absPath),
        depth + 1,
        childSeen
      );
    }
  );
}

// ---------------------------------------------------------------------------
// Variable substitution
// ---------------------------------------------------------------------------

/**
 * Replaces {{var_name}} with values from the vars map.
 * Only matches identifiers (alphanumeric + underscore), so include directives
 * (already resolved) and code-block examples are unaffected.
 */
function substituteVars(content, vars) {
  let result = content;
  for (const [key, value] of Object.entries(vars)) {
    const pattern = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    result = result.replace(pattern, value);
  }
  return result;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/**
 * Strips fenced code blocks (``` ... ```) from content so that template-like
 * syntax inside code examples does not trigger false positives.
 */
function stripFencedCodeBlocks(content) {
  return content.replace(/^```[\s\S]*?^```/gm, '');
}

/**
 * Runs post-assembly validation on the final SKILL.md content.
 * Throws on the first failure.
 */
function validate(content, skillName) {
  // Must be non-empty
  if (!content || content.trim().length === 0) {
    throw new Error(`${skillName}: assembled file is empty`);
  }

  // Parse the output frontmatter
  const { frontmatter, body } = splitFrontmatter(content);

  // Frontmatter must have name and description
  if (!/^name\s*:/m.test(frontmatter)) {
    throw new Error(`${skillName}: output frontmatter missing 'name' field`);
  }
  if (!/^description\s*:/m.test(frontmatter)) {
    throw new Error(
      `${skillName}: output frontmatter missing 'description' field`
    );
  }

  // Frontmatter must NOT have vars or target
  if (/^vars\s*:/m.test(frontmatter)) {
    throw new Error(
      `${skillName}: output frontmatter must not contain 'vars' field`
    );
  }
  if (/^target\s*:/m.test(frontmatter)) {
    throw new Error(
      `${skillName}: output frontmatter must not contain 'target' field`
    );
  }

  // Body must contain ## Operating Procedure
  if (!/^## Operating Procedure/m.test(body)) {
    throw new Error(
      `${skillName}: body missing '## Operating Procedure' heading`
    );
  }

  // No unresolved {{ directives outside fenced code blocks
  const strippedBody = stripFencedCodeBlocks(body);
  const unresolvedMatch = strippedBody.match(/\{\{.+?\}\}/);
  if (unresolvedMatch) {
    throw new Error(
      `${skillName}: unresolved directive found: ${unresolvedMatch[0]}`
    );
  }
}

// ---------------------------------------------------------------------------
// Output assembly
// ---------------------------------------------------------------------------

/**
 * Builds the output frontmatter containing only name and description.
 */
function buildOutputFrontmatter(meta) {
  const lines = ['---'];
  lines.push(`name: ${meta.name}`);
  lines.push(`description: ${meta.description}`);
  lines.push('---');
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  // Discover source templates (top-level .md files only)
  if (!fs.existsSync(SRC_DIR)) {
    console.error(
      `Source directory not found: ${SRC_DIR}\n` +
        'Create src/skill-prompts/ with at least one template before running this script.'
    );
    process.exit(1);
  }

  const templates = fs
    .readdirSync(SRC_DIR)
    .filter((f) => f.endsWith('.md') && f !== 'README.md' && !fs.statSync(path.join(SRC_DIR, f)).isDirectory());

  if (templates.length === 0) {
    console.error(`No .md templates found in ${SRC_DIR}`);
    process.exit(1);
  }

  let assembled = 0;

  for (const file of templates) {
    const srcPath = path.join(SRC_DIR, file);
    const raw = fs.readFileSync(srcPath, 'utf8');

    // 1. Parse frontmatter
    const { frontmatter: rawFm, body: rawBody } = splitFrontmatter(raw);
    const meta = parseFrontmatter(rawFm);

    if (!meta.name) {
      throw new Error(`${file}: frontmatter missing 'name'`);
    }
    if (!meta.target) {
      throw new Error(`${file}: frontmatter missing 'target'`);
    }

    // 2. Resolve includes
    const afterIncludes = resolveIncludes(rawBody, SRC_DIR);

    // 3. Substitute variables
    const afterVars = substituteVars(afterIncludes, meta.vars);

    // 4. Reassemble with output frontmatter
    const output = buildOutputFrontmatter(meta) + afterVars;

    // 5. Validate
    validate(output, meta.target);

    // 6. Write to target skill directory
    const targetDir = path.join(SKILLS_ROOT, meta.target);
    if (!fs.existsSync(targetDir)) {
      throw new Error(
        `Target skill directory does not exist: ${targetDir}\n` +
          `Ensure templates/harness/skills/${meta.target}/ exists.`
      );
    }

    const outPath = path.join(targetDir, 'SKILL.md');
    fs.writeFileSync(outPath, output, 'utf8');
    process.stdout.write(`  assembled ${meta.target}/SKILL.md\n`);
    assembled++;
  }

  process.stdout.write(
    `\n${assembled} skill prompt${assembled !== 1 ? 's' : ''} assembled.\n`
  );
}

try {
  main();
} catch (err) {
  console.error(err.message || err);
  process.exit(1);
}
