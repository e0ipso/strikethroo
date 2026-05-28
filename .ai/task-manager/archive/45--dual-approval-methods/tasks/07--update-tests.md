---
id: 7
group: "testing"
dependencies: [2]
status: "completed"
created: "2025-10-20"
skills:
  - jest
  - typescript
---
# Update set-approval-method Test Coverage

## Objective

Update the test suite for `set-approval-method.cjs` to cover the new third parameter functionality, ensuring both `approval_method_plan` and `approval_method_tasks` fields can be updated correctly.

## Skills Required

- **jest**: Jest testing framework and assertions
- **typescript**: TypeScript test file syntax and types

## Acceptance Criteria

- [ ] Tests for updating `approval_method_plan` field
- [ ] Tests for updating `approval_method_tasks` field
- [ ] Test for default behavior (no third parameter defaults to `plan`)
- [ ] Test for invalid field type error handling
- [ ] Tests for backward compatibility
- [ ] All existing tests still pass
- [ ] Test coverage maintained or improved

Use your internal Todo tool to track these and keep on track.

## Technical Requirements

**File to update:** `src/__tests__/set-approval-method.test.ts`

**New test scenarios:**

1. **Test updating approval_method_plan:**
   - Call script with field type `plan`
   - Verify `approval_method_plan` field is updated
   - Verify other fields unchanged

2. **Test updating approval_method_tasks:**
   - Call script with field type `tasks`
   - Verify `approval_method_tasks` field is updated
   - Verify other fields unchanged

3. **Test default field type:**
   - Call script without third parameter
   - Verify `approval_method_plan` is updated (default behavior)
   - Confirms backward compatibility

4. **Test invalid field type:**
   - Call script with invalid field type (e.g., `invalid`)
   - Verify error is thrown
   - Verify error message is clear

5. **Test both fields coexist:**
   - Create plan with both fields
   - Update one, verify other unchanged
   - Update other, verify first unchanged

## Input Dependencies

- Task 2 (script enhancement) must be complete as we're testing that implementation
- Script must be implemented with new functionality before tests can be written

## Output Artifacts

Updated `set-approval-method.test.ts` that:
- Covers all new functionality
- Maintains existing test coverage
- Follows project testing patterns
- Ensures quality and correctness

## Implementation Notes

<details>
<summary>Detailed Implementation Steps</summary>

1. **Review current tests:**
   ```bash
   # File location
   src/__tests__/set-approval-method.test.ts
   ```

2. **Understand existing test structure:**
   - Review how tests are organized
   - Note setup/teardown patterns
   - Identify helper functions
   - Check how temp files are created

3. **Add test for plan field:**
   ```typescript
   describe('field type parameter', () => {
     it('should update approval_method_plan when field type is "plan"', () => {
       // Create temp file with frontmatter
       const tempFile = createTempPlanFile({
         id: 1,
         summary: 'Test plan',
         created: '2025-01-01',
         approval_method_plan: 'manual',
         approval_method_tasks: 'manual'
       });

       // Execute script with 'plan' field type
       execSync(`node set-approval-method.cjs ${tempFile} auto plan`);

       // Read result
       const content = fs.readFileSync(tempFile, 'utf8');
       const frontmatter = extractFrontmatter(content);

       // Assertions
       expect(frontmatter.approval_method_plan).toBe('auto');
       expect(frontmatter.approval_method_tasks).toBe('manual'); // unchanged
     });
   });
   ```

4. **Add test for tasks field:**
   ```typescript
   it('should update approval_method_tasks when field type is "tasks"', () => {
     const tempFile = createTempPlanFile({
       id: 1,
       summary: 'Test plan',
       created: '2025-01-01',
       approval_method_plan: 'manual',
       approval_method_tasks: 'manual'
     });

     execSync(`node set-approval-method.cjs ${tempFile} auto tasks`);

     const content = fs.readFileSync(tempFile, 'utf8');
     const frontmatter = extractFrontmatter(content);

     expect(frontmatter.approval_method_tasks).toBe('auto');
     expect(frontmatter.approval_method_plan).toBe('manual'); // unchanged
   });
   ```

5. **Add test for default behavior:**
   ```typescript
   it('should default to "plan" field type when not specified', () => {
     const tempFile = createTempPlanFile({
       id: 1,
       summary: 'Test plan',
       created: '2025-01-01',
       approval_method_plan: 'manual',
       approval_method_tasks: 'manual'
     });

     // No third parameter
     execSync(`node set-approval-method.cjs ${tempFile} auto`);

     const content = fs.readFileSync(tempFile, 'utf8');
     const frontmatter = extractFrontmatter(content);

     // Should update plan field by default
     expect(frontmatter.approval_method_plan).toBe('auto');
     expect(frontmatter.approval_method_tasks).toBe('manual');
   });
   ```

6. **Add test for invalid field type:**
   ```typescript
   it('should throw error for invalid field type', () => {
     const tempFile = createTempPlanFile({
       id: 1,
       summary: 'Test plan',
       created: '2025-01-01'
     });

     expect(() => {
       execSync(`node set-approval-method.cjs ${tempFile} auto invalid`);
     }).toThrow(/Field type must be "plan" or "tasks"/);
   });
   ```

7. **Add test for field creation:**
   ```typescript
   it('should create approval_method_plan field if missing', () => {
     const tempFile = createTempPlanFile({
       id: 1,
       summary: 'Test plan',
       created: '2025-01-01'
       // no approval fields
     });

     execSync(`node set-approval-method.cjs ${tempFile} auto plan`);

     const content = fs.readFileSync(tempFile, 'utf8');
     const frontmatter = extractFrontmatter(content);

     expect(frontmatter.approval_method_plan).toBe('auto');
   });

   it('should create approval_method_tasks field if missing', () => {
     const tempFile = createTempPlanFile({
       id: 1,
       summary: 'Test plan',
       created: '2025-01-01'
       // no approval fields
     });

     execSync(`node set-approval-method.cjs ${tempFile} auto tasks`);

     const content = fs.readFileSync(tempFile, 'utf8');
     const frontmatter = extractFrontmatter(content);

     expect(frontmatter.approval_method_tasks).toBe('auto');
   });
   ```

8. **Update existing tests if needed:**
   - Check if any existing tests reference the old `approval_method` field
   - Update them to use `approval_method_plan` or `approval_method_tasks` as appropriate
   - Ensure test helper functions support both fields

9. **Run tests:**
   ```bash
   npm test -- set-approval-method.test.ts
   ```

10. **Verify coverage:**
    - Check that all new code paths are covered
    - Ensure no regressions in existing functionality
    - Validate error handling paths

11. **Follow project patterns:**
    - Match existing code style and formatting
    - Use consistent naming conventions
    - Follow established test organization
    - Include descriptive test names

</details>
