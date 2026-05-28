# New Features Documentation Sections

This document contains comprehensive documentation for new features to be integrated into CLAUDE.md.

## Fix-Broken-Tests Command

### Command Overview

The `fix-broken-tests` command is a critical post-implementation validation tool designed to maintain code integrity while ensuring tests reflect actual working functionality. This command addresses the common problem of tests failing after implementation changes and provides structured guidance for proper test fixes.

### Command Syntax

```bash
# Execute via template (recommended)
/tasks:fix-broken-tests [test-command]

# Direct usage in supported assistants
fix-broken-tests "npm test"
fix-broken-tests "jest src/__tests__/utils.test.ts"
fix-broken-tests ""  # Will read test command from CLAUDE.md
```

### Critical Integrity Requirements

The fix-broken-tests command enforces strict integrity standards to prevent "test cheating" - a common anti-pattern where developers modify tests to pass rather than fixing the underlying code issues.

#### ❌ Absolutely Forbidden Practices (Test Cheating)

- **Skipping tests with conditionals**: Adding `if` statements or environment checks to bypass test execution
- **Modifying test assertions**: Changing expected values to match broken implementation
- **Adding test-environment-specific code**: Implementing special behavior in source code just for tests
- **Disabling or commenting out tests**: Removing failing tests instead of fixing the code
- **ANY workaround that doesn't fix the real bug**: Solutions that make tests green without addressing root causes

#### ✅ Required Approach (Legitimate Fixes)

- **Find the root cause in the source code**: Identify why the implementation doesn't meet test expectations
- **Fix the actual bug**: Modify source code to correctly implement the intended functionality
- **Ensure tests pass because the code truly works**: Green tests must indicate working functionality

### Implementation Process

The command follows a structured three-step process:

1. **Run all tests to identify failures**: Execute the full test suite to understand scope of issues
2. **Fix EVERY failing test iteratively**: Address each test failure by fixing source code
3. **Verify all tests pass legitimately**: Confirm that passing tests represent actual working functionality

### Usage Examples

#### Basic Test Fixing
```bash
# Fix tests after implementing a new feature
/tasks:fix-broken-tests "npm test"

# Fix specific test file after changes
/tasks:fix-broken-tests "jest src/__tests__/user-auth.test.ts"

# Fix tests when test command is documented in CLAUDE.md
/tasks:fix-broken-tests ""
```

#### Integration with Development Workflow
```bash
# Typical workflow after feature implementation
git add -A
git commit -m "feat: implement user authentication"
/tasks:fix-broken-tests "npm test"
# Only proceed after all tests pass legitimately
git add -A
git commit -m "fix: resolve test failures from authentication implementation"
```

### Quality Assurance Philosophy

The fix-broken-tests command embodies the project's core testing philosophy: **tests must be meaningful validators of functionality, not just green checkmarks**. This approach ensures:

- **Reliability**: Green tests genuinely indicate working code
- **Maintainability**: Tests serve as accurate documentation of expected behavior
- **Debugging efficiency**: Test failures point to real issues requiring attention
- **Code quality**: Implementation must meet established behavioral contracts

### Error Handling and Troubleshooting

When encountering test fixes that seem impossible to resolve properly:

1. **Analyze test expectations**: Understand what the test is validating
2. **Review implementation logic**: Identify gaps between expected and actual behavior  
3. **Consider design issues**: Tests may reveal flaws in implementation approach
4. **Seek help rather than cheat**: Ask for assistance instead of bypassing tests

### Integration with Testing Philosophy

The fix-broken-tests command aligns with the project's "Write a Few Tests, Mostly Integration" philosophy by focusing on meaningful test validation rather than comprehensive coverage. It emphasizes fixing tests that validate:

- Custom business logic
- Critical workflows
- Edge cases and error scenarios
- Integration points between components

---

## Enhanced ID Generation Scripts

### Overview

The ID generation system provides reliable, collision-free identification for plans and tasks through enhanced scripts with comprehensive error handling, debugging capabilities, and optimization features.

### Components

#### get-next-plan-id.cjs

**Purpose**: Generates the next available plan ID by scanning existing plan files across both active plans and archived plans.

**Key Features**:
- **Comprehensive directory traversal**: Automatically finds task manager root from any subdirectory
- **Multi-source ID validation**: Cross-references IDs from directory names, filenames, and frontmatter
- **Enhanced error handling**: Graceful handling of permission errors, corrupted files, and malformed data
- **Debug logging**: Optional detailed logging via `DEBUG=true` environment variable
- **Consistency validation**: Detects and reports ID mismatches between different sources

