---
layout: default
title: Glossary
parent: Reference
nav_order: 1
description: "Canonical definitions of Strikethroo terms"
---

# Glossary

Canonical definitions of the terms used throughout Strikethroo.

| Term | Definition |
|------|-----------|
| **Work order** | The user's request describing what they want accomplished. Input to the system. |
| **Plan** | The comprehensive document the LLM produces by refining the work order. Covers requirements, architecture, risks, and success criteria. Output of the planning step. |
| **Execution blueprint** | The structured output of task generation. Contains all tasks organized into phases with dependency mappings. |
| **Phase** | A group of tasks within the execution blueprint. Tasks within a phase execute in parallel; phases execute in sequence. This is the unit of parallelism. |
| **Task** | An atomic unit of work within a phase. Has 1-2 skills, acceptance criteria, and dependencies. Executed by a sub-agent with clean context. |
| **Sub-agent** | A specialized AI agent that executes a single task with focused, clean context. Not the main conversation agent. |
| **Skill** | A harness-agnostic Agent Skill that implements one step of the workflow (e.g., `st-create-plan`, `st-execute-blueprint`). Skills load automatically when the user's intent matches their description. |
| **Harness** | The AI assistant environment (Claude Code, Gemini CLI, GitHub Copilot, Codex, etc.) in which skills run. |
| **Hook** | A lifecycle callback (Markdown file) executed at a specific point in the workflow. Nine hooks are available: `PRE_PLAN`, `POST_PLAN`, `PRE_PHASE`, `POST_PHASE`, `PRE_TASK_ASSIGNMENT`, `PRE_TASK_EXECUTION`, `POST_TASK_GENERATION_ALL`, `POST_EXECUTION`, `POST_ERROR_DETECTION`. |
| **Workspace** | The `.ai/strikethroo/` directory tree containing plans, archive, config, hooks, and templates. Created by `init`. |
| **Archive** | The `archive/` subdirectory inside the workspace where completed plans are moved for historical reference. |
