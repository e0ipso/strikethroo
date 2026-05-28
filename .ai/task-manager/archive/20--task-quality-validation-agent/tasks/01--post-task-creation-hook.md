---
id: 1
group: "hook-integration"
dependencies: []
status: "completed"
created: "2025-09-06"
skills: ["template-processing"]
---

## Objective
Create the POST_TASK_CREATION.md hook file that automatically validates and enhances task quality after task generation, ensuring tasks contain sufficient context for execution by less capable LLM models.

## Skills Required
- **template-processing**: Hook file creation, markdown template design, and workflow integration

## Acceptance Criteria
- [x] POST_TASK_CREATION.md hook file created in `.ai/task-manager/config/hooks/`
- [x] Hook automatically triggers after task generation completion
- [x] Implements sub-agent selection by asking LLM to choose appropriate agent
- [x] Includes task quality assessment and enhancement logic
- [x] Provides fallback to general-purpose agents when specialized agents unavailable
- [x] Updates task files directly with enhanced content

## Technical Requirements
The hook must integrate seamlessly into the existing task management workflow by loading as a post-creation validation step. It should use the LLM to select appropriate sub-agents and enhance tasks that don't meet quality standards.

**Hook Integration Points:**
- Automatic execution after generate-tasks command completes
- Access to generated task files for assessment and enhancement
- Sub-agent selection through LLM prompting
- Direct task file modification for improvements

## Input Dependencies
None - this is the foundational hook file for the validation system.

## Output Artifacts
- `.ai/task-manager/config/hooks/POST_TASK_CREATION.md` hook file
- Sub-agent selection prompt integration
- Task validation and enhancement workflow
- Error handling and fallback mechanisms

## Implementation Notes
<details>
<summary>Detailed Implementation Guidance</summary>

**Hook File Structure:**
Create the hook file at `.ai/task-manager/config/hooks/POST_TASK_CREATION.md` with the following structure:

```markdown
# Post-Task Creation Quality Validation Hook

This hook automatically validates and enhances task quality after task generation to ensure tasks contain sufficient context for execution by less capable LLM models.

## Sub-agent Selection Process

Ask the LLM to select the most appropriate sub-agent for task validation by evaluating available agents against these criteria:
- AI prompt engineering and optimization expertise
- Task decomposition and clarity assessment capabilities
- Context completeness evaluation skills
- Instruction writing for less capable models

If no specialized agents are available, ask the LLM to use the general-purpose sub-agent with specific validation prompts.

## Task Quality Assessment

For each generated task, evaluate across four dimensions:

1. **Context Completeness**: All necessary information present without external references
2. **Instruction Clarity**: Explicit and unambiguous for limited reasoning models
3. **Dependency Transparency**: Clear statements of required inputs/prerequisites
4. **Acceptance Criteria Precision**: Measurable and specific success criteria

## Task Enhancement Process

When tasks fail quality validation:
1. Identify specific gaps in context, clarity, or completeness
2. Generate additional context and clarifications based on plan information
3. Expand abbreviated instructions into detailed, step-by-step guidance
4. Add explicit references to required files, dependencies, and success criteria
5. Update task files directly with enhanced information

## Implementation Logic

### Step 1: Sub-agent Selection
```
Please select the most appropriate sub-agent from the available agents for task quality validation.
Prioritize agents with expertise in:
- AI prompt engineering and optimization
- Task decomposition and clarity assessment
- Context completeness evaluation
- Instruction writing for less capable models

If no specialized validation agents are available, use the general-purpose sub-agent.
```

### Step 2: Task Assessment
For each task file in the current plan:
- Read task content and structure
- Assess against quality dimensions (score 0-100 each)
- Identify specific improvement areas
- Determine if enhancement is needed (threshold: 75+ on all dimensions)

### Step 3: Task Enhancement
For tasks scoring below threshold:
- Add missing context from plan information
- Clarify ambiguous instructions with step-by-step guidance
- Specify dependency requirements and expected inputs
- Enhance acceptance criteria with measurable outcomes
- Update task file with improvements

### Step 4: Validation Summary
- Report enhancement actions taken
- Log validation scores and improvements
- Provide summary of tasks processed

## Error Handling

- **No Sub-agents Available**: Continue with direct LLM validation using built-in prompts
- **Task File Access Issues**: Log errors and skip problematic tasks
- **Enhancement Failures**: Preserve original task content as fallback
- **Assessment Errors**: Use simplified validation checks

## Integration Requirements

The hook should:
- Execute automatically after generate-tasks command completion
- Access the current plan's task directory
- Modify task files in-place with enhancements
- Provide clear logging of actions taken
- Maintain task structure and frontmatter integrity
- Complete within reasonable time bounds (target: <2x generation time)

## Quality Control

- Preserve original task scope and requirements
- Focus on clarity and completeness, not feature expansion
- Maintain existing task structure and frontmatter schema
- Ensure enhanced tasks remain atomic and skill-specific
- Validate that all original acceptance criteria are preserved
</details>