**Usage**:
```bash
# Generate next plan ID
node .ai/task-manager/config/scripts/get-next-plan-id.cjs

# With debug logging enabled
DEBUG=true node .ai/task-manager/config/scripts/get-next-plan-id.cjs
```

**Error Handling Improvements**:
- Permission denied errors are handled gracefully with warnings
- Malformed YAML frontmatter is detected and reported with specific error messages
- Filesystem access errors are logged with context but don't stop the scan
- ID validation includes range checking (negative numbers, overflow protection)

**Algorithm Details**:
1. Traverses upward from current working directory to find `.ai/task-manager/plans`
2. Scans both `plans/` and `archive/` directories for existing plan IDs
3. Extracts IDs from three sources: directory names (`25--plan-name`), filenames (`plan-25--plan-name.md`), and YAML frontmatter (`id: 25`)
4. Validates consistency between all sources and reports discrepancies
5. Returns highest ID found + 1

#### get-next-task-id.cjs

**Purpose**: Generates the next available task ID within a specific plan with performance optimizations for the common case of empty task directories.

**Key Features**:
- **Performance optimization**: Fast-path return for empty directories (90% case)
- **Flexible ID format support**: Handles both padded (`01`) and unpadded (`1`) plan ID formats
- **Resilient YAML parsing**: Multiple regex patterns handle various frontmatter formats
- **Graceful error handling**: Skips corrupted files without failing entire operation

**Usage**:
```bash
# Generate next task ID for plan 28
node .ai/task-manager/config/scripts/get-next-task-id.cjs 28

# Works with padded format as well
node .ai/task-manager/config/scripts/get-next-task-id.cjs 05
```

**Performance Optimizations**:
- Early return (ID 1) if plans directory doesn't exist
- Early return (ID 1) if specific plan's task directory is empty
- Minimal file I/O through optimized directory scanning
- Efficient regex patterns prioritized by common usage

**Frontmatter Format Support**:
```yaml
# All supported formats
id: 5                 # Simple numeric
id: "5"               # Double quoted
id: '5'               # Single quoted  
"id": 5               # Quoted key
'id': 5               # Single quoted key
id : 5                # Extra spaces
```

### Integration with Workflow

The ID generation scripts integrate seamlessly with the task management workflow:

1. **Plan Creation**: `get-next-plan-id.cjs` ensures unique plan IDs across active and archived plans
2. **Task Creation**: `get-next-task-id.cjs` provides unique task IDs within each plan
3. **Archive System**: Both scripts scan archived content to prevent ID collisions
4. **Error Recovery**: Robust error handling ensures workflow continuity even with filesystem issues

### Debugging and Troubleshooting

#### Debug Logging for Plan ID Generation
```bash
# Enable comprehensive debug output
DEBUG=true node .ai/task-manager/config/scripts/get-next-plan-id.cjs
```

Debug output includes:
- Directory traversal path and decisions
- File discovery and parsing attempts
- ID extraction from each source
- Consistency validation results
- Error context and recovery actions

#### Common Issues and Solutions

**ID Mismatch Errors**:
- Indicates inconsistency between directory name, filename, and frontmatter
- Review reported files and align ID values across all sources
- Use debug mode to understand which source contains the correct ID

**Permission Denied Warnings**:
- Script continues operation but warns about inaccessible directories
- Ensure adequate filesystem permissions for task manager directories
- Consider running with appropriate user privileges if needed

**No Task Manager Found**:
- Verify execution from within a project with initialized task manager
- Check that `.ai/task-manager/plans` directory exists
- Use absolute paths if running from unusual locations

---

## Archive System Workflows and Lifecycle Management

### Overview

The archive system provides automated lifecycle management for completed plans, maintaining project organization while preserving historical context and enabling post-completion analysis.

### Architecture

#### Directory Structure
```
.ai/task-manager/
├── plans/                    # Active plans
│   ├── 28--current-plan/     # Current working plans
│   └── 29--next-plan/
└── archive/                  # Completed plans
    ├── 01--archived-plan/    # Archived with full task history
    ├── 02--another-plan/     # Preserved directory structure
    └── 25--plan-id-generation-fix/
```

#### Lifecycle States

**Active Plans** (`plans/`):
- Currently being worked on
- Tasks in pending, in_progress, or recently completed status
- Full task subdirectories with implementation artifacts
- Regular ID generation scanning and validation

