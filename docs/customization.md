---
layout: default
title: Customization Guide
nav_order: 6
description: "Customizing hooks, templates, and workflows for your project"
---

# Customization Guide

AI Task Manager is built for extensibility. **Every aspect of the task management workflow can be tailored to your project's specific needs** through customizable hooks, templates, and configuration files.

This guide shows you how to adapt the system for your tech stack, coding standards, quality gates, and workflow patterns.

## Why Customize?

Out-of-the-box, AI Task Manager provides a solid foundation for structured AI-assisted development. Customization unlocks its full potential:

- **Project-Specific Quality Gates**: Add TypeScript compilation, test coverage thresholds, security scans, or performance benchmarks
- **Domain-Specific Templates**: Include acceptance criteria relevant to your industry (HIPAA compliance, GDPR requirements, accessibility standards)
- **Team Consistency**: Encode your organization's best practices into templates and hooks
- **Tool Integration**: Connect with existing CI/CD pipelines, testing frameworks, or documentation systems
- **Workflow Patterns**: Create reusable patterns for common project types (React apps, REST APIs, data pipelines)

## Hooks System

The hook system injects custom logic at seven key points in the workflow lifecycle. All hooks are Markdown files in `.ai/task-manager/config/hooks/` containing instructions that AI assistants interpret and execute.

### Available Hooks

#### 1. PRE_PLAN Hook

**File**: `PRE_PLAN.md`
**Purpose**: Pre-planning guidance executed before creating a comprehensive plan

**Key Functions**:
- Enforces YAGNI principle and prevents feature creep
- Promotes maintainable, straightforward solutions
- Ensures adequate context before plan generation

**Common Use Cases**:
- Add project-specific constraints ("Must use our existing auth library")
- Include architecture guidelines ("Prefer composition over inheritance")
- Reference existing documentation or design systems

#### 2. PRE_PHASE Hook

**File**: `PRE_PHASE.md`
**Purpose**: Phase preparation logic before starting any phase execution

**Key Functions**:
- Git branch management (creates feature branch from main if needed)
- Validates repository state (checks for unstaged changes)
- Task dependency validation using `check-task-dependencies.cjs`
- Confirms no tasks are marked "needs-clarification"

**Common Use Cases**:
- Add environment setup checks (Docker running, databases accessible)
- Validate tool versions (Node.js, npm, specific package versions)
- Check for required configuration files

#### 3. POST_PHASE Hook

**File**: `POST_PHASE.md`
**Purpose**: Quality gates executed after phase completion

**Current Implementation**:
- Ensure code passes linting requirements
- Create descriptive commit using conventional commits format

**Common Customizations**:
- Add test execution requirements
- Include code coverage thresholds
- Run security vulnerability scans
- Generate documentation
- Deploy to staging environment

#### 4. POST_PLAN Hook

**File**: `POST_PLAN.md`
**Purpose**: Simplified plan validation after initial plan creation

**Common Use Cases**:
- Validate plan against project requirements
- Check for required sections in plan document
- Notify team members or stakeholders

#### 5. POST_TASK_GENERATION_ALL Hook

**File**: `POST_TASK_GENERATION_ALL.md`
**Purpose**: Task complexity analysis, refinement, and blueprint generation after all tasks are created

**Key Functions**:
- Complexity scoring matrix (Technical, Decision, Integration, Scope, Uncertainty)
- Automatic decomposition of high-complexity tasks
- Dependency visualization using Mermaid diagrams
- Phase-based execution blueprint generation

**Common Customizations**:
- Adjust complexity thresholds for your team's capabilities
- Add project-specific complexity factors
- Modify parallelization strategies

#### 6. PRE_TASK_ASSIGNMENT Hook

**File**: `PRE_TASK_ASSIGNMENT.md`
**Purpose**: Agent selection based on task skills and available sub-agents

**Key Functions**:
- Extracts skills array from task frontmatter
- Matches skills to specialized agent capabilities
- Falls back to general-purpose agent if no match found

**Common Use Cases**:
- Configure custom skill categories
- Map skills to specific agent configurations
- Add fallback strategies for unmatched skills

#### 7. PRE_TASK_EXECUTION Hook

