---
id: 5
group: "documentation"
dependencies: [3]
status: "completed"
created: "2025-12-02"
skills:
  - technical-writing
---
# Update Documentation for Cursor Support

## Objective
Update AGENTS.md documentation to include Cursor assistant support, workflow instructions, and directory structure information.

## Skills Required
- Technical writing for developer documentation

## Acceptance Criteria
- [ ] AGENTS.md includes Cursor in "Core Value Proposition" section
- [ ] "Assistant-Specific Differences" section documents Cursor workflow
- [ ] Directory structure diagram includes `.cursor/` paths
- [ ] Initialization examples include Cursor
- [ ] Command invocation examples show Cursor syntax
- [ ] Documentation is clear, accurate, and follows existing style

Use your internal Todo tool to track these and keep on track.

## Technical Requirements

Update `AGENTS.md` to document:
1. Cursor as 6th supported assistant (alongside Claude, Codex, Gemini, GitHub, OpenCode)
2. Cursor-specific workflow and usage
3. Directory structure: `.cursor/commands/tasks/`
4. Command invocation: `/tasks/create-plan`, `/tasks/generate-tasks`, etc.
5. File format: Markdown with $ARGUMENTS placeholder

## Input Dependencies
Requires Task 3 (init logic) to be completed so documentation accurately reflects implementation.

## Output Artifacts
Updated `AGENTS.md` with comprehensive Cursor documentation.

## Implementation Notes

<details>
<summary>Click to expand detailed implementation instructions</summary>

### Section 1: Update "Core Value Proposition"

Location: Near the top of AGENTS.md (around line 35)

Current text mentions:
> Multi-Assistant Support: Unified workflow across Claude, Gemini, Open Code, and Codex platforms

Update to:
> Multi-Assistant Support: Unified workflow across Claude, Codex, Cursor, Gemini, GitHub, and Open Code platforms

### Section 2: Update Project Initialization Examples

Location: "Project Initialization" section (around line 44)

Add Cursor to the initialization examples:

```markdown
# Initialize for Cursor
npx . init --assistants cursor --destination-directory /path/to/project

# Initialize for multiple assistants including Cursor
npx . init --assistants claude,cursor,gemini --destination-directory /path/to/project
```

### Section 3: Update Directory Structure Diagram

Location: "Generated Project Structure" section (around line 127)

Add Cursor to the directory tree structure:

```markdown
├── .cursor/commands/tasks/        # Cursor commands (Markdown)
│   ├── create-plan.md
│   ├── refine-plan.md
│   ├── generate-tasks.md
│   ├── execute-task.md
│   ├── execute-blueprint.md
│   ├── fix-broken-tests.md
│   └── full-workflow.md
```

Insert this after the `.codex/` section and before `.gemini/` to maintain alphabetical order.

### Section 4: Add "Cursor Workflow" Section

Location: "Assistant-Specific Differences" section (around line 169)

Add a new subsection between Codex and GitHub sections:

```markdown
#### Cursor Workflow

Cursor is an AI-powered code editor built on VS Code that supports custom slash commands:

**Directory Structure**:
- Uses nested directory structure in `.cursor/commands/tasks/`
- File naming pattern: standard names (e.g., `create-plan.md`, `generate-tasks.md`)
- All files stored in the tasks subdirectory

**User Workflow**:
1. Run initialization: `npx . init --assistants cursor --destination-directory /path/to/project`
2. Commands are automatically discovered by Cursor when typing `/` in the editor
3. Invoke commands using `/tasks/` prefix: `/tasks/create-plan`, `/tasks/generate-tasks`, etc.

**Key Differences**:
- **Automatic Discovery**: Cursor automatically detects project-level commands in `.cursor/commands/`
- **Nested Structure**: Uses `tasks/` subdirectory for organization (like Claude and Gemini)
- **Markdown Format**: Uses standard Markdown with `$ARGUMENTS` placeholder (like Claude)
- **No Manual Setup**: Unlike Codex, no file copying or IDE restart required

**Command Invocation Examples**:
```bash
# Create a new plan
/tasks/create-plan Implement user authentication system

# Refine an existing plan
/tasks/refine-plan 51

# Generate tasks from a plan
/tasks/generate-tasks 51

# Execute a single task
/tasks/execute-task 51 3

# Execute the complete blueprint
/tasks/execute-blueprint 51

# Full automated workflow
/tasks/full-workflow Add dark mode toggle to application settings

# Fix broken tests
/tasks/fix-broken-tests npm test
```

**Key Features**:
- **Nested Directory Support**: Commands organized in subdirectories for better structure
- **Native Placeholder Support**: `$ARGUMENTS` works natively (no conversion needed)
- **Automatic IDE Integration**: Commands appear automatically in Cursor's command palette
- **No Manual Setup**: Commands work immediately after init (no copying or restart)

**Beta Status Note**:
Cursor's slash commands feature is in beta and subject to change. The implementation uses standard Markdown format to ensure easy adaptation to future updates.
```

### Section 5: Update "Adding New Assistant Support" Example

Location: "Adding New Assistant Support" section (around line 394)

Update the example to reference Cursor instead of a hypothetical "newassistant":

```markdown
**Example: Cursor Implementation**

The Cursor assistant was added with these characteristics:
- **Nested directory structure**: `.cursor/commands/tasks/` with subdirectories (like Claude/Gemini)
- **Standard file naming**: `create-plan.md`, `generate-tasks.md`, etc.
- **Markdown format**: Uses `.md` files like Claude, Codex, GitHub, and Open Code
- **Automatic discovery**: Cursor detects project-level commands automatically
- **Command prefix**: `/tasks/*` for organized command structure

These characteristics were handled through:
- Type system update in `src/types.ts`
- Validation updates in `src/utils.ts`
- Using existing template processing pipeline (no special logic needed)
- Following established patterns from Claude and Gemini
```

### Section 6: Update Reference Lists

Search for any lists that enumerate supported assistants and add Cursor:

1. **Supported assistants lists**: Add Cursor in alphabetical order
2. **Command examples**: Include Cursor where multiple assistants are shown
3. **Feature comparison tables**: Add Cursor column if such tables exist

### Documentation Style Guidelines

- **Consistency**: Match the existing documentation style and formatting
- **Alphabetical Order**: When listing assistants, maintain alphabetical order: Claude, Codex, Cursor, Gemini, GitHub, Open Code
- **Accuracy**: Ensure all technical details match the implementation
- **Completeness**: Cover all aspects covered for other assistants
- **Clarity**: Write for developers who may be new to the system

### Verification Steps

1. Read through the updated documentation to ensure it flows naturally
2. Verify all code examples are syntactically correct
3. Check that Cursor is mentioned consistently throughout the document
4. Ensure the directory structure diagram is formatted correctly
5. Confirm all section headings follow the existing hierarchy

### Important Notes

- Cursor uses **nested structure** (`.cursor/commands/tasks/`) not flat like Codex
- Cursor uses **Markdown format** like Claude, not TOML like Gemini
- Cursor has **automatic discovery** unlike Codex which requires manual setup
- Cursor is in **beta status** - mention this to set user expectations
- The documentation should help users understand when to choose Cursor vs other assistants

</details>
