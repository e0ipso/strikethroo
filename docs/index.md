---
layout: default
title: Home
nav_order: 1
description: "Structured AI task management with plain text files and Agent Skills"
---

# AI Task Manager

[![npm version](https://img.shields.io/npm/v/@e0ipso/ai-task-manager.svg)](https://www.npmjs.com/package/@e0ipso/ai-task-manager)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)

AI Task Manager transforms complex development requests into structured, validated implementations through plain text files and Agent Skills. No API keys. No additional tools. Works within your existing AI subscription.

## Why AI Task Manager

- **Zero Tooling** -- No API keys, no services. Plain text files and Agent Skills within your existing AI subscription.
- **Multi-Harness Support** -- Works across Claude Code, Gemini CLI, GitHub Copilot, Codex, Cursor, OpenCode. Same plans, different tools.
- **Better Results Than Plan Mode** -- Separates planning from execution with human review gates and YAGNI enforcement.
- **Context Management** -- Each sub-agent gets clean, focused context. No quality degradation from context accumulation.

[Learn more about why AI Task Manager produces better results](why.html).

## Quick Start

```bash
# 1. Bootstrap the shared workspace in your project
npx @e0ipso/ai-task-manager init --harnesses claude

# 2. Install the workflow skills for your assistant
npx skills add e0ipso/ai-task-manager
```

See the [Getting Started guide](getting-started.html) for prerequisites, directory structure, and verification steps.

## How It Works

A work order enters the system and passes through three distinct phases -- plan creation, task generation, and execution -- with a human review gate between each phase. Each phase runs in its own context, and specialized sub-agents handle individual tasks during the execution phase. The result is tighter scope, higher quality, and full human control over what gets built. See [How It Works](how-it-works.html) for the full breakdown.

## Documentation

- [Getting Started](getting-started.html) -- Install and run your first workflow
- [Why AI Task Manager](why.html) -- The four pillars: zero tooling, multi-harness, better results, context management
- [How It Works](how-it-works.html) -- Three-phase workflow, context isolation, hooks, and configuration
- [Workflow Guide](workflow.html) -- Day-to-day usage and advanced patterns
- [Customization Guide](customization.html) -- Hooks, templates, and real-world scenarios
- [Reference](reference.html) -- Glossary, CLI reference, FAQ
- [Migrating from 1.x](migration.html) -- Upgrade from slash commands to Agent Skills