**File**: `PRE_TASK_EXECUTION.md`
**Purpose**: Pre-flight validation before each individual task is dispatched to an agent. Ships empty -- add your own checks.

**Common Customizations**:
- Add project-specific pre-flight checks (e.g., verify required services are running)
- Configure which checks are hard failures vs warnings
- Add environment validation (e.g., required env vars are set)

#### 8. POST_ERROR_DETECTION Hook

**File**: `POST_ERROR_DETECTION.md`
**Purpose**: Error handling procedures for task execution failures

**Key Functions**:
- Updates task status to "failed" in frontmatter
- Documents quality gate failures
- Provides remediation steps
- Re-executes affected tasks after fixes

**Common Customizations**:
- Add project-specific error categorization
- Implement custom retry strategies
- Send notifications for critical failures

#### 9. POST_EXECUTION Hook

**File**: `POST_EXECUTION.md`
**Purpose**: Final validation after all blueprint phases complete successfully, before execution summary generation and plan archival

**Key Functions**:
- Validates linting requirements across all code
- Ensures all tests pass
- Verifies all tasks are marked as completed
- Prevents plan archival if validation fails

**Common Customizations**:
- Add comprehensive test suite execution
- Run security vulnerability scans
- Verify documentation is up to date
- Check code coverage thresholds
- Validate deployment readiness

### Customization Example: POST_PHASE Hook

**Default Implementation:**
```markdown
Ensure that:
- The code base is passing the linting requirements
- A descriptive commit for the phase was successfully created
```

**Enhanced for React + TypeScript Project:**
```markdown
Ensure that:
- The code base is passing ESLint requirements
- TypeScript compilation succeeds with no errors (`tsc --noEmit`)
- All tests are run locally and passing (`npm test`)
- Test coverage is above 80% for new code
- No high-severity npm audit vulnerabilities
- Prettier formatting is applied (`npm run format`)
- A descriptive commit using conventional commits was created

If any checks fail:
1. Fix the issues
2. Re-run the validation
3. Do not proceed to the next phase until all checks pass
```

## Templates System

Templates provide consistent structure for plans, tasks, and execution artifacts. All templates are in `.ai/task-manager/config/templates/` and fully editable.

### Core Templates

#### 1. PLAN_TEMPLATE.md

**Purpose**: Structure for comprehensive project plans

**Frontmatter** (Required):
```yaml
id: [planId]
summary: "[userPrompt]"
created: "YYYY-MM-DD"
```

**Core Sections**:
- Original Work Order
- Plan Clarifications (Q&A format)
- Executive Summary
- Context and Background
- Technical Implementation Approach
- Risk Considerations
- Success Criteria
- Resource Requirements

**Customization Example - Adding Security Section:**
```markdown
## Security Considerations

### Authentication & Authorization
- Authentication method (OAuth2, JWT, session-based)
- Authorization model (RBAC, ABAC, ACL)
- Session management strategy

### Data Protection
- Encryption at rest (Yes/No, method)
- Encryption in transit (TLS version, certificate management)
- PII handling procedures

### Compliance Requirements
- GDPR compliance (Yes/No, specific requirements)
- HIPAA compliance (Yes/No, specific requirements)
- SOC 2 considerations
```

#### 2. TASK_TEMPLATE.md

**Purpose**: Structure for individual task documents

**Frontmatter** (Required):
```yaml
id: [task-number]
group: "[logical-grouping]"
dependencies: [list-of-task-ids]
status: "pending"
created: "YYYY-MM-DD"
skills: ["skill-1", "skill-2"]
```

**Core Sections**:
- Objective
- Skills Required
- Acceptance Criteria (checkbox list)
- Technical Requirements
- Input Dependencies
- Output Artifacts
- Implementation Notes

**Customization Example - Adding Performance Requirements:**
```markdown
## Performance Requirements
- [ ] Response time < 200ms for 95th percentile
- [ ] Database queries optimized (max 3 queries per request)
- [ ] Bundle size impact < 50KB for new code
- [ ] Lighthouse performance score > 90
```

#### 3. BLUEPRINT_TEMPLATE.md

**Purpose**: Phase-based execution blueprint structure

**Key Sections**:
- Quality Gates Reference (points to POST_PHASE.md)
- Phase Definitions with parallel tasks
- Post-phase Actions
- Execution Summary (phases, tasks, parallelism, critical path)

