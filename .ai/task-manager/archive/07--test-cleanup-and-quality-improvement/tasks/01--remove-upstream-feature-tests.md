---
id: 1
group: "test-cleanup"
dependencies: []
status: "completed"
created: "2025-09-01"
---

# Remove Upstream Feature Tests

## Objective
Remove tests that verify third-party library and Node.js built-in functionality from utils.test.ts, focusing testing efforts on custom business logic instead.

## Acceptance Criteria
- [ ] Remove Node.js path module tests (path.resolve, path.join, etc.)
- [ ] Remove fs-extra library method tests
- [ ] Remove OS operation tests (os.homedir)
- [ ] Maintain tests for custom utility functions that use these libraries
- [ ] Ensure coverage remains above 70% threshold

## Technical Requirements
- Jest test framework
- TypeScript test files
- Coverage thresholds defined in jest.config.js

## Input Dependencies
None - this is the first task in the cleanup process

## Output Artifacts
- Cleaned utils.test.ts file with reduced test count
- Updated test coverage report

## Implementation Notes
Focus on removing tests in the "path helper functions" describe block that test Node.js built-ins directly. Keep tests for custom wrapper functions like parseAssistants, validateAssistants, and template processing functions.