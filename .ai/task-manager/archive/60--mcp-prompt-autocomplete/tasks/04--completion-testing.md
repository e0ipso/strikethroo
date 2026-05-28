---
id: 4
group: "testing"
dependencies: [3]
status: "completed"
created: 2025-11-25
skills:
  - testing
---
# Add Tests for Completion Functionality

## Objective
Create integration tests for the completion functionality to validate plan ID discovery, response formatting, and error handling scenarios using the project's existing Jest framework.

## Skills Required
- **Testing**: Write integration tests with proper fixtures and assertions

## Acceptance Criteria
- [ ] Create test file `src/__tests__/completion.integration.test.ts`
- [ ] Test plan ID discovery with valid plan fixtures
- [ ] Test empty directory scenario (returns empty array)
- [ ] Test malformed YAML handling (skips invalid, returns valid IDs)
- [ ] Test completion handler with matching argument name 'plan_id'
- [ ] Test completion handler with non-matching argument name (returns empty)
- [ ] Test completion handler with non-prompt ref type (returns empty)
- [ ] Test response format compliance with MCP CompleteResult schema
- [ ] Test numeric sorting of plan IDs before string conversion

## Technical Requirements
- Use Jest framework (existing project test infrastructure)
- Create test fixtures in temporary directories (pattern: `src/__tests__/fixtures/`)
- Test both `getActivePlanIds()` utility and completion handler integration
- Validate response structure matches `CompleteResultSchema`
- Follow existing test patterns from `src/__tests__/utils.test.ts` and `src/__tests__/cli.integration.test.ts`

## Input Dependencies
- Task 3: Fully integrated completion functionality

## Output Artifacts
- Integration test suite for completion feature
- Test fixtures with sample plan directories and frontmatter
- Coverage for success paths, edge cases, and error scenarios

## Implementation Notes
Test structure should follow project conventions:

```typescript
describe('Completion API', () => {
  describe('getActivePlanIds', () => {
    it('should discover plan IDs from valid plan directories', async () => {
      // Create temp directory with plan fixtures
      // Call getActivePlanIds()
      // Assert correct IDs returned in numeric order
    });

    it('should return empty array when .ai/task-manager not found', async () => {
      // Test graceful degradation
    });

    it('should skip malformed YAML files', async () => {
      // Create mix of valid and invalid plans
      // Assert only valid IDs returned
    });
  });

  describe('Completion Handler', () => {
    it('should return plan IDs for plan_id argument', async () => {
      // Mock completion request with argument.name = 'plan_id'
      // Assert response contains plan IDs as strings
    });

    it('should return empty completion for non-matching argument', async () => {
      // Mock completion request with argument.name = 'other'
      // Assert values array is empty
    });

    it('should limit results to 100 items', async () => {
      // Create 150 plan fixtures
      // Assert response.values.length === 100
      // Assert response.hasMore === true
    });
  });
});
```

Focus on integration testing with real filesystem operations (project philosophy: "Write a Few Tests, Mostly Integration"). Avoid heavy mocking; use temporary directories for isolation.