#### 4. EXECUTION_SUMMARY_TEMPLATE.md

**Purpose**: Post-completion documentation

**Sections**:
- Status: Completion status
- Completed Date: YYYY-MM-DD
- Results: Brief summary of deliverables
- Noteworthy Events: Challenges, findings, or "No significant issues"
- Recommendations: Follow-up actions or optimizations

#### 5. fix-broken-tests.md

**Purpose**: Systematic approach to fixing tests after implementation

**Critical Philosophy**:
- Green tests must reflect actual working code
- Fixing tests means fixing implementation, not assertions
- No shortcuts or workarounds

**Forbidden Practices**:
- Adding environment checks to bypass test execution
- Modifying assertions to match broken code
- Disabling or commenting out failing tests
- Test-environment-specific code in source files

## Real-World Customization Scenarios

### Scenario 1: React + TypeScript Project

**Goal**: Ensure all new components meet TypeScript, testing, and accessibility standards

**POST_PHASE.md Customization:**
```markdown
Ensure that:
- TypeScript compilation passes (`npm run build`)
- ESLint shows no errors (`npm run lint`)
- All tests pass with coverage > 80% (`npm test -- --coverage`)
- No console.log statements in production code
- All new components have PropTypes or TypeScript interfaces
- Accessibility checks pass (`npm run a11y`)
- A conventional commit was created
```

**TASK_TEMPLATE.md Addition:**
```markdown
## React-Specific Acceptance Criteria
- [ ] Component is functional (not class-based unless required)
- [ ] PropTypes or TypeScript interfaces defined
- [ ] Component has unit tests (> 80% coverage)
- [ ] Component is accessible (ARIA labels, keyboard navigation)
- [ ] Component is responsive (mobile, tablet, desktop)
- [ ] No prop drilling (use Context if needed)
```

**PRE_PLAN.md Addition:**
```markdown
## React Architecture Guidelines
- Use functional components with hooks
- Prefer composition over complex component hierarchies
- Keep components under 200 lines (split if larger)
- Co-locate styles with components
- Use existing design system components before creating new ones
```

### Scenario 2: REST API Project with Security Requirements

**Goal**: Ensure all endpoints have proper validation, authentication, and security controls

**POST_PHASE.md Customization:**
```markdown
Ensure that:
- All endpoints have input validation (Joi, Yup, or Zod schemas)
- Authentication middleware applied to protected routes
- OWASP security checks pass (helmet.js configured)
- API documentation updated (OpenAPI/Swagger)
- Integration tests cover happy and error paths
- No secrets in code (use environment variables)
- Security audit passes (`npm audit`)
- Conventional commit created
```

**TASK_TEMPLATE.md Addition:**
```markdown
## API Security Checklist
- [ ] Input validation implemented and tested
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS protection (output encoding)
- [ ] CSRF protection (tokens or SameSite cookies)
- [ ] Rate limiting configured for endpoint
- [ ] Authentication required (or explicitly public)
- [ ] Authorization checks (user can only access their data)
- [ ] Sensitive data not logged
```

**PLAN_TEMPLATE.md Addition:**
```markdown
## Security Architecture
- Authentication method (JWT, OAuth2, session)
- Authorization strategy (RBAC, resource-based)
- Data encryption (at rest, in transit)
- API rate limiting approach
- Input validation library
- Secrets management (environment variables, vault)
```

### Scenario 3: Monorepo with Multi-Package Coordination

**Goal**: Ensure changes across packages maintain compatibility and pass cross-package tests

**PRE_PHASE.md Customization:**
```markdown
Before starting each phase:

1. **Validate Workspace Dependencies**
   ```bash
   npm run workspace:check  # Custom script to verify package.json dependencies
   ```

2. **Check for Uncommitted Changes in Other Packages**
   - Ensure changes in current phase won't conflict with work in progress

3. **Verify Package Version Compatibility**
   - Check that interdependent packages use compatible version ranges

4. **Run Cross-Package Integration Tests** (if applicable)
   ```bash
   npm run test:integration:all
   ```
```

