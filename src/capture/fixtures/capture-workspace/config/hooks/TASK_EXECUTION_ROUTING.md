# TASK_EXECUTION_ROUTING Hook

Runs during task generation, after every task file for the plan exists and
before the execution blueprint is generated.

## Classification contract

- Execution profiles are defined in
  `.ai/strikethroo/config/execution-routing.yaml`. Their descriptions are the
  routing contract: match each newly generated task against them using the
  full task content already in your context — `skills`, `complexity_score`,
  objective, acceptance criteria, technical requirements, and integration
  surface. Do not reread task files to reconstruct information you already
  have.
- Classify every generated task exactly once, using only configured profile
  names. Never guess or invent a model, harness, or profile name.
- The task-to-profile mapping is a transient routing artifact. Only the exact
  `execution` mapping written by the routing helper is durable task metadata;
  profile names are never persisted.
- Any routing failure aborts task generation before blueprint generation.
  Never continue with partially routed tasks.

## Project-specific guidance

Add project-specific classification guidance here, for example:

- Prefer the most capable profile for tasks touching authentication,
  payments, or data migrations.
- Treat documentation-only or configuration-only tasks as routine work.
