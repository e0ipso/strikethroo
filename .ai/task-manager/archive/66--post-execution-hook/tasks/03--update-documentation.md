---
id: 3
group: "documentation"
dependencies: [1]
status: "completed"
created: 2026-02-02
skills:
  - "markdown-authoring"
---
# Update Documentation Pages with POST_EXECUTION Hook

## Objective
Add the POST_EXECUTION hook to relevant documentation pages in `docs/` where hooks are listed or described.

## Skills Required
- Markdown authoring

## Acceptance Criteria
- [ ] All docs pages that list hooks include POST_EXECUTION
- [ ] Documentation is consistent with how existing hooks are described
- [ ] Hook's trigger point and purpose are clearly explained

## Technical Requirements
- Search docs pages (`reference.md`, `customization.md`, `customization-extension.md`, `architecture.md`, `core-concepts.md`, `workflows.md`) for hook references
- Add POST_EXECUTION to any lists or tables of hooks
- Describe its trigger point: after all phases complete, before summary/archival

## Input Dependencies
- Task 1 must be complete (hook must exist to document)

## Output Artifacts
- Updated documentation files in `docs/`

## Implementation Notes
<details>

1. Search each docs file for references to existing hooks (e.g., `POST_PHASE`, `PRE_PHASE`, `POST_PLAN`):
   - `docs/reference.md`
   - `docs/customization.md`
   - `docs/customization-extension.md`
   - `docs/architecture.md`
   - `docs/core-concepts.md`
   - `docs/workflows.md`

2. For each file that lists hooks, add `POST_EXECUTION` in the appropriate location (usually after `POST_PHASE` or at the end of the lifecycle list).

3. Use the same description style as other hooks. Example entry:
   ```
   | POST_EXECUTION | After all blueprint phases complete, before summary generation | Runs validation (lint, tests, task status verification) and reports results |
   ```

4. If hooks are listed in a lifecycle diagram or flowchart, add POST_EXECUTION between the last phase and summary/archival.
</details>
