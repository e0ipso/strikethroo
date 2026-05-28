---
id: 4
group: "validation"
dependencies: [1, 2, 3]
status: "completed"
created: "2025-09-06"
skills: ["bash"]
---

## Objective
Validate that all assistant-specific language has been successfully removed from template files and that the changes work correctly across all supported assistant types.

## Skills Required
- **bash**: Run validation commands and verify template functionality

## Acceptance Criteria
- [ ] No Claude-specific language remains in any template files
- [ ] No hardcoded `.claude/agents` references exist in templates
- [ ] Shell logic executes successfully for different assistant directory structures
- [ ] Templates maintain professional language and functionality
- [ ] All template files use consistent assistant-agnostic terminology

## Technical Requirements
- Run comprehensive grep searches across template directory
- Test shell logic with different assistant directory scenarios
- Verify template content quality and consistency
- Confirm backward compatibility is maintained

## Input Dependencies
- Task 1: Updated execute-blueprint.md template
- Task 2: Updated execute-task.md template with dynamic shell logic
- Task 3: Updated TASK_MANAGER.md template

## Output Artifacts
- Validation report confirming all assistant-specific references removed
- Confirmation that templates work with Claude, Gemini, and OpenCode configurations

## Implementation Notes
<details>
<summary>Detailed validation procedures</summary>

**1. Language Validation Commands:**
```bash
# Check for any remaining Claude-specific references
grep -r -i "claude code\|\.claude/agents" /workspace/templates/

# Check for any remaining assistant-specific terms
grep -r -i "claude\|gemini\|opencode" /workspace/templates/ --exclude-dir=.git

# Verify no hardcoded paths remain
grep -r "\.claude\|\.gemini\|\.opencode" /workspace/templates/
```

All commands should return no matches (or only appropriate generic references).

**2. Shell Logic Testing:**
Create temporary test directories to verify dynamic detection:
```bash
# Test scenario 1: Claude agents directory
mkdir -p test_workspace/.claude/agents
touch test_workspace/.claude/agents/test-agent.md

# Test scenario 2: Gemini agents directory
mkdir -p test_workspace/.gemini/agents
touch test_workspace/.gemini/agents/test-agent.md

# Test scenario 3: No agents directories
mkdir -p test_workspace_empty

# Extract and test shell logic from updated execute-task.md template
```

**3. Content Quality Review:**
- Review all updated templates for professional language
- Ensure terminology is consistent across all files
- Confirm instructions remain clear and actionable
- Verify template variable substitution still works

**4. Success Criteria Verification:**
Document that all primary success criteria from the original plan are met:
- All template files use assistant-agnostic language ✓
- No hardcoded `.claude/agents` references remain ✓
- Shell logic works with any assistant directory structure ✓
- Template language feels professional and consistent ✓

**Cleanup:**
Remove any temporary test directories after validation.
</details>