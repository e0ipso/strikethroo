---
id: 2
group: "remove-detection-infrastructure"
dependencies: [1]
status: "pending"
created: "2025-12-29"
skills: ["bash", "markdown"]
---

# Update Hooks and Documentation to Remove Detection References

## Objective

Remove detection script references from hook files and update AGENTS.md documentation to reflect the new direct configuration loading approach. Ensure all guidance references the simplified workflow.

## Skills Required

- **bash**: Understanding hook script structure and bash syntax
- **markdown**: Updating documentation and hook configuration

## Acceptance Criteria

- [ ] `PRE_PLAN.md` hook updated to remove detection script execution
- [ ] `PRE_TASK_ASSIGNMENT.md` hook updated to remove detection script execution
- [ ] All other hooks checked for detection references and updated if needed
- [ ] AGENTS.md refine-plan section updated to remove detection workflow references
- [ ] AGENTS.md documentation updated to reflect direct configuration loading
- [ ] All hook files execute successfully without detection logic
- [ ] Documentation accurately describes the new approach

## Technical Requirements

Hook files to update:
- `/workspace/.ai/task-manager/config/hooks/PRE_PLAN.md`
- `/workspace/.ai/task-manager/config/hooks/PRE_TASK_ASSIGNMENT.md`
- Any other hooks that reference detection scripts

Documentation to update:
- `/workspace/AGENTS.md` - Refine-plan section and any references to detection workflow
- Any section describing assistant configuration loading

## Input Dependencies

- Updated command templates from Task 1 (to understand the new approach)
- Current hook files
- AGENTS.md documentation

## Output Artifacts

- Updated hook files without detection script calls
- Updated AGENTS.md with accurate documentation
- Clear guidance on direct configuration loading

## Implementation Notes

<details>
<summary>Detailed Implementation Steps</summary>

### Hook Updates

**PRE_PLAN.md Hook**:
1. Search for lines containing `detect-assistant.cjs` or `read-assistant-config.cjs`
2. These lines should be removed entirely
3. The hook should focus on its core purpose (plan validation) without assistant detection
4. Ensure any configuration loading (if needed) is done directly from known paths

**PRE_TASK_ASSIGNMENT.md Hook**:
1. Same process as PRE_PLAN.md
2. Focus on task assignment logic without detection overhead

**Other Hooks to Check**:
- `POST_PLAN.md` - Check for detection references
- `POST_TASK_GENERATION_ALL.md` - Check for detection references
- `POST_PHASE.md` - Check for detection references
- `PRE_PHASE.md` - Check for detection references
- `POST_ERROR_DETECTION.md` - Check for detection references
- `EXECUTION_SUMMARY_TEMPLATE.md` - Check for detection references

### AGENTS.md Updates

**Refine-plan Section**:
- Current text mentions: "Load the plan context safely via `detect-assistant.cjs` and `read-assistant-config.cjs`"
- Replace with: "Load the plan context directly from assistant-specific configuration files (e.g., `/AGENTS.md` for Claude)"
- Remove any steps that involve running detection scripts

**Assistant Configuration References**:
- Update any section describing "how assistants load configuration"
- Change from "detect at runtime" to "configuration files are assistant-specific during template generation"
- Clarify that each assistant's templates already know their context

**Command Documentation Examples**:
- Update any examples showing detection script usage
- Replace with direct file path references

### Search and Verify

After making changes, verify:
```bash
grep -r "detect-assistant.cjs" /workspace/.ai/task-manager/config/hooks/ 2>/dev/null || echo "No detection references in hooks"
grep -r "read-assistant-config.cjs" /workspace/.ai/task-manager/config/hooks/ 2>/dev/null || echo "No detection references in hooks"
grep -n "detect-assistant\|read-assistant-config" /workspace/AGENTS.md | head -20 || echo "No detection references in AGENTS.md"
```

### Testing

- Verify hooks load without errors by checking their syntax
- Ensure AGENTS.md is valid markdown
- Confirm documentation is clear and accurate

</details>
