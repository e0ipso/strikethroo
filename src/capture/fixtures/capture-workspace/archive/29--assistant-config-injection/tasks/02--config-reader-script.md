---
id: 2
group: "configuration-detection"
dependencies: [1]
status: "completed"
created: "2025-10-08"
skills:
  - nodejs
---
# Create Configuration Reader Script

## Objective
Create a CommonJS script that reads global and project-level configuration files for a given assistant, concatenating them with clear section markers and handling missing files gracefully.

## Skills Required
- **nodejs**: File reading with fs module, path resolution with os.homedir(), UTF-8 encoding, error handling

## Acceptance Criteria
- [ ] Script created at `templates/ai-task-manager/config/scripts/read-assistant-config.cjs`
- [ ] Accepts assistant identifier as command-line argument
- [ ] Reads global config files from home directory (~/.claude/CLAUDE.md, etc.)
- [ ] Reads project-level config files (AGENTS.md, .gemini/styleguide.md, etc.)
- [ ] Outputs concatenated configuration with section markers
- [ ] Handles missing files gracefully (skip with debug message, don't error)
- [ ] Supports DEBUG environment variable for troubleshooting
- [ ] Works cross-platform (Linux, macOS, Windows)

Use your internal Todo tool to track these and keep on track.

## Technical Requirements
- **File location**: `templates/ai-task-manager/config/scripts/read-assistant-config.cjs`
- **Input**: Assistant identifier as first command-line argument (`process.argv[2]`)
- **Configuration paths per assistant**:
  - **Claude**: Global `~/.claude/CLAUDE.md`, Project `AGENTS.md` or `CLAUDE.md`
  - **Gemini**: Global `~/.gemini/GEMINI.md`, Project `.gemini/styleguide.md`
  - **OpenCode**: Global `~/.opencode/OPENCODE.md`, Project `AGENTS.md` or `OPENCODE.md`
  - **Cursor**: Global `~/.cursor/rules/index.mdc`, Project `.cursor/index.mdc`
- **Cross-platform**: Use `os.homedir()` for home directory detection
- **Encoding**: Read files with UTF-8 encoding
- **Output format**: Markdown with section headers

## Input Dependencies
- Task 1 (detect-assistant.cjs) must exist to test integration
- Requires `os`, `fs`, and `path` Node.js built-in modules

## Output Artifacts
- `templates/ai-task-manager/config/scripts/read-assistant-config.cjs` - executable CommonJS script
- Output: Concatenated configuration content to stdout

## Implementation Notes

<details>
<summary>Detailed Implementation Guide</summary>

### Script Structure

```javascript
#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');

const DEBUG = process.env.DEBUG === 'true';

function debugLog(message, ...args) {
  if (DEBUG) {
    console.error(`[DEBUG] ${message}`, ...args);
  }
}

// Configuration path mapping
const CONFIG_PATHS = {
  claude: {
    global: [path.join(os.homedir(), '.claude', 'CLAUDE.md')],
    project: ['AGENTS.md', 'CLAUDE.md']
  },
  gemini: {
    global: [path.join(os.homedir(), '.gemini', 'GEMINI.md')],
    project: ['.gemini/styleguide.md']
  },
  opencode: {
    global: [path.join(os.homedir(), '.opencode', 'OPENCODE.md')],
    project: ['AGENTS.md', 'OPENCODE.md']
  },
  cursor: {
    global: [path.join(os.homedir(), '.cursor', 'rules', 'index.mdc')],
    project: ['.cursor/index.mdc']
  }
};

function readConfigFile(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      debugLog(`Successfully read config file: ${filePath}`);
      return content.trim();
    } else {
      debugLog(`Config file not found: ${filePath}`);
      return null;
    }
  } catch (error) {
    debugLog(`Error reading config file ${filePath}: ${error.message}`);
    return null;
  }
}

function readAssistantConfig(assistant) {
  const configs = CONFIG_PATHS[assistant];

  if (!configs) {
    debugLog(`Unknown assistant: ${assistant}`);
    return '';
  }

  const output = [];

  // Read global configs
  let globalContent = null;
  for (const globalPath of configs.global) {
    const content = readConfigFile(globalPath);
    if (content) {
      globalContent = content;
      break; // Use first found
    }
  }

  if (globalContent) {
    output.push('## Global Assistant Configuration\n');
    output.push(globalContent);
    output.push('\n');
  }

  // Read project configs
  let projectContent = null;
  for (const projectPath of configs.project) {
    const fullPath = path.join(process.cwd(), projectPath);
    const content = readConfigFile(fullPath);
    if (content) {
      projectContent = content;
      break; // Use first found
    }
  }

  if (projectContent) {
    output.push('## Project-Level Configuration\n');
    output.push(projectContent);
    output.push('\n');
  }

  return output.join('\n');
}

// Main execution
const assistant = process.argv[2];

if (!assistant) {
  debugLog('No assistant identifier provided');
  process.exit(0); // Silent exit for graceful degradation
}

debugLog(`Reading configuration for assistant: ${assistant}`);

try {
  const config = readAssistantConfig(assistant);
  if (config) {
    console.log(config);
  } else {
    debugLog('No configuration files found');
  }
  process.exit(0);
} catch (error) {
  console.error(`[ERROR] Failed to read configuration: ${error.message}`);
  process.exit(0); // Graceful degradation
}
```

### Key Implementation Points

1. **Shebang**: Include `#!/usr/bin/env node`
2. **Path mapping**: Use lookup object for assistant → paths
3. **Home directory**: Use `os.homedir()` for cross-platform compatibility
4. **Multiple paths**: Each assistant can have multiple potential config files (try in order, use first found)
5. **UTF-8 encoding**: Explicitly specify when reading files
6. **Graceful handling**: Missing files don't cause errors, just skip silently
7. **Section markers**: Clear markdown headers separate global and project configs
8. **No output when empty**: If no config files found, output nothing (not an error)

### Configuration Path Logic

- **Global configs**: Single path to home directory file
- **Project configs**: Multiple possible paths (e.g., AGENTS.md or CLAUDE.md for Claude)
- **First match wins**: If multiple project paths specified, use first one that exists

### Testing

```bash
# Test with Claude (current environment)
node templates/ai-task-manager/config/scripts/read-assistant-config.cjs claude

# Test with debug
DEBUG=true node templates/ai-task-manager/config/scripts/read-assistant-config.cjs claude

# Test unknown assistant
node templates/ai-task-manager/config/scripts/read-assistant-config.cjs foobar
# Expected: no output, silent exit

# Test integration with detect script
ASSISTANT=$(node templates/ai-task-manager/config/scripts/detect-assistant.cjs)
node templates/ai-task-manager/config/scripts/read-assistant-config.cjs "$ASSISTANT"
```

### Edge Cases to Handle

1. **Missing home directory**: os.homedir() should always work, but wrap in try-catch
2. **Permission errors**: File may exist but not be readable
3. **Empty files**: Return empty string, not error
4. **Invalid UTF-8**: Use encoding error handling
5. **Symbolic links**: fs.existsSync and fs.readFileSync handle these automatically

</details>
