#!/usr/bin/env node
/**
 * Renders SKILL.md files from Handlebars source templates.
 *
 * Source layout mirrors the output layout, which is what lets the output path
 * be derived rather than declared:
 *
 *   src/skill-prompts/_partials/<name>.md.hbs   shared, never shipped
 *   src/skill-prompts/skills/<skill>/SKILL.md.hbs
 *     -> templates/harness/skills/<skill>/SKILL.md
 *
 * Partials register under their path relative to `_partials/` with `.md.hbs`
 * stripped, so a template pulls one in with `{{> name}}` and parameterizes it
 * with call-site hash arguments (`{{> name arg="value"}}`).
 *
 * Frontmatter is pass-through: the source carries exactly `name` +
 * `description`, which is exactly what ships, so the whole file is one template
 * and there is nothing to parse and reconstruct.
 *
 * RENDER IN PLACE. Unlike the kenkeep reference implementation this is modelled
 * on, this script must never wipe or copy its destination. `templates/` is
 * mostly committed source (`templates/strikethroo/`, `templates/harness/agents/`),
 * and the per-skill `scripts/` bundles under `templates/harness/skills/` are
 * written by `build:skills` immediately before this script runs in the
 * `npm run build` chain. The only
 * write target here is `templates/harness/skills/<skill>/SKILL.md`. Any
 * `rmSync`, `cpSync`, or `mkdirSync` against `templates/` is a defect.
 *
 * `_partials/` is never shipped, and that is structural rather than enforced:
 * partials live only under `src/`, and nothing copies them.
 */

const fs = require('fs');
const path = require('path');
const Handlebars = require('handlebars');

const REPO_ROOT = path.resolve(__dirname, '..');
const SRC_DIR = path.join(REPO_ROOT, 'src', 'skill-prompts');
const PARTIALS_DIR = path.join(SRC_DIR, '_partials');
const TEMPLATES_DIR = path.join(SRC_DIR, 'skills');
const SKILLS_ROOT = path.join(REPO_ROOT, 'templates', 'harness', 'skills');
const SHIPPED_ROOT = path.join(REPO_ROOT, 'templates');

const PARTIAL_EXTENSION = '.md.hbs';
const TEMPLATE_FILENAME = 'SKILL.md.hbs';

// Markdown and shell text, not HTML: `&`, `<`, and `>` must reach the output
// verbatim. ignoreStandalone keeps a partial tag from swallowing the blank
// lines it sits between, so spacing stays exactly as authored. strict turns a
// missing hash argument into a build error instead of silently deleting text.
const COMPILE_OPTIONS = {
  noEscape: true,
  ignoreStandalone: true,
  strict: true,
};

const HTML_ENTITIES = ['&lt;', '&gt;', '&amp;'];

// ---------------------------------------------------------------------------
// Filesystem helpers
// ---------------------------------------------------------------------------

function walkFiles(dir) {
  const files = [];
  for (const name of fs.readdirSync(dir).sort()) {
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) files.push(...walkFiles(full));
    else if (stat.isFile()) files.push(full);
  }
  return files;
}

// ---------------------------------------------------------------------------
// Partial registration
// ---------------------------------------------------------------------------

/**
 * Registers every `_partials/**\/*.md.hbs` under its path relative to
 * `_partials/` with the extension stripped.
 *
 * Bodies are trimEnd()ed so authoring a trailing newline never shifts rendered
 * output.
 *
 * @returns {string[]} Registered partial bodies, for the escaping tripwire.
 */
