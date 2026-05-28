# MCP vs File-Based Architecture - Quick Reference

**Last Updated**: 2025-11-23

---

## At a Glance

| Aspect | File-Based (Current) | MCP Approach |
|--------|---------------------|--------------|
| **Primary Artifact** | Static files in assistant directories | Dynamic prompts from MCP server |
| **Setup Complexity** | ⭐️ Simple (1 command) | ⭐️⭐️ Medium (2 steps) |
| **Maintenance** | ⭐️⭐️⭐️ Complex (5 formats) | ⭐️ Simple (1 format) |
| **Assistant Support** | 5 hardcoded | Any MCP-compatible (10+) |
| **Code Size** | ~2,500 LOC | ~800 LOC |
| **Update Speed** | 5 steps | 1 step (edit file) |

---

## Directory Structure

### Current (File-Based)

```
project/
├── .claude/commands/tasks/*.md           ← 7 Markdown files
├── .gemini/commands/tasks/*.toml         ← 7 TOML files
├── .opencode/command/tasks/*.md          ← 7 Markdown files
├── .codex/prompts/tasks-*.md             ← 7 Markdown files (flat)
├── .github/prompts/tasks-*.prompt.md     ← 7 GitHub prompt files
└── .ai/task-manager/                     ← Shared config
    ├── plans/
    ├── archive/
    └── config/
        ├── templates/
        ├── hooks/
        └── scripts/
```

**Total**: ~40 files across 5 directories

### MCP Approach

```
project/
├── .mcp.json                             ← MCP configuration (1 file)
└── .ai/task-manager/                     ← ALL config here
    ├── plans/
    ├── archive/
    └── config/
        ├── templates/                    ← Single source of truth
        ├── hooks/
        └── scripts/
```

**Total**: ~15 files in 1 directory

---

## Setup Instructions

### Current (File-Based)

```bash
# Step 1: Install
npm install -g ai-task-manager

# Step 2: Initialize
npx ai-task-manager init --assistants claude,gemini

# Step 3 (Codex only): Manual copy
cp -r .codex/prompts/* ~/.codex/prompts/
codex restart

# Done
```

### MCP Approach

```bash
# Step 1: Install
npm install -g ai-task-manager-mcp

# Step 2: Initialize project structure
cd /path/to/project
ai-task-manager-mcp init

# Step 3: Configure assistant
claude mcp add ai-task-manager --scope user

# Done - works with ALL MCP assistants
```

---

## Command Invocation

### Current (File-Based)

| Assistant | Command |
|-----------|---------|
| Claude | `/tasks:create-plan "Add dark mode"` |
| Gemini | `/tasks:create-plan "Add dark mode"` |
| Open Code | `/tasks:create-plan "Add dark mode"` |
| Codex | `/prompts:tasks-create-plan "Add dark mode"` |
| GitHub Copilot | `/tasks-create-plan Add dark mode` |

**Consistency**: Mostly consistent, but varies slightly

### MCP Approach

| Assistant | Command |
|-----------|---------|
| **All** | `/mcp__ai-task-manager__tasks-create-plan "Add dark mode"` |

**Consistency**: Identical across ALL assistants

---

## Template Updates

### Current (File-Based)

```bash
# Scenario: Update PLAN_TEMPLATE.md

# Step 1: Edit source
vim templates/ai-task-manager/config/templates/PLAN_TEMPLATE.md

# Step 2: Rebuild
npm run build

# Step 3: Re-initialize
npx ai-task-manager init --assistants claude,gemini --force

# Step 4: Verify files updated
ls .claude/commands/tasks/
ls .gemini/commands/tasks/

# Step 5 (if needed): Restart assistant
```

**Time**: ~2-5 minutes

### MCP Approach

```bash
# Scenario: Update PLAN_TEMPLATE.md

# Step 1: Edit file
vim .ai/task-manager/config/templates/PLAN_TEMPLATE.md

# Done - next invocation uses new template
```

**Time**: ~10 seconds

---

## Adding New Assistant Support

### Current (File-Based)

**Code Changes Required**:

1. Update `src/types.ts`:
   ```typescript
   export type Assistant = '... | newassistant';
   ```

2. Update `src/utils.ts` (`getTemplateFormat`):
   ```typescript
   case 'newassistant': return 'md';
   ```

3. Update `src/utils.ts` (`getAssistantConfig`):
   ```typescript
   newassistant: { dir: '.newassistant/commands', subdir: 'tasks' }
   ```

4. Add tests for new assistant
5. Build, test, release new version
6. Users must upgrade package

**Timeline**: 1-2 weeks (dev + test + release)

### MCP Approach

**Code Changes Required**: None

**User Action**:
```bash
# Just add MCP configuration for new assistant
# (if it supports MCP)
```

**Timeline**: Immediate (no package update needed)

---

