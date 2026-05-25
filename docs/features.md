---
layout: default
title: Features
nav_order: 5
parent: Core Concepts
description: "Comprehensive features and capabilities of AI Task Manager"
---

# ✨ Features

AI Task Manager provides comprehensive tools for structured AI-assisted development workflows with a focus on customization and extensibility.

## 🔧 Configuration & Customization

**Tailor every aspect of the task management workflow to your project's specific needs.**

### Project Context
- **TASK_MANAGER.md**: Editable project context and guidelines that inform AI assistants about your tech stack, coding standards, and project-specific requirements
- **POST_PHASE.md**: Custom validation criteria and quality gates executed after each phase completion
- **Template Customization**: Modify plan and task templates to include project-specific sections, acceptance criteria, and workflow steps

### Extensibility Framework
- **Hook System**: Nine lifecycle hooks for injecting custom logic at key workflow points (PRE_PLAN, PRE_PHASE, POST_PHASE, POST_PLAN, POST_TASK_GENERATION_ALL, PRE_TASK_ASSIGNMENT, PRE_TASK_EXECUTION, POST_ERROR_DETECTION, POST_EXECUTION)
- **Custom Validation Gates**: Add project-specific quality checks, security scans, performance tests, or documentation requirements
- **Integration Points**: Connect with existing CI/CD pipelines, testing frameworks, or development tools
- **Workflow Patterns**: Create and share reusable workflow patterns for common project types

**Learn more**: See the [Customization Guide](customization.html) for detailed examples and real-world scenarios.

## 📋 Template System

**Consistent structure with flexibility for project-specific needs.**

### Core Templates
- **PLAN_TEMPLATE.md**: Strategic planning with requirement analysis, architecture decisions, and risk considerations
- **TASK_TEMPLATE.md**: Task structure with acceptance criteria, dependencies, and implementation notes
- **BLUEPRINT_TEMPLATE.md**: Phase-based execution plans with dependency graphs and parallelization strategies
- **EXECUTION_SUMMARY_TEMPLATE.md**: Post-completion documentation capturing results and learnings

### Template Features
- **YAML Frontmatter**: Structured metadata for plans, tasks, and execution tracking
- **Customizable Sections**: Add domain-specific content while preserving core structure
- **Variable Substitution**: Dynamic content based on context (plan ID, task ID, arguments)

**Learn more**: See the [Customization Guide](customization.html) for template modification examples.

## 🤝 Multi-Harness Support

The workflow is delivered through harness-agnostic Agent Skills installed via `npx skills add e0ipso/ai-task-manager`. A single skill works for every harness that supports the Agent Skills format, so there is no per-harness command surface to install or maintain.

All harnesses share the same task management structure under `.ai/task-manager/`. Initialize once per project, install the skills for each developer's harness, and team members can collaborate using different harnesses on the same plans.

