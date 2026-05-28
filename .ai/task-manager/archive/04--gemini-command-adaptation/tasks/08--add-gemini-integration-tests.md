---
id: 8
group: "testing-validation"
dependencies: [5, 6, 7]
status: "completed"
created: "2025-09-01"
---

## Objective
Create integration tests to validate that Gemini initialization creates proper TOML command files and directory structures.

## Acceptance Criteria
- [ ] Add test case for Gemini-only initialization
- [ ] Add test case for mixed Claude and Gemini initialization
- [ ] Validate TOML file creation and proper content structure
- [ ] Test directory structure creation for .gemini/commands/tasks
- [ ] Ensure Claude tests remain passing without changes

## Technical Requirements
- Extend existing integration test suite in `src/__tests__/`
- Create test cases for Gemini assistant initialization
- Validate TOML file existence and basic structure
- Test mixed assistant scenarios (claude + gemini)
- Use existing test patterns and utilities

## Input Dependencies
- Updated init command from Tasks 05, 06, 07
- TOML template files from Tasks 02, 03, 04
- Existing integration test infrastructure

## Output Artifacts
- New integration test cases for Gemini initialization
- Validation of TOML file generation
- Test coverage for mixed assistant scenarios

## Implementation Notes
- Follow existing test patterns in `cli.integration.test.ts`
- Use temporary directories for test isolation
- Validate both file existence and content structure
- Ensure tests clean up created files/directories
- Consider testing both individual and combined assistant selections