## Customization Workflow

### Current (File-Based)

**Editing Templates**:
```bash
# Option 1: Edit generated files (gets overwritten on re-init)
vim .claude/commands/tasks/create-plan.md

# Option 2: Edit in .ai/task-manager (preferred)
vim .ai/task-manager/config/templates/PLAN_TEMPLATE.md
# Then re-run init to propagate
```

**Editing Hooks**:
```bash
vim .ai/task-manager/config/hooks/POST_PLAN.md
# Changes apply immediately (hooks are read from .ai/task-manager)
```

### MCP Approach

**Editing Templates**:
```bash
vim .ai/task-manager/config/templates/PLAN_TEMPLATE.md
# Changes apply immediately (MCP reads on each invocation)
```

**Editing Hooks**:
```bash
vim .ai/task-manager/config/hooks/POST_PLAN.md
# Changes apply immediately (MCP reads on each invocation)
```

**Consistency**: Same workflow for all customizations

---

## Debugging

### Current (File-Based)

**Check template content**:
```bash
cat .claude/commands/tasks/create-plan.md
```

**Check if template was copied correctly**:
```bash
diff templates/assistant/commands/tasks/create-plan.md \
     .claude/commands/tasks/create-plan.md
```

**Verify format conversion (Gemini)**:
```bash
cat .gemini/commands/tasks/create-plan.toml
# Check TOML syntax and variable substitution
```

**Transparency**: High (static files, easy to inspect)

### MCP Approach

**Check template content**:
```bash
cat .ai/task-manager/config/templates/PLAN_TEMPLATE.md
```

**Test MCP server**:
```bash
npx @modelcontextprotocol/inspector ai-task-manager-mcp
```

**Check generated prompt**:
```
# In MCP Inspector UI:
1. Select prompt: tasks-create-plan
2. Fill arguments: { "prompt": "test" }
3. View generated output
```

**Enable debug mode**:
```bash
DEBUG=ai-task-manager:* /mcp__ai-task-manager__tasks-create-plan
```

**Transparency**: Medium (requires MCP Inspector, but excellent tooling)

---

## Performance

### Current (File-Based)

**Command Execution**:
```
User types command
  ↓ ~5ms
Assistant reads static file
  ↓ ~1ms
Parses frontmatter
  ↓ immediate
Executes prompt
```

**Total Overhead**: ~5ms

### MCP Approach

**Command Execution**:
```
User types command
  ↓ ~5ms
Assistant → MCP Server (IPC)
  ↓ ~10ms
Server reads template
  ↓ ~5ms
Server processes (substitute vars, inject hooks)
  ↓ ~10ms
MCP Server → Assistant (IPC)
  ↓ ~10ms
Executes prompt
```

**Total Overhead**: ~40ms (without caching), ~15ms (with caching)

**User Impact**: None (imperceptible)

---

## Migration Script

### Automated Migration

```bash
npx ai-task-manager migrate-to-mcp
```

**What it does**:
1. ✅ Detects existing assistant configurations
2. ✅ Preserves `.ai/task-manager/` (no changes)
3. ✅ Removes obsolete directories (`.claude/`, `.gemini/`, etc.)
4. ✅ Generates `.mcp.json` configuration
5. ✅ Provides setup instructions for each detected assistant

**What it preserves**:
- All templates
- All hooks
- All scripts
- All plans and archives
- All customizations

**What it removes**:
- `.claude/commands/tasks/`
- `.gemini/commands/tasks/`
- `.opencode/command/tasks/`
- `.codex/prompts/`
- `.github/prompts/`

---

## Code Complexity

### Current (File-Based)

**Core Components**:
- `cli.ts` (60 LOC)
- `index.ts` (630 LOC) - directory management, template copying
- `utils.ts` (260 LOC) - format conversion
- `metadata.ts` (120 LOC) - hash tracking
- `conflict-detector.ts` (150 LOC) - conflict detection
- `prompts.ts` (100 LOC) - interactive prompts
- `types.ts` (290 LOC)

**Total**: ~2,500 LOC

### MCP Approach

**Core Components**:
- `index.ts` (200 LOC) - MCP server setup
- `prompts.ts` (250 LOC) - prompt handlers
- `template-engine.ts` (150 LOC) - template reading & substitution
- `hooks.ts` (100 LOC) - hook loading & injection
- `types.ts` (100 LOC)

**Total**: ~800 LOC

**Reduction**: 68% less code

---

## Testing

### Current (File-Based)

**Test Suites**: 7
**Tests**: 119
**Coverage**: Format conversion, directory creation, metadata tracking, conflict resolution

**Key Tests**:
- Markdown → TOML conversion accuracy
- Markdown → GitHub prompt conversion
- Variable transformation (`$ARGUMENTS` → `{{args}}`)
- Directory structure for each assistant
- Hash calculation and conflict detection

