---
id: 1
group: "core-fix"
dependencies: []
status: "completed"
created: 2025-11-09
skills:
  - javascript
  - regex
---
# Update Plan ID Matching Logic in validate-plan-blueprint.cjs

## Objective

Modify the validate-plan-blueprint.cjs script to match plan directories and files using numeric comparison instead of exact string matching, allowing both zero-padded (e.g., "02") and non-padded (e.g., "2") plan IDs to work correctly.

## Skills Required

- **JavaScript**: Node.js scripting, parseInt operations, conditional logic
- **Regular Expressions**: Pattern matching for extracting numeric IDs from directory/file names

## Acceptance Criteria

- [ ] Directory matching (line 115) uses numeric comparison with zero-stripping regex
- [ ] File matching (line 124) uses numeric comparison with zero-stripping regex
- [ ] Invalid plan IDs (non-numeric) are handled gracefully without crashes
- [ ] Debug logging shows the numeric comparison logic in action
- [ ] Script accepts both "2" and "02" for the same plan
- [ ] All existing functionality remains unchanged

Use your internal Todo tool to track these and keep on track.

## Technical Requirements

**File to modify**: `.ai/task-manager/config/scripts/validate-plan-blueprint.cjs`

**Lines to update**:
- Line 115: Directory pattern matching
- Line 124: File pattern matching

**Pattern to implement** (based on get-next-plan-id.cjs):
```javascript
// Convert input to numeric
const numericPlanId = parseInt(planId, 10);

// Extract numeric ID from directory/file name
const match = name.match(/^0*(\d+)--/);
if (match) {
  const numericId = parseInt(match[1], 10);
  // Compare numerically
  if (numericId === numericPlanId) {
    // Match found
  }
}
```

**Validation**:
- Check if `parseInt(planId, 10)` returns a valid number (not NaN)
- Add appropriate error handling for invalid inputs

## Input Dependencies

- Current validate-plan-blueprint.cjs implementation (lines 87-148)
- Existing regex pattern from get-next-plan-id.cjs for reference

## Output Artifacts

- Updated validate-plan-blueprint.cjs with flexible ID matching
- Enhanced debug logging showing numeric comparison

## Implementation Notes

<details>
<summary>Detailed Implementation Guide</summary>

### Step 1: Add Input Validation

At the start of `findPlanById()` function (after line 95), add:

```javascript
// Convert planId to numeric for flexible matching
const numericPlanId = parseInt(planId, 10);

if (isNaN(numericPlanId)) {
  errorLog(`Invalid plan ID: ${planId}. Plan ID must be numeric.`);
  return null;
}

debugLog(`Searching for plan with numeric ID: ${numericPlanId} (input was: ${planId})`);
```

### Step 2: Update Directory Matching (Line 115)

Replace:
```javascript
if (entry.isDirectory() && entry.name.match(new RegExp(`^${planId}--`))) {
```

With:
```javascript
if (entry.isDirectory()) {
  // Extract numeric ID from directory name, stripping leading zeros
  const dirMatch = entry.name.match(/^0*(\d+)--/);
  if (dirMatch && parseInt(dirMatch[1], 10) === numericPlanId) {
```

Don't forget to add a closing brace at the appropriate location.

### Step 3: Update File Matching (Line 124)

Replace:
```javascript
if (planEntry.isFile() && planEntry.name.match(new RegExp(`^plan-${planId}--.*\\.md$`))) {
```

With:
```javascript
if (planEntry.isFile()) {
  // Extract numeric ID from filename, stripping leading zeros
  const fileMatch = planEntry.name.match(/^plan-0*(\d+)--.*\.md$/);
  if (fileMatch && parseInt(fileMatch[1], 10) === numericPlanId) {
```

Add a closing brace at the appropriate location.

### Step 4: Update Debug Logging

Add debug statements to show the matching logic:

```javascript
debugLog(`Comparing directory ${entry.name}: extracted ID ${dirMatch[1]} vs input ${numericPlanId}`);
debugLog(`Comparing file ${planEntry.name}: extracted ID ${fileMatch[1]} vs input ${numericPlanId}`);
```

### Step 5: Handle Edge Cases

Ensure that:
- Non-matching directories/files continue to be skipped without errors
- The control flow properly closes all conditional blocks
- Error messages remain clear and helpful

### Testing Approach

Manual testing commands:
```bash
# Test with non-padded ID
node .ai/task-manager/config/scripts/validate-plan-blueprint.cjs 2 planFile

# Test with padded ID
node .ai/task-manager/config/scripts/validate-plan-blueprint.cjs 02 planFile

# Test with debug logging
DEBUG=true node .ai/task-manager/config/scripts/validate-plan-blueprint.cjs 2 planFile

# Test with invalid ID
node .ai/task-manager/config/scripts/validate-plan-blueprint.cjs abc planFile
```

Expected results:
- Both "2" and "02" successfully find plan ID 2
- Invalid IDs produce clear error messages
- Debug output shows numeric comparison logic
</details>
