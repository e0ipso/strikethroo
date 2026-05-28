---
id: 1
group: "template-language-updates"
dependencies: []
status: "completed"
created: "2025-09-06"
skills: ["text-processing"]
---

## Objective
Replace Claude-specific language and hardcoded path references in execute-blueprint.md template to make it assistant-agnostic.

## Skills Required
- **text-processing**: Systematic find-and-replace operations and template content editing

## Acceptance Criteria
- [ ] "Available Claude Code Sub-Agents" section header replaced with "Available Sub-Agents"
- [ ] Hardcoded `.claude/agents` reference replaced with assistant-agnostic language
- [ ] All Claude-specific terminology replaced with generic equivalents
- [ ] Template functionality preserved while being portable across assistants
- [ ] Language feels professional and consistent

## Technical Requirements
- Target file: `/workspace/templates/assistant/commands/tasks/execute-blueprint.md`
- Replace "Claude Code Sub-Agents" with "Sub-Agents"
- Replace `.claude/agents` reference with generic description about checking appropriate assistant directory structure
- Maintain existing template variable substitution and formatting

## Input Dependencies
None - this is a standalone template update

## Output Artifacts
- Updated execute-blueprint.md template with assistant-agnostic language
- Template ready for use with any supported assistant (Claude, Gemini, OpenCode)

## Implementation Notes
<details>
<summary>Detailed implementation guidance</summary>

**Specific text replacements needed:**

1. **Section Header** (around line 82):
   - FROM: `#### Available Claude Code Sub-Agents`
   - TO: `#### Available Sub-Agents`

2. **Path Reference** (around line 83):
   - FROM: `Analyze the sub-agents available under `.claude/agents`. If none are available`
   - TO: `Analyze the sub-agents available in your current assistant's agents directory. If none are available`

3. **Context References**:
   - Replace any remaining "Claude Code" references with "AI Assistant" or "Sub-Agents" as contextually appropriate

**Quality Check:**
After changes, ensure the template still makes logical sense and maintains its instructional clarity while being assistant-neutral.

**Verification:**
Run grep to confirm no Claude-specific terms remain:
```bash
grep -i "claude\|\.claude" /workspace/templates/assistant/commands/tasks/execute-blueprint.md
```
</details>