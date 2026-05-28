---
id: 1
group: "template-analysis"
dependencies: []
status: "completed"
created: "2025-09-01"
---

## Objective
Analyze the existing Claude markdown templates to understand their structure, argument usage patterns, and conversion requirements for Gemini TOML format.

## Acceptance Criteria
- [ ] Document structure and content of all three existing MD templates
- [ ] Identify all argument placeholders (`$ARGUMENTS`, `$1`) and their usage contexts
- [ ] Map markdown frontmatter fields to TOML equivalents
- [ ] Define conversion rules for argument handling (`$ARGUMENTS` → `{{args}}`)
- [ ] Create specifications for each TOML template conversion

## Technical Requirements
- Read and parse `templates/commands/tasks/create-plan.md`
- Read and parse `templates/commands/tasks/generate-tasks.md`
- Read and parse `templates/commands/tasks/execute-blueprint.md`
- Understand Gemini TOML format requirements from provided documentation
- Document argument injection patterns and semantic equivalence

## Input Dependencies
- Existing template files in `templates/commands/tasks/`
- Gemini CLI documentation on TOML format and argument handling

## Output Artifacts
- Analysis document detailing:
  - Current template structures
  - Argument usage patterns
  - Conversion mapping specifications
  - TOML format requirements per template

## Implementation Notes
- Focus on preserving semantic meaning during format conversion
- Pay special attention to complex argument handling in generate-tasks template
- Consider both `{{args}}` shorthand and default argument handling approaches
- Document any potential issues with format conversion