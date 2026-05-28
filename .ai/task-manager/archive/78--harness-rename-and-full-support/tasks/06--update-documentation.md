---
id: 6
group: "documentation"
dependencies: [1, 4]
status: "completed"
created: "2026-05-25"
skills:
  - markdown
---
# Update Documentation

## Objective
Update all documentation files to reflect the "assistant" → "harness" terminology rename and the new per-harness agent deployment feature.

## Skills Required
- **markdown**: Technical documentation writing, consistent terminology, accurate command examples

## Acceptance Criteria
- [ ] `AGENTS.md` updated: all "assistant(s)" → "harness(es)", `--assistants` → `--harnesses`, `templates/assistant/` → `templates/harness/`
- [ ] `AGENTS.md` updated: documentation reflects that all 6 harnesses receive agent files during init (not just Claude)
- [ ] `README.md` updated: CLI usage examples use `--harnesses`
- [ ] `docs/getting-started.md` updated (if it references `--assistants` or "assistant" terminology)
- [ ] `docs/installation.md` updated (if it references `--assistants`)
- [ ] `docs/features.md` updated (if it references assistants or agent deployment)
- [ ] `docs/workflow.md` updated (if applicable)
- [ ] `docs/comparison.md` updated (if applicable)
- [ ] `grep -rn "assistant\|Assistant" AGENTS.md README.md docs/ | grep -v "AI assistant"` returns zero relevant matches (note: "AI assistant" in generic context may be acceptable where it refers to the AI itself, not to the harness concept)
- [ ] No broken markdown links or formatting issues

Use your internal Todo tool to track these and keep on track.

## Technical Requirements
- Be careful to distinguish between "assistant" meaning "the AI harness/environment" (rename these) vs "assistant" meaning "the AI itself" or "AI-assisted" (may be acceptable in certain generic contexts — use judgment)
- The term "harness" should be used consistently wherever we refer to the environments/tools (Claude, Gemini, Codex, Cursor, GitHub Copilot, OpenCode)
- Update code examples and CLI invocations to use `--harnesses`

## Input Dependencies
- Task 1: Terminology is finalized (types, function names, CLI flag)
- Task 4: Per-harness agent deployment is implemented (documentation should describe the new behavior)

## Output Artifacts
- Updated `AGENTS.md`
- Updated `README.md`
- Updated docs pages as applicable

## Implementation Notes

<details>

### AGENTS.md — key sections to update

This is the largest documentation file. Use `grep -n "assistant\|Assistant\|--assistants\|templates/assistant" AGENTS.md` to find all occurrences. Key areas:

1. **Quick Start Guide**: 
   - `npx . init --assistants claude` → `npx . init --harnesses claude`
   - All `--assistants` examples → `--harnesses`

2. **Project Initialization section**:
   - All command examples updated
   - "assistants" parameter descriptions → "harnesses"

3. **Skills Layer section**:
   - `templates/assistant/skills/` → `templates/harness/skills/`
   - `templates/assistant/agents/` → `templates/harness/agents/`
   - Any mention of "assistant-agnostic" should become "harness-agnostic" if referring to the tool concept, but could stay if referring to the AI assistant concept

4. **Build pipeline section**:
   - Path references in code examples

5. **Distribution section**:
   - Plugin.json references
   - `templates/assistant/` → `templates/harness/`

6. **GitHub Releases section**:
   - `templates/assistant/skills/*/scripts/` → `templates/harness/skills/*/scripts/`

7. **Adding New Assistant Support section**:
   - Rename section to "Adding New Harness Support" or similar
   - Update content to reflect harness terminology

8. **Directory Structure section**:
   - Any path references

### README.md

Look for CLI usage examples and the project description. Update any `--assistants` references.

### docs/ pages

Run:
```bash
grep -rn "assistant\|Assistant\|--assistants" docs/ 2>/dev/null || echo "No docs directory or no matches"
```

Update each file found. Common patterns:
- `--assistants claude` → `--harnesses claude`
- "supported assistants" → "supported harnesses"
- "assistant configuration" → "harness configuration"

### Verification

```bash
# Check for remaining stale references (excluding acceptable generic uses of "assistant"):
grep -rn "\-\-assistants" AGENTS.md README.md docs/
grep -rn "templates/assistant" AGENTS.md README.md docs/
```

</details>
