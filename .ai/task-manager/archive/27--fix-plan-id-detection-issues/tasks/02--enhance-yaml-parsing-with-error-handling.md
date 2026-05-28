---
id: 2
group: "yaml-parsing"
dependencies: [1]
status: "completed"
created: "2025-09-26"
skills:
  - "nodejs"
---

# Enhance YAML Parsing with Error Handling

## Objective

Enhance the `extractIdFromFrontmatter()` function to robustly parse YAML frontmatter with comprehensive error handling, debug logging, and support for real-world formatting variations, replacing silent failures with clear error reporting.

## Skills Required

- **nodejs**: Regular expressions, string parsing, error handling, and Node.js logging patterns

## Acceptance Criteria

- [ ] Support flexible regex patterns for ID extraction (quoted/unquoted values, spacing variations)
- [ ] Handle edge cases: mixed quote types, extra whitespace, malformed YAML
- [ ] Log parsing failures with descriptive messages instead of silently returning null
- [ ] Implement optional verbose mode for troubleshooting (`DEBUG=true` environment variable)
- [ ] Provide fallback mechanisms when frontmatter parsing fails
- [ ] Validate detected IDs against expected numeric formats
- [ ] Add structured error logging for file system and parsing failures

## Technical Requirements

**Target File**: `templates/ai-task-manager/config/scripts/get-next-plan-id.cjs`
**Function to Modify**: `extractIdFromFrontmatter()` (lines 36-65)
**Core Enhancements**: Expand regex patterns, add error logging, implement debug mode

The function must:
- Support additional YAML formats: `id: 5`, `id: "5"`, `id: '5'`, `"id": 5`, `'id': 5`, with various spacing
- Handle malformed YAML gracefully without crashing
- Log parsing attempts and failures when `DEBUG=true`
- Provide descriptive error messages for common parsing failures
- Return structured results with success/failure status

## Input Dependencies

- Modified `findTaskManagerRoot()` function from Task 1
- Current `extractIdFromFrontmatter()` function as starting point

## Output Artifacts

- Enhanced `extractIdFromFrontmatter()` function with robust parsing
- Comprehensive error logging throughout the script
- Optional debug mode for troubleshooting parsing issues
- Clear error messages replacing silent failures

## Implementation Notes

<details>
<summary>Detailed Implementation Guidelines</summary>

**Enhanced Regex Patterns:**
```javascript
const patterns = [
  /^\s*[\"']?id[\"']?\s*:\s*[\"']?(\d+)[\"']?\s*$/m,  // Most flexible
  /^\s*id\s*:\s*(\d+)\s*$/m,                         // Simple numeric
  /^\s*id\s*:\s*\"(\d+)\"\s*$/m,                     // Double quoted
  /^\s*id\s*:\s*'(\d+)'\s*$/m,                       // Single quoted
  /^\s*\"id\"\s*:\s*(\d+)\s*$/m,                     // JSON-style key
  /^\s*'id'\s*:\s*(\d+)\s*$/m,                       // Single quoted key
];
```

**Error Logging Implementation:**
```javascript
function logDebug(message, data = null) {
  if (process.env.DEBUG === 'true') {
    console.error(`[DEBUG] ${message}`, data ? JSON.stringify(data, null, 2) : '');
  }
}

function logError(message, data = null) {
  console.error(`[ERROR] ${message}`, data ? JSON.stringify(data, null, 2) : '');
}
```

**Enhanced Function Structure:**
```javascript
function extractIdFromFrontmatter(content) {
  const frontmatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!frontmatterMatch) {
    logDebug('No frontmatter found in content');
    return null;
  }

  const frontmatterText = frontmatterMatch[1];
  logDebug('Extracting ID from frontmatter', { frontmatter: frontmatterText });

  for (const pattern of patterns) {
    const match = frontmatterText.match(pattern);
    if (match) {
      const id = parseInt(match[1], 10);
      if (!isNaN(id)) {
        logDebug('Successfully extracted ID', { id, pattern: pattern.toString() });
        return id;
      }
    }
  }

  logError('Failed to extract valid ID from frontmatter', { frontmatter: frontmatterText });
  return null;
}
```

**Error Handling in Main Function:**
- Add try-catch blocks around file reading operations
- Log file system errors with file paths and error details
- Provide suggestions for common issues (permissions, missing files)
- Validate final ID results before returning

**Debug Mode Features:**
- Log directory traversal steps
- Log each file being processed
- Log regex pattern matching attempts
- Log final ID calculation results
</details>