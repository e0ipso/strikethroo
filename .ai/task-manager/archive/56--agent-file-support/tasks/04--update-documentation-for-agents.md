---
id: 4
group: documentation
dependencies:
  - 1
  - 2
  - 3
status: completed
created: '2025-11-19'
skills:
  - documentation
---

# Task: Update Documentation for Agent Support

## Objective

Update `AGENTS.md` project documentation to explain agent file support, Claude-only implementation rationale, agent file structure, and provide guidance for creating custom agents.

## Skills Required

- `documentation`: Technical writing and documentation structuring

## Acceptance Criteria

1. New "Agent File Support" section added to `AGENTS.md`
2. Explains Claude-only support with platform research findings
3. Documents agent file structure and YAML frontmatter schema
4. Provides examples of agent file format
5. Notes that Gemini uses MCP servers and Windsurf uses rules
6. Includes guidance for creating custom agents
7. Documents initialization behavior for agent files
8. Explains conflict detection for agents

## Technical Requirements

<details>
<summary>Implementation Details</summary>

### File to Modify
`/workspace/AGENTS.md`

### Content to Add

Add new section after "Orchestration Pattern: Runtime Prompt Composition" section:

```markdown
---

## Agent File Support

### Overview

Agent files enable spawning specialized AI assistants (subagents) with dedicated roles, tools, and permissions. As of 2025, only Claude Code has native agent file support. Gemini Code Assist uses MCP (Model Context Protocol) servers, and Windsurf uses a rules-based system for behavioral customization.

### Platform Support Status

| Platform | Agent Support | Alternative Extensibility |
|----------|---------------|---------------------------|
| **Claude Code** | ✅ Native (`.claude/agents/`) | N/A |
| **Gemini Code Assist** | ❌ No native support | MCP servers (`~/.gemini/settings.json`) |
| **Windsurf** | ❌ No native support | Rules system (`.windsurf/rules/`) |

### Claude Code Agent Files

#### Directory Structure

```
.claude/
├── agents/                    # Project-level agents
│   ├── plan-creator.md       # Strategic planning agent
│   └── .init-metadata.json   # Hash tracking for conflict detection
└── commands/                  # Command files (separate from agents)
```

**Note**: User-level agents can also be placed in `~/.claude/agents/` for availability across all projects.

#### Agent File Format

Agent files use Markdown with YAML frontmatter:

```markdown
---
name: plan-creator
description: |
  Use this agent to create comprehensive strategic plan documents combining
  business strategy and technical architecture. Specializes in context
  gathering, YAGNI enforcement, and producing actionable blueprints.
tools: Read, Grep, Glob, Bash, Edit, Write
model: sonnet
---

You are a strategic planning specialist who creates actionable plan documents...

## Core Mission
- Gather complete context through targeted clarification
- Enforce YAGNI (reduce scope by 20-30%)
...
```

#### YAML Frontmatter Schema

| Field | Required | Type | Description |
|-------|----------|------|-------------|
| `name` | ✅ Yes | string | Unique identifier (lowercase, hyphens only) |
| `description` | ✅ Yes | string | Natural language description of purpose and when to invoke |
| `tools` | ❌ No | string | Comma-separated tool list (omit to inherit all tools) |
| `model` | ❌ No | string | Model alias: `sonnet`, `opus`, `haiku`, or `inherit` |
| `permissionMode` | ❌ No | enum | `default`, `acceptEdits`, `bypassPermissions`, `plan`, `ignore` |
| `skills` | ❌ No | string | Comma-separated list of skill names to auto-load |

### Initialization Behavior

#### First-Time Initialization

When running `npx . init --assistants claude --destination-directory /path/to/project`:
- Creates `.claude/agents/` directory
- Copies agent files from `templates/assistant/agents/`
- Creates `.claude/agents/.init-metadata.json` with file hashes
- Displays created agent files in console output

#### Re-Initialization (Conflict Detection)

When running init on an existing installation:
- **No modifications**: Updates agent files silently
- **User modifications detected**: Prompts for keep/overwrite per file
- **Force flag**: Overwrites all files without prompting (`--force`)

Example conflict resolution prompt:
```
⚠  Detected 1 modified agent file(s). Prompting for resolution...

File: plan-creator.md
Modified: Yes (hash mismatch)
Options: [K]eep user version, [O]verwrite with template
```

### Creating Custom Agents

#### Step 1: Create Agent File

Create a new `.md` file in `.claude/agents/`:

```bash
# Example: Create a code review agent
touch .claude/agents/code-reviewer.md
```

#### Step 2: Define Agent Frontmatter

```yaml
---
name: code-reviewer
description: |
  Reviews code for quality, security vulnerabilities, and adherence to best
  practices. Provides actionable feedback with specific recommendations.
tools: Read, Grep, Glob
model: sonnet
---
```

#### Step 3: Write Agent Instructions

```markdown
You are a thorough code reviewer focused on quality and security.

