---
id: 2
group: "documentation-update"
dependencies: []
status: "completed"
created: 2025-11-23
skills:
  - technical-writing
---
# Add Codex and GitHub Copilot References to docs/ Files

## Objective
Add brief mentions of Codex and GitHub Copilot support in relevant docs/ directory files to ensure documentation completeness.

## Skills Required
- Technical writing: Update documentation files with concise references to new assistants

## Acceptance Criteria
- [ ] docs/installation.md mentions Codex and GitHub Copilot in relevant sections
- [ ] docs/getting-started.md includes references to all five assistants
- [ ] Any other relevant docs/ files are updated with brief mentions
- [ ] Updates are concise and reference AGENTS.md for details
- [ ] No duplication of comprehensive information already in AGENTS.md

## Technical Requirements
- Edit Markdown files in docs/ directory
- Keep additions minimal and consistent with existing documentation style
- Reference AGENTS.md for comprehensive details

## Input Dependencies
- Task 1 completed (for consistency in naming/terminology)

## Output Artifacts
- Updated docs/installation.md
- Updated docs/getting-started.md
- Updated other relevant docs/ files as needed

## Implementation Notes

<details>
<summary>Detailed Implementation Steps</summary>

### Step 1: Review Relevant Documentation Files

Examine these docs/ files for sections that list supported assistants:
- docs/installation.md
- docs/getting-started.md
- docs/features.md (if it lists assistants)
- docs/workflows.md (if it references assistant setup)

### Step 2: Update installation.md

Look for sections that discuss initializing the CLI or assistant setup. Add brief references to Codex and GitHub Copilot alongside existing assistant mentions. Example pattern:

```markdown
The CLI supports five AI assistants: Claude, Gemini, Open Code, Codex, and GitHub Copilot. See AGENTS.md for detailed setup instructions.
```

### Step 3: Update getting-started.md

Add Codex and GitHub Copilot to any assistant lists or initialization instructions. Keep it brief:

```markdown
npx @e0ipso/ai-task-manager init --assistants <claude|gemini|opencode|codex|github>
```

### Step 4: Check Other Files

Scan docs/ for other files that might reference assistants:
```bash
grep -l "claude\|gemini\|opencode" docs/*.md
```

Add Codex and GitHub Copilot references where appropriate, following the same brief pattern.

### Step 5: Verify No Over-Documentation

Ensure updates are concise. If detailed information is needed, reference AGENTS.md:
```markdown
For Codex-specific workflow and GitHub Copilot IDE requirements, see AGENTS.md.
```

</details>
