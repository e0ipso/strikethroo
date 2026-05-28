---
id: 4
group: "validation"
dependencies: [1, 2, 3]
status: "completed"
created: 2026-02-02
skills:
  - "cli-testing"
---
# Validate Build and Init Output

## Objective
Verify that `npm run build && npx . init --assistants claude --destination-directory /tmp/test` produces the POST_EXECUTION hook file in the output, and that the build succeeds.

## Skills Required
- CLI testing and validation

## Acceptance Criteria
- [ ] `npm run build` succeeds without errors
- [ ] `npx . init --assistants claude --destination-directory /tmp/test` succeeds
- [ ] `/tmp/test/.ai/task-manager/config/hooks/POST_EXECUTION.md` exists in the output
- [ ] `npm test` passes
- [ ] `npm run lint` passes

## Technical Requirements
- Run the full build and init pipeline
- Verify file presence in output directory

## Input Dependencies
- All previous tasks must be complete

## Output Artifacts
- Validation results confirming success criteria

## Implementation Notes
<details>

Run the following commands in sequence:

```bash
npm run build
npx . init --assistants claude --destination-directory /tmp/test
ls /tmp/test/.ai/task-manager/config/hooks/POST_EXECUTION.md
npm test
npm run lint
```

If any step fails, investigate and report the issue. The build must succeed cleanly.
</details>