## Review Checklist
- Security vulnerabilities (XSS, SQL injection, etc.)
- Code maintainability and readability
- Performance considerations
- Test coverage
...
```

#### Step 4: Invoke Agent

Use `@code-reviewer` in Claude Code to spawn the agent with specialized behavior.

### Key Differences: Agents vs Commands

| Aspect | Commands | Agents |
|--------|----------|--------|
| **Purpose** | User-invoked workflows | Specialized AI personas |
| **Invocation** | `/command-name` | `@agent-name` |
| **Location** | `.claude/commands/` | `.claude/agents/` |
| **Format** | Markdown + YAML | Markdown + YAML |
| **Variables** | ✅ Yes (`$ARGUMENTS`) | ❌ No (static prompts) |
| **Context** | Passed via variables | Dynamically provided at runtime |

### Platform-Specific Alternatives

#### Gemini Code Assist: MCP Servers

Gemini extends functionality via MCP servers configured in `~/.gemini/settings.json`:

```json
{
  "mcpServers": {
    "custom-server": {
      "command": "/path/to/mcp-server",
      "args": ["--option", "value"]
    }
  }
}
```

**Use Case**: Add external tools, APIs, or data sources to Gemini.

#### Windsurf: Rules System

Windsurf uses rules in `.windsurf/rules/` for behavioral customization:

```markdown
# .windsurf/rules/coding-standards.md

<coding_guidelines>
## Variable Naming
- Use camelCase for variables and functions
- Use PascalCase for classes and types
</coding_guidelines>
```

**Use Case**: Define coding conventions and project-specific guidelines.

### Troubleshooting

#### Agent Files Not Appearing

**Symptoms**: Running init with `--assistants claude` doesn't create `.claude/agents/`

**Solution**:
1. Verify source templates exist: `ls templates/assistant/agents/`
2. Check console output for error messages
3. Ensure using latest version: `npm run build && npm start init --assistants claude`

#### Conflict Detection Not Working

**Symptoms**: Re-init overwrites modified agents without prompting

**Solution**:
1. Check metadata exists: `ls .claude/agents/.init-metadata.json`
2. Verify metadata contains file hashes
3. Don't use `--force` flag unless intentional overwrite desired

#### Custom Agent Not Recognized

**Symptoms**: Claude Code doesn't find custom agent

**Solution**:
1. Verify file is in `.claude/agents/` directory
2. Check YAML frontmatter has required `name` and `description` fields
3. Ensure agent name uses lowercase and hyphens only
4. Restart Claude Code to refresh agent discovery

### Future Expansion

If Gemini or Windsurf introduce native agent support in future releases:
1. Update this documentation with platform-specific details
2. Extend CLI to support format conversion (Markdown → TOML for Gemini if needed)
3. Add platform-specific agent templates
4. Update initialization logic to handle multiple agent systems

For now, the Claude-only approach respects platform-native capabilities while maintaining option for future expansion.
```

</details>

## Input Dependencies

- Tasks 1-3 completed: Agent support fully implemented
- Research findings on platform differences
- Understanding of agent file structure and frontmatter schema

## Output Artifacts

- Updated `AGENTS.md` with comprehensive agent documentation
- User guidance for creating custom agents
- Platform comparison table for agent support

## Implementation Notes

<details>
<summary>Detailed Implementation Guidance</summary>

### Documentation Structure

The new section should be comprehensive but scannable:
1. **Overview**: High-level explanation (1-2 paragraphs)
2. **Platform Support Status**: Clear table showing what's supported
3. **Claude Code Agent Files**: Detailed implementation guide
4. **Creating Custom Agents**: Step-by-step tutorial
5. **Platform-Specific Alternatives**: Guidance for Gemini/Windsurf users
6. **Troubleshooting**: Common issues and solutions

### Writing Style

- **Professional and concise**: Match existing AGENTS.md tone
- **Code examples**: Use fenced code blocks with language tags
- **Visual aids**: Tables for comparisons, lists for steps
- **Cross-references**: Link to related sections when appropriate

### Key Messages to Convey

1. **Claude-only is intentional**: Not a limitation, but respecting platform-native capabilities
2. **Alternatives exist**: Gemini and Windsurf users have equivalent extensibility
3. **Future-proof**: Architecture supports expansion if other platforms add agents
4. **User-friendly**: Clear guidance for both using and creating agents

### Content Organization

```markdown
## Agent File Support          ← New section
├── Overview                   ← Why agents matter
├── Platform Support Status    ← Table: what's supported where
├── Claude Code Agent Files    ← Deep dive on Claude implementation
│   ├── Directory Structure
│   ├── Agent File Format
│   └── YAML Frontmatter Schema
├── Initialization Behavior    ← How init command handles agents
│   ├── First-Time Init
│   └── Re-Initialization
├── Creating Custom Agents     ← Tutorial for users
├── Key Differences           ← Agents vs Commands comparison
├── Platform Alternatives     ← Gemini MCP, Windsurf rules
├── Troubleshooting          ← Common issues
└── Future Expansion          ← What might change
```

### Testing the Documentation

After writing:
1. **Accuracy check**: Verify all technical details match implementation
2. **Completeness check**: Ensure all acceptance criteria covered
3. **Clarity check**: Have someone unfamiliar with agents read it
4. **Example validation**: Test all code examples work as shown

</details>
