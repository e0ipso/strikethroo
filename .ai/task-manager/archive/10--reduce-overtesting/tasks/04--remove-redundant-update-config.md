---
id: 4
group: "cleanup"
dependencies: [2, 3]
status: "completed"
created: "2025-09-03"
---

# Task 004: Remove Redundant Test Files and Update Configuration

## Objective
Delete unnecessary test files, update Jest configuration for optimal performance, and ensure the test suite runs efficiently with the new consolidated structure.

## Acceptance Criteria
- [ ] Remove unnecessary test files (logger, toml-validation, toml-integration, index.test.ts)
- [ ] Update jest.config.js for faster execution
- [ ] Test suite runs in under 5 seconds total
- [ ] Coverage thresholds adjusted appropriately
- [ ] All tests pass with the new configuration

## Technical Requirements
- Delete files:
  - `src/__tests__/logger.test.ts`
  - `src/__tests__/toml-validation.test.ts`
  - `src/__tests__/toml-integration.test.ts`
  - `src/__tests__/index.test.ts`
- Update `jest.config.js`:
  - Optimize for speed (adjust maxWorkers, coverage settings)
  - Update coverage thresholds to match new test philosophy
  - Remove unnecessary configuration
- Verify test execution time meets targets

## Input Dependencies
- Completed new test files from Tasks 002 and 003
- Working consolidated test suite

## Output Artifacts
- Cleaned test directory with only 2 test files
- Optimized jest.config.js
- Test execution time under 5 seconds

## Implementation Notes
- Run tests before and after deletion to ensure nothing breaks
- Consider keeping deleted tests in a backup branch temporarily
- Adjust coverage thresholds to ~70% for critical paths only
- Remove any test-specific configuration that's no longer needed