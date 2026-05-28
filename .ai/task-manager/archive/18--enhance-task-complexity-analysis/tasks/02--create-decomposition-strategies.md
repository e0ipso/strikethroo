---
id: 2
group: "algorithm-design"
dependencies: [1]
status: "completed"
created: "2025-09-06"
skills: ["pattern-design", "technical-writing"]
---

## Objective
Create systematic decomposition strategies and patterns for breaking down complex tasks (>5 complexity score) into simpler subtasks, with specific approaches for different complexity drivers and validation rules.

## Skills Required
- **pattern-design**: Creating reusable decomposition patterns for different task complexity types
- **technical-writing**: Documenting clear decomposition strategies and decision frameworks

## Acceptance Criteria
- [ ] Decomposition patterns for each complexity dimension (technical depth, decision complexity, integration points, scope breadth, uncertainty)
- [ ] Step-by-step decomposition workflow with clear decision points
- [ ] Rules for maintaining task dependencies during decomposition
- [ ] Validation criteria for when tasks should NOT be decomposed further
- [ ] Examples of decomposition applied to high-complexity tasks

## Technical Requirements
The strategies must address the decomposition workflow specified in the plan:
1. **Initial Assessment**: How to identify complexity drivers
2. **Identification Phase**: Rules for flagging tasks >5 for decomposition
3. **Decomposition Strategy**: Systematic breakdown patterns
4. **Validation Loop**: Criteria for re-analysis and iteration
5. **Dependency Reconstruction**: Maintaining referential integrity

Must include specific patterns for common complexity types mentioned in the plan:
- Multi-step workflows
- Integration-heavy tasks
- Decision-intensive tasks

## Input Dependencies
- Complexity scoring algorithm and rubrics from Task 1
- Understanding of complexity dimensions and their evaluation criteria

## Output Artifacts
- Decomposition pattern library for different complexity types
- Step-by-step decomposition workflow instructions
- Dependency reconstruction procedures
- Validation rules for minimum task viability
- Example decompositions with before/after complexity scores

## Implementation Notes
<details>
<summary>Detailed Implementation Guidance</summary>

Create systematic patterns that AI agents can apply consistently:

1. **Decomposition Patterns by Complexity Driver**:
   - **High Technical Depth**: Split by technology/framework boundaries
   - **High Decision Complexity**: Separate decision-making from implementation
   - **High Integration Points**: Isolate integration tasks from core functionality
   - **High Scope Breadth**: Split by functional boundaries or user stories
   - **High Uncertainty**: Separate research/clarification from implementation

2. **Workflow Decision Tree**: Create clear if/then logic for decomposition choices based on complexity drivers.

3. **Dependency Preservation**: Rules for how to split task dependencies when parent tasks are decomposed.

4. **Stop Conditions**: Clear criteria for when further decomposition would create tasks that are too granular or lose coherence.

5. **Validation Checkpoints**: How to verify that decomposed tasks maintain the original task's objectives while reducing complexity.

Focus on practical, actionable patterns that can be embedded directly into template instructions.
</details>