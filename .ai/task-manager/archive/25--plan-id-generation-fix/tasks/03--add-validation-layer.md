---
id: 3
group: "implementation"
dependencies: [2]
status: "completed"
created: 2025-09-17
skills: ["bash", "yaml-parsing"]
complexity_score: 5.5
complexity_notes: "Higher complexity due to YAML validation requirements and edge case handling"
---

# Add Frontmatter Validation Layer

## Objective

Implement a validation layer that ensures matched files contain valid YAML frontmatter with numeric `id:` fields before attempting ID extraction, preventing errors from malformed or missing frontmatter.

## Skills Required

- **bash**: Implementing validation logic within bash command chains
- **yaml-parsing**: Understanding YAML frontmatter structure and validation requirements

## Acceptance Criteria

- [ ] Validation logic correctly identifies files with valid YAML frontmatter
- [ ] Only files with numeric `id:` fields are processed for ID extraction
- [ ] Malformed or missing frontmatter files are gracefully skipped
- [ ] Validation works with various whitespace patterns around `id:` field
- [ ] No performance degradation from validation overhead

## Technical Requirements

The validation layer must:
- Verify presence of YAML frontmatter delimiters (`---`)
- Confirm existence of `id:` field within frontmatter
- Validate that the `id:` value is numeric
- Handle various whitespace patterns: `id: 5`, `id:5`, `id:  5`
- Skip files that fail validation without causing command failure
- Integrate seamlessly with existing grep and sed operations

## Input Dependencies

- Improved pattern matching from Task 2
- Test scenarios and failure modes from Task 1
- Understanding of current ID extraction mechanism

## Output Artifacts

- Validation logic integrated into the bash command
- Test results showing validation effectiveness
- Documentation of validation criteria and behavior
- Examples of handled edge cases

## Implementation Notes

<details>
<summary>Detailed implementation guidance</summary>

1. **YAML Frontmatter Validation**:
   - Add check for frontmatter delimiters: files should start with `---`
   - Verify `id:` field exists within the frontmatter section
   - Use grep or awk to validate frontmatter structure before ID extraction

2. **Numeric ID Validation**:
   - Ensure extracted ID values are numeric (not strings or other types)
   - Handle various formats: `id: 5`, `id: "5"`, with different whitespace
   - Skip files where ID extraction would fail or return non-numeric values

3. **Integration Strategy**:
   - Option 1: Pre-filter files with validation before ID extraction
   - Option 2: Validate during ID extraction and skip invalid entries
   - Choose approach that maintains command simplicity and performance

4. **Validation Implementation Examples**:
   ```bash
   # Pre-filter approach:
   find ... -name "plan-[0-9]*--*.md" -exec sh -c '
     head -n 5 "$1" | grep -q "^---" &&
     head -n 20 "$1" | grep -q "^id: *[0-9]*$" &&
     grep "^id:" "$1"
   ' _ {} \;

   # Or inline validation:
   find ... -name "plan-[0-9]*--*.md" -exec grep "^id: *[0-9]*$" {} \;
   ```

5. **Edge Case Handling**:
   - Files with `id:` in content body (not frontmatter)
   - Files with multiple `id:` fields
   - Files with quoted vs unquoted numeric IDs
   - Files with YAML syntax errors

6. **Performance Optimization**:
   - Limit frontmatter checks to first few lines of files
   - Use efficient grep patterns to minimize file processing
   - Consider combining validation with existing grep operation

7. **Error Recovery**:
   - Ensure validation failure doesn't break the entire command
   - Provide graceful degradation when validation can't be performed
   - Log or handle cases where validation logic itself fails
</details>