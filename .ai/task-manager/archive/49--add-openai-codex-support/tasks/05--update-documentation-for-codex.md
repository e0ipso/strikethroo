---
id: 5
group: "documentation"
dependencies: [4]
status: "completed"
created: "2025-11-22"
skills: ["markdown"]
---

# Task: Update Documentation for Codex Support

## Objective

Update AGENTS.md to document Codex as a supported assistant with usage examples and implementation guidance.

## Skills Required

- `markdown`: Documentation writing

## Acceptance Criteria

- [ ] AGENTS.md lists Codex as fourth supported assistant
- [ ] "Adding New Assistant Support" section includes Codex example
- [ ] Documentation explains flat file structure constraint
- [ ] User workflow instructions for Codex are clear
- [ ] Command invocation examples are provided

## Technical Requirements

- Update `/workspace/AGENTS.md`
- Add Codex to relevant sections:
  - Multi-Assistant Support overview
  - Directory Structure diagram/examples
  - Project Initialization examples
  - Adding New Assistant Support section
- Document key differences:
  - Flat file structure (`.codex/prompts/`)
  - File naming pattern (`tasks-{name}.md`)
  - User workflow (copy to `~/.codex/prompts/`)
  - Command invocation (`/prompts:tasks-*`)
  - Session restart requirement

## Input Dependencies

- Task 4: Implementation validated through tests

## Output Artifacts

- Updated `/workspace/AGENTS.md` with Codex documentation
- Clear examples of Codex usage

## Implementation Notes

<details>
<summary>Detailed Implementation Steps</summary>

1. Open `/workspace/AGENTS.md`
2. Update "Core Value Proposition" section to mention Codex
3. Add Codex to "Project Initialization" examples:
   ```bash
   # Initialize for Codex
   npx . init --assistants codex --destination-directory /path/to/project

   # Multiple assistants including Codex
   npx . init --assistants claude,codex,gemini --destination-directory /path/to/project
   ```
4. Update "Directory Structure and Organization" section:
   ```
   └── .codex/prompts/            # Codex commands (Markdown, flat structure)
       ├── tasks-create-plan.md
       ├── tasks-refine-plan.md
       ├── tasks-generate-tasks.md
       ├── tasks-execute-blueprint.md
       └── tasks-fix-broken-tests.md
   ```
5. Add note about Codex workflow:
   ```
   **Codex CLI Workflow**: After initialization, copy files from `.codex/prompts/`
   to `~/.codex/prompts/` in your home directory. Restart Codex to load commands.
   Commands are invoked as `/prompts:tasks-create-plan`, etc.
   ```
6. Update "Adding New Assistant Support" with Codex as example
7. Save and review for clarity
</details>
