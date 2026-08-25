Read `<root>/config/hooks/TASK_EXECUTION_ROUTING.md` and follow its
instructions together with this procedure:

1. Run `scripts/route-task-execution.cjs profiles <plan-id>` and interpret
   its JSON result. On `no-config` or `disabled`, routing is off: skip the
   remaining routing steps and continue. On `invalid-config`, stop and
   surface the errors to the user — do not generate the blueprint.
2. Classify every task in the plan's `tasks/` directory against the
   configured profile descriptions. For tasks generated in this run, use the
   task content already in your context — objective, acceptance criteria,
   technical requirements, `skills`, and `complexity_score`; do not reread
   the emitted task files to reconstruct information you already hold. If
   the plan carried task files from an earlier generation run, read those
   files (and only those) to classify them — the mapping must cover every
   task in the plan. Assign each task ID exactly one configured profile
   name. Never invent a profile name, model, or harness.
3. Write the complete task-ID-to-profile mapping as a JSON object to a
   temporary file, for example `{"1": "routine", "2": "demanding"}`.
4. Run
   `scripts/route-task-execution.cjs apply <plan-id> <mapping-file>`. The
   helper validates the mapping (every task exactly once, only configured
   profiles), writes one `execution_profile` frontmatter field per task, and
   verifies the written files. Target selection and resolver execution happen
   later at task dispatch, never during generation.
5. On `routed`, delete the temporary mapping file and continue. On any
   failure result (`invalid-assignments`, `invalid-tasks`,
   `routing-failure`, `infrastructure-failure`), stop
   and surface the JSON errors to the user. Never proceed to blueprint
   generation with partially routed tasks.

Profile names are durable routing labels. Persist them only through the
helper's `execution_profile` field; never hand-write a concrete `execution`
target into task frontmatter or task bodies.