function registerPartials() {
  if (!fs.existsSync(PARTIALS_DIR)) {
    throw new Error(`Partials directory not found: ${PARTIALS_DIR}`);
  }

  const bodies = [];
  for (const file of walkFiles(PARTIALS_DIR)) {
    if (!file.endsWith(PARTIAL_EXTENSION)) {
      throw new Error(
        `Non-partial file in _partials/: ${path.relative(REPO_ROOT, file)}\n` +
          `Every file under _partials/ must be a *${PARTIAL_EXTENSION} template.`
      );
    }
    const name = path
      .relative(PARTIALS_DIR, file)
      .slice(0, -PARTIAL_EXTENSION.length)
      .split(path.sep)
      .join('/');
    const body = fs.readFileSync(file, 'utf8').trimEnd();
    Handlebars.registerPartial(name, body);
    bodies.push(body);
  }

  if (bodies.length === 0) {
    throw new Error(`No *${PARTIAL_EXTENSION} partials found in ${PARTIALS_DIR}`);
  }
  return bodies;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/**
 * Splits a rendered file into { frontmatter, body }.
 */
function splitFrontmatter(content) {
  if (!content.startsWith('---')) {
    throw new Error('Missing YAML frontmatter (file must start with ---)');
  }
  const end = content.indexOf('\n---', 3);
  if (end === -1) {
    throw new Error('Unterminated YAML frontmatter (no closing ---)');
  }
  return { frontmatter: content.slice(4, end), body: content.slice(end + 4) };
}

/**
 * Strips fenced code blocks (``` ... ```) so template-like syntax inside code
 * examples does not trigger false positives. The kenkeep reference scans the
 * whole file; several prompts here carry literal `{{...}}`-looking text in
 * fenced examples, so that simpler check would report them.
 */
function stripFencedCodeBlocks(content) {
  return content.replace(/^```[\s\S]*?^```/gm, '');
}

/**
 * Runs post-render validation on the final SKILL.md content.
 * Throws on the first failure.
 *
 * @param {string} content   - Rendered output
 * @param {string} skillName - Skill directory name, for error messages
 * @param {string} corpus    - Template source plus every partial body; the
 *                             baseline for the HTML-escaping tripwire
 */
function validate(content, skillName, corpus) {
  if (!content || content.trim().length === 0) {
    throw new Error(`${skillName}: rendered file is empty`);
  }

  const { frontmatter, body } = splitFrontmatter(content);

  if (!/^name\s*:/m.test(frontmatter)) {
    throw new Error(`${skillName}: output frontmatter missing 'name' field`);
  }
  if (!/^description\s*:/m.test(frontmatter)) {
    throw new Error(
      `${skillName}: output frontmatter missing 'description' field`
    );
  }
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

  if (!/^## Operating Procedure/m.test(body)) {
    throw new Error(
      `${skillName}: body missing '## Operating Procedure' heading`
    );
  }

  const strippedBody = stripFencedCodeBlocks(body);
  const unresolvedMatch = strippedBody.match(/\{\{.+?\}\}/);
  if (unresolvedMatch) {
    throw new Error(
      `${skillName}: unresolved directive found: ${unresolvedMatch[0]}`
    );
  }

  // Tripwire for a missing `noEscape`: an entity reference in the output that
  // no source file contains was manufactured by the templating engine.
  for (const entity of HTML_ENTITIES) {
    if (content.includes(entity) && !corpus.includes(entity)) {
      throw new Error(
        `${skillName}: rendered output contains '${entity}' that is absent from ` +
          'the source. Check that Handlebars is compiled with noEscape: true.'
      );
    }
  }
}

/**
 * Sweeps the shipped tree for build-time artifacts that must never reach it.
 */
function assertNoTemplateArtifactsShipped() {
  const stack = [SHIPPED_ROOT];
  while (stack.length > 0) {
    const dir = stack.pop();
    for (const name of fs.readdirSync(dir)) {
      const full = path.join(dir, name);
      if (fs.statSync(full).isDirectory()) {
        if (name === '_partials') {
          throw new Error(
            `Partials directory leaked into the shipped tree: ${path.relative(REPO_ROOT, full)}`
          );
        }
        stack.push(full);
      } else if (name.endsWith('.hbs')) {
        throw new Error(
          `Unrendered template left in the shipped tree: ${path.relative(REPO_ROOT, full)}`
        );
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  if (!fs.existsSync(TEMPLATES_DIR)) {
    console.error(
      `Template directory not found: ${TEMPLATES_DIR}\n` +
        'Create src/skill-prompts/skills/<name>/SKILL.md.hbs before running this script.'
    );
    process.exit(1);
  }

  const partialBodies = registerPartials();
  const partialCorpus = partialBodies.join('\n');

  const skills = fs
    .readdirSync(TEMPLATES_DIR)
    .sort()
    .filter((name) => fs.statSync(path.join(TEMPLATES_DIR, name)).isDirectory());

  if (skills.length === 0) {
    console.error(`No skill templates found in ${TEMPLATES_DIR}`);
    process.exit(1);
  }

  let rendered = 0;

  for (const skill of skills) {
    const srcPath = path.join(TEMPLATES_DIR, skill, TEMPLATE_FILENAME);
    if (!fs.existsSync(srcPath)) {
      throw new Error(
        `${skill}: missing ${TEMPLATE_FILENAME} in ${path.relative(REPO_ROOT, path.dirname(srcPath))}`
      );
    }

    const source = fs.readFileSync(srcPath, 'utf8');
    const template = Handlebars.compile(source, COMPILE_OPTIONS);
    const output = template(undefined, { partials: Handlebars.partials });

    validate(output, skill, source + '\n' + partialCorpus);

    // The target directory is created by build:skills, which runs first in the
    // build chain. Never create it here; its absence means the ordering broke.
    const targetDir = path.join(SKILLS_ROOT, skill);
    if (!fs.existsSync(targetDir)) {
      throw new Error(
        `Target skill directory does not exist: ${targetDir}\n` +
          `Ensure templates/harness/skills/${skill}/ exists.`
      );
    }

    // Validate against the freshly rendered output, not a stale SKILL.md.
    for (const [, script] of output.matchAll(/scripts\/([\w.-]+\.cjs)/g)) {
      const scriptPath = path.join(targetDir, 'scripts', script);
      if (!fs.existsSync(scriptPath)) {
        throw new Error(`${skill}: references missing script scripts/${script}`);
      }
    }

    fs.writeFileSync(path.join(targetDir, 'SKILL.md'), output, 'utf8');
    process.stdout.write(`  assembled ${skill}/SKILL.md\n`);
    rendered++;
  }

  assertNoTemplateArtifactsShipped();

  process.stdout.write(
    `\n${rendered} skill prompt${rendered !== 1 ? 's' : ''} assembled.\n`
  );
}

try {
  main();
} catch (err) {
  console.error(err.message || err);
  process.exit(1);
}
