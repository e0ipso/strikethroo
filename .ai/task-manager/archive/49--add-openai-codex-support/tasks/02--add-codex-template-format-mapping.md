---
id: 2
group: "template-processing"
dependencies: [1]
status: "completed"
created: "2025-11-22"
skills: ["typescript"]
---

# Task: Add Codex Template Format Mapping

## Objective

Configure the template system to recognize that Codex uses Markdown format (no conversion needed from source templates).

## Skills Required

- `typescript`: Function modification

## Acceptance Criteria

- [ ] `getTemplateFormat()` in `src/utils.ts` returns `'md'` for `'codex'` assistant
- [ ] TypeScript compilation succeeds
- [ ] Lint checks pass

## Technical Requirements

- Update `src/utils.ts` around lines 71-76
- Add case statement for `'codex'` in `getTemplateFormat()` function
- Return `'md'` as the template format
- Follow existing code patterns (similar to Claude and Open Code cases)

## Input Dependencies

- Task 1: `'codex'` type must exist in type system

## Output Artifacts

- Modified `src/utils.ts` with Codex format mapping
- Successful build and lint results

## Implementation Notes

<details>
<summary>Detailed Implementation Steps</summary>

1. Open `src/utils.ts`
2. Locate the `getTemplateFormat()` function (around line 71)
3. Add a new case for `'codex'`:
   ```typescript
   case 'codex':
     return 'md';
   ```
4. Ensure proper switch statement formatting
5. Run `npm run build` to verify compilation
6. Run `npm run lint:fix` to ensure code style
</details>