**Archived Plans** (`archive/`):
- Completed projects moved from active plans
- Preserved directory structure and task history
- Read-only reference for future development
- Included in ID generation scans to prevent collisions

### Archival Process

#### Manual Archival
```bash
# Move completed plan to archive
mv .ai/task-manager/plans/25--plan-id-generation-fix .ai/task-manager/archive/

# Verify archival
ls .ai/task-manager/archive/25--plan-id-generation-fix
```

#### Automated Archival Triggers

Plans become candidates for archival when:
- All tasks are marked as completed
- Plan status is marked as completed
- No active development for specified time period
- Project milestone completion is confirmed

### Benefits of the Archive System

#### Organization Benefits
- **Clean active workspace**: Only current projects visible in plans directory
- **Historical preservation**: Complete project history maintained in archive
- **Scalable structure**: Supports unlimited project history without performance degradation
- **Reference accessibility**: Easy access to past implementations and patterns

#### Development Benefits
- **Pattern reuse**: Archived plans serve as templates for similar future projects
- **Debugging context**: Historical implementation decisions available for troubleshooting
- **Learning resource**: Archive serves as knowledge base of completed solutions
- **Compliance tracking**: Maintains audit trail of project evolution

#### ID Management Benefits
- **Collision prevention**: Archived plan IDs remain reserved to prevent conflicts
- **Continuous numbering**: ID sequence continues across active and archived plans
- **Integrity assurance**: Validation scripts check both directories for consistency

### Accessing Archived Plans

#### Direct File Access
```bash
# Browse archived plan
ls .ai/task-manager/archive/25--plan-id-generation-fix/

# Read archived plan document
cat .ai/task-manager/archive/25--plan-id-generation-fix/plan-25--plan-id-generation-fix.md

# Review archived task
cat .ai/task-manager/archive/25--plan-id-generation-fix/tasks/01--analyze-current-id-detection.md
```

#### Reference for New Development
```bash
# Copy successful pattern from archive
cp .ai/task-manager/archive/25--plan-id-generation-fix/tasks/01--analyze-current-id-detection.md \
   .ai/task-manager/plans/28--current-plan/tasks/05--similar-analysis.md
```

### Archive Maintenance

#### Periodic Review Process
1. **Quarterly archive review**: Assess archived plans for permanent value
2. **Pattern documentation**: Extract reusable patterns from successful archived plans
3. **Storage optimization**: Consider compressing very old archived plans
4. **Knowledge transfer**: Document lessons learned from archived projects

#### Archive Integrity Validation
```bash
# Validate archived plan IDs don't conflict
DEBUG=true node .ai/task-manager/config/scripts/get-next-plan-id.cjs

# Check archive directory structure
find .ai/task-manager/archive -name "*.md" -type f | head -10
```

### Integration with Development Workflow

The archive system integrates with standard development practices:

#### Post-Completion Workflow
1. **Completion verification**: Confirm all tasks completed and objectives met
2. **Final documentation**: Update plan with completion notes and outcomes
3. **Archive migration**: Move plan directory from `plans/` to `archive/`
4. **Reference update**: Update any cross-references to archived plan location

#### Project Planning Benefits
- **Historical context**: Review similar archived plans before starting new projects
- **Effort estimation**: Use archived task completion data for planning
- **Risk assessment**: Learn from challenges documented in archived plans
- **Pattern application**: Apply successful patterns from archived implementations

---

## Enhanced Development Commands

### Updated Testing Statistics

The project maintains an efficient testing approach with enhanced metrics and validation:

**Current Test Statistics**:
- **Test Suites**: 3 passed, 3 total
- **Tests**: 67 passed, 67 total (up from previous 37 tests)
- **Execution Time**: ~3 seconds
- **Coverage Philosophy**: Deliberately selective coverage focusing on critical paths

### Enhanced Security and Maintenance Scripts

**Security Auditing**:
```bash
npm run security:audit        # Standard security audit
npm run security:audit-json   # JSON formatted audit output
npm run security:fix          # Automated security fixes
npm run security:fix-force    # Force security fixes for critical issues
```

**Build and Development**:
```bash
npm run build        # TypeScript compilation to dist/
npm run dev          # Watch mode with automatic recompilation
npm run clean        # Clean build artifacts
npm start            # Execute compiled CLI
```

**Code Quality**:
```bash
npm run lint         # ESLint validation (excludes test files)
npm run lint:fix     # Automated lint fixes
npm run format       # Prettier code formatting
```

