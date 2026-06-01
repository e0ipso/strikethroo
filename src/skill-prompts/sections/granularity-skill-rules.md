Each task must be:

- **Single-purpose** — one clear deliverable.
- **Atomic** — cannot be meaningfully split further.
- **Skill-specific** — executable by an agent with 1–2 technical skills.
- **Verifiable** — has explicit acceptance criteria.

Skill assignment (kebab-case, automatically inferred from the task's
technical requirements):

- 1 skill — single-domain task (e.g. `["css"]`, `["vitest"]`).
- 2 skills — complementary domains (e.g. `["api-endpoints", "database"]`,
  `["react-components", "vitest"]`).
- 3+ skills indicates the task should be broken down further.
