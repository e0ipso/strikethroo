---
id: 1
group: "code-removal"
dependencies: []
status: "completed"
created: 2025-11-20
skills:
  - typescript
---
# Remove Agent Tracking Functions from src/index.ts

## Objective
Remove the copyAgentTemplates() and createAgentMetadata() functions along with the applyResolutions() helper if it's exclusively used for agent tracking.

## Skills Required
- TypeScript code modification and refactoring

## Acceptance Criteria
- [ ] copyAgentTemplates() function removed (lines 332-385)
- [ ] createAgentMetadata() function removed (lines 390-430)
- [ ] applyResolutions() function removed if only used by agent tracking (lines 313-327)
- [ ] Code compiles without errors after removal
- [ ] No dangling references to removed functions

## Technical Requirements
- Location: src/index.ts
- Functions to remove:
  - `copyAgentTemplates()` at lines 332-385
  - `createAgentMetadata()` at lines 390-430
  - `applyResolutions()` at lines 313-327 (verify it's not used for config file tracking first)

## Input Dependencies
None - this is the first task in the removal workflow

## Output Artifacts
- Modified src/index.ts with functions removed
- Clean TypeScript compilation

<details>
<summary>Implementation Notes</summary>

**Step-by-step approach**:

1. First, verify if `applyResolutions()` is used elsewhere:
   ```bash
   grep -n "applyResolutions" src/index.ts
   ```
   If it appears in line 242 (config file tracking), keep it. If only in line 381 (agent tracking), remove it.

2. Locate the exact line numbers for the three functions in src/index.ts:
   - Read the file to confirm current line numbers haven't shifted
   - Use the Read tool to check lines 310-430

3. Remove the functions in reverse order (bottom to top) to avoid line number shifts:
   - First: Remove `createAgentMetadata()` (lines 390-430)
   - Second: Remove `copyAgentTemplates()` (lines 332-385)
   - Third: Remove `applyResolutions()` (lines 313-327) ONLY if not used by config tracking

4. After removal, verify compilation:
   ```bash
   npm run build
   ```

5. Check for any remaining references:
   ```bash
   grep -n "copyAgentTemplates\|createAgentMetadata" src/index.ts
   ```
   Should return no results.

**Critical**: Do NOT remove `applyResolutions()` if it's used by config file tracking (look for usage around line 242).
</details>
