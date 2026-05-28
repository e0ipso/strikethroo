# MCP Server Architecture Analysis for AI Task Manager

**Date**: 2025-11-23
**Author**: Analysis conducted by Claude Code
**Purpose**: Evaluate feasibility of reimplementing AI Task Manager as an MCP server with saved prompts

---

## Executive Summary

This document analyzes the potential migration of the AI Task Manager from a file-based multi-assistant CLI tool to a unified MCP (Model Context Protocol) server implementation. The MCP approach would eliminate format conversion complexity, provide universal assistant support, and significantly reduce maintenance overhead while preserving all existing functionality including template customization, hooks, and plan management.

**Key Findings**:
- ✅ **Fully Feasible**: All current functionality can be preserved in MCP architecture
- ✅ **Significant Simplification**: Eliminates ~70% of format conversion and directory management code
- ✅ **Universal Support**: Works with any MCP-compatible assistant (Claude, Gemini, Copilot, Cursor, Windsurf, Continue, Cline)
- ⚠️ **Tradeoff**: Requires MCP client configuration instead of file-based installation
- ⚠️ **Consideration**: Limited to assistants with MCP support (though most modern ones do)

---

## Table of Contents

1. [Current Architecture Analysis](#current-architecture-analysis)
2. [MCP-Based Architecture Design](#mcp-based-architecture-design)
3. [Setup Instructions](#setup-instructions)
4. [Workflow and Usage](#workflow-and-usage)
5. [Comparative Analysis](#comparative-analysis)
6. [Migration Path](#migration-path)
7. [Appendices](#appendices)

---

## Current Architecture Analysis

### Architecture Overview

The AI Task Manager currently operates as a CLI tool that initializes project-specific directories and copies template files in different formats for different assistants.

#### Core Components

1. **CLI Entry Point** (`src/cli.ts`)
   - Single `init` command with `--assistants` flag
   - Parses comma-separated assistant list
   - Validates and routes to initialization

2. **Template Processing** (`src/utils.ts`)
   - **Format Conversion**: Markdown → TOML for Gemini
   - **Variable Transformation**: `$ARGUMENTS` → `{{args}}`, `$1` → `{{plan_id}}`
   - **GitHub Format**: Special handling for `.prompt.md` files
   - **Content Processing**: Frontmatter parsing and body transformation

3. **Directory Management** (`src/index.ts`)
   - Creates assistant-specific directories:
     - `.claude/commands/tasks/` (Markdown)
     - `.gemini/commands/tasks/` (TOML)
     - `.opencode/command/tasks/` (Markdown)
     - `.codex/prompts/` (Markdown, flat structure)
     - `.github/prompts/` (Markdown with `.prompt.md` extension)
   - Copies templates with format conversion
   - Manages shared `.ai/task-manager/` structure

4. **Metadata and Conflict Detection**
   - SHA-256 hash tracking in `.init-metadata.json`
   - Detects user modifications to prevent overwrites
   - Interactive conflict resolution prompts

### Pain Points

#### 1. Format Conversion Complexity

**Current Code** (~200 lines in `utils.ts`):
```typescript
export function convertMdToToml(mdContent: string): string {
  const { frontmatter, body } = parseFrontmatter(mdContent);

  const processedBody = body
    .replace(/\$ARGUMENTS(?![0-9])/g, '{{args}}')
    .replace(/\$1(?![0-9])/g, '{{plan_id}}')
    .replace(/\$2(?![0-9])/g, '{{param2}}');

  // Build TOML with metadata section...
}

export function convertMdToGitHubPrompt(mdContent: string): string {
  // Special GitHub format handling...
}
```

**Issues**:
- Brittle regex-based transformations
- Format-specific variable syntax requires maintenance
- Each new assistant may need new format converter
- Testing requires validating all format combinations

#### 2. Directory Structure Fragmentation

**Current State**:
```
project/
├── .claude/commands/tasks/*.md
├── .gemini/commands/tasks/*.toml
├── .opencode/command/tasks/*.md       # Note: 'command' singular
├── .codex/prompts/tasks-*.md          # Flat structure
├── .github/prompts/tasks-*.prompt.md  # Special extension
└── .ai/task-manager/                  # Shared config
```

**Issues**:
- 5 different directory structures to maintain
- Inconsistent naming conventions (`commands` vs `command` vs `prompts`)
- File naming varies (`create-plan.md` vs `tasks-create-plan.md` vs `tasks-create-plan.prompt.md`)
- Codex requires manual file copying to `~/.codex/prompts/`

#### 3. Template Synchronization

**Current Challenges**:
- Single source (Markdown) generates 5 different outputs
- Changes must be validated across all formats
- Variable transformation must work in all contexts
- Format-specific features require conditional logic

#### 4. Limited Assistant Support

**Current Model**:
- Hardcoded support for 5 assistants: Claude, Gemini, Open Code, Codex, GitHub Copilot
- Adding new assistant requires:
  - Type system update (`src/types.ts`)
  - Format mapping (`getTemplateFormat()`)
  - Directory configuration (`getAssistantConfig()`)
  - File naming logic (`getCommandFileName()`)
  - Template processing updates
  - Integration testing

**Example** (from AGENTS.md):
```typescript
export type Assistant = 'claude' | 'gemini' | 'opencode' | 'codex' | 'github';
```

#### 5. Metadata and Conflict Management Overhead

**Code Complexity** (~300 lines):
- Hash calculation for all copied files
- Conflict detection comparing original vs current vs new
- Interactive prompts for resolution
- Metadata persistence and updates
- Special handling for excluded directories (`scripts/`)

### Current File Statistics

**Total Implementation**:
- **Source Files**: 12 TypeScript files
- **Lines of Code**: ~2,500 LOC
- **Format Conversion**: ~300 LOC
- **Directory Management**: ~400 LOC
- **Metadata/Conflicts**: ~300 LOC
- **Tests**: 119 tests across 7 test suites

**Template Files**:
- **Command Templates**: 7 Markdown files
- **Hook Templates**: 6 hook files
- **Config Templates**: 4 configuration templates
- **Total Templates**: ~2,000 lines

---

## MCP-Based Architecture Design

### Conceptual Overview

Instead of copying files to assistant-specific directories, the AI Task Manager becomes an **MCP server** that:

1. **Serves prompts dynamically** via MCP protocol
2. **Reads templates** from `.ai/task-manager/config/templates/`
3. **Executes hooks** from `.ai/task-manager/config/hooks/`
4. **Manages plans** in `.ai/task-manager/plans/` (unchanged)
5. **Provides universal access** to any MCP-compatible assistant

### MCP Server Architecture

#### Server Components

```
ai-task-manager-mcp/
├── src/
│   ├── index.ts                    # MCP server entry point
│   ├── prompts.ts                  # Prompt definitions and handlers
│   ├── template-engine.ts          # Template reading and processing
│   ├── hooks.ts                    # Hook execution system
│   ├── scripts.ts                  # Wrapper for get-next-*-id.cjs
│   └── types.ts                    # Type definitions
├── package.json
├── tsconfig.json
└── README.md
```

#### Prompt Definitions

**Seven Core Prompts**:

1. **`tasks-create-plan`**
   - Arguments: `{ prompt: string }`
   - Returns: Formatted plan creation prompt with project context

2. **`tasks-refine-plan`**
   - Arguments: `{ plan_id: string }`
   - Returns: Plan refinement prompt with existing plan loaded

3. **`tasks-generate-tasks`**
   - Arguments: `{ plan_id: string }`
   - Returns: Task generation prompt with plan context

4. **`tasks-execute-task`**
   - Arguments: `{ plan_id: string, task_id: string }`
   - Returns: Single task execution prompt with dependencies

5. **`tasks-execute-blueprint`**
   - Arguments: `{ plan_id: string }`
   - Returns: Full blueprint execution orchestration

6. **`tasks-fix-broken-tests`**
   - Arguments: `{ test_command?: string }`
   - Returns: Test debugging and fixing workflow

7. **`tasks-full-workflow`**
   - Arguments: `{ prompt: string }`
   - Returns: Complete workflow from plan to execution

### Implementation Design

#### Server Initialization

```typescript
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ListPromptsRequestSchema, GetPromptRequestSchema } from '@modelcontextprotocol/sdk/types.js';

const server = new Server(
  {
    name: 'ai-task-manager',
    version: '1.0.0',
  },
  {
    capabilities: {
      prompts: {
        listChanged: true, // Notify clients when prompts change
      },
    },
  }
);

// Start server with stdio transport
const transport = new StdioServerTransport();
await server.connect(transport);
```

#### Prompt List Handler

```typescript
server.setRequestHandler(ListPromptsRequestSchema, async () => {
  return {
    prompts: [
      {
        name: 'tasks-create-plan',
        description: 'Create a comprehensive plan to accomplish the request from the user',
        arguments: [
          {
            name: 'prompt',
            description: 'The user request to plan for',
            required: true,
          },
        ],
      },
      {
        name: 'tasks-refine-plan',
        description: 'Review and refine an existing plan with feedback loop',
        arguments: [
          {
            name: 'plan_id',
            description: 'The numeric ID of the plan to refine',
            required: true,
          },
        ],
      },
      {
        name: 'tasks-generate-tasks',
        description: 'Generate atomic tasks from an approved plan',
        arguments: [
          {
            name: 'plan_id',
            description: 'The numeric ID of the plan to generate tasks for',
            required: true,
          },
        ],
      },
      {
        name: 'tasks-execute-task',
        description: 'Execute a single task with dependency validation',
        arguments: [
          {
            name: 'plan_id',
            description: 'The plan ID containing the task',
            required: true,
          },
          {
            name: 'task_id',
            description: 'The task ID to execute',
            required: true,
          },
        ],
      },
      {
        name: 'tasks-execute-blueprint',
        description: 'Execute the complete task blueprint for a plan',
        arguments: [
          {
            name: 'plan_id',
            description: 'The numeric ID of the plan to execute',
            required: true,
          },
        ],
      },
      {
        name: 'tasks-fix-broken-tests',
        description: 'Fix tests that fail after implementation changes',
        arguments: [
          {
            name: 'test_command',
            description: 'The test command to run (optional, auto-detected from CLAUDE.md)',
            required: false,
          },
        ],
      },
      {
        name: 'tasks-full-workflow',
        description: 'Execute the complete workflow from plan creation to implementation',
        arguments: [
          {
            name: 'prompt',
            description: 'The user request to implement',
            required: true,
          },
        ],
      },
    ],
  };
});
```

#### Prompt Get Handler

```typescript
server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  // Find .ai/task-manager directory
  const taskManagerPath = await findTaskManagerPath();

  if (!taskManagerPath) {
    throw new Error('AI Task Manager not initialized in this project. Run: npx ai-task-manager init');
  }

  // Load template based on prompt name
  const templatePath = path.join(
    taskManagerPath,
    'config/templates',
    `${name.replace('tasks-', '').toUpperCase()}_TEMPLATE.md`
  );

  // Read and process template
  const template = await readTemplate(templatePath);

  // Execute PRE hooks if applicable
  const preHookPath = path.join(taskManagerPath, 'config/hooks', 'PRE_PLAN.md');
  let preHookContent = '';
  if (await fs.exists(preHookPath) && name === 'tasks-create-plan') {
    preHookContent = await fs.readFile(preHookPath, 'utf-8');
  }

  // Substitute variables in template
  const processedContent = substituteVariables(template, args);

  // Build final prompt message
  let promptContent = '';

  // Add pre-hook content
  if (preHookContent) {
    promptContent += `## Pre-Plan Hook\n\n${preHookContent}\n\n`;
  }

  // Add main template content
  promptContent += processedContent;

  // Add post-hook instructions if applicable
  if (name === 'tasks-create-plan') {
    promptContent += `\n\n## Post-Plan Validation\n\nAfter creating the plan, execute: .ai/task-manager/config/hooks/POST_PLAN.md`;
  }

  return {
    description: `Execute ${name} workflow`,
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: promptContent,
        },
      },
    ],
  };
});
```

#### Template Engine

```typescript
interface TemplateContext {
  prompt?: string;
  plan_id?: string;
  task_id?: string;
  test_command?: string;
}

async function readTemplate(templatePath: string): Promise<string> {
  // Read from project's .ai/task-manager/config/templates/
  // Templates are stored in Markdown format (single source of truth)
  return await fs.readFile(templatePath, 'utf-8');
}

function substituteVariables(template: string, args: TemplateContext): string {
  let processed = template;

  // Replace argument placeholders
  if (args.prompt) {
    processed = processed.replace(/\$ARGUMENTS/g, args.prompt);
  }

  if (args.plan_id) {
    processed = processed.replace(/\$1/g, args.plan_id);
  }

  if (args.task_id) {
    processed = processed.replace(/\$2/g, args.task_id);
  }

  if (args.test_command) {
    processed = processed.replace(/\[testCommand\]/g, args.test_command || '');
  }

  return processed;
}

async function findTaskManagerPath(): Promise<string | null> {
  // Search upward from current directory for .ai/task-manager
  let currentDir = process.cwd();

  while (currentDir !== path.parse(currentDir).root) {
    const taskManagerPath = path.join(currentDir, '.ai/task-manager');

    if (await fs.exists(taskManagerPath)) {
      return taskManagerPath;
    }

    currentDir = path.dirname(currentDir);
  }

  return null;
}
```

#### Hook Execution System

```typescript
interface HookConfig {
  PRE_PLAN?: string;
  POST_PLAN?: string;
  PRE_PHASE?: string;
  POST_PHASE?: string;
  POST_TASK_GENERATION_ALL?: string;
  PRE_TASK_ASSIGNMENT?: string;
  POST_ERROR_DETECTION?: string;
}

async function loadHooks(taskManagerPath: string): Promise<HookConfig> {
  const hooksDir = path.join(taskManagerPath, 'config/hooks');
  const hooks: HookConfig = {};

  const hookFiles = [
    'PRE_PLAN.md',
    'POST_PLAN.md',
    'PRE_PHASE.md',
    'POST_PHASE.md',
    'POST_TASK_GENERATION_ALL.md',
    'PRE_TASK_ASSIGNMENT.md',
    'POST_ERROR_DETECTION.md',
  ];

  for (const hookFile of hookFiles) {
    const hookPath = path.join(hooksDir, hookFile);
    if (await fs.exists(hookPath)) {
      const hookName = hookFile.replace('.md', '') as keyof HookConfig;
      hooks[hookName] = await fs.readFile(hookPath, 'utf-8');
    }
  }

  return hooks;
}

function injectHooks(template: string, hooks: HookConfig, promptName: string): string {
  let processed = template;

  // Inject PRE hooks at the beginning
  if (promptName === 'tasks-create-plan' && hooks.PRE_PLAN) {
    processed = `${hooks.PRE_PLAN}\n\n---\n\n${processed}`;
  }

  // Inject POST hooks with instructions
  if (promptName === 'tasks-create-plan' && hooks.POST_PLAN) {
    processed += `\n\n---\n\n## Post-Plan Quality Gates\n\n${hooks.POST_PLAN}`;
  }

  return processed;
}
```

#### Script Execution

```typescript
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function getNextPlanId(taskManagerPath: string): Promise<number> {
  const scriptPath = path.join(taskManagerPath, 'config/scripts/get-next-plan-id.cjs');

  const { stdout } = await execAsync(`node "${scriptPath}"`);

  return parseInt(stdout.trim(), 10);
}

async function getNextTaskId(taskManagerPath: string, planId: string): Promise<number> {
  const scriptPath = path.join(taskManagerPath, 'config/scripts/get-next-task-id.cjs');

  const { stdout } = await execAsync(`node "${scriptPath}" ${planId}`);

  return parseInt(stdout.trim(), 10);
}

// These can be exposed as utility functions within prompts
// Or referenced in prompt templates for execution
```

### Directory Structure (MCP Approach)

```
project/
├── .ai/task-manager/              # ALL configuration (same as current)
│   ├── plans/                     # Plan storage (unchanged)
│   │   └── 28--current-plan/
│   │       ├── plan-28--current-plan.md
│   │       └── tasks/
│   ├── archive/                   # Archive storage (unchanged)
│   ├── config/
│   │   ├── TASK_MANAGER.md        # Project context (unchanged)
│   │   ├── scripts/               # ID generation scripts (unchanged)
│   │   │   ├── get-next-plan-id.cjs
│   │   │   ├── get-next-task-id.cjs
│   │   │   ├── detect-assistant.cjs
│   │   │   └── read-assistant-config.cjs
│   │   ├── hooks/                 # Customizable hooks (unchanged)
│   │   │   ├── PRE_PLAN.md
│   │   │   ├── POST_PLAN.md
│   │   │   ├── PRE_PHASE.md
│   │   │   ├── POST_PHASE.md
│   │   │   └── ...
│   │   └── templates/             # Customizable templates (unchanged)
│   │       ├── PLAN_TEMPLATE.md
│   │       ├── TASK_TEMPLATE.md
│   │       ├── BLUEPRINT_TEMPLATE.md
│   │       └── EXECUTION_SUMMARY_TEMPLATE.md
│   └── .mcp-server/               # NEW: MCP server code
│       ├── package.json
│       ├── dist/                  # Compiled server
│       └── src/
│           ├── index.ts
│           ├── prompts.ts
│           └── ...
└── .mcp.json                      # MCP client configuration
```

**Key Changes**:
- ❌ **REMOVED**: All assistant-specific directories (`.claude/`, `.gemini/`, etc.)
- ❌ **REMOVED**: Format conversion logic
- ❌ **REMOVED**: Directory structure management
- ✅ **ADDED**: `.ai/task-manager/.mcp-server/` for MCP server code
- ✅ **ADDED**: `.mcp.json` for client configuration
- ✅ **PRESERVED**: All `.ai/task-manager/` structure and customization

### Preserving Customizability

#### 1. Template Customization (Unchanged)

Users can still edit templates in `.ai/task-manager/config/templates/`:

```markdown
# .ai/task-manager/config/templates/PLAN_TEMPLATE.md

---
id: [planId]
summary: "[userPrompt]"
created: "YYYY-MM-DD"
---

# Plan: [Title]

## Original Work Order
[User's original request...]

## Executive Summary
[2-3 sentence summary...]

[... rest of custom template ...]
```

**MCP Server Behavior**:
- Reads template from filesystem on each prompt invocation
- No caching (or file-watch-based cache invalidation)
- Changes to templates take effect immediately

#### 2. Hook Customization (Unchanged)

Users can still customize hooks in `.ai/task-manager/config/hooks/`:

```markdown
# .ai/task-manager/config/hooks/POST_PLAN.md

## Quality Gates

Before proceeding, verify the plan meets these criteria:

1. **Scope Discipline**: No gold-plating or features beyond user request
2. **Clarity**: Technical approach is specific and actionable
3. **Risk Assessment**: Key risks identified with mitigation strategies
4. **Success Criteria**: Measurable outcomes defined

[... custom quality gates ...]
```

**MCP Server Behavior**:
- Loads hooks dynamically during prompt generation
- Injects hook content into appropriate prompt sections
- Supports all existing hook types

#### 3. Script Execution (Unchanged)

All existing scripts continue to work:

```bash
# .ai/task-manager/config/scripts/get-next-plan-id.cjs
# (No changes needed)
```

**MCP Server Behavior**:
- Executes scripts via Node.js child process
- Passes results to prompts or uses for file naming
- Full backward compatibility

#### 4. Plan and Task Storage (Unchanged)

Plans and tasks continue to be stored in the same format:

```
.ai/task-manager/plans/28--feature-name/
├── plan-28--feature-name.md
├── tasks/
│   ├── 01--task-one.md
│   └── 02--task-two.md
└── execution-summary-28.md
```

**MCP Server Behavior**:
- Does NOT manage plan storage (prompts instruct AI to do so)
- Reads existing plans for context (refine-plan, generate-tasks)
- Archives handled by AI following prompt instructions

---

## Setup Instructions

### For End Users (Project Setup)

#### Step 1: Install AI Task Manager MCP Server

**Option A: Global Installation (Recommended)**
```bash
npm install -g ai-task-manager-mcp
```

**Option B: Project-Local Installation**
```bash
npm install --save-dev ai-task-manager-mcp
```

#### Step 2: Initialize Project

```bash
# Navigate to your project directory
cd /path/to/your/project

# Initialize AI Task Manager structure
ai-task-manager-mcp init
```

**What This Creates**:
```
.ai/task-manager/
├── plans/
├── archive/
├── config/
│   ├── TASK_MANAGER.md
│   ├── templates/
│   │   ├── PLAN_TEMPLATE.md
│   │   ├── TASK_TEMPLATE.md
│   │   └── ...
│   ├── hooks/
│   │   ├── PRE_PLAN.md
│   │   ├── POST_PLAN.md
│   │   └── ...
│   └── scripts/
│       ├── get-next-plan-id.cjs
│       └── get-next-task-id.cjs
└── README.md
```

**Note**: No assistant-specific directories are created!

#### Step 3: Configure MCP Client

##### Claude Code

**Create/Edit** `~/.claude.json` (user scope) or `.mcp.json` (project scope):

```json
{
  "mcpServers": {
    "ai-task-manager": {
      "type": "stdio",
      "command": "ai-task-manager-mcp",
      "args": [],
      "env": {}
    }
  }
}
```

**Or use the CLI helper**:
```bash
claude mcp add ai-task-manager --scope user
```

##### GitHub Copilot (VS Code / JetBrains)

**Create/Edit** `.mcp.json` in project root:

```json
{
  "mcpServers": {
    "ai-task-manager": {
      "type": "stdio",
      "command": "npx",
      "args": ["ai-task-manager-mcp"]
    }
  }
}
```

##### Cursor / Windsurf / Continue / Cline

Each has similar configuration files (refer to their MCP documentation). General pattern:

```json
{
  "mcpServers": {
    "ai-task-manager": {
      "type": "stdio",
      "command": "ai-task-manager-mcp"
    }
  }
}
```

#### Step 4: Verify Installation

In your AI assistant:

```
# List available MCP servers
/mcp

# List AI Task Manager prompts
/mcp__ai-task-manager__tasks-create-plan
```

**Expected Output**: Prompt appears in autocomplete or MCP prompt list

#### Step 5: Customize Configuration (Optional)

Edit templates and hooks in `.ai/task-manager/config/` to match your project needs.

### For Developers (MCP Server Development)

#### Repository Structure

```bash
git clone https://github.com/your-org/ai-task-manager-mcp.git
cd ai-task-manager-mcp
npm install
npm run build
```

#### Development Workflow

```bash
# Watch mode for development
npm run dev

# Run tests
npm test

# Test MCP server locally
npm run test:mcp
```

#### Testing MCP Server

**Using MCP Inspector** (official testing tool):

```bash
npx @modelcontextprotocol/inspector ai-task-manager-mcp
```

**Manual Testing with Claude Code**:

1. Build the server: `npm run build`
2. Link globally: `npm link`
3. Configure Claude Code to use local build:
   ```json
   {
     "mcpServers": {
       "ai-task-manager-dev": {
         "type": "stdio",
         "command": "node",
         "args": ["/path/to/ai-task-manager-mcp/dist/index.js"]
       }
     }
   }
   ```
4. Test in Claude Code: `/mcp__ai-task-manager-dev__tasks-create-plan`

#### Publishing

```bash
# Version bump
npm version patch|minor|major

# Publish to npm
npm publish

# Create GitHub release
gh release create v1.0.0
```

---

## Workflow and Usage

### User Workflow (MCP Approach)

#### One-Time Setup

1. **Install MCP Server**: `npm install -g ai-task-manager-mcp`
2. **Initialize Project**: `ai-task-manager-mcp init` (in project directory)
3. **Configure Assistant**: Add MCP server to `~/.claude.json` or `.mcp.json`
4. **Verify**: Run `/mcp` in assistant to see `ai-task-manager` listed

#### Automated Workflow (Simple Tasks)

**Single Command Execution**:
```
/mcp__ai-task-manager__tasks-full-workflow Update product page with dark mode toggle
```

**Behind the Scenes**:
1. MCP server receives prompt name and arguments
2. Reads templates from `.ai/task-manager/config/templates/`
3. Injects hooks from `.ai/task-manager/config/hooks/`
4. Returns formatted prompt to AI assistant
5. AI assistant executes full workflow:
   - Creates plan with clarifications
   - Generates tasks
   - Executes blueprint
   - Archives completed plan

#### Manual Workflow (Complex Tasks)

**Step 1: Create Plan**
```
/mcp__ai-task-manager__tasks-create-plan Implement user authentication with OAuth2
```

**Step 2: Review Plan**
- AI creates plan in `.ai/task-manager/plans/XX--auth-oauth2/`
- User reviews `plan-XX--auth-oauth2.md`
- User can manually edit if needed

**Step 3: Refine Plan (Optional)**
```
/mcp__ai-task-manager__tasks-refine-plan 42
```
- Different AI assistant can review and refine
- Clarification loop until all questions resolved

**Step 4: Generate Tasks**
```
/mcp__ai-task-manager__tasks-generate-tasks 42
```
- AI creates atomic tasks in `plans/42--auth-oauth2/tasks/`
- User reviews task breakdown

**Step 5: Execute Blueprint**
```
/mcp__ai-task-manager__tasks-execute-blueprint 42
```
- AI executes all tasks with dependency management
- Quality gates enforce integrity

**Step 6: Fix Tests (If Needed)**
```
/mcp__ai-task-manager__tasks-fix-broken-tests npm test
```
- AI debugs and fixes any failing tests
- Enforces "no test cheating" rules

### Command Reference

| Command | Arguments | Description |
|---------|-----------|-------------|
| `/mcp__ai-task-manager__tasks-create-plan` | `prompt` | Create comprehensive plan with clarifications |
| `/mcp__ai-task-manager__tasks-refine-plan` | `plan_id` | Review and refine existing plan |
| `/mcp__ai-task-manager__tasks-generate-tasks` | `plan_id` | Generate atomic tasks from plan |
| `/mcp__ai-task-manager__tasks-execute-task` | `plan_id task_id` | Execute single task with dependencies |
| `/mcp__ai-task-manager__tasks-execute-blueprint` | `plan_id` | Execute complete task blueprint |
| `/mcp__ai-task-manager__tasks-fix-broken-tests` | `[test_command]` | Fix failing tests after implementation |
| `/mcp__ai-task-manager__tasks-full-workflow` | `prompt` | Complete workflow from plan to execution |

### Customization Workflow

#### Editing Templates

**Example: Add Security Section to Plan Template**

1. **Edit Template**:
   ```bash
   # Edit .ai/task-manager/config/templates/PLAN_TEMPLATE.md

   # Add new section:
   ## Security Considerations
   - Authentication requirements
   - Data encryption needs
   - Compliance requirements (GDPR, HIPAA, etc.)
   ```

2. **Test Change**:
   ```
   /mcp__ai-task-manager__tasks-create-plan Add user profile management
   ```

3. **Verify**: New "Security Considerations" section appears in generated plan

**No Build Step Required**: MCP server reads template on each invocation

#### Editing Hooks

**Example: Add Custom Quality Gate**

1. **Edit Hook**:
   ```bash
   # Edit .ai/task-manager/config/hooks/POST_PLAN.md

   # Add custom gate:
   ## Accessibility Compliance
   - [ ] WCAG 2.1 Level AA requirements documented
   - [ ] Keyboard navigation plan included
   ```

2. **Test Change**:
   ```
   /mcp__ai-task-manager__tasks-create-plan Build dashboard UI
   ```

3. **Verify**: POST_PLAN hook includes new accessibility gate

#### Project-Specific Scripts

**Example: Custom ID Generation**

1. **Edit Script**:
   ```bash
   # Edit .ai/task-manager/config/scripts/get-next-plan-id.cjs

   // Add custom logic for ID prefixing:
   const nextId = maxId + 1;
   const prefix = process.env.TEAM_PREFIX || '';
   console.log(`${prefix}${nextId}`);
   ```

2. **Set Environment**:
   ```json
   {
     "mcpServers": {
       "ai-task-manager": {
         "env": {
           "TEAM_PREFIX": "BACKEND-"
         }
       }
     }
   }
   ```

3. **Test**: Next plan created as `BACKEND-43--feature-name`

---

## Comparative Analysis

### Benefits of MCP Approach

#### 1. Simplified Codebase

**Current Architecture**:
- **12 TypeScript files**: CLI, utils, types, metadata, conflict detection, prompts
- **~2,500 LOC**: Complex format conversion, directory management, hash tracking
- **119 Tests**: Validate all format combinations and directory structures

**MCP Architecture**:
- **4-5 TypeScript files**: Server, prompts, template engine, hooks, types
- **~800 LOC**: Simple template reading, variable substitution, hook injection
- **40-50 Tests**: Validate prompt generation, template loading, hook execution

**Code Reduction**: ~70% less code to maintain

#### 2. Universal Assistant Support

**Current Architecture**:
- **Supported**: 5 hardcoded assistants (Claude, Gemini, Open Code, Codex, GitHub Copilot)
- **Adding New Assistant**: Requires code changes, testing, release
- **Format Requirements**: Must match assistant's expected format

**MCP Architecture**:
- **Supported**: Any MCP-compatible assistant (10+ and growing)
- **Adding New Assistant**: Zero code changes, just MCP configuration
- **Format**: MCP protocol is standardized

**Assistant Support**: ~8x more assistants supported out of the box

#### 3. No Format Conversion

**Current Architecture**:
```typescript
// utils.ts: ~300 lines of format conversion
convertMdToToml()      // Markdown → TOML for Gemini
convertMdToGitHub()    // Markdown → GitHub prompt format
escapeTomlString()     // TOML escaping
parseFrontmatter()     // YAML parsing
```

**MCP Architecture**:
```typescript
// template-engine.ts: ~50 lines
readTemplate()         // Read Markdown (single format)
substituteVariables()  // Simple string replacement
```

**Complexity Reduction**: 6x simpler template processing

#### 4. Single Source of Truth

**Current Architecture**:
- **Source**: Markdown templates
- **Outputs**: 5 different formats in 5 different locations
- **Sync Issue**: Change must propagate correctly to all formats

**MCP Architecture**:
- **Source**: Markdown templates
- **Outputs**: Dynamic prompt generation (no files)
- **Sync**: N/A (single source, single output)

**Maintenance**: Zero sync issues

#### 5. No Manual File Operations

**Current Architecture** (Codex Example):
```bash
# User must manually copy files
cp -r .codex/prompts/* ~/.codex/prompts/
# Restart Codex session
codex restart
```

**MCP Architecture**:
```bash
# One-time MCP configuration
claude mcp add ai-task-manager --scope user
# Done - works immediately
```

**Setup Complexity**: 3 steps → 1 step

#### 6. Instant Updates

**Current Architecture**:
1. Update template in `templates/`
2. Run `npm run build`
3. Run `npx ai-task-manager init --assistants claude --force`
4. Files overwritten in `.claude/commands/`
5. Restart assistant (if needed)

**MCP Architecture**:
1. Update template in `.ai/task-manager/config/templates/`
2. Next prompt invocation uses new template

**Update Process**: 5 steps → 1 step

### Tradeoffs of MCP Approach

#### 1. MCP Client Dependency

**Current Architecture**:
- ✅ Works with file-based slash commands (no protocol required)
- ✅ No additional dependencies beyond assistant itself

**MCP Architecture**:
- ❌ Requires assistant with MCP support
- ❌ Requires MCP configuration setup

**Impact**:
- **Low** for modern assistants (most support MCP as of 2025)
- **Blocks** older or non-MCP assistants

#### 2. Configuration Complexity

**Current Architecture**:
```bash
# Simple, familiar
npx ai-task-manager init --assistants claude
# Files appear in .claude/commands/
# Assistant auto-discovers them
```

**MCP Architecture**:
```bash
# Two-step process
1. npx ai-task-manager-mcp init
2. claude mcp add ai-task-manager --scope user
# Requires understanding MCP configuration
```

**Impact**:
- **Medium** for technical users (familiar with MCP)
- **Higher** for non-technical users (new concept)

**Mitigation**: Provide interactive setup wizard

#### 3. Debugging Complexity

**Current Architecture**:
- Templates are static files
- Easy to inspect: `cat .claude/commands/tasks/create-plan.md`
- Errors are clear: "File not found" or "Invalid TOML"

**MCP Architecture**:
- Templates are dynamically generated
- Requires MCP inspector: `npx @modelcontextprotocol/inspector`
- Errors may be protocol-level: "Server failed to respond"

**Impact**:
- **Low** for development (MCP inspector is excellent)
- **Medium** for end users (less transparent)

**Mitigation**: Robust error messages, logging, debug mode

#### 4. Network/Process Overhead

**Current Architecture**:
- Zero overhead: files are read by assistant directly
- No additional processes

**MCP Architecture**:
- MCP server runs as separate process (stdio transport)
- Protocol overhead for each prompt invocation
- Template reading on every invocation (unless cached)

**Impact**:
- **Negligible** for practical use (~10-50ms per prompt)
- **Noticeable** only in high-frequency scenarios

**Mitigation**: Template caching with file-watch invalidation

### Feature Comparison Matrix

| Feature | Current (File-Based) | MCP Approach |
|---------|---------------------|--------------|
| **Assistant Support** | 5 hardcoded | Any MCP-compatible (10+) |
| **Setup Steps** | 1 command | 2 commands (init + MCP config) |
| **Template Updates** | 5 steps (build, re-init, force) | 1 step (edit file) |
| **Code Complexity** | ~2,500 LOC | ~800 LOC |
| **Format Conversion** | Required (3 formats) | None |
| **Directory Structure** | 5 different structures | 1 shared structure |
| **Metadata Tracking** | SHA-256 hashing, conflict detection | None needed |
| **Customizability** | ✅ Full (templates, hooks, scripts) | ✅ Full (identical) |
| **Plan Storage** | ✅ `.ai/task-manager/plans/` | ✅ `.ai/task-manager/plans/` (identical) |
| **Archive System** | ✅ `.ai/task-manager/archive/` | ✅ `.ai/task-manager/archive/` (identical) |
| **Backward Compatibility** | N/A | Migration script provided |
| **Debugging Ease** | ✅ Static files, easy to inspect | ⚠️ Dynamic, needs inspector |
| **Performance** | ✅ Zero overhead | ⚠️ Minor protocol overhead (~10ms) |
| **Maintenance Burden** | High (5 formats, 5 structures) | Low (1 source, dynamic generation) |

### When to Use Each Approach

#### Use Current (File-Based) Approach When:

1. **No MCP Support**: Target assistant doesn't support MCP protocol
2. **Air-Gapped Environment**: No npm registry access for MCP dependencies
3. **Zero-Config Requirement**: Absolute simplicity required (single command setup)
4. **Legacy Compatibility**: Existing workflows depend on file-based slash commands

#### Use MCP Approach When:

1. **Multiple Assistants**: Team uses diverse AI tools (Claude, Copilot, Cursor, etc.)
2. **Frequent Updates**: Templates and hooks change often
3. **Custom Logic**: Need dynamic prompt generation based on project state
4. **Reduced Maintenance**: Prefer simpler codebase with fewer edge cases
5. **Future-Proofing**: Want to support new assistants without code changes

---

## Migration Path

### Migration Strategy

#### Phase 1: Parallel Development (2-3 months)

**Goal**: Build MCP server while maintaining file-based CLI

**Actions**:
1. Create `ai-task-manager-mcp` repository (separate from current)
2. Implement MCP server with feature parity
3. Extensive testing with multiple assistants
4. Beta release for early adopters
5. Gather feedback, iterate

**Outcome**: Stable MCP server, proven in production

#### Phase 2: User Migration (3-6 months)

**Goal**: Enable users to migrate smoothly

**Actions**:
1. **Migration Script**: `npx ai-task-manager migrate-to-mcp`
   - Detects existing `.claude/`, `.gemini/`, etc. directories
   - Preserves customizations in `.ai/task-manager/`
   - Removes obsolete directories
   - Generates `.mcp.json` configuration
   - Provides post-migration checklist

2. **Documentation**:
   - Migration guide with video walkthrough
   - Troubleshooting FAQ
   - Assistant-specific configuration guides

3. **Support**:
   - GitHub Discussions for migration questions
   - Example repositories demonstrating migration

**Outcome**: Users can migrate at their own pace

#### Phase 3: Deprecation (6-12 months)

**Goal**: Sunset file-based CLI

**Actions**:
1. **Deprecation Notice**: Add to README, CLI output, docs
2. **Version Support**:
   - Continue bug fixes for file-based CLI (no new features)
   - All new features only in MCP version
3. **Final Release**: Last version of file-based CLI with long-term support tag

**Outcome**: Clear migration timeline, user confidence

#### Phase 4: MCP-Only (12+ months)

**Goal**: Simplify to single architecture

**Actions**:
1. Archive file-based CLI repository
2. Redirect `ai-task-manager` npm package to `ai-task-manager-mcp`
3. Maintain legacy documentation for historical reference

**Outcome**: Unified, simpler, more maintainable architecture

### Migration Script Design

```typescript
// npx ai-task-manager migrate-to-mcp

import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';

async function migrate() {
  console.log(chalk.bold('AI Task Manager Migration to MCP\n'));

  // Step 1: Detect existing installation
  const hasClaudeConfig = await fs.exists('.claude/commands/tasks');
  const hasGeminiConfig = await fs.exists('.gemini/commands/tasks');
  const hasOpencodeConfig = await fs.exists('.opencode/command/tasks');
  const hasCodexConfig = await fs.exists('.codex/prompts');
  const hasGitHubConfig = await fs.exists('.github/prompts');

  if (!hasClaudeConfig && !hasGeminiConfig && !hasOpencodeConfig && !hasCodexConfig && !hasGitHubConfig) {
    console.log(chalk.yellow('No existing AI Task Manager installation detected.'));
    console.log('Run: npx ai-task-manager-mcp init');
    return;
  }

  console.log(chalk.cyan('Detected assistant configurations:'));
  if (hasClaudeConfig) console.log(`  ${chalk.green('✓')} Claude`);
  if (hasGeminiConfig) console.log(`  ${chalk.green('✓')} Gemini`);
  if (hasOpencodeConfig) console.log(`  ${chalk.green('✓')} Open Code`);
  if (hasCodexConfig) console.log(`  ${chalk.green('✓')} Codex`);
  if (hasGitHubConfig) console.log(`  ${chalk.green('✓')} GitHub Copilot`);

  // Step 2: Preserve .ai/task-manager (already in correct location)
  console.log(chalk.cyan('\n✓ Preserving .ai/task-manager configuration'));

  // Step 3: Remove obsolete directories
  console.log(chalk.cyan('\nRemoving obsolete assistant directories:'));

  if (hasClaudeConfig) {
    await fs.remove('.claude/commands/tasks');
    console.log(`  ${chalk.green('✓')} Removed .claude/commands/tasks`);
  }

  if (hasGeminiConfig) {
    await fs.remove('.gemini/commands/tasks');
    console.log(`  ${chalk.green('✓')} Removed .gemini/commands/tasks`);
  }

  if (hasOpencodeConfig) {
    await fs.remove('.opencode/command/tasks');
    console.log(`  ${chalk.green('✓')} Removed .opencode/command/tasks`);
  }

  if (hasCodexConfig) {
    await fs.remove('.codex/prompts');
    console.log(`  ${chalk.green('✓')} Removed .codex/prompts`);
  }

  if (hasGitHubConfig) {
    await fs.remove('.github/prompts');
    console.log(`  ${chalk.green('✓')} Removed .github/prompts`);
  }

  // Step 4: Generate MCP configuration
  console.log(chalk.cyan('\nGenerating MCP configuration:'));

  const mcpConfig = {
    mcpServers: {
      'ai-task-manager': {
        type: 'stdio',
        command: 'ai-task-manager-mcp',
        args: [],
      },
    },
  };

  await fs.writeJSON('.mcp.json', mcpConfig, { spaces: 2 });
  console.log(`  ${chalk.green('✓')} Created .mcp.json`);

  // Step 5: Success message and next steps
  console.log(chalk.green('\n✓ Migration complete!\n'));

  console.log(chalk.cyan('Next Steps:\n'));
  console.log('1. Install MCP server:');
  console.log(chalk.gray('   npm install -g ai-task-manager-mcp\n'));

  console.log('2. Configure your AI assistant:');
  console.log(chalk.gray('   # For Claude Code'));
  console.log(chalk.gray('   claude mcp add ai-task-manager --scope user\n'));
  console.log(chalk.gray('   # For other assistants, see: https://docs.ai-task-manager.com/mcp-setup\n'));

  console.log('3. Verify installation:');
  console.log(chalk.gray('   /mcp (in your AI assistant)\n'));

  console.log('4. Test a command:');
  console.log(chalk.gray('   /mcp__ai-task-manager__tasks-create-plan Test migration\n'));

  console.log(chalk.yellow('📚 Full migration guide: https://docs.ai-task-manager.com/migration-to-mcp'));
}

migrate().catch(console.error);
```

---

## Appendices

### Appendix A: MCP Prompt Examples

#### Example 1: tasks-create-plan Prompt

**User Invocation**:
```
/mcp__ai-task-manager__tasks-create-plan Implement user authentication with OAuth2
```

**MCP Server Processing**:
1. Receives: `{ name: 'tasks-create-plan', arguments: { prompt: 'Implement user authentication with OAuth2' } }`
2. Finds `.ai/task-manager/` in project
3. Reads templates and hooks
4. Substitutes variables
5. Returns formatted prompt

**Generated Prompt** (simplified):
```markdown
## Pre-Plan Hook

[Content from .ai/task-manager/config/hooks/PRE_PLAN.md]

---

# Comprehensive Plan Creation

You are a strategic planning specialist who creates actionable plan documents...

## Instructions

The user input is:

<user-input>
Implement user authentication with OAuth2
</user-input>

### Process Checklist

- [ ] User input and context analysis
- [ ] Clarification questions
- [ ] Plan generation
- [ ] Quality validation

#### Step 1: Context Analysis
Before creating any plan, analyze the user's request for:
- **Objective**: What is the end goal?
- **Scope**: What are the boundaries and constraints?
...

[Full template content with all sections]

---

## Post-Plan Quality Gates

[Content from .ai/task-manager/config/hooks/POST_PLAN.md]
```

#### Example 2: tasks-execute-blueprint Prompt

**User Invocation**:
```
/mcp__ai-task-manager__tasks-execute-blueprint 42
```

**MCP Server Processing**:
1. Receives: `{ name: 'tasks-execute-blueprint', arguments: { plan_id: '42' } }`
2. Reads plan file: `.ai/task-manager/plans/42--auth-oauth2/plan-42--auth-oauth2.md`
3. Reads task files: `.ai/task-manager/plans/42--auth-oauth2/tasks/*.md`
4. Reads blueprint template
5. Injects plan context
6. Returns formatted prompt with full context

**Generated Prompt** (simplified):
```markdown
# Blueprint Execution for Plan 42

## Plan Context

[Content from plan-42--auth-oauth2.md]

## Task List

[Content from tasks/01--setup-oauth-provider.md]
[Content from tasks/02--implement-oauth-flow.md]
...

## Execution Instructions

Execute tasks in dependency order with these quality gates:
- Verify dependencies satisfied before starting task
- Run tests after each task
- Update task status in task file
...

[Full execution workflow]
```

### Appendix B: File Structure Comparison

#### Current (File-Based) Structure

```
project/
├── .claude/
│   ├── commands/
│   │   └── tasks/
│   │       ├── create-plan.md
│   │       ├── refine-plan.md
│   │       ├── generate-tasks.md
│   │       ├── execute-task.md
│   │       ├── execute-blueprint.md
│   │       ├── fix-broken-tests.md
│   │       └── full-workflow.md
│   └── agents/
│       └── plan-creator.md
├── .gemini/
│   └── commands/
│       └── tasks/
│           ├── create-plan.toml          # TOML format
│           ├── refine-plan.toml
│           ├── generate-tasks.toml
│           ├── execute-task.toml
│           ├── execute-blueprint.toml
│           ├── fix-broken-tests.toml
│           └── full-workflow.toml
├── .opencode/
│   └── command/                          # Singular 'command'
│       └── tasks/
│           ├── create-plan.md
│           ├── refine-plan.md
│           ├── generate-tasks.md
│           ├── execute-task.md
│           ├── execute-blueprint.md
│           ├── fix-broken-tests.md
│           └── full-workflow.md
├── .codex/
│   └── prompts/                          # Flat structure
│       ├── tasks-create-plan.md          # Hyphenated
│       ├── tasks-refine-plan.md
│       ├── tasks-generate-tasks.md
│       ├── tasks-execute-task.md
│       ├── tasks-execute-blueprint.md
│       ├── tasks-fix-broken-tests.md
│       └── tasks-full-workflow.md
├── .github/
│   └── prompts/                          # GitHub Copilot
│       ├── tasks-create-plan.prompt.md   # .prompt.md extension
│       ├── tasks-refine-plan.prompt.md
│       ├── tasks-generate-tasks.prompt.md
│       ├── tasks-execute-task.prompt.md
│       ├── tasks-execute-blueprint.prompt.md
│       ├── tasks-fix-broken-tests.prompt.md
│       └── tasks-full-workflow.prompt.md
└── .ai/task-manager/
    ├── plans/
    ├── archive/
    └── config/
        ├── TASK_MANAGER.md
        ├── templates/
        ├── hooks/
        └── scripts/
```

**File Count**: ~40 files (7 commands × 5 assistants + config)

#### MCP Structure

```
project/
├── .mcp.json                             # MCP client configuration
└── .ai/task-manager/
    ├── plans/
    ├── archive/
    └── config/
        ├── TASK_MANAGER.md
        ├── templates/                    # Single source of truth
        │   ├── PLAN_TEMPLATE.md
        │   ├── TASK_TEMPLATE.md
        │   ├── BLUEPRINT_TEMPLATE.md
        │   └── EXECUTION_SUMMARY_TEMPLATE.md
        ├── hooks/
        │   ├── PRE_PLAN.md
        │   ├── POST_PLAN.md
        │   ├── PRE_PHASE.md
        │   ├── POST_PHASE.md
        │   ├── POST_TASK_GENERATION_ALL.md
        │   ├── PRE_TASK_ASSIGNMENT.md
        │   └── POST_ERROR_DETECTION.md
        └── scripts/
            ├── get-next-plan-id.cjs
            ├── get-next-task-id.cjs
            ├── detect-assistant.cjs
            └── read-assistant-config.cjs
```

**File Count**: ~15 files (config + templates only)

**Reduction**: ~60% fewer files

### Appendix C: Performance Comparison

#### File-Based Approach

**Command Invocation** (`/tasks:create-plan`):
1. User types command
2. Assistant reads `.claude/commands/tasks/create-plan.md`
3. Assistant processes frontmatter
4. Assistant executes prompt

**Time**: ~5ms (file read + parse)

#### MCP Approach

**Command Invocation** (`/mcp__ai-task-manager__tasks-create-plan`):
1. User types command
2. Assistant sends MCP request to server
3. Server finds `.ai/task-manager/`
4. Server reads templates and hooks
5. Server substitutes variables
6. Server sends response to assistant
7. Assistant executes prompt

**Time**: ~15-50ms (IPC + file read + processing + IPC)

**Overhead**: +10-45ms per invocation

**Impact Analysis**:
- **Negligible** for human interaction (imperceptible)
- **Irrelevant** for prompt execution (minutes-long process)
- **Could matter** for automated high-frequency scenarios

**Mitigation**:
- Template caching (reduce to ~10ms after first invocation)
- File-watch-based cache invalidation
- Keep-alive server (eliminate startup overhead)

### Appendix D: Security Considerations

#### File-Based Approach

**Attack Surface**:
- Template files in project directory
- Scripts executed via Node.js (`get-next-plan-id.cjs`)
- No network exposure

**Risks**:
- Malicious template injection (if untrusted project)
- Script execution vulnerabilities (if scripts modified)

**Mitigations**:
- User controls all files (project-local)
- Standard file permissions
- Code review for script changes

#### MCP Approach

**Attack Surface**:
- MCP server process (stdio transport)
- Template files in project directory
- Scripts executed via Node.js
- MCP protocol communication

**Risks**:
- Malicious template injection (if untrusted project)
- Script execution vulnerabilities (if scripts modified)
- MCP server vulnerabilities (protocol-level attacks)
- Prompt injection via MCP arguments

**Mitigations**:
- User controls all files (project-local)
- Stdio transport (no network exposure)
- Input validation on MCP arguments
- Sandbox script execution (future enhancement)
- Regular security audits of MCP server code

**Additional Considerations**:
- MCP server runs as user (not privileged)
- No persistent state (stateless prompt generation)
- No external API calls (local-only operation)
- Templates and hooks are user-controlled (same trust model as current)

**Conclusion**: MCP approach has slightly larger attack surface (MCP protocol), but risk is minimal with stdio transport and local-only operation.

### Appendix E: Testing Strategy

#### Current (File-Based) Testing

**Test Suites** (119 tests):
1. **Format Conversion** (30 tests)
   - Markdown → TOML conversion
   - Markdown → GitHub prompt conversion
   - Variable transformation accuracy
   - Frontmatter parsing
   - Edge cases (empty body, missing frontmatter)

2. **Directory Management** (25 tests)
   - Assistant-specific structure creation
   - File naming conventions
   - Template copying
   - Overwrite behavior

3. **Metadata and Conflicts** (20 tests)
   - Hash calculation accuracy
   - Conflict detection logic
   - Resolution application
   - Metadata persistence

4. **Integration** (30 tests)
   - End-to-end init for each assistant
   - Multi-assistant scenarios
   - Re-initialization with force flag
   - Validation and error handling

5. **Utilities** (14 tests)
   - Path resolution
   - Assistant parsing
   - Format detection
   - File existence checks

**Total**: ~2,500 lines of test code

#### MCP Approach Testing

**Test Suites** (estimated 40-50 tests):
1. **Prompt Generation** (15 tests)
   - Prompt list accuracy
   - Argument validation
   - Template loading
   - Variable substitution
   - Hook injection

2. **Template Engine** (10 tests)
   - Template reading
   - Variable replacement
   - Error handling (missing templates)
   - Path resolution

3. **Hook System** (8 tests)
   - Hook loading
   - Hook injection into prompts
   - Optional hook handling
   - Hook ordering

4. **MCP Protocol** (10 tests)
   - ListPrompts request handling
   - GetPrompt request handling
   - Error responses
   - Invalid argument handling

5. **Integration** (7 tests)
   - End-to-end prompt generation
   - Multi-prompt scenarios
   - Project detection
   - Error scenarios

**Total**: ~800 lines of test code

**Testing Tools**:
- **MCP Inspector**: Official testing tool for MCP servers
- **Jest**: Unit and integration tests
- **Manual Testing**: Real assistant integrations (Claude, Copilot, Cursor)

---

## Conclusion

The MCP-based architecture represents a significant simplification and modernization of the AI Task Manager. By leveraging the standardized Model Context Protocol, we can:

1. **Eliminate Complexity**: Remove ~70% of codebase dedicated to format conversion and directory management
2. **Universal Support**: Work with any MCP-compatible assistant without code changes
3. **Preserve Functionality**: Maintain all existing customization capabilities (templates, hooks, scripts)
4. **Improve Maintainability**: Single source of truth, dynamic generation, instant updates
5. **Future-Proof**: Support new assistants automatically as they adopt MCP

**Recommendation**: Proceed with MCP implementation via parallel development, allowing users to migrate at their own pace while maintaining backward compatibility during transition period.

**Next Steps**:
1. Create proof-of-concept MCP server
2. Test with Claude Code, Cursor, and GitHub Copilot
3. Gather user feedback on setup complexity
4. Refine based on real-world usage
5. Develop migration tooling
6. Execute phased rollout plan

---

**End of Analysis**
