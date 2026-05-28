---
id: 2
group: "implementation"
dependencies: [1]
status: "completed"
created: 2025-09-17
skills: ["bash", "regex"]
complexity_score: 4.4
complexity_notes: "Moderate complexity due to regex design and bash integration requirements"
---

# Implement Improved Pattern Matching Logic

## Objective

Replace the overly permissive `plan-*.md` pattern with a precise `plan-[0-9]*--*.md` pattern that only matches properly formatted plan files following the established naming convention.

## Skills Required

- **bash**: Modifying find command patterns and testing bash expressions
- **regex**: Designing and testing regex patterns for file name matching

## Acceptance Criteria

- [ ] New pattern `plan-[0-9]*--*.md` implemented and tested
- [ ] Pattern matches 100% of properly formatted plan files
- [ ] Pattern matches 0% of improperly formatted files
- [ ] Backward compatibility verified with existing plan files
- [ ] Performance impact assessed and documented

## Technical Requirements

The improved pattern must:
- Match files starting with "plan-"
- Followed by one or more digits `[0-9]*`
- Followed by double dashes "--"
- Followed by any characters for the plan name
- Ending with ".md" extension
- Work within the existing find command structure
- Maintain compatibility with both plans and archive directories

## Input Dependencies

- Analysis results from Task 1 (current behavior and test scenarios)
- List of existing plan files for compatibility testing
- Current bash command structure from `create-plan.md:135`

## Output Artifacts

- Updated find command with improved pattern
- Test results showing pattern matching accuracy
- Performance comparison (if applicable)
- Documentation of pattern behavior with examples

## Implementation Notes

<details>
<summary>Detailed implementation guidance</summary>

1. **Pattern Design**:
   - Replace `-name "plan-*.md"` with `-name "plan-[0-9]*--*.md"`
   - Test pattern against existing plan files to ensure compatibility
   - Verify pattern works with both zero-padded and non-padded numbers

2. **Integration Testing**:
   - Update the find command in the existing bash expression
   - Test with various directory scenarios (empty, mixed files, etc.)
   - Ensure the pattern works correctly with the `-exec grep` portion

3. **Validation Against Requirements**:
   - Test that files like `plan-05--user-management.md` match
   - Test that files like `plan-backup.md` or `plan.md` don't match
   - Verify files with different naming patterns are excluded

4. **Performance Considerations**:
   - Compare execution time of old vs new pattern (should be minimal difference)
   - Ensure pattern doesn't introduce performance regressions
   - Document any performance characteristics

5. **Error Handling**:
   - Ensure pattern fails gracefully if no files match
   - Test behavior with symbolic links or unusual file systems
   - Verify compatibility across different bash versions

6. **Command Structure**:
   ```bash
   # Current (problematic):
   find .ai/task-manager/{plans,archive} -name "plan-*.md" -exec grep "^id:" {} \;

   # New (improved):
   find .ai/task-manager/{plans,archive} -name "plan-[0-9]*--*.md" -exec grep "^id:" {} \;
   ```
</details>