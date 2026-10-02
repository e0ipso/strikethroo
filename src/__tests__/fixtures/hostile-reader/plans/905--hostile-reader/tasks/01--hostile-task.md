---
id: 1
group: "hostile"
dependencies: []
status: "pending"
created: 2026-10-01
skills:
  - html-sanitization
complexity_score: 1
---
# Hostile task body

## Objective

<form action="/api/plans/905--hostile-reader/archive" method="post"><button>Archive</button></form>
<input type="checkbox" checked>
<iframe src="https://example.invalid/task-frame"></iframe>
<img src="https://example.invalid/task.png" alt="task pixel">

Plain objective text with a <a href="https://example.invalid/doc" title="t">link</a>.

## Acceptance Criteria

- [ ] The controls above never render.
- [x] The prose below still does.
