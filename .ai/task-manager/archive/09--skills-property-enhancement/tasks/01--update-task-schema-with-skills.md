---
id: 1
group: "schema-enhancement"
dependencies: []
status: "completed"
created: "2025-09-02"
skills: ["json-schema"]
---

# Update Task Schema with Skills Property

## Objective
Update the JSON schema definition for task frontmatter to include a new required "skills" property as an array of strings, and update all frontmatter examples across task generation templates.

## Acceptance Criteria
- [ ] JSON schema includes "skills" as a required property of type array with string items
- [ ] Schema enforces that skills array cannot be empty
- [ ] All frontmatter examples in template files include the skills property
- [ ] Skills examples demonstrate 1-2 technical skills per task
- [ ] Skills use lowercase string format matching common technical domains

## Technical Requirements
- Update JSON schema in `/templates/commands/tasks/generate-tasks.md` around line 158-191
- Add skills property to schema with proper validation rules
- Update frontmatter examples throughout the file to include skills arrays
- Skills should follow the format: `["skill1", "skill2"]`
- Common skill categories: js, css, react-hooks, api-endpoints, database, jest, github-actions, etc.

## Input Dependencies
None - this is a foundational schema definition task

## Output Artifacts
- Updated JSON schema with skills property
- Updated frontmatter examples demonstrating skills usage
- Schema validation that enforces skills property requirements

## Implementation Notes
- Skills property should be added to the required array in the schema
- Use descriptive skill names that align with common technical domains
- Ensure examples show variety of skill combinations (frontend, backend, testing, etc.)
- The skills property will be consumed by execute-blueprint.md for subagent selection