# PRE_TASK_ASSIGNMENT Hook

## Agent Selection and Task Assignment

- For each task in the current phase:
    - Read task frontmatter to extract the `skills` property (array of technical skills)
    - Analyze task requirements and technical domain from description
    - Match task skills against available sub-agent capabilities
    - Select the most appropriate sub-agent (if any are available). If no sub-agent is appropriate, use the general-purpose one.
    - Consider task-specific requirements from the task document

[IMPORTANT] Analyze the set of tasks skills in order to engage any relevant harness skills as necessary (either global
or project skills).


## Available Sub-Agents
Analyze the sub-agents available in your current harness's agents directory. If none are available or the available
ones do not match the task's requirements, then use a generic agent.

## Matching Criteria
Select agents based on:
1. **Primary skill match**: Task technical requirements from the `skills` array in task frontmatter
2. **Domain expertise**: Specific frameworks or libraries mentioned in task descriptions
3. **Task complexity**: Senior vs. junior agent capabilities
4. **Resource efficiency**: Avoid over-provisioning for simple tasks

## Skills Extraction and Agent Detection

1. Read the `skills` array from the task's YAML frontmatter directly.
2. Check for available sub-agents in your harness's agents directory.
3. If matching sub-agents are found, select the most appropriate one based on the task's required skills.
4. If no sub-agents are available or none match, use a general-purpose agent for task execution.