**Note**: See [AGENTS.md](https://github.com/e0ipso/ai-task-manager/blob/main/AGENTS.md) for detailed setup instructions.

## 🔄 Workflow Orchestration

### Three-Phase Progressive Refinement

```mermaid
flowchart TD
    A[User Request] --> B[📝 Phase 1: Planning]
    B --> C[📋 Phase 2: Task Generation]
    C --> D[🚀 Phase 3: Execution]
    D --> E[✅ Quality Review]

    B --> B1[Requirements Analysis<br/>Stakeholder Clarification<br/>Architecture Planning]
    C --> C1[Atomic Task Breakdown<br/>Dependency Mapping<br/>Resource Allocation]
    D --> D1[Parallel Execution<br/>Progress Tracking<br/>Validation Gates]

    style A fill:#ffebee
    style E fill:#e8f5e8
    style B fill:#fff3e0
    style C fill:#f3e5f5
    style D fill:#e3f2fd
```

### Progressive Refinement Benefits
- **Context Isolation**: Each phase focuses on specific objectives without cognitive overload
- **Validation Gates**: Quality checkpoints between phases catch issues early
- **Iterative Improvement**: Human review and feedback loops at each phase
- **Scope Control**: Built-in mechanisms prevent feature creep through YAGNI enforcement
- **Automatic Task Generation**: execute-blueprint auto-generates tasks if missing, reducing manual steps

**Learn more**: See the [Architecture](architecture.html) page for design principles and [Workflow Patterns](workflows.html) for advanced usage.

## 🚀 Workflow Automation

### Automated End-to-End Execution

For streamlined development, the `task-full-workflow` skill automates all three phases. Ask your assistant to run the full task-manager workflow for a feature (for example, "Create user authentication system with JWT tokens"), and the skill chains plan creation, task generation, and blueprint execution together.

**Benefits:**
- **Single Invocation**: Entire workflow from plan to execution
- **Reduced Friction**: No manual phase transitions
- **Faster Iteration**: Ideal for clear requirements
- **Automatic Archival**: Completed plans moved to archive

**Use Cases:**
- Quick prototyping and proof-of-concepts
- Well-defined features with clear scope
- Reducing cognitive load during development
- Onboarding new users to the workflow

**Manual vs Automated:**
- Use automated workflow for straightforward implementations
- Use manual workflow (step-by-step) for complex features needing review

**Learn more**: See the [Workflow Guide](workflow.html) for detailed usage examples.

## 🎯 Task Management

### Atomic Task Decomposition
- **Single Responsibility**: Each task addresses one clear objective
- **Skill-Based Assignment**: Tasks tagged with 1-2 technical skills for specialized agent deployment
- **Dependency Tracking**: Automatic dependency resolution and sequencing
- **Complexity Analysis**: Automatic scoring identifies tasks requiring subdivision

### Quality Assurance
- **Acceptance Criteria**: Checkbox-based validation requirements for each task
- **Progress Tracking**: Real-time status updates (pending → in_progress → completed/failed)
- **Error Handling**: Graceful failure recovery with remediation workflows via POST_ERROR_DETECTION hook
- **Test Integrity**: the `fix-broken-tests` skill enforces proper test fixes, not workarounds

### Progress Monitoring & Dashboard

Real-time visibility into your project's task management state:

![Dashboard](img/dashboard.svg)

**Dashboard Features:**
- Summary statistics: total plans, active/archived counts, completion rates
- Active plans view with visual progress bars
- Unfinished task alerts for archived plans
- Color-coded terminal output for easy scanning

**Usage:**
```bash
npx @e0ipso/ai-task-manager status
```

## 📊 Plan Management CLI

### Inspect and Manage Plans

Command-line tools for plan inspection and lifecycle management:

```bash
# View plan details
npx @e0ipso/ai-task-manager plan show 41
npx @e0ipso/ai-task-manager plan 41  # shorthand

# Archive completed plan
npx @e0ipso/ai-task-manager plan archive 41

# Delete plan permanently
npx @e0ipso/ai-task-manager plan delete 41
```

**Features:**
- **Plan Inspection**: View metadata, progress, and executive summary
- **Manual Archival**: Move completed plans from active to archive directory
- **Plan Deletion**: Permanently remove plans and all associated tasks
- **Shorthand Syntax**: `plan <id>` defaults to `plan show <id>`

**Benefits:**
- No manual file system navigation required
- Consistent interface across all plan operations
- Progress visibility without opening files
- Clean workspace management

**Learn more**: See the [Workflow Guide](workflow.html) for integrated usage patterns.

## 🏗️ Workspace Management

### Intelligent Initialization
- **Non-destructive Setup**: Detects existing project structures and merges safely
- **File Conflict Detection**: Hash-based tracking monitors user customizations
- **Interactive Resolution**: Shows unified diffs and prompts for conflicts
- **Force Mode**: `--force` flag bypasses prompts for automation scenarios
- **Smart Updates**: Automatically updates unchanged template files

### Directory Structure
Organized workspace with clear separation of concerns:
```
.ai/task-manager/       # Shared configuration
├── plans/              # Active plans and tasks
├── archive/            # Completed plans (preserved history)
├── config/             # Customizable hooks and templates
└── .init-metadata.json # Conflict detection tracking

.claude/agents/         # Claude agents (if --harnesses claude)
```

The workflow itself is delivered through Agent Skills installed via `npx skills add e0ipso/ai-task-manager`. Skills are not copied into the project tree; they live wherever your harness manages them.

## 🚀 Performance & Scalability

### Optimized Execution
- **Parallel Processing**: Independent tasks within phases execute concurrently via Task tool
- **Specialized Agents**: Skill-based agent deployment provides domain-specific context
- **Resource Management**: Intelligent allocation of AI assistant capabilities
- **Incremental Updates**: Only process changes, not entire workflows

### Enhanced ID Generation
- **Performance Optimization**: Fast empty directory checks (90% case)
- **Comprehensive Validation**: Multi-source ID detection (directories, filenames, frontmatter)
- **Error Handling**: Graceful degradation with informative error messages
- **Debug Support**: `DEBUG=true` environment variable for troubleshooting

## 🔒 Security & Privacy

### Local-First Architecture
- **No External Dependencies**: All data stored locally on your machine
- **No Data Transmission**: Works entirely within AI assistant interfaces
- **Full Control**: Complete ownership of plans, tasks, and project information
- **Offline Capable**: Most operations work without internet connectivity

### Best Practices
- **Secure Configuration**: No hardcoded credentials or API keys
- **Version Control**: Include customized hooks/templates in repository for team consistency
- **Audit Trail**: Comprehensive logging of decisions and outcomes in plan/task documents
- **Environment-Specific Settings**: Separate configuration for development, staging, production

## 💰 Subscription-Based Model

### Works Within Existing AI Subscriptions
- No additional API keys required
- No pay-per-token charges
- No external service dependencies
- Maximize value from current AI investments (Claude Pro/Max, Gemini subscriptions)

### Resource Optimization
- Efficient prompt structuring through phased approach
- Targeted context isolation minimizes redundant information
- Reusable templates and patterns reduce setup overhead
- Cached plans and tasks enable quick iteration
