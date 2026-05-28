---
id: 1
group: "remove-detection-infrastructure"
dependencies: []
status: "pending"
created: "2025-12-29"
skills: ["typescript", "bash"]
---

# Update Command Templates to Remove Detection Calls

## Objective

Remove all references to `detect-assistant.cjs` and `read-assistant-config.cjs` from task management command templates across all assistant directories. Replace the detection pattern with direct configuration file loading.

## Skills Required

- **typescript**: Understanding template structure and variable substitution
- **bash**: Working with configuration file paths and shell syntax

## Acceptance Criteria

- [ ] All detection script calls removed from Claude templates (`.claude/commands/tasks/`)
- [ ] All detection script calls removed from Gemini templates (`.gemini/commands/tasks/`)
- [ ] All detection script calls removed from Cursor templates (`.cursor/commands/tasks/`)
- [ ] All detection script calls removed from Codex templates (`.codex/prompts/`)
- [ ] All detection script calls removed from template source files (`/workspace/templates/`)
- [ ] Each template's "Assistant Configuration" section updated with direct file path references
- [ ] Updated templates tested to confirm configuration loads correctly

## Technical Requirements

Current pattern to replace:
```bash
assistant=$(node .ai/task-manager/config/scripts/detect-assistant.cjs)
node .ai/task-manager/config/scripts/read-assistant-config.cjs "$assistant"
```

New pattern (assistant-specific):
- Claude: Load `/AGENTS.md` and `/home/node/.claude/CLAUDE.md` directly
- Gemini: Load `/GEMINI.md` and equivalent in home directory
- Similar patterns for Cursor, Codex, and Open Code

## Input Dependencies

- Existing command template files across 5 assistant directories
- Understanding of which configuration files each assistant should load

## Output Artifacts

- Updated template files with direct configuration loading
- No templates still referencing detection scripts

## Implementation Notes

<details>
<summary>Detailed Implementation Steps</summary>

### Files to Update

**Template Source Files** (6 files):
- `/workspace/templates/assistant/commands/tasks/create-plan.md`
- `/workspace/templates/assistant/commands/tasks/refine-plan.md`
- `/workspace/templates/assistant/commands/tasks/generate-tasks.md`
- `/workspace/templates/assistant/commands/tasks/execute-blueprint.md`
- `/workspace/templates/assistant/commands/tasks/full-workflow.md`
- `/workspace/templates/assistant/commands/tasks/fix-broken-tests.md`

**Claude Templates** (6 files in `.claude/commands/tasks/`):
- `create-plan.md`
- `refine-plan.md`
- `generate-tasks.md`
- `execute-blueprint.md`
- `full-workflow.md`
- `fix-broken-tests.md`

**Similar updates for**:
- `.gemini/commands/tasks/` (6 files, TOML format)
- `.cursor/commands/tasks/` (6 files)
- `.codex/prompts/` (6 files, flat structure)

### Update Strategy

For each template file:

1. Find the "Assistant Configuration" section (usually near top)
2. Locate the lines:
   ```bash
   assistant=$(node .ai/task-manager/config/scripts/detect-assistant.cjs)
   node .ai/task-manager/config/scripts/read-assistant-config.cjs "$assistant"
   ```
3. Replace with assistant-specific direct file reads using bash/markdown syntax appropriate to the template format
4. For markdown templates: Use inline code blocks or descriptive text
5. For TOML templates (Gemini): Use appropriate TOML syntax

### Configuration File Mapping

- **Claude** → Read `/AGENTS.md` and `/home/node/.claude/CLAUDE.md`
- **Gemini** → Read `/GEMINI.md` and `~/.gemini/gemini-config.md` (or equivalent)
- **Cursor** → Read `/AGENTS.md` and `.cursor/cursor-config.md` (or equivalent)
- **Codex** → Read `/AGENTS.md` and `~/.codex/codex-config.md` (or equivalent)
- **Open Code** → Read `/AGENTS.md` and `.opencode/config.md` (or equivalent)

For each assistant, ensure the template has clear comments indicating which configuration files are being loaded.

### Testing Pattern

After updates, verify that:
1. A command template invocation can access both global and project-level configuration
2. No `detect-assistant.cjs` or `read-assistant-config.cjs` references remain in the template
3. Assistant-specific paths are correctly referenced
4. Configuration loads successfully (can be tested by running a single command)

</details>
