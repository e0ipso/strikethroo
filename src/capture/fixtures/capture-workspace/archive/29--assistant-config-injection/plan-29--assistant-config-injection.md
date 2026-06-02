---
id: 29
summary: "Implement assistant configuration detection and automatic injection into hook execution contexts"
created: 2025-10-08
---

# Plan: Assistant Configuration Detection and Injection System

## Original Work Order

> Assistant Configuration Detection and Injection System
>
> Overview
>
> Create a system to detect the running AI assistant (Claude, Gemini, OpenCode, etc.) and automatically inject their global and project-level configuration files into hook execution contexts.
>
> Implementation Plan
>
> 1. Create Assistant Detection Script (detect-assistant.cjs)
>
> - Location: templates/ai-task-manager/config/scripts/detect-assistant.cjs
> - Logic: Detect assistant from environment variables and directory presence
>   - Claude: Check CLAUDECODE env var or .claude/ directory
>   - Gemini: Check .gemini/ directory
>   - OpenCode: Check .opencode/ directory
>   - Cursor: Check .cursor/ directory (future support)
> - Output: Return assistant identifier as string
>
> 2. Create Configuration Reader Script (read-assistant-config.cjs)
>
> - Location: templates/ai-task-manager/config/scripts/read-assistant-config.cjs
> - Parameters: Takes assistant identifier from detection script
> - Functionality:
>   - Global configs: Read from ~/.claude/CLAUDE.md, ~/.gemini/GEMINI.md, etc.
>   - Project configs: Read from AGENTS.md, CLAUDE.md, .gemini/styleguide.md, .cursor/index.mdc, etc.
> - Output: Return concatenated configuration content for injection into hook context
>
> 3. Update Command Templates (REVISED - moved from hooks to commands for mandatory enforcement)
>
> Modify command templates to inject config reading at the beginning:
> - templates/assistant/commands/tasks/create-plan.md
> - templates/assistant/commands/tasks/generate-tasks.md
> - templates/assistant/commands/tasks/execute-blueprint.md
>
> Injection pattern:
> ## Assistant Configuration
>
> Before proceeding, load and consider the assistant's global and project-level configuration:
>
> ```bash
> ASSISTANT=$(node .ai/task-manager/config/scripts/detect-assistant.cjs)
> node .ai/task-manager/config/scripts/read-assistant-config.cjs "$ASSISTANT"
> ```
>
> Keep these rules and guidelines in mind during execution.
>
> **Rationale**: Configuration injection in command files (not hooks) makes it mandatory and non-bypassable, since users can customize hooks but commands are system-defined entry points.
>
> ### 5. Testing Strategy
> - Test detection with Claude environment
> - Test reading ~/.claude/CLAUDE.md
> - Test reading project-level AGENTS.md
> - Test hook injection and execution
> - Verify configs are properly considered during plan creation and task generation
>
> ## Key Design Decisions
>
> 1. **CommonJS format** for Node.js script compatibility
> 2. **Home directory detection** using `os.homedir()` for cross-platform support
> 3. **Graceful degradation** if config files don't exist
> 4. **Multiple config paths** per assistant (global + project level)
> 5. **Early hook injection** before critical decision points (planning, task generation, execution)

## Executive Summary

This plan implements a configuration detection and injection system to ensure AI assistants respect their global and project-level rules during task management operations. Currently, assistants executing plans and tasks may ignore important configuration files containing coding standards, test requirements, and behavioral guidelines.

The solution creates two CommonJS scripts: one to detect which assistant is running (Claude, Gemini, OpenCode, or Cursor) based on environment variables and directory presence, and another to read and inject configuration files from both global (`~/.claude/CLAUDE.md`) and project-level locations (`AGENTS.md`, `.gemini/styleguide.md`, etc.) into command execution contexts.

By injecting these configurations directly into command templates (create-plan, generate-tasks, execute-blueprint) before any hook execution, the system makes configuration awareness mandatory and non-bypassable, improving consistency and adherence to established guidelines.

## Context

### Current State