### Enhanced Template System Capabilities

**Multi-Assistant Format Support**:
- **Markdown**: Native format for Claude and Open Code assistants
- **TOML**: Converted format for Gemini assistant integration
- **Variable transformation**: Automated conversion between format-specific syntax
- **Consistency validation**: Ensures functionality parity across all formats

**Template Processing Enhancements**:
- Improved variable substitution: `$ARGUMENTS` → `{{args}}`
- Enhanced frontmatter handling: Automatic format adaptation
- Error resilience: Graceful handling of malformed templates
- Debug capabilities: Detailed logging for template processing issues

---

## Testing Philosophy and Best Practices

### Enhanced Testing Philosophy: "Write a Few Tests, Mostly Integration"

The project implements a sophisticated testing strategy that prioritizes meaningful validation over comprehensive coverage metrics.

#### Core Principles

**Focus on Value, Not Volume**:
- Test business logic that could silently fail
- Prioritize integration tests over unit tests
- Use real filesystem operations instead of mocking
- Target critical workflows and edge cases

**Deliberate Coverage Strategy**:
- **Current Coverage**: 24% lines (deliberately selective)
- **Test Distribution**: Integration-heavy with targeted unit tests
- **Quality over Quantity**: 67 meaningful tests vs. hundreds of trivial tests
- **Fast Execution**: Complete test suite runs in ~3 seconds

#### What to Test

**High-Value Test Targets**:
- **Data transformation logic**: Parser functions, format conversions, validation
- **Complex business rules**: ID generation, dependency resolution, workflow logic
- **Error scenarios**: Graceful failure handling, input validation, edge cases
- **Integration points**: File system operations, cross-component interactions
- **Critical workflows**: End-to-end feature functionality

**Low-Value Test Targets (Avoid)**:
- Simple getters and setters
- Third-party library functionality
- Framework-provided features (Jest, Commander.js)
- Obvious utility functions
- Trivial CRUD operations

#### Test Structure and Organization

**Key Test Files**:
- `src/__tests__/utils.test.ts`: Business logic validation and data transformation
- `src/__tests__/cli.integration.test.ts`: End-to-end CLI workflows and integration
- `src/__tests__/get-next-plan-id.test.ts`: ID generation system validation

**Test Categories**:
1. **Integration Tests** (Primary): Real filesystem, complete workflows
2. **Unit Tests** (Selective): Critical business logic, complex algorithms
3. **Error Path Tests** (Essential): Edge cases, failure scenarios, input validation

#### Advanced Testing Patterns

**Real Filesystem Usage**:
```typescript
// Preferred approach - real filesystem operations
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-'));
fs.writeFileSync(path.join(tempDir, 'test.md'), content);
const result = processFile(path.join(tempDir, 'test.md'));
```

**Minimal Mocking Strategy**:
```typescript
// Mock only external dependencies, not internal logic
jest.mock('external-api-client');
// Don't mock internal filesystem operations - use real files
```

**Error Scenario Validation**:
```typescript
// Test both success and failure paths
expect(() => parseInvalidYaml(malformedContent)).toThrow('Invalid YAML');
expect(parseValidYaml(goodContent)).toEqual(expectedResult);
```

#### Quality Assurance Integration

**Automated Quality Gates**:
- Tests must pass before commits (via Husky pre-commit hooks)
- Lint and format validation integrated with test pipeline
- Security audit integration with build process
- Performance regression detection through execution time monitoring

**Manual Quality Reviews**:
- Test meaningfulness evaluation during code review
- Coverage gap analysis focused on risk areas
- Integration test effectiveness assessment
- Performance impact evaluation for new tests

#### Testing Best Practices for AI-Assisted Development

**Test Integrity Requirements**:
- Tests must validate actual working functionality
- No environment-specific workarounds in source code
- No conditional logic to bypass test failures
- Green tests must mean the code actually works

**Collaboration with Fix-Broken-Tests Command**:
- Tests are designed to be meaningful validators
- Failing tests indicate real implementation issues
- Test design supports proper debugging and root cause analysis
- Test fixes require source code changes, not test modifications

**Continuous Improvement**:
- Regular test effectiveness review
- Identification and elimination of flaky tests
- Performance optimization for fast feedback cycles
- Integration of new testing patterns as project evolves

This testing philosophy ensures that the test suite serves as a reliable indicator of system health while maintaining development velocity and providing meaningful feedback to developers and AI assistants alike.