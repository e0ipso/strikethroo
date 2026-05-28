---
id: 4
group: "testing"
dependencies: [3]
status: "completed"
created: "2025-11-22"
skills: ["jest"]
---

# Task: Add Integration Tests for Codex Support

## Objective

Validate Codex assistant integration through automated tests covering directory creation, file naming, and multi-assistant scenarios.

## Skills Required

- `jest`: Integration testing

## Acceptance Criteria

- [ ] Test verifies `.codex/prompts/` directory creation
- [ ] Test validates `tasks-{name}.md` file naming pattern
- [ ] Test confirms all 7 command files are present
- [ ] Multi-assistant test includes Codex
- [ ] All new tests pass
- [ ] All existing tests continue to pass (no regressions)

## Technical Requirements

- Add test cases to `src/__tests__/cli.integration.test.ts`
- Follow existing test patterns and structure
- Use temporary directories for test isolation
- Test core functionality:
  1. Directory structure validation
  2. File naming pattern verification
  3. File count validation
  4. Multi-assistant initialization with Codex

## Input Dependencies

- Task 3: Codex directory structure implementation complete

## Output Artifacts

- Modified `src/__tests__/cli.integration.test.ts` with Codex test cases
- All tests passing (`npm test`)

## Implementation Notes

**Meaningful Test Strategy Guidelines**

Your critical mantra for test generation is: "write a few tests, mostly integration".

Focus on testing the unique aspects of Codex integration (flat structure, file naming) without over-testing framework functionality.

<details>
<summary>Detailed Implementation Steps</summary>

1. Open `src/__tests__/cli.integration.test.ts`
2. Add a new describe block for Codex tests:
   ```typescript
   describe('Codex assistant support', () => {
     it('should create .codex/prompts/ directory with flat structure', async () => {
       // Test directory creation
     });

     it('should rename template files with tasks- prefix', async () => {
       // Test file naming pattern
     });

     it('should copy all 7 command templates', async () => {
       // Test file count
     });

     it('should work with multi-assistant initialization', async () => {
       // Test --assistants claude,codex
     });
   });
   ```
3. Implement each test case following existing patterns
4. Run `npm test` to verify all tests pass
5. Check for regressions in existing assistant tests
</details>
