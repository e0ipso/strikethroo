---
id: 4
group: "implementation"
dependencies: [3]
status: "completed"
created: 2025-09-17
skills: ["bash"]
complexity_score: 4.6
complexity_notes: "Moderate-high complexity due to comprehensive error handling requirements"
---

# Enhance Error Handling and Parsing

## Objective

Improve the sed command parsing and add comprehensive error handling for edge cases including empty directories, corrupted files, and various whitespace patterns in YAML frontmatter.

## Skills Required

- **bash**: Advanced bash scripting for error handling, fallback logic, and robust parsing

## Acceptance Criteria

- [ ] Improved sed command handles various whitespace patterns around `id:` field
- [ ] Fallback logic returns sensible default (ID 1) when no valid plans found
- [ ] Error handling for empty directories, corrupted files, and parsing failures
- [ ] Robust numeric sorting and ID increment logic
- [ ] Graceful handling of edge cases without command failure

## Technical Requirements

The enhanced error handling must address:
- Empty directories (both plans and archive) returning appropriate default
- Corrupted or incomplete files that cause parsing errors
- Various whitespace patterns: `id: 5`, `id:5`, `id:  5`, `id:\t5`
- Missing or malformed frontmatter
- Non-numeric ID values that slip through validation
- Proper numeric sorting of extracted IDs
- Safe increment logic that handles edge cases

## Input Dependencies

- Validation layer implementation from Task 3
- Pattern matching improvements from Task 2
- Edge case analysis from Task 1

## Output Artifacts

- Enhanced sed command with robust whitespace handling
- Fallback logic for empty result scenarios
- Comprehensive error handling integrated into bash command
- Test results demonstrating error resilience

## Implementation Notes

<details>
<summary>Detailed implementation guidance</summary>

1. **Improved sed Command**:
   - Current: `sed 's/id: *//'`
   - Enhanced: `sed 's/^id:[[:space:]]*//'` to handle tabs and multiple spaces
   - Alternative: `sed -E 's/^id:[[:space:]]*([0-9]+).*/\1/'` for more precision
   - Test with various whitespace patterns

2. **Fallback Logic Implementation**:
   ```bash
   # Current problematic approach:
   sed 's/^$/0/'

   # Enhanced approach with better fallback:
   { echo "0"; } | tail -1  # Ensures there's always a value
   ```

3. **Empty Directory Handling**:
   - Ensure command returns 1 when no plan files exist
   - Handle cases where find returns no results
   - Verify behavior when directories don't exist

4. **Parsing Error Recovery**:
   - Handle non-numeric values that might be extracted
   - Ensure sort -n works correctly with potentially mixed input
   - Add validation that final result is indeed numeric

5. **Complete Enhanced Command Structure**:
   ```bash
   echo $(($(
     find .ai/task-manager/{plans,archive} -name "plan-[0-9]*--*.md" 2>/dev/null \
       -exec grep "^id:[[:space:]]*[0-9]" {} \; | \
     sed -E 's/^id:[[:space:]]*([0-9]+).*/\1/' | \
     sort -n | tail -1 | \
     { read id; echo "${id:-0}"; }
   ) + 1))
   ```

6. **Edge Case Testing**:
   - Empty plans and archive directories
   - Files with corrupted YAML frontmatter
   - Files with non-numeric IDs (should be filtered by validation)
   - Mixed numeric and string content in ID fields
   - Very large ID numbers (integer overflow protection)

7. **Error Logging and Debugging**:
   - Consider adding debug output for troubleshooting
   - Ensure errors don't break the command but are handled gracefully
   - Document expected behavior for each error condition

8. **Performance and Reliability**:
   - Test command performance with large numbers of plan files
   - Ensure reliable operation across different bash versions
   - Verify behavior on different file systems and operating systems
</details>