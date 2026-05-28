---
id: 2
group: "implementation"
dependencies: [1]
status: "completed"
created: "2025-09-03"
---

# Task 002: Write Consolidated CLI Integration Tests

## Objective
Create a single, focused CLI integration test file (~400 lines) that covers all critical user workflows with real file system operations and minimal mocking.

## Acceptance Criteria
- [ ] Test file is ~400 lines or less
- [ ] Covers all critical paths identified in the coverage matrix
- [ ] Uses real file system operations (no excessive mocking)
- [ ] Tests run in under 3 seconds
- [ ] Clear test names describing scenarios and expected outcomes
- [ ] Tests are maintainable and easy to understand

## Technical Requirements
- Replace existing `src/__tests__/cli.integration.test.ts`
- Use temporary directories for test isolation
- Test scenarios must include:
  - Initialize with single assistant (claude, gemini)
  - Initialize with multiple assistants
  - Handle existing files/directories (conflict resolution)
  - Path resolution (relative, absolute, default)
  - Error handling (missing parameters, invalid assistants)

## Input Dependencies
- Coverage matrix from Task 001
- List of critical test scenarios to preserve

## Output Artifacts
- New `cli.integration.test.ts` file (~400 lines)
- All critical user workflows covered with integration tests

## Implementation Notes
- Combine related test scenarios into single test cases where appropriate
- Use descriptive test names: "should copy templates to correct location when initializing with claude"
- Focus on end-to-end behavior, not implementation details
- Avoid testing Commander.js functionality (it's already tested upstream)