**TASK_TEMPLATE.md Addition:**
```markdown
## Package Context
- **Primary Package**: [package-name]
- **Dependent Packages**: [list of packages that depend on this]
- **Dependencies**: [list of packages this depends on]

## Cross-Package Acceptance Criteria
- [ ] Changes maintain backward compatibility (or breaking changes documented)
- [ ] Dependent packages' tests still pass
- [ ] Package README updated if public API changed
- [ ] CHANGELOG.md updated with changes
- [ ] Version bump follows semver (major.minor.patch)
```

**POST_PHASE.md Customization:**
```markdown
Ensure that:
- All affected packages pass linting
- All affected packages pass tests
- Cross-package integration tests pass
- Package interdependencies are valid (no circular deps)
- Documentation updated for any API changes
- Conventional commit created
```

## Best Practices for Customization

### 1. Version Control Your Customizations

Include customized hooks and templates in your repository:

```bash
git add .ai/task-manager/config/hooks/
git add .ai/task-manager/config/templates/
git commit -m "chore: customize task manager for React + TypeScript project"
```

This ensures:
- Team consistency (everyone uses same quality gates)
- Change tracking (see when and why hooks were modified)
- Easy rollback (revert problematic customizations)

### 2. Document Custom Fields

If you add custom sections to templates, document them in TASK_MANAGER.md:

```markdown
## Custom Template Fields

### TASK_TEMPLATE.md
- **Performance Requirements**: Added section for response time and resource usage criteria
- **Security Checklist**: Custom checklist for API security validation

### PLAN_TEMPLATE.md
- **Security Architecture**: Details authentication, authorization, and encryption approaches
```

### 3. Test Customizations with Small Tasks

Before applying customizations to large projects:

1. Create a test plan with simple requirements
2. Generate 1-2 tasks
3. Execute and verify hooks run as expected
4. Iterate on hook logic if needed

### 4. Start Minimal, Add Incrementally

Don't over-engineer hooks initially:

**Bad (Too Complex Initially):**
```markdown
Run 47 validation checks including performance profiling, visual regression tests,
load testing, security penetration testing, and deployment to 5 staging environments...
```

**Good (Start Simple):**
```markdown
Ensure that:
- Tests pass
- Linting passes
- Commit created

# Add more checks as team identifies needs:
# - Coverage threshold
# - Security scan
# - Documentation update
```

### 5. Use Conditional Logic for Context-Specific Rules

In hooks, you can include conditional instructions:

```markdown
## POST_PHASE Validation

### For All Phases
- Code passes linting
- Tests pass
- Commit created

### For Backend Tasks Only
If task skills include "api-endpoints" or "database":
- API integration tests pass
- Database migrations run successfully
- OpenAPI documentation updated

### For Frontend Tasks Only
If task skills include "react-components" or "ui":
- Component tests pass
- Accessibility checks pass
- No console.log statements
```

## Integration with Hooks and Templates

Hooks reference template structure:

- **PRE_PLAN** validates before using PLAN_TEMPLATE
- **POST_TASK_GENERATION_ALL** uses BLUEPRINT_TEMPLATE for organization
- **POST_PHASE** references status fields from TASK_TEMPLATE
- **Execute completion** applies EXECUTION_SUMMARY_TEMPLATE

This integration ensures consistent structure while allowing flexible validation through customizable hooks.

## Advanced Customization: Workflow Patterns

For even more control, create workflow pattern documentation in TASK_MANAGER.md:

```markdown
## Workflow Patterns for This Project

### Pattern 1: Feature Development
1. Create plan with user stories and acceptance criteria
2. Generate tasks, ensuring UI and API tasks are separated
3. Execute API tasks first (backend-first approach)
4. Execute UI tasks after API is stable
5. Run integration tests
6. Deploy to staging

### Pattern 2: Bug Fix
1. Create minimal plan focused on root cause
2. Generate 2-3 tasks max (reproduce, fix, test)
3. Execute with extra focus on regression tests
4. Hot-fix deployment process
```

These patterns guide AI assistants on project-specific workflows while still using the core three-phase workflow.

## Getting Help

**Questions about customization?**
- Review existing hooks in `.ai/task-manager/config/hooks/` for examples
- Check templates in `.ai/task-manager/config/templates/` for structure
- See [Workflow Guide](workflow.html) for advanced usage examples
- Reference [How It Works](how-it-works.html) for system capabilities