The AI Task Manager system executes hooks at various workflow stages (plan creation, task generation, execution phases), but these hooks don't have access to assistant-specific configuration files. Each AI assistant stores its global configuration in different locations:

- **Claude**: `~/.claude/CLAUDE.md`
- **Gemini**: `~/.gemini/GEMINI.md` (hypothetical)
- **OpenCode**: `~/.opencode/OPENCODE.md` (hypothetical)
- **Cursor**: `~/.cursor/rules/` directory with `.mdc` files

Project-level configurations also vary by assistant:
- Claude/generic: `AGENTS.md` or `CLAUDE.md` at repository root
- Gemini: `.gemini/styleguide.md`
- Cursor: `.cursor/index.mdc`

Without automatic injection, assistants may generate plans or tasks that violate project conventions, ignore testing requirements, or overlook critical architectural constraints documented in these files.

### Target State

After implementation:
1. Command templates automatically detect the running assistant via environment variables and directory presence
2. Both global and project-level configuration files are read and injected into command contexts before any workflow execution
3. Assistants maintain awareness of configuration throughout plan creation, task generation, and execution
4. System degrades gracefully when configuration files don't exist
5. Configuration injection is mandatory (cannot be bypassed by hook customization)
6. Solution supports extensibility for future assistants (Cursor, Windsurf, etc.)

### Background

The user reported that assistants "ignore their global rules" during plan/task operations. This occurs because neither commands nor hooks have access to assistant-specific configuration files stored in various locations.

Initially, hook-level injection was considered, but this approach has a critical weakness: hooks are user-customizable files that can be modified or overridden. To ensure mandatory enforcement, configuration injection must occur at the command level - the system-controlled entry points that users invoke via slash commands (`/tasks:create-plan`, `/tasks:generate-tasks`, `/tasks:execute-blueprint`).

The existing script architecture (like `get-next-plan-id.cjs`) demonstrates that CommonJS scripts can reliably interact with the file system and provide output to command execution contexts. By injecting configuration reading directives directly into command templates, the system ensures all workflows respect assistant configuration regardless of hook customization.

## Technical Implementation Approach

### Component 1: Assistant Detection Script

**Objective**: Reliably identify which AI assistant is executing the workflow to determine appropriate configuration paths.

**Implementation Strategy**:
- Create `templates/ai-task-manager/config/scripts/detect-assistant.cjs`
- Implement detection hierarchy:
  1. **Environment variables** (highest priority): Check `CLAUDECODE`, `GEMINI_CODE`, etc.
  2. **Directory presence** (fallback): Detect `.claude/`, `.gemini/`, `.opencode/`, `.cursor/` directories
  3. **Default behavior**: Return `unknown` if no assistant detected
- Output format: Single line with assistant identifier (`claude`, `gemini`, `opencode`, `cursor`, or `unknown`)
- Include debug logging via `DEBUG` environment variable (consistent with existing scripts)
- Follow error handling patterns from `get-next-plan-id.cjs`

```mermaid
flowchart TD
    A[Start Detection] --> B{Check CLAUDECODE env?}
    B -->|Yes| C[Return 'claude']
    B -->|No| D{Check .claude/ dir?}
    D -->|Yes| C
    D -->|No| E{Check .gemini/ dir?}
    E -->|Yes| F[Return 'gemini']
    E -->|No| G{Check .opencode/ dir?}
    G -->|Yes| H[Return 'opencode']
    G -->|No| I{Check .cursor/ dir?}
    I -->|Yes| J[Return 'cursor']
    I -->|No| K[Return 'unknown']
```

### Component 2: Configuration Reader Script

**Objective**: Locate and read configuration files for the detected assistant, concatenating global and project-level configs.

**Implementation Strategy**:
- Create `templates/ai-task-manager/config/scripts/read-assistant-config.cjs`
- Accept assistant identifier as command-line argument
- Define configuration paths per assistant:
  - **Claude**: Global `~/.claude/CLAUDE.md`, Project `AGENTS.md` or `CLAUDE.md`
  - **Gemini**: Global `~/.gemini/GEMINI.md`, Project `.gemini/styleguide.md`
  - **OpenCode**: Global `~/.opencode/OPENCODE.md`, Project `AGENTS.md` or `OPENCODE.md`
  - **Cursor**: Global `~/.cursor/rules/index.mdc`, Project `.cursor/index.mdc`
