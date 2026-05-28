---
id: 2
group: "source"
dependencies: [1]
status: "completed"
created: "2026-05-21"
skills:
  - typescript
---
# Trim CLI source to remove command-emission code paths

## Objective
Edit `src/cli.ts`, `src/index.ts`, `src/exec.ts`, `src/utils.ts`, and `src/types.ts` so the CLI no longer renders command templates, no longer invokes slash commands, no longer references the deleted `templates/assistant/commands/` tree, and prints skills-based post-init guidance.

## Skills Required
`typescript` — careful edits across five files with tight type and import coupling. Knowledge of Commander.js, fs-extra, and the project's `Assistant` union.

## Acceptance Criteria
- [ ] `src/exec.ts` is deleted (`git ls-files src/exec.ts` returns empty)
- [ ] `src/cli.ts` no longer contains the `claude-exec` subcommand block or the `import { claudeExec } from './exec'` line
- [ ] `src/index.ts` `createAssistantStructure()` only copies `templates/assistant/agents/` → `.claude/agents/` for the `claude` assistant; all other branches (codex/github/gemini/cursor/opencode commands) are removed
- [ ] `src/index.ts` no longer references `templates/assistant/commands` anywhere
- [ ] The Codex-specific post-init block in `src/index.ts:198-216` is deleted
- [ ] `displayWorkflowHelp()` is rewritten: no `/tasks:*` examples, mentions `npx skills add e0ipso/ai-task-manager`, describes the workflow by intent (plan → decompose → execute)
- [ ] `getInitInfo()` no longer probes per-assistant command directories; its return type loses the obsolete fields and is updated at every call site (likely none outside the file itself)
- [ ] Non-Claude assistants passed to `--assistants` produce a one-line notice that nothing is emitted for them (still accepted as a no-op so users mid-migration don't hit hard errors)
- [ ] `src/utils.ts` no longer contains `convertMdToGitHubPrompt`, no longer has the `assistant === 'github'` branch in `readAndProcessTemplate`, and drops `convertMdToToml` + `escapeTomlString` + `escapeTomlTripleQuotedString` if they have no remaining callers (`grep -n convertMdToToml src/` returns nothing after this task)
- [ ] `src/types.ts` `Assistant` union is unchanged (kept broad to accept non-Claude as no-op)
- [ ] `npm run lint` passes with zero warnings, including no unused-imports/unused-vars warnings
- [ ] `npm run build` succeeds; `dist/cli.js` exists; `grep claude-exec dist/cli.js` returns nothing

## Technical Requirements
- `src/cli.ts:191-220` — remove the `claude-exec` `program.command(...)` block in full
- `src/cli.ts:13` — remove `import { claudeExec } from './exec';`
- `src/exec.ts` — delete the file
- `src/index.ts:140-184` — drop the per-assistant command/prompt directory listings; keep the Common Configuration listing and the Claude Agents listing
- `src/index.ts:198-216` — delete the Codex post-init instruction block (the one that prints `/prompts:tasks-*` examples)
- `src/index.ts:381-508` `createAssistantStructure()` — collapse to: for the `claude` assistant, ensure `.claude/agents/` and copy `templates/assistant/agents/` into it; for all other assistants, print a single notice line (`chalk.gray('  - install skills via "npx skills add e0ipso/ai-task-manager" for ' + assistant)`) and return.
- `src/index.ts:562-624` `displayWorkflowHelp()` — rewrite. Suggested content: a "Suggested Workflow" header, then a short paragraph: "Install the task skills with `npx skills add e0ipso/ai-task-manager`. Then ask your assistant to (1) create a plan, (2) generate tasks, (3) execute the blueprint. Review the plan in `.ai/task-manager/plans/` between steps for complex work." Skip slash-command examples.
- `src/index.ts:521-558` `getInitInfo()` — drop the `.<assistant>/commands/tasks`, `.<assistant>/command/tasks`, `.codex/prompts`, `.cursor/commands/tasks`, `.github/prompts` checks. Return only `hasAiTaskManager` and `hasClaudeAgents: boolean`. The function may currently have no callers outside `src/__tests__/`; check before changing the public shape.
- `src/utils.ts` — remove `convertMdToGitHubPrompt` (lines 237-252) and the `assistant === 'github'` branch in `readAndProcessTemplate` (lines 270-272). After Stage 2, `convertMdToToml`, `escapeTomlString`, `escapeTomlTripleQuotedString`, `parseFrontmatter` may all become dead. Remove any that ESLint flags as unused. (Note: `parseFrontmatter` may still be used by skill-script shared code — `grep -rn parseFrontmatter src/` before removing.)
- `src/types.ts` — `TemplateFormat` may become unused; remove if so. `Assistant` union stays.

## Input Dependencies
Task 1 (deleted template directory). Without it, `createAssistantStructure()` would silently still try to read from `templates/assistant/commands/` and the simplification rationale would be unclear during review.

## Output Artifacts
A buildable CLI that:
- Copies `.ai/task-manager/` and `.claude/agents/`
- Emits a skill-installation notice for non-Claude assistants
- Has no `claude-exec` subcommand
- Has no `/tasks:` literals anywhere

## Implementation Notes

<details>

**Sequence of edits to keep the build healthy at each step**:
1. Edit `src/cli.ts` first: remove the `claude-exec` block and its import. Run `npm run build` — it should still pass because `index.ts` still imports from `utils.ts` and `exec.ts` exists.
2. Delete `src/exec.ts`. Run `npm run build` — should still pass since nothing imports from it now.
3. Edit `src/index.ts`. Run `npm run build` after each major edit (createAssistantStructure, displayWorkflowHelp, getInitInfo, output blocks).
4. Edit `src/utils.ts`. Run `npm run lint` to catch unused exports.
5. Edit `src/types.ts` only if lint flags `TemplateFormat` as unused.

**Important grep checks before deleting functions in utils.ts**:
```
grep -rn convertMdToGitHubPrompt src/        # should appear only in utils.ts after step 3
grep -rn convertMdToToml src/                # check before deleting
grep -rn parseFrontmatter src/               # might be used by skill-scripts
grep -rn escapeTomlString src/               # likely only utils.ts
```

If `parseFrontmatter` is used by `src/skill-scripts/shared/`, **keep it** — the skill-scripts build pipeline must keep working.

**Sample replacement for `createAssistantStructure()`**:
```typescript
async function createAssistantStructure(assistant: Assistant, baseDir: string): Promise<void> {
  if (assistant !== 'claude') {
    console.log(chalk.gray(`    Skills required for ${assistant} — run \`npx skills add e0ipso/ai-task-manager\``));
    return;
  }
  const sourceAgentsDir = getTemplatePath(path.join('assistant', 'agents'));
  const targetAgentsDir = resolvePath(baseDir, '.claude', 'agents');
  if (await exists(sourceAgentsDir)) {
    await fs.copy(sourceAgentsDir, targetAgentsDir);
  }
}
```

**Sample rewrite for `displayWorkflowHelp()`**:
```typescript
async function displayWorkflowHelp(): Promise<void> {
  console.log(formatSectionHeader('Suggested Workflow'));
  console.log(`  ${chalk.cyan('●')} Install the task skills: ${chalk.gray('npx skills add e0ipso/ai-task-manager')}`);
  console.log(`  ${chalk.cyan('●')} Ask your assistant to plan, then decompose, then execute.`);
  console.log(`  ${chalk.cyan('●')} Review plans in ${chalk.gray('.ai/task-manager/plans/')} between steps for complex work.`);
  console.log('');
}
```

Adjust to match the existing tone in `src/index.ts`; do not invent new ASCII art.

**Do not** modify `src/skill-scripts/` — it is a separate code tree with its own build pipeline.
**Do not** modify `src/conflict-detector.ts`, `src/metadata.ts`, `src/prompts.ts`, `src/plan-utils.ts`, `src/plan.ts`, `src/status.ts`. They are unrelated to commands. (Spot-check by grep for `commands` in each — if nothing matches, leave it alone.)

</details>