### MCP Approach

**Test Suites**: 5 (estimated)
**Tests**: 40-50 (estimated)
**Coverage**: Prompt generation, template loading, hook injection

**Key Tests**:
- MCP protocol compliance (ListPrompts, GetPrompt)
- Template reading and variable substitution
- Hook loading and injection
- Error handling
- Integration with MCP Inspector

**Reduction**: ~60% fewer tests needed

---

## Version Compatibility

### Current (File-Based)

**Package Updates**:
```bash
# User has v1.0.0 installed
npm install -g ai-task-manager

# v1.1.0 released with new features
npm update -g ai-task-manager

# Re-initialize to get new templates
npx ai-task-manager init --assistants claude --force
```

**Frequency**: Template updates require re-init

### MCP Approach

**Package Updates**:
```bash
# User has v1.0.0 installed
npm install -g ai-task-manager-mcp

# v1.1.0 released with new features
npm update -g ai-task-manager-mcp

# Done - server auto-uses new version
```

**Frequency**: Server updates apply immediately (no re-init)

**Template Updates**:
```bash
# Templates are in project, not package
# Users control when to update templates
# No forced updates
```

---

## Ecosystem Compatibility

### Current (File-Based)

**Supported Assistants** (as of 2025-11):
- ✅ Claude Code
- ✅ Gemini
- ✅ Open Code
- ✅ Codex CLI
- ✅ GitHub Copilot

**Future Assistants**: Require code changes

### MCP Approach

**Supported Assistants** (as of 2025-11):
- ✅ Claude Code
- ✅ Claude Desktop
- ✅ Cursor
- ✅ GitHub Copilot (VS Code, JetBrains)
- ✅ Windsurf
- ✅ Continue
- ✅ Cline
- ✅ Any future MCP-compatible assistant

**Future Assistants**: Automatic support (zero code changes)

---

## Security Model

### Current (File-Based)

**Threat Model**:
- User controls all files in project
- Scripts execute with user permissions
- No network communication
- No external dependencies at runtime

**Attack Surface**:
- Malicious template injection (requires project access)
- Script execution (requires modifying `.cjs` files)

### MCP Approach

**Threat Model**:
- User controls all files in project
- Scripts execute with user permissions
- MCP server runs as user process (stdio transport)
- No network communication (stdio only)
- No external dependencies at runtime

**Attack Surface**:
- Malicious template injection (requires project access)
- Script execution (requires modifying `.cjs` files)
- MCP server vulnerabilities (mitigated by stdio transport)
- Prompt injection via MCP arguments (validated)

**Difference**: Slightly larger attack surface (MCP protocol), but minimal with stdio transport

---

## Documentation Requirements

### Current (File-Based)

**User Documentation**:
- Installation guide
- Init command usage
- Per-assistant setup (5 guides)
- Template customization
- Hook customization
- Troubleshooting per assistant

**Developer Documentation**:
- Format conversion logic
- Directory structure mapping
- Adding new assistants
- Testing strategies

### MCP Approach

**User Documentation**:
- Installation guide
- Init command usage
- MCP configuration guide (per assistant)
- Template customization
- Hook customization
- General troubleshooting

**Developer Documentation**:
- MCP server implementation
- Template engine
- Hook system
- Testing with MCP Inspector

**Reduction**: Simpler docs (no format conversion, single structure)

---

## Rollout Timeline

### Recommended Phases

| Phase | Duration | Milestone |
|-------|----------|-----------|
| **1. Development** | 2-3 months | Feature parity, beta release |
| **2. Migration** | 3-6 months | Stable release, migration tooling |
| **3. Deprecation** | 6-12 months | Bug fixes only on file-based |
| **4. Sunset** | 12+ months | Archive file-based, MCP-only |

**Total Transition**: ~18-24 months for complete migration

---

## Decision Matrix

### Choose File-Based (Current) If:

- ✅ Target assistant has no MCP support
- ✅ Air-gapped environment
- ✅ Simplicity is paramount (single command)
- ✅ Existing workflows depend on static files

### Choose MCP Approach If:

- ✅ Team uses multiple assistants
- ✅ Templates change frequently
- ✅ Want reduced maintenance burden
- ✅ Future-proofing desired
- ✅ Dynamic prompt generation needed

---

## Bottom Line

**MCP Approach Wins On**:
- Maintainability (70% less code)
- Scalability (universal assistant support)
- Update speed (instant template changes)
- Future-proofing (automatic new assistant support)

**File-Based Wins On**:
- Setup simplicity (1 command vs 2)
- Transparency (static files vs dynamic)
- Zero dependencies (no MCP server)

**Recommendation**: MCP for new projects, gradual migration for existing

---

**See Also**:
- `mcp-architecture-analysis.md` - Full technical analysis
- `executive-summary.md` - High-level overview
