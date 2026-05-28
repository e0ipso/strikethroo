---
id: 1
group: "command-implementation"
dependencies: []
status: "completed"
created: "2025-09-06"
skills: ["bash", "markdown"]
---

# Create Execute Task Command

## Objective
Create a new command file at `templates/assistant/commands/tasks/execute-task.md` that executes individual tasks with dependency validation, argument parsing, agent selection, and status management.

## Skills Required
- `bash`: Command logic, argument parsing, file operations, and script integration
- `markdown`: Command structure with proper YAML frontmatter formatting

## Acceptance Criteria
- [ ] Command file created with proper frontmatter structure (`argument-hint: [plan-ID] [task-ID]`)
- [ ] Argument parsing validates both plan ID and task ID are provided
- [ ] Plan and task location logic using find commands following existing patterns
- [ ] Integration with dependency checking script at `@templates/ai-task-manager/config/scripts/check-task-dependencies.sh`
- [ ] Agent selection logic matching skills from task frontmatter
- [ ] Status management with transitions: pending → in-progress → completed/failed
- [ ] Error handling with clear user feedback for all failure scenarios
- [ ] Consistent patterns with existing execute-blueprint command

Use your internal TODO tool to track these and keep on track.

## Technical Requirements
- Follow established command patterns from `create-plan.md` and `execute-blueprint.md`
- Use `$1` for plan ID and `$2` for task ID arguments
- Implement find command pattern: `find .ai/task-manager/{plans,archive} -name "${PLAN_ID}--*"`
- Call dependency script: `@templates/ai-task-manager/config/scripts/check-task-dependencies.sh $PLAN_ID $TASK_ID`
- Use Task tool for agent deployment with task context
- Update task status in frontmatter using appropriate file editing commands

## Input Dependencies
- Existing command patterns from other task commands
- Dependency checking script at specified location
- Task management directory structure

## Output Artifacts
- Complete execute-task command file ready for use
- Command that can execute individual tasks with full validation

## Implementation Notes
Follow the implementation order from the plan: command structure → argument parsing → task location → dependency validation → agent selection → status management → error handling. Prioritize reliability and clear error messages over performance optimization.