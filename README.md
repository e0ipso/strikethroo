# 🤖 Strikethroo

[![npm version](https://img.shields.io/npm/v/strikethroo.svg)](https://www.npmjs.com/package/strikethroo)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)

![Dashboard](./docs/img/dashboard.svg)

**Strikethroo: extensible AI-powered plan and task management with customizable workflows and structured development processes.**

Transform complex AI prompts into organized, executable workflows through customizable hooks, templates, and progressive refinement. Works seamlessly within your existing AI subscriptions for Claude Code, Gemini CLI, and Open Code.

## 🚀 Quick Start

This project ships in two parts: the **skills** (installed by [vercel-labs/skills](https://github.com/vercel-labs/skills)) and the **workspace** (initialized by this CLI). Run both:

```bash
# 1. Install the Strikethroo skills for your assistant
npx skills add e0ipso/strikethroo

# 2. Initialize the .ai/strikethroo/ workspace
npx strikethroo init --harnesses claude --destination-directory .
```

The skills give your assistant the planning, decomposition, and execution workflow; the CLI bootstraps `.ai/strikethroo/` with hooks, templates, and the hash-tracked diff-on-conflict UX. Each step is independently re-runnable. See the [migration guide](https://mateuaguilo.com/strikethroo/migration.html) for upgrade flows from 1.x.

The CLI's `init` emits the shared workspace plus harness-specific agents (e.g., `.claude/agents/` for Claude). Other harnesses rely entirely on the installed skills.

## ✨ Key Benefits

- **🔧 Fully Customizable**: Tailor hooks, templates, and workflows to your project's specific needs
- **🎯 Extensible Architecture**: Add custom validation gates, quality checks, and workflow patterns
- **📋 Structured Workflows**: Three-phase progressive refinement with validation gates
- **🔄 Plan Mode Integration**: Enhance existing AI assistant features with structured task management
- **📊 Plan Inspection & Management**: View progress, archive completed work, and manage plans via CLI
- **💰 Works Within Subscriptions**: No additional API keys or costs required

## 📖 Documentation

### 🌐 **[Complete Documentation →](https://mateuaguilo.com/strikethroo/)**

Comprehensive guides covering:
- Installation and configuration
- Customization with hooks and templates
- Workflow patterns and best practices
- Architecture and design principles

## 🔄 Workflow Preview

Once the skills are installed, invoke the workflow by intent — the assistant auto-loads the matching skill. There are no slash commands to memorize.

**Automated end-to-end run:**

> "Run the full workflow to create a user authentication system."

The `st-full-workflow` skill handles plan creation, task generation, and blueprint execution in a single pass.

**Step-by-step (for manual review between phases):**

1. **📝 Create a plan** → "Create a plan for a user authentication system" (`st-create-plan` skill)
2. **🔍 Refine the plan** → "Refine plan 1" (`st-refine-plan` skill — useful when a second assistant should red-team the plan)
3. **📋 Generate tasks** → "Generate tasks for plan 1" (`st-generate-tasks` skill)
4. **🚀 Execute blueprint** → "Execute the blueprint for plan 1" (`st-execute-blueprint` skill)
5. **📊 Monitor progress** → `npx strikethroo status`
6. **🗂️ Manage plans** → `npx strikethroo plan show 1`

## 🤖 Supported Harnesses

| Harness | Interface | Setup Time |
|-----------|-----------|------------|
| 🎭 **Claude** | [claude.ai/code](https://claude.ai/code) | < 30 seconds |
| 🖱️ **Cursor** | Cursor IDE | < 30 seconds |
| 💎 **Gemini** | Gemini CLI | < 30 seconds |
| 📝 **Open Code** | Open source | < 30 seconds |
| 🔮 **Codex** | Codex CLI | < 30 seconds |
| 🐙 **GitHub Copilot** | VS Code / JetBrains IDEs | < 30 seconds |

## 📄 License

MIT License - Open source and free to use.
