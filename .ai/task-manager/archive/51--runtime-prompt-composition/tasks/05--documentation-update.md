---
id: 5
group: "documentation"
dependencies: [4]
status: "completed"
created: 2025-11-04
skills:
  - markdown
---
# Update Documentation for Prompt Composition Pattern

## Objective
Update AGENTS.md and CLAUDE.md documentation to explain the new runtime prompt-composition pattern for orchestration commands.

## Skills Required
- **markdown**: Technical documentation writing and structure

## Acceptance Criteria
- [ ] Add section to AGENTS.md explaining composition pattern
- [ ] Document when to use composition vs standalone commands
- [ ] Update command examples to reflect new behavior
- [ ] Add troubleshooting guidance for composition issues
- [ ] Include architecture diagrams or examples

Use your internal Todo tool to track these and keep on track.

## Technical Requirements
- **Files to Update**: `/workspace/AGENTS.md`, `/workspace/CLAUDE.md`
- **Content Focus**: Composition pattern explanation, usage guidelines, troubleshooting
- **Audience**: Future developers and AI assistants working with the codebase
- **Style**: Match existing documentation tone and structure

## Input Dependencies
- Task 2: Refactored `full-workflow.md` implementation
- Task 3: Refactored `execute-blueprint.md` implementation
- Task 4: Integration test results and patterns
- Plan 51: Architecture diagrams and technical approach

## Output Artifacts
- Updated `/workspace/AGENTS.md` with composition pattern section
- Updated `/workspace/CLAUDE.md` (if needed) with pattern documentation
- Clear guidelines for when to use each pattern

## Implementation Notes

<details>
<summary>Detailed Implementation Guidance</summary>

### Documentation Structure for AGENTS.md

Add a new section after the "AI Task Management System" section:

```markdown
### Orchestration Pattern: Runtime Prompt Composition

#### Overview
The orchestration commands (`/tasks:full-workflow` and `/tasks:execute-blueprint`) use a runtime prompt-composition pattern instead of invoking slash commands recursively. This enables uninterrupted workflow execution.

#### How It Works
Instead of calling `/tasks:create-plan` via the SlashCommand tool, orchestrators embed the create-plan.md prompt content directly inline with variable substitution.

**Traditional Pattern (Problematic)**:
```
/tasks:full-workflow → SlashCommand(/tasks:create-plan) → WAIT FOR USER
```

**Composition Pattern (Solution)**:
```
/tasks:full-workflow → Embed create-plan.md → Embed generate-tasks.md → Embed execute-blueprint.md → Complete
```

#### When to Use Each Pattern

**Use Standalone Commands** when:
- Running a single workflow step independently
- User review is needed between steps
- Debugging or testing individual components

**Use Orchestration Commands** when:
- Executing the complete workflow without interruption
- Automating the full development cycle
- The plan is already approved and ready for implementation

#### Architecture

[Include the mermaid diagram from Plan 51]

#### Troubleshooting

**Problem**: Full-workflow still pauses for user input
**Solution**: Verify the template file has been updated with embedded prompts, not SlashCommand invocations

**Problem**: Variables not substituted correctly
**Solution**: Check that Plan ID extraction uses the correct structured output format

**Problem**: Tasks not auto-generated in execute-blueprint
**Solution**: Verify conditional logic checks TASK_COUNT and BLUEPRINT_EXISTS correctly
```

### Updates to CLAUDE.md

If the enhanced features section needs updating:
- Add composition script to "Enhanced Features" if listing all scripts
- Update workflow command examples to reflect composition behavior
- Note the architectural shift in relevant sections

### Completeness Check

- [ ] Explain why the pattern was needed (SlashCommand limitation)
- [ ] Show before/after architecture
- [ ] Provide usage guidelines
- [ ] Include troubleshooting common issues
- [ ] Reference test coverage

</details>
