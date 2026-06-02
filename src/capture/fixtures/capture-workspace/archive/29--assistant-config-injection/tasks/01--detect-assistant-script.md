---
id: 1
group: "configuration-detection"
dependencies: []
status: "completed"
created: "2025-10-08"
skills:
  - nodejs
---
# Create Assistant Detection Script

## Objective
Create a CommonJS script that detects the currently running AI assistant (Claude, Gemini, OpenCode, or Cursor) based on environment variables and directory presence, outputting a single identifier string.

## Skills Required
- **nodejs**: CommonJS script development with fs, path, and os modules; environment variable detection

## Acceptance Criteria
- [ ] Script created at `templates/ai-task-manager/config/scripts/detect-assistant.cjs`
- [ ] Environment variable detection works (CLAUDECODE → claude)
- [ ] Directory presence fallback works (.claude/ → claude, .gemini/ → gemini, etc.)
- [ ] Returns 'unknown' when no assistant detected
- [ ] Includes DEBUG environment variable support for logging
- [ ] Outputs single line to stdout with assistant identifier
- [ ] Handles errors gracefully without crashing

Use your internal Todo tool to track these and keep on track.

## Technical Requirements
- **File location**: `templates/ai-task-manager/config/scripts/detect-assistant.cjs`
- **Detection hierarchy**:
  1. Environment variables (highest priority): `CLAUDECODE`, `GEMINI_CODE`, `OPENCODE`, `CURSOR`
  2. Directory presence (fallback): `.claude/`, `.gemini/`, `.opencode/`, `.cursor/`
  3. Default: return `unknown`
- **Output format**: Single line string (`claude`, `gemini`, `opencode`, `cursor`, or `unknown`)
- **Debug logging**: Use `process.env.DEBUG === 'true'` for debug output to stderr
- **Error handling**: Follow patterns from `get-next-plan-id.cjs`

## Input Dependencies
None - this is a foundational script

## Output Artifacts
- `templates/ai-task-manager/config/scripts/detect-assistant.cjs` - executable CommonJS script
- Output: assistant identifier string for consumption by other scripts

## Implementation Notes

<details>
<summary>Detailed Implementation Guide</summary>

### Script Structure

```javascript
#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const DEBUG = process.env.DEBUG === 'true';

function debugLog(message, ...args) {
  if (DEBUG) {
    console.error(`[DEBUG] ${message}`, ...args);
  }
}

function detectAssistant() {
  // 1. Check environment variables (highest priority)
  if (process.env.CLAUDECODE) {
    debugLog('Detected Claude via CLAUDECODE environment variable');
    return 'claude';
  }

  if (process.env.GEMINI_CODE) {
    debugLog('Detected Gemini via GEMINI_CODE environment variable');
    return 'gemini';
  }

  if (process.env.OPENCODE) {
    debugLog('Detected OpenCode via OPENCODE environment variable');
    return 'opencode';
  }

  if (process.env.CURSOR) {
    debugLog('Detected Cursor via CURSOR environment variable');
    return 'cursor';
  }

  // 2. Check directory presence (fallback)
  const cwd = process.cwd();

  const assistantDirs = [
    { name: 'claude', dir: '.claude' },
    { name: 'gemini', dir: '.gemini' },
    { name: 'opencode', dir: '.opencode' },
    { name: 'cursor', dir: '.cursor' }
  ];

  for (const { name, dir } of assistantDirs) {
    const dirPath = path.join(cwd, dir);
    try {
      if (fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory()) {
        debugLog(`Detected ${name} via ${dir}/ directory presence`);
        return name;
      }
    } catch (err) {
      debugLog(`Error checking ${dir}/: ${err.message}`);
    }
  }

  // 3. Default: unknown
  debugLog('No assistant detected, returning unknown');
  return 'unknown';
}

// Main execution
try {
  const assistant = detectAssistant();
  console.log(assistant);
  process.exit(0);
} catch (error) {
  console.error(`[ERROR] Failed to detect assistant: ${error.message}`);
  console.log('unknown');
  process.exit(0); // Still exit 0 for graceful degradation
}
```

### Key Implementation Points

1. **Shebang**: Include `#!/usr/bin/env node` at the top
2. **Environment variables first**: Check CLAUDECODE, GEMINI_CODE, OPENCODE, CURSOR in order
3. **Directory fallback**: Check for `.claude/`, `.gemini/`, `.opencode/`, `.cursor/` directories in current working directory
4. **Error handling**: Wrap file system checks in try-catch
5. **Debug mode**: Use `DEBUG=true` environment variable for troubleshooting
6. **Graceful exit**: Always return a value (unknown if nothing detected), never crash
7. **Single output line**: Only stdout should contain the assistant identifier

### Testing

```bash
# Test with environment variable
CLAUDECODE=1 node templates/ai-task-manager/config/scripts/detect-assistant.cjs
# Expected: claude

# Test with debug
DEBUG=true node templates/ai-task-manager/config/scripts/detect-assistant.cjs
# Expected: debug messages to stderr, assistant name to stdout

# Test unknown
cd /tmp && node /path/to/detect-assistant.cjs
# Expected: unknown
```

</details>
