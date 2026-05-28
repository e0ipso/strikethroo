---
id: 1
group: "toml-escaping"
dependencies: []
status: "completed"
created: 2025-12-19
skills: ["typescript"]
---

# Task 01: Implement TOML Escape Function Fix

## Objective

Implement context-aware TOML escaping for triple-quoted strings by creating a new escape function and updating the TOML conversion logic in `src/utils.ts`. This fixes the root cause of Gemini command parsing failures.

## Acceptance Criteria

- [ ] New `escapeTomlTripleQuotedString()` function created in `src/utils.ts`
- [ ] Function preserves actual newlines and whitespace in content
- [ ] Function escapes triple-quote sequences (`"""`) to prevent string boundary issues
- [ ] `convertMdToToml()` updated to use new function for content field
- [ ] `escapeTomlString()` remains unchanged for backward compatibility
- [ ] Build succeeds with `npm run build`
- [ ] Existing tests pass with `npm test`

## Technical Requirements

**File to modify**: `src/utils.ts`

**Current problematic code** (around line 177-212):
- `convertMdToToml()` function currently uses `escapeTomlString(processedBody)` to escape content
- `escapeTomlString()` converts newlines to `\n` escape sequences

**What must change**:
1. Create new function `escapeTomlTripleQuotedString(str: string): string`
2. Update line ~209 to use new function
3. Verify TOML specification compliance

<details>
<summary>Implementation Notes</summary>

### Step 1: Create escapeTomlTripleQuotedString function

Insert this function in `src/utils.ts` right after the existing `escapeTomlString` function (after line 170):

```typescript
/**
 * Escape a string for TOML triple-quoted format
 * Triple-quoted strings in TOML do NOT interpret escape sequences,
 * so we preserve newlines and only escape triple-quote boundaries.
 * @param str - The string to escape
 * @returns The escaped string suitable for TOML triple-quoted strings
 */
export function escapeTomlTripleQuotedString(str: string): string {
  // Triple-quoted strings don't interpret escape sequences, so preserve newlines
  // Only escape backslashes at triple-quote boundaries to prevent breaking the delimiters
  return str.replace(/"""/g, '"\\"');  // Replace """ with "\" to break the triple-quote boundary
}
```

Note: This escaping strategy treats `"""` as a potential issue. In practice, template content is unlikely to contain triple quotes, but this defensive approach ensures safety.

### Step 2: Update convertMdToToml function

Find the section around line 208-209 in `convertMdToToml()`:
```typescript
// OLD (line 209):
tomlContent += `content = """${escapeTomlString(processedBody)}"""\n`;

// NEW:
tomlContent += `content = """${escapeTomlTripleQuotedString(processedBody)}"""\n`;
```

### Step 3: Verify the change

After making changes:
1. Build: `npm run build`
2. Run full test suite: `npm test`
3. Check that all tests pass

If any tests fail, they likely need updating based on new TOML output format, but the build itself should succeed.

### Why This Works

TOML has two types of quoted strings:
- **Basic strings** (`"..."`) → Escape sequences like `\n` are interpreted as actual newlines
- **Multi-line basic strings** (`"""..."""`) → Escape sequences are NOT interpreted, so `\n` stays as literal text

By using the triple-quoted string type but NOT escaping newlines, we get:
- Actual newlines in the template content (making markdown formatting work)
- TOML-compliant syntax
- No need to unescape content when Gemini parses the file

### Edge Cases

The only edge case is if template content contains `"""` (triple quotes), which would break the TOML string. Our replacement strategy converts `"""` to `"\"` which maintains validity while being extremely unlikely in practice (task templates don't use triple quotes).

</details>

## Success Validation

Run these commands to verify:
```bash
npm run build  # Should complete successfully
npm test       # All tests should pass
```

## Input Dependencies

- `src/utils.ts` file exists and contains `convertMdToToml` and `escapeTomlString` functions

## Output Artifacts

- Modified `src/utils.ts` with new `escapeTomlTripleQuotedString()` function
- Updated `convertMdToToml()` to use the new function
- TypeScript compilation successful
- All existing tests passing
