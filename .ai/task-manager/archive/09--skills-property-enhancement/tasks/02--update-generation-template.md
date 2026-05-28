---
id: 2
group: "template-updates"
dependencies: [1]
status: "completed"
created: "2025-09-02"
skills: ["markdown", "documentation"]
---

# Update Task Generation Template with Skills Guidance

## Objective
Modify the task generation template to include comprehensive guidance for skill selection and automatic skill inference based on task technical requirements, incorporating the updated schema from Task 1.

## Acceptance Criteria
- [ ] Template includes updated frontmatter structure with skills property
- [ ] Added section explaining skill selection criteria and examples
- [ ] Guidelines for inferring skills from task objectives and technical requirements
- [ ] Examples of skill categories with specific skill values
- [ ] Instructions for maintaining 1-2 skills per task (typical)
- [ ] Updated task body structure documentation references skills

## Technical Requirements
- Update `/templates/commands/tasks/generate-tasks.md` with new skills guidance
- Add skill selection guidelines in the Task Creation Guidelines section
- Include skill inference logic in the Process section
- Update all example frontmatter blocks to include skills property
- Provide comprehensive skill vocabulary examples matching plan specifications

## Input Dependencies
- Updated JSON schema with skills property from Task 1
- Skills property validation rules and examples

## Output Artifacts
- Enhanced task generation template with skills integration
- Clear guidance for skill selection and inference
- Updated process workflow incorporating skills assignment
- Complete skill vocabulary reference

## Implementation Notes
- Skills should be automatically inferred from task technical requirements
- Include examples mapping different task types to appropriate skills
- Ensure skill naming consistency (lowercase, hyphenated format)
- Reference the skill categories from the plan: frontend, backend, testing, devops, etc.
- Skills will be used by execute-blueprint.md for subagent matching