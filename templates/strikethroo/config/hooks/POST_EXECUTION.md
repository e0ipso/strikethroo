# POST_EXECUTION Hook

## Validation Gates

Before marking the blueprint as complete, verify:

- [ ] All linting rules must pass without errors. If no linter is configured, skip this step
- [ ] All tests must pass successfully. If no test suite is configured, skip this step
- [ ] Verify all tasks in the plan have `status: "completed"` in their frontmatter
- [ ] Verify that the AGENTS.md documentation or related documents are still correct after this plan execution
- [ ] Execute the **Self Validation** steps defined in the plan document. These are concrete verification procedures (e.g., Playwright browser checks, database CLI queries, screenshots) that confirm the implementation works in the real system. If any step fails, treat it as a validation gate failure

## Cleanup
Assess whether the current plan has left tech debt behind or if it has created dead code. None of those are acceptable. Fix them and leave behind the most maintainable code change possible.

Backwards compatibility and legacy support are only tolerated if explicitly expressed by the user. Unless it is called out in the plan, you are to assume that backwards compatibility layers are tech debt that should be eliminated.

## Failure Behavior

If any validation gate fails:

- **Document the failure** in the plan file with details about which gate failed
- **Provide actionable next steps** for resolving the failure in a new task for the plan, following `<root>/config/templates/TASK_TEMPLATE.md`
- **Execute the task** using the `st-execute-task` skill
