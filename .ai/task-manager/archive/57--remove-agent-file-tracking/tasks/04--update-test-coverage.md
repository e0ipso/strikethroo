---
id: 4
group: "testing"
dependencies: [1, 2, 3]
status: "completed"
created: 2025-11-20
skills:
  - testing
---
# Update Test Coverage for Agent Tracking Removal

## Objective
Remove or update tests in conflict-detection.integration.test.ts that specifically validate agent file tracking, while preserving all config file conflict detection tests.

## Skills Required
- Jest testing framework
- Integration test maintenance

## Acceptance Criteria
- [ ] No tests reference agent file tracking functionality
- [ ] All config file tracking tests still pass
- [ ] Test suite runs successfully with no failures
- [ ] Test count may be lower (some agent-specific tests removed)

## Technical Requirements
- Location: src/__tests__/conflict-detection.integration.test.ts
- Keep: All tests for config file conflict detection (majority of the file)
- Remove/Update: Any tests specifically validating agent tracking
- Framework: Jest with fs-extra for filesystem operations

## Input Dependencies
- Tasks 1, 2, 3 must be completed (all agent tracking code must be removed first)
- Otherwise tests will fail due to missing functions

## Output Artifacts
- Modified conflict-detection.integration.test.ts with updated tests
- Passing test suite with appropriate test count

<details>
<summary>Implementation Notes</summary>

**IMPORTANT** Make sure to copy the _Meaningful Test Strategy Guidelines_ section from the plan into this task:

### Meaningful Test Strategy Guidelines

Your critical mantra for test generation is: "write a few tests, mostly integration".

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

---

**Step-by-step approach**:

1. First, read the entire test file to understand its structure:
   ```bash
   wc -l src/__tests__/conflict-detection.integration.test.ts
   ```
   File is 349 lines, review it completely.

2. Identify agent-specific tests:
   - Search for "agent" references in the file
   - Look for tests that create/modify `.claude/agents/` directory
   - Check for tests calling `copyAgentTemplates()` or `createAgentMetadata()`

3. Review each test suite:
   - "First-time initialization" - Likely config-focused, keep
   - "Re-initialization with no changes" - Likely config-focused, keep
   - "Re-initialization with user modifications" - Likely config-focused, keep
   - "Force flag behavior" - Likely config-focused, keep
   - "Corrupted metadata handling" - Likely config-focused, keep
   - "Multiple assistants" - May test agent creation, review carefully
   - "Edge cases" - Likely general, keep

4. For each agent-specific test found:
   - If it ONLY tests agent functionality: Delete entirely
   - If it tests both config and agents: Update to remove agent parts
   - Document what was changed in comments

5. After modifications, run the test suite:
   ```bash
   npm test -- conflict-detection.integration.test.ts
   ```

6. Verify test counts:
   - Original: 119 tests total
   - After removal: Expect slightly fewer (exact number depends on how many agent-specific tests exist)
   - All remaining tests should pass

7. Run full test suite to ensure no cross-test dependencies:
   ```bash
   npm test
   ```

**Likely outcome**: The file probably doesn't have many agent-specific tests since the conflict detection system is generic. Most tests likely focus on the config file tracking workflow which should remain unchanged.
</details>
