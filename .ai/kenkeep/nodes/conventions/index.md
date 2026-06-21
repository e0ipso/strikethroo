---
schema_version: 2
nodes_hash: 'sha256:cd7b77c495afd40aaadf2f1c86899655974e37170ae684604d4dd4b859a4b4e4'
node_count: 2
summary: >-
  documentation and terminology conventions — current-state-only docs and the
  reserved meaning of phase
---
# kenkeep Index: conventions

↑ Parent: [kenkeep](../index.md)

> kenkeep navigation: the injected body above is the root index node, the top-level catalog of branches and root-level leaves. Do not expect the whole knowledge base here; descend on demand. Read the root index node, pick one or more branches whose intent and tags match your task (several branches can be relevant), and read those branch `index.md` nodes. Descend further only where the task needs it, opening only the leaves you have confirmed are relevant. Follow each leaf's `relates_to` and `depends_on` cross edges to reach related leaves in other branches. You decide how deep to go per branch.

## Subfolders
_None._

## Conventions (how we build)
- Open [**Documentation captures current state only**](practice-documentation-captures-current-state-only.md) to learn about: All docs describe how things work now. No historical context, migration notes, or retired-term mappings. #documentation #conventions
- Open [**Phase is reserved for execution blueprint task groups**](practice-phase-reserved-for-blueprint-task-groups.md) to learn about: "Phase" means parallel task batches in the blueprint. The three workflow stages are "steps", never "phases". #terminology #documentation #execution-blueprint

## Components (what exists)
_None yet._

## By topic

### #documentation
- Open [**Documentation captures current state only**](practice-documentation-captures-current-state-only.md) — All docs describe how things work now. No historical context, migration notes, or retired-term mappings.
- Open [**Phase is reserved for execution blueprint task groups**](practice-phase-reserved-for-blueprint-task-groups.md) — "Phase" means parallel task batches in the blueprint. The three workflow stages are "steps", never "phases".
- Open [**Use committed fixture workspaces, not the live gitignored .ai/strikethroo/ tree**](../testing/practice-use-committed-fixture-workspaces-not-the-live-ai-strikethroo-tree.md) — Capture, integration, and e2e must use committed fixture workspaces — not the live gitignored .ai/strikethroo/ tree that breaks CI and capture determinism.
### #conventions
- Open [**Documentation captures current state only**](practice-documentation-captures-current-state-only.md) — All docs describe how things work now. No historical context, migration notes, or retired-term mappings.
### #execution-blueprint
- Open [**Plan Detail: blueprint markdown section is distinct from the tasks-frontmatter Tasks tab**](../serve/practice-plan-detail-blueprint-markdown-vs-tasks-frontmatter.md) — Four data sources feed the Plan Detail tabs; the blueprint prose and tasks-frontmatter rendering must not be conflated
- Open [**Phase is reserved for execution blueprint task groups**](practice-phase-reserved-for-blueprint-task-groups.md) — "Phase" means parallel task batches in the blueprint. The three workflow stages are "steps", never "phases".
### #terminology
- Open [**Phase is reserved for execution blueprint task groups**](practice-phase-reserved-for-blueprint-task-groups.md) — "Phase" means parallel task batches in the blueprint. The three workflow stages are "steps", never "phases".
