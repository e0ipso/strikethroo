---
id: 6
group: "testing"
dependencies: [5]
status: "completed"
created: "2025-09-06"
skills: ["jest", "typescript"]
---

# Add Open Code Integration Tests

## Objective
Add comprehensive integration tests for Open Code support, covering directory creation, template processing, and mixed assistant initialization.

## Skills Required
- **jest**: Write integration tests using the existing Jest test framework
- **typescript**: Test TypeScript functionality and type safety

## Acceptance Criteria
- [ ] Test Open Code directory creation (`--assistants opencode`)
- [ ] Test mixed assistant initialization (`--assistants claude,opencode,gemini`)
- [ ] Test template processing for Open Code (Markdown format preservation)
- [ ] Test assistant validation accepts Open Code as valid option
- [ ] Test template format mapping returns correct format for Open Code
- [ ] All existing tests continue to pass

## Technical Requirements
- Add tests to existing integration test files (likely `src/__tests__/cli.integration.test.ts`)
- Follow existing test patterns for Claude/Gemini integration
- Test both single Open Code initialization and mixed assistant scenarios
- Verify directory structure creation matches Open Code expectations
- Test template processing produces correct output format

## Input Dependencies
- Task 5: Template processing integration must be completed first

## Output Artifacts
- Integration tests covering Open Code functionality
- Verification that existing test suite remains passing

## Implementation Notes

**Meaningful Test Strategy Guidelines**

Your critical mantra for test generation is: "write a few tests, mostly integration".

**Definition of "Meaningful Tests":**
Tests that verify custom business logic, critical paths, and edge cases specific to the application. Focus on testing YOUR code, not the framework or library functionality.

**When TO Write Tests:**
- Custom business logic and algorithms
- Critical user workflows and data transformations
- Edge cases and error conditions for core functionality
- Integration points between different system components
- Complex validation logic or calculations

**When NOT to Write Tests:**
- Third-party library functionality (already tested upstream)
- Framework features (React hooks, Express middleware, etc.)
- Simple CRUD operations without custom logic
- Getter/setter methods or basic property access
- Configuration files or static data
- Obvious functionality that would break immediately if incorrect

Focus on integration tests that verify the end-to-end Open Code initialization workflow. Test the critical business logic of assistant recognition, directory creation, and template processing - not individual utility functions unless they contain complex logic.