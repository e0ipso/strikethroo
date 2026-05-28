---
id: 4
group: "testing"
dependencies: [2, 3]
status: "completed"
created: "2025-09-06"
skills: ["jest"]
---

# Task 004: Test Template Copying Implementation

## Objective
Run existing tests and verify that the new recursive template copying implementation works correctly, updating tests if necessary to reflect the new directory structure.

## Skills Required
Jest testing framework

## Acceptance Criteria
- [ ] All existing tests pass with the new implementation
- [ ] Template copying creates correct directory structure
- [ ] Assistant-specific templates are copied to correct locations
- [ ] Format conversions (MD to TOML) still work for Gemini

Use your internal TODO tool to track these and keep on track.

## Meaningful Test Strategy Guidelines

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

## Technical Requirements
- Run `npm test` to execute the test suite
- Update test expectations if paths have changed
- Focus on integration tests that verify end-to-end template copying
- Verify directory structure matches new template organization

## Input Dependencies
- Completed implementation from Tasks 002 and 003

## Output Artifacts
- Passing test suite confirming the implementation works correctly

## Implementation Notes
The existing test suite should mostly work, but may need updates for:
1. New directory paths (config/, config/hooks/, etc.)
2. Additional template files being copied
3. Changed source paths for assistant templates
4. Focus on verifying the critical path: init command successfully copies all templates