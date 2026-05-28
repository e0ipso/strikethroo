---
id: 1
group: "terminology-rename"
dependencies: []
status: "completed"
created: "2026-05-25"
skills:
  - typescript
complexity_score: 4
complexity_notes: "Mechanical but wide-reaching rename across all TypeScript source files. Repetitive pattern reduces cognitive load."
---
# Core Terminology Rename in TypeScript Source

## Objective
Replace all "assistant" terminology with "harness" across every TypeScript source file in `src/`. This is the foundational task that all other tasks depend on.

## Skills Required
- **typescript**: Type system refactoring, interface renaming, function renaming, variable renaming across interconnected modules

## Acceptance Criteria
- [ ] `Assistant` type becomes `Harness` in `src/types.ts`
- [ ] `AssistantConfig` interface becomes `HarnessConfig` in `src/types.ts`
- [ ] `InitOptions.assistants` property becomes `InitOptions.harnesses`
- [ ] `defaultAssistant` becomes `defaultHarness` in `ProjectConfig`
- [ ] `assignedTo` type changes from `Assistant` to `Harness` in `TaskConfig`
- [ ] `VALID_ASSISTANTS` becomes `VALID_HARNESSES` in `src/utils.ts`
- [ ] `parseAssistants()` becomes `parseHarnesses()` in `src/utils.ts`
- [ ] `validateAssistants()` becomes `validateHarnesses()` in `src/utils.ts`
- [ ] All error messages in utils.ts updated (e.g., "Invalid assistant(s)" → "Invalid harness(es)")
- [ ] CLI flag `--assistants` becomes `--harnesses` in `src/cli.ts`
- [ ] CLI help text updated to list all 6 harnesses: `(claude,gemini,codex,cursor,github,opencode)`
- [ ] `createAssistantStructure()` renamed to `createHarnessStructure()` in `src/index.ts`
- [ ] All internal variable names in `src/index.ts` updated (e.g., `assistants` → `harnesses`, `assistant` → `harness`)
- [ ] Console output messages updated (e.g., "Setting up claude assistant" → "Setting up claude harness")
- [ ] `npm run build` compiles without TypeScript errors
- [ ] `grep -rn "assistant\|Assistant\|ASSISTANT" src/ --include="*.ts" | grep -v __tests__ | grep -v "// "` returns zero relevant matches

Use your internal Todo tool to track these and keep on track.

## Technical Requirements
- TypeScript type system — renaming exported types will cause compile errors in all consumers, which guides completeness
- No backward compatibility alias for the old `--assistants` flag (clean break)
- The `Assistant` type union values remain lowercase strings: `'claude' | 'codex' | 'cursor' | 'gemini' | 'github' | 'opencode'` — only the type name changes

## Input Dependencies
None — this is the foundational task.

## Output Artifacts
- Updated `src/types.ts` with `Harness`, `HarnessConfig`, updated `InitOptions`, `TaskConfig`, `ProjectConfig`
- Updated `src/utils.ts` with `VALID_HARNESSES`, `parseHarnesses()`, `validateHarnesses()`
- Updated `src/cli.ts` with `--harnesses` flag and help text
- Updated `src/index.ts` with `createHarnessStructure()` and all variable renames
- Any other `src/*.ts` files that import or reference the renamed symbols

## Implementation Notes

<details>

### Files to modify and specific changes

**`src/types.ts`** (line references from current source):
- Line 11: `export type Assistant = ...` → `export type Harness = ...`
- Line 20: `assistants: string` → `harnesses: string` in `InitOptions`
- Line 98: `assignedTo?: Assistant` → `assignedTo?: Harness` in `TaskConfig`
- Line 142-148: `AssistantConfig` → `HarnessConfig`, `type: Assistant` → `type: Harness`
- Line 180-186: `defaultAssistant?: Assistant` → `defaultHarness?: Harness`, `assistants: AssistantConfig[]` → `harnesses: HarnessConfig[]`

**`src/utils.ts`**:
- Line 7: `import { Assistant }` → `import { Harness }`
- Line 9: `const VALID_ASSISTANTS: readonly Assistant[]` → `const VALID_HARNESSES: readonly Harness[]`
- Line 24: `export function parseAssistants(value: string): Assistant[]` → `export function parseHarnesses(value: string): Harness[]`
- Line 26: Error message "Assistants parameter cannot be empty" → "Harnesses parameter cannot be empty"
- Line 34-40: All variable names (`invalidAssistants` → `invalidHarnesses`, cast to `Harness`, error messages)
- Line 44: Return cast `as Assistant[]` → `as Harness[]`
- Line 52: `export function validateAssistants(assistants: Assistant[])` → `export function validateHarnesses(harnesses: Harness[])`
- Lines 53-60: All variable names and error messages

**`src/cli.ts`**:
- Line 23: `'--assistants <value>'` → `'--harnesses <value>'`
- Line 24: Help text → `'Comma-separated list of harnesses to configure (claude,gemini,codex,cursor,github,opencode)'`

**`src/index.ts`**:
- Line 11: Update imports from types and utils
- Line 102-104: `parseAssistants(options.assistants)` → `parseHarnesses(options.harnesses)`, variable `assistants` → `harnesses`
- Line 113: Console message update
- Line 129-131: Loop variable and console messages
- Line 144: `assistants.includes('claude')` → `harnesses.includes('claude')`
- Line 160: Console message update
- Line 172: `data: { assistants }` → `data: { harnesses }`
- Line 320: `createAssistantStructure` → `createHarnessStructure`
- Line 321-328: Parameter and variable names
- Line 330: Template path (leave as-is for now — Task 2 handles directory rename)

**Other `src/*.ts` files**: Grep for any remaining imports or references to `Assistant`, `AssistantConfig`, `parseAssistants`, `validateAssistants`, or the `assistants` property in each of: `conflict-detector.ts`, `metadata.ts`, `plan-utils.ts`, `plan.ts`, `prompts.ts`, `status.ts`. Update any matches.

### Approach
1. Start with `src/types.ts` — rename all types and interfaces
2. Run `npm run build` to find all compile errors from broken imports
3. Fix each file following the compile errors as a guide
4. Verify with `grep -rn "assistant\|Assistant" src/ --include="*.ts" | grep -v __tests__` for any stragglers
5. Final `npm run build` to confirm clean compilation

</details>
