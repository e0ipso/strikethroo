---
id: 1
group: "core-fix"
dependencies: []
status: "completed"
created: 2025-11-10
skills:
  - javascript
  - nodejs
---
# Refactor findPlanDirectory Function for Flexible Plan ID Matching

## Objective

Enhance the `findPlanDirectory` function in `templates/ai-task-manager/config/scripts/check-task-dependencies.cjs` to accept both padded (e.g., `03`) and unpadded (e.g., `3`) plan IDs, matching the robust ID handling already implemented in the `findTaskFile` function.

## Skills Required

- **JavaScript/Node.js**: Modify the existing function to handle ID variations
- **Shell command execution**: Work with `execSync` and `find` commands

## Acceptance Criteria

- [ ] Function accepts unpadded plan IDs (e.g., `3`) and correctly finds `03--*` directories
- [ ] Function continues to accept padded plan IDs (e.g., `03`) without regression
- [ ] Implementation mirrors the pattern used in `findTaskFile` function (lines 65-125)
- [ ] Early return optimization on first successful match
- [ ] All existing error handling preserved

Use your internal Todo tool to track these and keep on track.

## Technical Requirements

**File to modify**: `templates/ai-task-manager/config/scripts/check-task-dependencies.cjs`

**Function location**: Lines 52-63

**Implementation strategy**:
1. Define search locations array (`plans/` and `archive/`)
2. Create ID variations array (exact, padded, unpadded)
3. Iterate through variations and locations
4. Return first successful match
5. Return `null` if no matches found

**Reference implementation** (adapt from `findTaskFile`):
- Lines 65-125 demonstrate the ID normalization pattern
- Use `padStart(2, '0')` for padding
- Use `replace(/^0+/, '') || '0'` for unpadding

## Input Dependencies

None - this is the foundational fix.

## Output Artifacts

- Modified `findPlanDirectory` function with flexible ID matching
- Maintains backward compatibility with all existing callers

## Implementation Notes

<details>
<summary>Detailed implementation guidance</summary>

### Current Implementation (lines 52-63)

```javascript
const findPlanDirectory = (planId) => {
    try {
        // Use find command similar to bash script
        const findCommand = `find .ai/task-manager/plans .ai/task-manager/archive -type d -name "${planId}--*" 2>/dev/null || true`;
        const result = execSync(findCommand, { encoding: 'utf8' }).trim();
        const directories = result.split('\n').filter(dir => dir.length > 0);
        return directories.length > 0 ? directories[0] : null;
    } catch (error) {
        return null;
    }
};
```

**Issue**: Only searches for exact `planId` match. If `planId` is `3`, looks for `3--*` but actual directory is `03--*`.

### Target Implementation

```javascript
const findPlanDirectory = (planId) => {
    const searchLocations = [
        '.ai/task-manager/plans',
        '.ai/task-manager/archive'
    ];

    // Generate ID variations to try
    const idVariations = [
        planId,                           // 1. Try exact match first
        planId.padStart(2, '0'),          // 2. Try padded version (3 → 03)
        planId.replace(/^0+/, '') || '0'  // 3. Try unpadded version (03 → 3)
    ];

    // Remove duplicates from variations array
    const uniqueVariations = [...new Set(idVariations)];

    // Search for each variation in each location
    for (const id of uniqueVariations) {
        for (const location of searchLocations) {
            try {
                const findCommand = `find ${location} -type d -name "${id}--*" 2>/dev/null || true`;
                const result = execSync(findCommand, { encoding: 'utf8' }).trim();
                const directories = result.split('\n').filter(dir => dir.length > 0);

                if (directories.length > 0) {
                    return directories[0]; // Early return on first match
                }
            } catch (error) {
                // Continue trying other variations/locations
                continue;
            }
        }
    }

    return null; // No matches found
};
```

### Key Implementation Details

1. **Search order matters**: Try exact match first for performance (most common case)
2. **Remove duplicates**: If `planId` is `03`, both `planId` and `padStart(2, '0')` produce `03` - use `Set` to avoid redundant searches
3. **Early return**: Return immediately on first match to minimize unnecessary `find` operations
4. **Error handling**: Continue to next variation if `execSync` throws (maintains robustness)
5. **Backward compatibility**: All existing working calls remain functional

### Testing Strategy

After implementation, test with:

```bash
# Test with unpadded ID (currently fails, should pass after fix)
node .ai/task-manager/config/scripts/check-task-dependencies.cjs 3 1

# Test with padded ID (currently works, should still work)
node .ai/task-manager/config/scripts/check-task-dependencies.cjs 03 1

# Verify both produce identical output
```

### Edge Cases to Consider

- **Single-digit IDs**: `3` should find `03--*`
- **Double-digit IDs**: `10` should find `10--*` (padding has no effect)
- **Leading zeros**: `003` should find `03--*` (unpadding removes extra zeros)
- **Zero ID**: `0` or `00` should find `00--*` (special case in unpadding logic)

</details>
