---
id: [PLAN-ID]
summary: "[Brief one-line description of what this plan accomplishes]"
created: [YYYY-MM-DD]
---

# Plan: [Descriptive Plan Title]

## Original Work Order
[The unmodified user input that was used to generate this plan, as a quote]

## Plan Clarifications [only add it if clarifications were necessary]
[Clarification questions and answers in table format]

## Executive Summary

[Provide a 2-3 paragraph overview of the plan. Include:
- What the plan accomplishes
- Why this approach was chosen
- Key benefits and outcomes expected]

## Context

### Current State vs Target State
[Create a table that compares the current state with the target state in the different aspects of the implementation. Include a column on why the change is necessary.]

Example:

| Current State            | Target State | Why?                      |
|--------------------------| ------------ |---------------------------|
| Users have to click twice | Users can click once | We want to improve the UX |
| The button is small | The button is bigger | Fix site design           |
| ... | ... | ...                       |

### Background
[Any additional context, requirements, constraints, any solutions that we tried that didn't work, or relevant history that informs the implementation approach.]

## Architectural Approach
[Provide an overview of the implementation strategy, key architectural decisions, and technical approach. Break down into major components or phases using ### subheadings. Add a mermaid diagram summary.]

### [Component/Stage 1 Name]
**Objective**: [What this component accomplishes and why it's important]

[Detailed & concise explanation of implementation approach, key technical decisions, specifications, and rationale for design choices.]

### [Component/Stage 2 Name]
**Objective**: [What this component accomplishes and why it's important]

[Detailed & concise explanation of implementation approach, key technical decisions, specifications, and rationale for design choices.]

### [Additional Components as Needed]
[Continue with additional technical components or phases following the same pattern]

## Risk Considerations and Mitigation Strategies

<details>
<summary>Technical Risks</summary>
- **[Specific Technical Risk]**: [Description of the technical challenge or limitation]
    - **Mitigation**: [Specific strategy to address this technical risk]
</details>

<details>
<summary>Implementation Risks</summary>
- **[Specific Implementation Risk]**: [Description of implementation-related challenge]
    - **Mitigation**: [Specific strategy to address this implementation risk]
</details>

[Additional Risk Categories as Needed: continue with other risk categories such as Integration Risks, Quality Risks, Resource Risks, etc.]

## Success Criteria

### Primary Success Criteria
1. [Measurable outcome 1]
2. [Measurable outcome 2]
3. [Measurable outcome 3]

## Self Validation

[Describe the concrete steps an LLM should execute after all tasks are completed to verify the implementation works correctly. These must be actionable verification procedures that inspect the real system — not just running pre-existing tests.

Examples of good validation steps:
- Use Playwright CLI to open a browser, navigate to the affected pages, and take screenshots to confirm the UI renders correctly
- Run a CLI command to query the database and verify the expected configuration or content exists
- Use `curl` or a browser automation tool to exercise the new API endpoints and confirm correct responses
- Take a screenshot of the form/page/component and visually verify the expected elements are present
- Run the application and interact with the new feature end-to-end, capturing evidence of success

Avoid vague statements like "verify it works" or "ensure quality". Each step must be a specific, executable action.]

## Documentation

[Required documentation updates to existing documentation, either human-focused documentation like README.md or AI-facing documentation like AGENTS.md and related configuration files.]

## Resource Requirements

### Development Skills
[Required technical expertise and specialized knowledge areas needed for successful implementation]

### Technical Infrastructure
[Tools, libraries, frameworks, and systems needed for development and deployment]

### [Additional Resource Categories as Needed]
[Other resources such as external dependencies, research access, third-party services, etc.]

## Integration Strategy
[Optional section - how this work integrates with existing systems]

## Notes
[Optional section - any additional considerations, constraints, or important context]
