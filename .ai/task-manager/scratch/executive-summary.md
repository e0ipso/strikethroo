# MCP Architecture Migration - Executive Summary

**Date**: 2025-11-23
**Full Analysis**: See `mcp-architecture-analysis.md` in this directory

---

## TL;DR

**Yes, the AI Task Manager can be reimplemented as an MCP server with saved prompts.** This approach would eliminate ~70% of the current codebase complexity while providing universal assistant support and preserving all existing functionality.

**Recommendation**: Proceed with parallel development, releasing MCP version alongside current file-based CLI with gradual migration path.

---

## Key Findings

### ✅ Fully Feasible

- All current functionality can be preserved
- Templates, hooks, and scripts work identically
- Plan/archive storage unchanged
- Same level of customizability

### 📊 Significant Benefits

| Metric | Current | MCP Approach | Improvement |
|--------|---------|--------------|-------------|
| **Lines of Code** | ~2,500 | ~800 | 70% reduction |
| **Supported Assistants** | 5 hardcoded | 10+ (any MCP client) | 2x+ more |
| **Template Formats** | 3 (MD, TOML, GitHub) | 1 (MD only) | Zero conversion |
| **Directory Structures** | 5 different | 1 shared | Zero fragmentation |
| **Update Process** | 5 steps | 1 step | 80% faster |
| **File Count** | ~40 files | ~15 files | 60% fewer |

### ⚠️ Tradeoffs

1. **Requires MCP Support**: Only works with MCP-compatible assistants (but most modern ones are)
2. **Setup Complexity**: Two-step setup instead of one (init + MCP config)
3. **Minor Overhead**: +10-50ms per prompt invocation (imperceptible to users)
4. **New Concept**: Users need to understand MCP configuration

---

## What Changes

### Removed ❌

- `.claude/commands/` directory
- `.gemini/commands/` directory
- `.opencode/command/` directory
- `.codex/prompts/` directory
- `.github/prompts/` directory
- Format conversion code (~300 LOC)
- Directory management code (~400 LOC)
- Metadata/conflict detection code (~300 LOC)

### Added ✅

- `.mcp.json` configuration file (1 file)
- MCP server implementation (~800 LOC total)
- Dynamic prompt generation from templates

### Preserved ✅

