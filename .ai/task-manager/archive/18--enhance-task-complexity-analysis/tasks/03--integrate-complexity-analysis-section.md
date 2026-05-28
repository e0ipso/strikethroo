---
id: 3
group: "template-enhancement"
dependencies: [1, 2]
status: "completed"
created: "2025-09-06"
skills: ["markdown", "prompt-engineering"]
---

## Objective
Integrate the complexity analysis and recursive decomposition workflow into the existing generate-tasks.md template structure, adding a new "Complexity Analysis and Refinement" section while preserving all existing functionality.

## Skills Required
- **markdown**: Modifying template structure and formatting with collapsible sections
- **prompt-engineering**: Integrating analysis workflow into AI agent instructions

## Acceptance Criteria
- [ ] New "Complexity Analysis and Refinement" section added after Step 1 (Task Decomposition)
- [ ] Complexity scoring algorithm integrated with detailed rubrics
- [ ] Decomposition strategies and patterns included
- [ ] Recursive workflow instructions with clear iteration steps
- [ ] All existing template sections and functionality preserved
- [ ] Collapsible sections used for detailed implementation guidance

## Technical Requirements
The integration must follow the template structure enhancement approach from the plan:
- Add new section after initial task generation but before final output generation
- Preserve all existing task creation guidelines and minimization principles
- Use collapsible sections for detailed guidance
- Maintain compatibility with existing plan formats and dependency structures
- Include validation checkpoints and iteration controls

The new section should be positioned between the current Step 1 (Task Decomposition) and Step 2 (Dependency Analysis).

## Input Dependencies
- Complexity scoring algorithm and rubrics from Task 1
- Decomposition strategies and patterns from Task 2
- Current generate-tasks.md template structure

## Output Artifacts
- Enhanced generate-tasks.md template with integrated complexity analysis
- New "Complexity Analysis and Refinement" section with embedded instructions
- Updated process flow incorporating complexity workflow
- Preserved existing template functionality and structure

## Implementation Notes
<details>
<summary>Detailed Implementation Guidance</summary>

Carefully integrate the complexity analysis without disrupting existing template flow:

1. **Section Placement**: Insert new "Step 1.5: Complexity Analysis and Refinement" between Task Decomposition and Dependency Analysis.

2. **Content Integration**:
   - Embed complexity scoring rubrics in collapsible sections
   - Include decomposition patterns with clear decision trees
   - Add iteration instructions with termination conditions
   - Preserve existing minimization principles and guidelines

3. **Template Flow Updates**:
   - Update step numbering to accommodate new section
   - Ensure validation checklist includes complexity requirements
   - Add complexity scores to task frontmatter examples if needed

4. **Formatting Consistency**:
   - Use same heading structure and formatting as existing sections
   - Maintain consistent tone and instruction style
   - Use collapsible `<details>` sections for extensive guidance

5. **Backward Compatibility**: Ensure the enhanced template still works for plans that don't need complexity analysis, making the new section feel natural rather than forced.

Read the current template file first to understand its exact structure and integration points.
</details>