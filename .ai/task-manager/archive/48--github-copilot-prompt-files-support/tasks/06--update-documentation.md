---
id: 6
group: "documentation"
dependencies: [5]
status: "completed"
created: 2025-10-31
skills:
  - documentation
---
# Update Documentation for GitHub Copilot Support

## Objective
Update AGENTS.md and README.md to document GitHub Copilot support, including usage instructions, IDE requirements, limitations, and file locations.

## Skills Required
- **documentation**: Technical writing and markdown formatting

## Acceptance Criteria
- [ ] AGENTS.md includes GitHub Copilot section with complete information
- [ ] README.md lists GitHub in supported assistants
- [ ] Documentation explains invocation syntax (`/tasks-create-plan`)
- [ ] IDE requirements clearly stated (VS Code/JetBrains)
- [ ] Limitations documented (not available in Copilot CLI)
- [ ] File locations specified (`.github/prompts/`)
- [ ] Examples provided for common use cases
- [ ] Documentation is clear, accurate, and consistent with existing content

## Technical Requirements
- Update `AGENTS.md` with new GitHub Copilot section
- Update `README.md` to add GitHub to supported assistants list
- Follow existing documentation style and formatting
- Include code examples and command syntax
- Provide clear distinction between prompt files (IDE) and custom agents (CLI)

## Input Dependencies
- Task 5: Integration tests must pass to confirm implementation works

## Output Artifacts
- Updated `AGENTS.md` with GitHub Copilot documentation
- Updated `README.md` with GitHub in assistants list

## Implementation Notes

<details>
<summary>Detailed Implementation Steps</summary>

### Step 1: Update AGENTS.md

File: `AGENTS.md`

Add a new section for GitHub Copilot after the existing assistant sections. Follow the existing format:

```markdown
## GitHub Copilot (VS Code / JetBrains)

### File Location
Prompt files are stored in `.github/prompts/` directory:
- `tasks-create-plan.prompt.md`
- `tasks-generate-tasks.prompt.md`
- `tasks-execute-blueprint.prompt.md`
- `tasks-fix-broken-tests.prompt.md`

### Invocation
Use slash commands directly in GitHub Copilot chat:
```bash
/tasks-create-plan Implement user authentication
/tasks-generate-tasks 48
/tasks-execute-blueprint 48
/tasks-fix-broken-tests "npm test"
```

### IDE Requirements
- **Supported**: VS Code, JetBrains IDEs (IntelliJ, WebStorm, etc.)
- **Not Supported**: GitHub Copilot CLI (command line)

### Limitations
- Prompt files are currently in public preview and subject to change
- Only works in IDE environments, not in terminal/CLI
- Requires GitHub Copilot subscription

### How It Works
GitHub Copilot automatically discovers prompt files in `.github/prompts/` and makes them available as slash commands. When you type `/tasks-create-plan`, Copilot loads the prompt file and uses your input as `$ARGUMENTS`.

### Initialization
```bash
npx . init --assistants github --destination-directory /path/to/project
```
```

### Step 2: Update README.md

File: `README.md`

Locate the section listing supported assistants and add GitHub Copilot:

```markdown
## Supported Assistants

- **Claude**: Markdown slash commands in `.claude/commands/tasks/`
- **Gemini**: TOML slash commands in `.gemini/commands/tasks/`
- **OpenCode**: Markdown slash commands in `.opencode/command/tasks/`
- **GitHub Copilot**: Prompt files in `.github/prompts/` (VS Code/JetBrains only)
```

### Step 3: Add Quick Start Example

If README has a quickstart or examples section, add GitHub Copilot:

```markdown
### Initialize for GitHub Copilot

```bash
npx . init --assistants github --destination-directory /path/to/project
```

Then in VS Code or JetBrains IDE with GitHub Copilot:
```
/tasks-create-plan Implement user authentication system
```
```

### Step 4: Document Key Differences

Add a note explaining the distinction:

```markdown
### GitHub Copilot: Prompt Files vs Custom Agents

This implementation uses **prompt files** (`.github/prompts/*.prompt.md`) which work in VS Code and JetBrains IDEs.

**Note**: GitHub Copilot also supports **custom agents** (`.github/agents/*.md`) which work in the CLI, but these are not implemented in this version. Prompt files provide a cleaner invocation experience for IDE users.
```

### Step 5: Verify Documentation Quality

Check documentation for:
- **Clarity**: Is it easy to understand?
- **Accuracy**: Does it match the implementation?
- **Completeness**: Are all use cases covered?
- **Consistency**: Does it match the style of existing docs?
- **Examples**: Are there clear, working examples?

### Step 6: Proofread

- Fix any typos or grammatical errors
- Ensure code blocks are properly formatted
- Verify all file paths are correct
- Check that commands are copy-pasteable

</details>
