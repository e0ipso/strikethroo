---
id: 4
group: "agent-deployment"
dependencies: [1, 2, 3]
status: "completed"
created: "2026-05-25"
skills:
  - typescript
complexity_score: 5
complexity_notes: "Integrates template generalization, per-harness transformation logic, and init output updates. Core complexity is in the createHarnessStructure() rewrite."
---
# Generalize Agent Template and Implement Per-Harness Deployment

## Objective
Generalize the canonical `plan-creator.md` to be harness-agnostic, then rewrite `createHarnessStructure()` to transform and deploy agent files into each harness's native format and directory. Update init output to show all created agent files.

## Skills Required
- **typescript**: Init flow logic, file I/O, template transformation, console output formatting

## Acceptance Criteria
- [ ] `templates/harness/agents/plan-creator.md` is harness-agnostic (no Claude-specific references)
- [ ] `createHarnessStructure()` no longer early-returns for non-Claude harnesses
- [ ] `createHarnessStructure()` reads canonical template, transforms per-harness, and writes to correct directory
- [ ] Claude: `.claude/agents/plan-creator.md` — markdown, unchanged from canonical
- [ ] Gemini: `.gemini/agents/plan-creator.md` — markdown, unchanged from canonical
- [ ] Codex: `.codex/agents/plan-creator.toml` — valid TOML with `name`, `description`, `developer_instructions`
- [ ] Cursor: `.cursor/agents/plan-creator.md` — markdown, unchanged from canonical
- [ ] GitHub: `.github/agents/plan-creator.agent.md` — markdown with `.agent.md` extension
- [ ] OpenCode: `.opencode/agents/plan-creator.md` — markdown, unchanged from canonical
- [ ] Init output lists all agent files created for each selected harness
- [ ] `npm run build` succeeds
- [ ] Running `npx . init --harnesses claude,codex,github --destination-directory /tmp/test-harness` creates correct files in all three directories

Use your internal Todo tool to track these and keep on track.

## Technical Requirements
- Uses `getAgentFormat()` and `convertAgentMdToToml()` from Task 3
- The canonical template lives at `templates/harness/agents/plan-creator.md` (after Task 2 rename)
- Should iterate over all `.md` files in the agents template directory (future-proofing for additional agents without explicit per-file logic)
- GitHub Copilot agent discovery requires the `.agent.md` extension — this is critical

## Input Dependencies
- Task 1: `Harness` type and renamed function signature
- Task 2: `templates/harness/` directory exists at the new path
- Task 3: `getAgentFormat()`, `convertAgentMdToToml()`, `parseFrontmatter()` utilities

## Output Artifacts
- Updated `templates/harness/agents/plan-creator.md` (generalized content)
- Rewritten `createHarnessStructure()` in `src/index.ts`
- Updated init console output showing per-harness agent files

## Implementation Notes

<details>

### Part A: Generalize plan-creator.md

Edit `templates/harness/agents/plan-creator.md`. The current content has one Claude-specific reference at line 21:

```markdown
- Read CLAUDE.md, README.md, package.json
```

Change to:
```markdown
- Read project instructions (AGENTS.md, README.md, package.json, or equivalent harness-specific config files)
```

Scan the rest of the file for any other Claude-specific language. The current content is mostly generic already. Preserve the YAML frontmatter (`name`, `description`) exactly as-is since it serves as the canonical source format for all conversions.

### Part B: Rewrite createHarnessStructure()

Replace the current implementation in `src/index.ts` (around line 320):

```typescript
// Current code (to be replaced):
async function createAssistantStructure(assistant: Assistant, baseDir: string): Promise<void> {
  if (assistant !== 'claude') {
    console.log(chalk.gray(`    ${assistant}: no files emitted ...`));
    return;
  }
  const sourceAgentsDir = getTemplatePath(path.join('assistant', 'agents'));
  const targetAgentsDir = resolvePath(baseDir, '.claude', 'agents');
  if (await exists(sourceAgentsDir)) {
    await fs.copy(sourceAgentsDir, targetAgentsDir);
  }
}
```

New implementation:

```typescript
import { getAgentFormat, convertAgentMdToToml } from './utils'; // or './template-utils'

async function createHarnessStructure(harness: Harness, baseDir: string): Promise<void> {
  const sourceAgentsDir = getTemplatePath(path.join('harness', 'agents'));

  if (!(await exists(sourceAgentsDir))) {
    return;
  }

  const formatInfo = getAgentFormat(harness);
  const targetAgentsDir = resolvePath(baseDir, formatInfo.directory);
  await fs.ensureDir(targetAgentsDir);

  // Process each markdown agent template in the source directory
  const agentFiles = (await fs.readdir(sourceAgentsDir)).filter(f => f.endsWith('.md'));

  for (const agentFile of agentFiles) {
    const baseName = agentFile.replace(/\.md$/, '');
    const sourceContent = await fs.readFile(path.join(sourceAgentsDir, agentFile), 'utf-8');

    let outputContent: string;
    let outputFilename: string;

    if (formatInfo.format === 'toml') {
      outputContent = convertAgentMdToToml(sourceContent);
      outputFilename = `${baseName}${formatInfo.extension}`;
    } else {
      outputContent = sourceContent;
      outputFilename = `${baseName}${formatInfo.extension}`;
    }

    await fs.writeFile(path.join(targetAgentsDir, outputFilename), outputContent);
    console.log(chalk.gray(`    Created ${formatInfo.directory}/${outputFilename}`));
  }
}
```

### Part C: Update init output

In the main `init()` function in `src/index.ts`, the loop that calls `createHarnessStructure()` currently logs "Setting up {harness} assistant configuration". Update this message:

```typescript
console.log(`  ${chalk.green('✓')} Setting up ${harness} harness configuration`);
```

Also update the `getInitInfo()` function (around line 349-361) to be more generic — instead of checking only `.claude/agents`, it could check for any harness agent directory, or simply remain as-is if it's only used for informational display.

### Part D: Verify

```bash
npm run build
# Test with multiple harnesses:
node dist/cli.js init --harnesses claude,codex,github --destination-directory /tmp/test-harness-deploy
# Check outputs:
cat /tmp/test-harness-deploy/.claude/agents/plan-creator.md
cat /tmp/test-harness-deploy/.codex/agents/plan-creator.toml
cat /tmp/test-harness-deploy/.github/agents/plan-creator.agent.md
```

</details>
