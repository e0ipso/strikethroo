---
id: 7
group: "documentation"
dependencies: [6]
status: "completed"
created: "2025-09-06"
skills: ["markdown"]
---

# Update Documentation for Open Code Support

## Objective
Update README.md and CLAUDE.md to include Open Code examples and usage instructions alongside existing Claude and Gemini documentation.

## Skills Required
- **markdown**: Update documentation files with Open Code examples and usage

## Acceptance Criteria
- [ ] README.md includes Open Code in assistant options and examples
- [ ] CLAUDE.md updated with Open Code CLI testing commands
- [ ] Usage examples show mixed assistant initialization with Open Code
- [ ] Installation/setup instructions mention Open Code support
- [ ] Command examples demonstrate Open Code integration

## Technical Requirements
- Add Open Code to assistant list in README.md
- Update CLI examples to include `--assistants opencode` option
- Add examples of mixed assistant usage: `--assistants claude,opencode,gemini`
- Update CLAUDE.md with Open Code testing commands if relevant
- Ensure documentation consistency across all assistant types

## Input Dependencies
- Task 6: Integration tests must pass to validate functionality works as documented

## Output Artifacts
- Updated README.md with Open Code examples
- Updated CLAUDE.md with Open Code CLI testing instructions
- Consistent documentation across all supported assistants

## Implementation Notes
Follow the existing documentation patterns for Claude and Gemini. Look for sections that list available assistants, provide usage examples, or demonstrate CLI commands, and add corresponding Open Code examples. Ensure the documentation reflects the three-assistant support (Claude, Gemini, Open Code) consistently throughout.