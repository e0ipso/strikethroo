---
id: 3
group: "template-language-updates"
dependencies: []
status: "completed"
created: "2025-09-06"
skills: ["text-processing"]
---

## Objective
Replace Claude-specific language references in TASK_MANAGER.md template to make it assistant-agnostic.

## Skills Required
- **text-processing**: Find and replace specific terminology in documentation

## Acceptance Criteria
- [ ] "Claude Code" reference replaced with generic "AI Assistant" terminology
- [ ] Document maintains its instructional clarity and professional tone
- [ ] All references are now assistant-neutral
- [ ] Context and meaning preserved while removing brand-specific language

## Technical Requirements
- Target file: `/workspace/templates/ai-task-manager/config/TASK_MANAGER.md`
- Replace Claude-specific terminology around line 4
- Ensure documentation remains clear and helpful for all assistant types

## Input Dependencies
None - this is a standalone documentation update

## Output Artifacts
- Updated TASK_MANAGER.md template with assistant-agnostic language
- Documentation that works consistently across all supported assistants

## Implementation Notes
<details>
<summary>Detailed implementation guidance</summary>

**Specific Change Needed** (around line 4):
- FROM: `commands for Claude Code.`
- TO: `commands for AI assistants.`

**Context Check:**
The full sentence should read: "This document contains important information that is common to all the /task:* commands for AI assistants."

**Quality Verification:**
After the change, review the surrounding context to ensure:
1. The sentence flows naturally
2. The meaning remains clear
3. No other Claude-specific references exist in the file

**Validation Command:**
```bash
grep -i "claude" /workspace/templates/ai-task-manager/config/TASK_MANAGER.md
```

This should return no matches after the update.
</details>