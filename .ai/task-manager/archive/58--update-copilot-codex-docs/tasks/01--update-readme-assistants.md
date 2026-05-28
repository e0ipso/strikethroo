---
id: 1
group: "documentation-update"
dependencies: []
status: "completed"
created: 2025-11-23
skills:
  - technical-writing
---
# Update README.md with Codex and GitHub Copilot References

## Objective
Add Codex and GitHub Copilot to the README.md assistants table and initialization examples to ensure users are aware of all five supported AI assistants.

## Skills Required
- Technical writing: Update user-facing documentation with clear, concise information

## Acceptance Criteria
- [ ] Assistants table (lines 61-66) includes Codex and GitHub Copilot entries
- [ ] Quick Start section (lines 14-23) includes initialization examples for `--assistants codex` and `--assistants github`
- [ ] Table formatting matches existing style
- [ ] Information is consistent with AGENTS.md lines 434-555

## Technical Requirements
- Edit README.md Markdown file
- Maintain existing table structure and formatting conventions
- Keep descriptions brief (similar to existing entries)

## Input Dependencies
None - standalone documentation update

## Output Artifacts
- Updated README.md with complete list of five supported assistants

## Implementation Notes

<details>
<summary>Detailed Implementation Steps</summary>

### Step 1: Update Assistants Table

Locate the "Supported Assistants" table in README.md (currently lines 61-66). Add two new rows:

**For Codex:**
```markdown
| 📝 **Open Code** | Open source | < 30 seconds |
| 🔮 **Codex** | Codex CLI | < 30 seconds |
```

**For GitHub Copilot:**
```markdown
| 🐙 **GitHub Copilot** | VS Code / JetBrains IDEs | < 30 seconds |
```

Match the emoji style and column formatting of existing entries.

### Step 2: Add Initialization Examples

In the Quick Start section (lines 14-23), add examples for the new assistants. Update the existing multi-assistant example to include all five:

```bash
# Initialize for Codex
npx @e0ipso/ai-task-manager init --assistants codex

# Initialize for GitHub Copilot
npx @e0ipso/ai-task-manager init --assistants github

# Or configure multiple assistants
npx @e0ipso/ai-task-manager init --assistants claude,gemini,opencode,codex,github
```

### Step 3: Verify Consistency

Cross-reference with AGENTS.md:
- Codex details: lines 454-500
- GitHub Copilot details: lines 501-555

Ensure terminology and naming conventions match.

</details>