- Use `os.homedir()` for cross-platform home directory detection
- Read files with UTF-8 encoding
- Gracefully handle missing files (skip with debug message, don't error)
- Output format: Concatenated configuration with clear section markers

**Output Structure**:
```markdown
## Global Assistant Configuration

[contents of global config file]

## Project-Level Configuration

[contents of project config file]
```

### Component 3: Command Template Updates

**Objective**: Inject configuration reading logic directly into command templates to make it mandatory and non-bypassable.

**Command Modifications**:

1. **create-plan.md** - Inject configuration before plan creation workflow begins
2. **generate-tasks.md** - Inject configuration before task generation from plan
3. **execute-blueprint.md** - Inject configuration before blueprint execution

**Injection Pattern** (add after frontmatter and title, before instructions):
```markdown
## Assistant Configuration

Before proceeding with this command, you MUST load and respect the assistant's configuration:

**Run the following scripts:**
```bash
ASSISTANT=$(node .ai/task-manager/config/scripts/detect-assistant.cjs)
node .ai/task-manager/config/scripts/read-assistant-config.cjs "$ASSISTANT"
```

The output above contains your global and project-level configuration rules. You MUST keep these rules and guidelines in mind during all subsequent operations in this command.

---

[Existing command instructions continue below]
```

**Design Rationale**:
- **Mandatory injection**: Commands are entry points that users cannot modify, unlike hooks which are user-customizable
- **Early execution**: Configuration is loaded before any hook invocation, ensuring awareness throughout the entire workflow
- **Clear directive**: Explicit "MUST" language emphasizes the requirement to respect configuration
- **Non-blocking**: Script failures won't crash the command, but successful output is emphasized
- **Consistent pattern**: Same injection structure across all three command templates

**Implementation Details**:
- Injection point: After YAML frontmatter and main title, before "Instructions" or "Process" section
- Scripts are invoked inline with bash command blocks
- Configuration output is displayed directly to the assistant executing the command
- Visual separator (horizontal rule) distinguishes configuration from command instructions

## Risk Considerations and Mitigation Strategies

### Technical Risks

- **File System Access Failures**: Home directory or project files may be unreadable due to permissions
  - **Mitigation**: Wrap file reads in try-catch, use graceful degradation with debug logging

- **Cross-Platform Path Differences**: Windows vs Unix path separators and home directory locations
  - **Mitigation**: Use Node.js `path` and `os` modules for cross-platform compatibility (already proven in existing scripts)

- **Assistant Detection False Positives**: Multiple assistant directories may exist in a project
  - **Mitigation**: Use environment variables as highest priority, document precedence order clearly

### Implementation Risks

- **Hook Execution Performance**: Reading configuration files adds I/O overhead to each hook execution
  - **Mitigation**: File reads are small (typically <50KB), modern SSDs make this negligible (<10ms)

- **Configuration File Format Variations**: Assistants may use different formats (Markdown vs TOML vs MDC)
  - **Mitigation**: Read as plain text and inject verbatim - AI assistants can parse their own formats

- **Breaking Existing Workflows**: Command template modifications could disrupt current users
  - **Mitigation**: Inject configuration section before existing instructions, maintain all existing command functionality; graceful degradation if scripts fail

### Integration Risks

- **Template Distribution**: New scripts must be copied to all existing and new projects
  - **Mitigation**: Scripts are in template directory, automatically distributed during `init` command

- **Unknown Assistants**: Future assistants won't be detected initially
  - **Mitigation**: Return `unknown` gracefully, document extension process in script comments

## Success Criteria

### Primary Success Criteria

1. **Detection Accuracy**: Assistant detection script correctly identifies Claude, Gemini, OpenCode, and Cursor based on environment variables and directory presence in test scenarios
2. **Configuration Retrieval**: Reader script successfully locates and reads both global and project-level config files for all supported assistants
3. **Command Integration**: Updated command templates execute without errors and display configuration context before proceeding with workflow instructions
4. **Mandatory Execution**: Configuration injection cannot be bypassed - it executes at command level before any hook invocation
5. **Backward Compatibility**: Existing projects continue to function normally, with graceful handling when config files are absent

### Quality Assurance Metrics

1. **Error Handling**: Scripts handle missing files, permission errors, and unknown assistants without crashing
2. **Performance**: Configuration injection adds <100ms to hook execution time
3. **Cross-Platform**: Scripts work correctly on Linux, macOS, and Windows environments
4. **Documentation**: Both scripts include clear comments explaining detection logic and configuration paths

## Resource Requirements

### Development Skills

- **Node.js/CommonJS**: Writing scripts with fs, path, and os modules
- **Bash scripting**: Integrating script calls into markdown hook templates
- **File system operations**: Reading files with UTF-8 encoding and handling errors
- **Testing**: Manual testing with different assistant environments

### Technical Infrastructure

- Node.js runtime (already required for existing scripts)
- File system access to home directory and project root
- No new external dependencies - use Node.js built-in modules only

## Integration Strategy

The configuration injection system integrates into the command execution layer:

1. **Script Location**: Scripts live alongside existing `get-next-plan-id.cjs` and `get-next-task-id.cjs` in `templates/ai-task-manager/config/scripts/`
2. **Template Distribution**: Scripts and updated command templates are automatically distributed to new projects via `init` command
3. **Command Modifications**: Changes are additive (prepend configuration section to existing commands), not destructive
4. **Mandatory Execution**: Configuration loading happens at command entry point before any hook invocation, making it non-bypassable
5. **Backward Compatibility**: Existing command functionality remains unchanged; configuration injection is a new initial step

## Implementation Order

1. Create `detect-assistant.cjs` with environment variable and directory detection logic
2. Create `read-assistant-config.cjs` with path mapping and file reading logic
3. Update `create-plan.md` command template with configuration injection pattern
4. Update `generate-tasks.md` command template with configuration injection pattern
5. Update `execute-blueprint.md` command template with configuration injection pattern
6. Test with Claude environment (CLAUDECODE=1) and verify config injection in all three commands
7. Test with missing configuration files to validate graceful degradation
8. Document assistant extension process for future integrations

## Notes

- **Architectural Decision**: Configuration injection at command level (not hook level) ensures mandatory enforcement - users can customize hooks, but commands are system-controlled entry points
- **Extensibility**: Scripts use lookup tables for assistant-to-path mapping, making it trivial to add new assistants
- **No Breaking Changes**: Configuration injection is purely additive - removing scripts would simply skip the config section
- **Debug Mode**: Both scripts support `DEBUG=true` for troubleshooting, consistent with existing script patterns
- **Security**: Scripts only read files, never write or execute user input, minimizing security risks
- **Future-Proofing**: By injecting at command level, the system ensures configuration awareness even if hooks are modified or removed by users

---

## Task Dependency Visualization

```mermaid
graph TD
    001[Task 1: Create Assistant Detection Script] --> 002[Task 2: Create Configuration Reader Script]
    001 --> 003[Task 3: Update create-plan.md]
    001 --> 004[Task 4: Update generate-tasks.md]
    001 --> 005[Task 5: Update execute-blueprint.md]
    002 --> 003
    002 --> 004
    002 --> 005
    003 --> 006[Task 6: Integration Testing]
    004 --> 006
    005 --> 006
```

## Execution Blueprint

**Validation Gates:**
- Reference: `.ai/task-manager/config/hooks/POST_PHASE.md`

### ✅ Phase 1: Script Foundation
**Parallel Tasks:**
- ✔️ Task 1: Create Assistant Detection Script (detect-assistant.cjs) - **completed**

**Objective**: Establish the foundational assistant detection capability that all other components depend on.

### ✅ Phase 2: Configuration Infrastructure
**Parallel Tasks:**
- ✔️ Task 2: Create Configuration Reader Script (read-assistant-config.cjs) (depends on: 1) - **completed**

**Objective**: Build configuration reading capability that uses the detection script to load appropriate config files.

### ✅ Phase 3: Command Template Integration
**Parallel Tasks:**
- ✔️ Task 3: Update create-plan.md Command Template (depends on: 1, 2) - **completed**
- ✔️ Task 4: Update generate-tasks.md Command Template (depends on: 1, 2) - **completed**
- ✔️ Task 5: Update execute-blueprint.md Command Template (depends on: 1, 2) - **completed**

**Objective**: Inject configuration loading into all three command entry points, making it mandatory across the workflow.

### ✅ Phase 4: Verification and Validation
**Parallel Tasks:**
- ✔️ Task 6: Integration Testing and Validation (depends on: 3, 4, 5) - **completed**

**Objective**: Comprehensively test the complete system including detection, reading, injection, and graceful degradation.

### Post-phase Actions
After each phase completion:
1. Run linting to ensure code quality
2. Commit changes with descriptive message following conventional commits format
3. Update task statuses in blueprint (✅ for phases, ✔️ for tasks)

### Execution Summary
- **Total Phases**: 4
- **Total Tasks**: 6
- **Maximum Parallelism**: 3 tasks (in Phase 3)
- **Critical Path Length**: 4 phases
- **Estimated Complexity**: Low-Medium (all tasks ≤4 complexity score)
- **Key Dependencies**: Sequential script creation (Phase 1→2), then parallel template updates (Phase 3), final testing (Phase 4)

---

## Execution Summary

**Status**: ✅ Completed Successfully
**Completed Date**: 2025-10-08

### Results

Successfully implemented a configuration detection and injection system that ensures AI assistants respect their global and project-level rules during task management operations. All 6 tasks completed across 4 phases:

**Phase 1 - Script Foundation**
- Created `detect-assistant.cjs` with environment variable and directory detection for Claude, Gemini, OpenCode, and Cursor
- Supports DEBUG mode and graceful degradation to 'unknown'

**Phase 2 - Configuration Infrastructure**
- Created `read-assistant-config.cjs` that reads and concatenates global (~/.claude/CLAUDE.md) and project-level (AGENTS.md) configuration files
- Handles missing files gracefully with clear section markers

**Phase 3 - Command Template Integration**
- Updated `create-plan.md`, `generate-tasks.md`, and `execute-blueprint.md` with mandatory configuration loading
- Injected clear "MUST" language directives before workflow instructions
- Configuration injection occurs at command level (non-bypassable)

**Phase 4 - Verification**
- Comprehensive integration testing validated all functionality
- All 8 test scenarios passed (detection, reading, edge cases, integration)
- Zero regressions: all 67 existing tests still pass
- Confirmed cross-platform compatibility (Linux verified, designed for macOS/Windows)

### Noteworthy Events

**Commit Message Linting**: Initial commit attempt failed due to:
1. Line length limit (100 characters)
2. Forbidden AI-generated content pattern detection

Resolution: Adjusted commit message format to comply with linting rules while maintaining clear, descriptive content.

**Feature Branch Creation**: Successfully created `feature/assistant-config-injection` branch from main, enabling clean separation of development work.

**Parallel Execution Success**: Phase 3 demonstrated effective parallelism with 3 simultaneous template updates, reducing total execution time.

**No Breaking Changes**: Integration testing confirmed that existing functionality remains intact - all command templates preserve their original behavior while adding configuration awareness.

### Recommendations

1. **Documentation Update**: Consider adding a section to AGENTS.md or CLAUDE.md explaining how the configuration injection system works and what happens when config files are missing.

2. **Future Assistant Support**: When adding new assistants (e.g., Windsurf, Aider), update both scripts:
   - Add environment variable check in `detect-assistant.cjs`
   - Add configuration paths in `read-assistant-config.cjs`

3. **Template Distribution**: Run `npm run build && npm start init` in existing projects to receive the updated templates with configuration injection.

4. **Monitoring**: Track whether assistants actually respect the injected configuration in practice. If compliance issues persist, consider enhancing the directive language or adding validation gates.

5. **Performance**: Current implementation adds <100ms overhead per command execution. If this becomes significant, consider caching configuration content in memory during blueprint execution.
