---
id: 3
group: "validation"
dependencies: [1, 2]
status: "completed"
created: 2025-10-17
skills:
  - markdown
---
# Audit Other Workflow Commands for Similar Issues

## Objective
Review generate-tasks and execute-blueprint templates to identify and fix any similar conflicting instructions that could cause full-workflow to pause unexpectedly.

## Skills Required
- **markdown**: Template analysis and potential modification

## Acceptance Criteria
- [ ] generate-tasks template reviewed for pause-inducing instructions
- [ ] execute-blueprint template reviewed for pause-inducing instructions
- [ ] Any conflicting instructions identified and documented
- [ ] Fixes applied to any problematic templates using same pattern
- [ ] All templates support FULL_WORKFLOW_MODE convention

Use your internal Todo tool to track these and keep on track.

## Technical Requirements
- Files to review:
  - `templates/assistant/commands/tasks/generate-tasks.md`
  - `templates/assistant/commands/tasks/execute-blueprint.md`
- Look for instructions that tell AI to prompt user for review/approval
- Check output format sections for user interaction prompts
- Verify error handling doesn't unnecessarily pause execution

## Input Dependencies
- Task 01: Full-workflow template updated (provides pattern to follow)
- Task 02: Create-plan template updated (provides example of fix)

## Output Artifacts
- Audit report documenting findings
- Updated templates if issues found (using FULL_WORKFLOW_MODE pattern)

## Implementation Notes

<details>
<summary>Detailed Implementation Instructions</summary>

**Step 1: Review generate-tasks Template**
1. Open `templates/assistant/commands/tasks/generate-tasks.md`
2. Search for phrases like:
   - "review"
   - "wait for"
   - "user approval"
   - "instruct the user"
   - "ask the user"
3. Check the output/completion section for user interaction prompts
4. Document any findings

**Step 2: Review execute-blueprint Template**
1. Open `templates/assistant/commands/tasks/execute-blueprint.md`
2. Perform same search as above
3. Pay special attention to phase completion and validation sections
4. Check post-execution summary instructions
5. Document any findings

**Step 3: Apply Fixes if Needed**
If any templates have similar issues:
1. Add FULL_WORKFLOW_MODE check using same pattern as create-plan
2. Define conditional output behavior:
   - **Workflow mode**: Progress confirmation only ("Step N/M completed")
   - **Standalone mode**: Full output with review instructions
3. Update both the template and add documentation

**Step 4: Patterns to Look For**

**Problematic patterns** (would cause pauses):
- "Review the tasks in..."
- "Please verify..."
- "Check the implementation..."
- "Ensure you review..."

**Acceptable patterns** (won't cause pauses):
- "Tasks created successfully"
- "Execution completed"
- "Step N/M: [status]"
- Error reporting without user prompts

**Step 5: Document Findings**
Create a brief summary:
- Templates reviewed: [list]
- Issues found: [describe each]
- Fixes applied: [describe changes]
- No issues found: [confirm clean templates]

**Step 6: Consistency Check**
Ensure all workflow command templates:
- Respect FULL_WORKFLOW_MODE when set
- Provide clear progress updates in workflow mode
- Maintain helpful instructions in standalone mode
- Handle errors appropriately in both modes

</details>
