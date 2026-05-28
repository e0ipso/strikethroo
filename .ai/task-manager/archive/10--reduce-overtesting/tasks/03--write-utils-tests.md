---
id: 3
group: "implementation"
dependencies: [1]
status: "completed"
created: "2025-09-03"
---

# Task 003: Write Minimal Utils Tests for Critical Functions

## Objective
Create a minimal utils test file (~200 lines) that only tests critical business logic and custom implementations, avoiding tests for trivial wrappers and framework functionality.

## Acceptance Criteria
- [ ] Test file is ~200 lines or less
- [ ] Only tests functions with custom business logic
- [ ] No tests for simple wrappers around fs-extra functions
- [ ] Tests focus on edge cases and error conditions
- [ ] Clear, focused test cases with single assertions

## Technical Requirements
- Replace existing `src/__tests__/utils.test.ts`
- Focus on testing:
  - `parseAssistants` and `validateAssistants` (critical input validation)
  - `convertMdToToml` (if TOML support is critical)
  - Complex path resolution logic (if any)
- Skip testing:
  - Simple file system wrappers (ensureDir, exists, etc.)
  - Path manipulation that just wraps Node.js path module
  - Trivial string formatting functions

## Input Dependencies
- Coverage matrix from Task 001
- List of utils functions that have actual business logic

## Output Artifacts
- New `utils.test.ts` file (~200 lines)
- Tests for critical business logic only

## Implementation Notes
- Each test should verify actual business rules, not library behavior
- Avoid testing functions that would obviously break if wrong
- Focus on functions where incorrect behavior might be subtle
- Remember: if a function just calls fs-extra methods, it doesn't need a test