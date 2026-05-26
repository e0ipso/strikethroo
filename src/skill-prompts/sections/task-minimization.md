Read the entire plan. Identify all concrete deliverables **explicitly stated**.
Decompose each deliverable into atomic tasks only when genuinely needed.

**Task minimization (mandatory):**

- Create only the minimum number of tasks necessary. Target a 20–30%
  reduction from comprehensive lists by questioning the necessity of each
  candidate.
- **Direct Implementation Only**: a task corresponds to an explicit
  requirement, not a "nice-to-have".
- **DRY Task Principle**: each task has a unique, non-overlapping purpose.
- **Question Everything**: for each task, ask "Is this absolutely necessary
  to meet the plan objectives?"
- **Avoid Gold-plating**: resist comprehensive features the plan does not
  require.

**Antipatterns to avoid:**

- Separating "error handling" from the main implementation when it can be
  inline.
- Splitting trivially small operations into multiple tasks (e.g. "validate
  input" + "process input" as separate units).
- Adding tasks for "future extensibility" or "best practices" the plan does
  not mention.
- Comprehensive test suites for trivial functionality.
