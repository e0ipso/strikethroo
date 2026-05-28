---
id: 3
group: "template-conversion"
dependencies: [2]
status: "completed"
created: 2025-10-31
skills:
  - typescript
---
# Integrate GitHub Format Routing in Template Processing

## Objective
Update the template format mapping and processing functions to route GitHub assistant through the new conversion function while maintaining backward compatibility with existing assistants.

## Skills Required
- **typescript**: Function modification and conditional logic

## Acceptance Criteria
- [ ] `getTemplateFormat()` returns `'md'` for GitHub assistant
- [ ] `readAndProcessTemplate()` accepts optional `assistant` parameter
- [ ] GitHub assistant triggers `convertMdToGitHubPrompt()` conversion
- [ ] Claude and OpenCode still use raw Markdown (no conversion)
- [ ] Gemini still uses TOML conversion
- [ ] No breaking changes to existing assistant processing
- [ ] TypeScript compilation succeeds

## Technical Requirements
- Modify `getTemplateFormat()` function in `src/utils.ts` (around line 71)
- Modify `readAndProcessTemplate()` function in `src/utils.ts` (around line 198)
- Add optional `assistant?: Assistant` parameter
- Implement conditional logic for GitHub-specific processing

## Input Dependencies
- Task 2: `convertMdToGitHubPrompt()` function must exist

## Output Artifacts
- Updated `getTemplateFormat()` with GitHub case
- Updated `readAndProcessTemplate()` with assistant parameter and GitHub logic

## Implementation Notes

<details>
<summary>Detailed Implementation Steps</summary>

### Step 1: Update getTemplateFormat()
File: `src/utils.ts` (around line 71)

Add the GitHub case to the switch statement:

```typescript
export function getTemplateFormat(assistant: Assistant): TemplateFormat {
  switch (assistant) {
    case 'claude':
      return 'md';
    case 'gemini':
      return 'toml';
    case 'opencode':
      return 'md';
    case 'github':
      return 'md'; // GitHub prompt files use Markdown
    default:
      throw new Error(`Unknown assistant type: ${assistant}`);
  }
}
```

**Rationale**: GitHub prompt files use Markdown with YAML frontmatter, so format is `'md'`.

### Step 2: Update readAndProcessTemplate() Signature
File: `src/utils.ts` (around line 198)

Modify the function signature to accept an optional assistant parameter:

```typescript
export async function readAndProcessTemplate(
  templatePath: string,
  targetFormat: TemplateFormat,
  assistant?: Assistant // Add optional parameter
): Promise<string> {
  // ... function body
}
```

### Step 3: Add GitHub-Specific Processing Logic

Update the Markdown format branch in `readAndProcessTemplate()`:

```typescript
if (targetFormat === 'md') {
  // Check if GitHub assistant needs special processing
  if (assistant === 'github') {
    return convertMdToGitHubPrompt(mdContent);
  }
  return mdContent; // Claude and OpenCode use raw Markdown
} else if (targetFormat === 'toml') {
  return convertMdToToml(mdContent); // Gemini conversion
} else {
  throw new Error(`Unsupported template format: ${targetFormat}`);
}
```

**Key Points:**
- GitHub uses Markdown format but requires conversion (unlike Claude/OpenCode)
- Conditional check ensures backward compatibility
- Optional parameter means existing calls still work

### Step 4: Verify No Breaking Changes

Ensure existing function calls still work:
- Calls without `assistant` parameter should still function
- Claude and OpenCode paths unchanged
- Gemini TOML conversion unchanged

### Step 5: Compile and Test
```bash
npm run build
npm test
```

Verify all existing tests pass (no regressions).

</details>