- **100% of .ai/task-manager/** structure
- All templates (PLAN_TEMPLATE.md, TASK_TEMPLATE.md, etc.)
- All hooks (PRE_PLAN.md, POST_PLAN.md, etc.)
- All scripts (get-next-plan-id.cjs, etc.)
- Plan storage in `plans/` directory
- Archive system
- All customization capabilities

---

## How It Works

### Current Approach (File-Based)

```
User types: /tasks:create-plan
          ↓
Assistant reads: .claude/commands/tasks/create-plan.md
          ↓
Executes prompt
```

### MCP Approach

```
User types: /mcp__ai-task-manager__tasks-create-plan
          ↓
Assistant → MCP Server (via stdio)
          ↓
Server reads: .ai/task-manager/config/templates/PLAN_TEMPLATE.md
Server injects: .ai/task-manager/config/hooks/PRE_PLAN.md
Server substitutes: $ARGUMENTS with user input
          ↓
MCP Server → Assistant (formatted prompt)
          ↓
Executes prompt
```

**Key Difference**: Templates served dynamically instead of copied statically

---

## Setup Comparison

### Current Setup

```bash
# One command
npx ai-task-manager init --assistants claude

# Creates:
# .claude/commands/tasks/*.md
# .gemini/commands/tasks/*.toml
# .ai/task-manager/
```

### MCP Setup

```bash
# Step 1: Initialize structure
npx ai-task-manager-mcp init

# Creates:
# .ai/task-manager/
# .mcp.json

# Step 2: Configure assistant
claude mcp add ai-task-manager --scope user

# Done - works with all MCP assistants
```

---

## Usage Comparison

### Current Usage

```
# Different commands for different assistants
/tasks:create-plan (Claude)
/prompts:tasks-create-plan (Codex)
/tasks-create-plan (GitHub Copilot)
```

### MCP Usage

```
# Same command for ALL assistants
/mcp__ai-task-manager__tasks-create-plan

# Works in: Claude, Gemini, Cursor, Copilot, Windsurf, Continue, Cline, etc.
```

---

## Migration Path (Recommended)

### Phase 1: Parallel Development (2-3 months)

- Build MCP server in separate repository
- Achieve feature parity
- Beta testing with early adopters

### Phase 2: User Migration (3-6 months)

- Release stable MCP version
- Provide migration script: `npx ai-task-manager migrate-to-mcp`
- Document assistant-specific setup guides
- Support both versions

### Phase 3: Deprecation (6-12 months)

- Announce deprecation of file-based CLI
- Bug fixes only (no new features)
- Continue support for existing users

### Phase 4: MCP-Only (12+ months)

- Archive file-based repository
- Redirect npm package to MCP version
- Unified architecture going forward

---

## What Users Retain

### ✅ Complete Customization

**Templates** (same workflow):
```bash
# Edit templates
vim .ai/task-manager/config/templates/PLAN_TEMPLATE.md

# Changes take effect immediately
/mcp__ai-task-manager__tasks-create-plan Test
```

**Hooks** (same workflow):
```bash
# Edit hooks
vim .ai/task-manager/config/hooks/POST_PLAN.md

# Changes apply on next invocation
```

**Scripts** (same workflow):
```bash
# Edit scripts
vim .ai/task-manager/config/scripts/get-next-plan-id.cjs

# MCP server executes modified script
```

### ✅ Plan Management (unchanged)

```
.ai/task-manager/plans/28--feature-name/
├── plan-28--feature-name.md
├── tasks/
│   ├── 01--task-one.md
│   └── 02--task-two.md
└── execution-summary-28.md

# Stored in exact same format
# Archive system works identically
```

---

## Code Complexity Reduction

### Format Conversion (REMOVED)

**Current** (~300 LOC):
```typescript
convertMdToToml()           // Markdown → TOML
convertMdToGitHubPrompt()   // Markdown → GitHub format
escapeTomlString()          // TOML escaping
parseFrontmatter()          // YAML parsing
// + variable transformation logic
// + format-specific handling
```

**MCP** (~50 LOC):
```typescript
readTemplate()              // Read Markdown
substituteVariables()       // Simple string replacement
// That's it - single format
```

### Directory Management (REMOVED)

**Current** (~400 LOC):
```typescript
createAssistantStructure()  // 5 different structures
getAssistantConfig()        // Directory mapping
getCommandFileName()        // File naming logic
// + copying logic for each assistant
// + special handling for Codex, GitHub
```

**MCP** (~100 LOC):
```typescript
findTaskManagerPath()       // Find .ai/task-manager
loadHooks()                 // Load hooks from directory
// That's it - single shared structure
```

---

## When to Use Each Approach

### Use Current (File-Based) ✅

- Target assistant doesn't support MCP
- Air-gapped environment (no npm access)
- Absolute simplicity required (single command)
- Existing workflows depend on files

### Use MCP Approach ✅

- Team uses multiple AI assistants
- Templates change frequently
- Want simplified maintenance
- Future-proofing for new assistants
- Need dynamic prompt generation

---

## Risk Assessment

### Low Risk ✅

- **Technical Feasibility**: MCP is proven, widely adopted
- **Feature Parity**: All functionality preserved
- **Testing**: MCP Inspector provides excellent testing tools
- **Migration**: Automated script handles transition

### Medium Risk ⚠️

- **User Adoption**: Requires learning MCP configuration (mitigated by docs)
- **Debugging**: Less transparent than static files (mitigated by logging)
- **Assistant Support**: Depends on MCP adoption (currently excellent)

### Mitigations

- Comprehensive documentation with videos
- Interactive setup wizard
- Migration script with validation
- Parallel support during transition
- Active community support

---

## Performance Impact

### Overhead Analysis

**Current**: ~5ms (file read + parse)
**MCP**: ~15-50ms (IPC + processing + IPC)

**Difference**: +10-45ms per command

**User Impact**: Zero (imperceptible in human interaction)

**Mitigation**: Template caching (reduce to ~10ms after first use)

---

## Recommended Next Steps

1. **Proof of Concept** (1-2 weeks)
   - Build minimal MCP server with 2-3 prompts
   - Test with Claude Code and Cursor
   - Validate architecture assumptions

2. **Full Implementation** (4-6 weeks)
   - Complete all 7 prompts
   - Implement hook system
   - Template engine with caching
   - Comprehensive testing

3. **Documentation** (2 weeks)
   - Setup guides for each assistant
   - Migration documentation
   - Video tutorials
   - Troubleshooting FAQ

4. **Beta Release** (2-4 weeks)
   - Early adopter program
   - Gather feedback
   - Iterate on UX issues
   - Performance tuning

5. **Stable Release** (1 week)
   - Final polish
   - Release announcements
   - Begin migration period

**Total Timeline**: ~3 months to stable release

---

## Conclusion

The MCP architecture represents a **strategic modernization** that:

- **Simplifies** codebase by 70%
- **Expands** assistant support by 2x+
- **Eliminates** format conversion complexity
- **Preserves** all user-facing functionality
- **Future-proofs** against new assistant releases

**Verdict**: Proceed with implementation via phased rollout.

---

**For Full Technical Details**: See `mcp-architecture-analysis.md`
