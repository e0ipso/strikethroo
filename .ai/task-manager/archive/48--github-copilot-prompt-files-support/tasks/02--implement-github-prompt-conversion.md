---
id: 2
group: "template-conversion"
dependencies: [1]
status: "completed"
created: 2025-10-31
skills:
  - typescript
---
# Implement GitHub Prompt File Conversion Function

## Objective
Create a conversion function that transforms Markdown templates into GitHub Copilot prompt file format with minimal frontmatter and `$ARGUMENTS` placeholder.

## Skills Required
- **typescript**: Function implementation and string manipulation

## Acceptance Criteria
- [ ] `convertMdToGitHubPrompt()` function created in `src/utils.ts`
- [ ] Function extracts `description` from source frontmatter
- [ ] Output includes simple YAML frontmatter with `description` field
- [ ] Output includes `$ARGUMENTS` placeholder after frontmatter
- [ ] Template body is preserved as-is (no variable conversion)
- [ ] Function follows OpenSpec pattern for simplicity
- [ ] TypeScript compilation succeeds

## Technical Requirements
- Add new function after `convertMdToToml()` in `src/utils.ts`
- Reuse existing `parseFrontmatter()` helper function
- Follow the OpenSpec pattern: minimal frontmatter + $ARGUMENTS + body
- No variable transformation needed (GitHub Copilot supports `$ARGUMENTS` natively)

## Input Dependencies
- Task 1: GitHub assistant type must exist in type system

## Output Artifacts
- `convertMdToGitHubPrompt()` function in `src/utils.ts`

## Implementation Notes

<details>
<summary>Detailed Implementation Steps</summary>

### Step 1: Locate Insertion Point
File: `src/utils.ts`

Find the `convertMdToToml()` function (around line 157). Add the new function immediately after it.

### Step 2: Implement Conversion Function

Add this function in `src/utils.ts`:

```typescript
/**
 * Convert markdown template content to GitHub Copilot prompt file format
 * @param mdContent - The markdown template content
 * @returns The converted prompt file content
 */
export function convertMdToGitHubPrompt(mdContent: string): string {
  const { frontmatter, body } = parseFrontmatter(mdContent);

  // Build GitHub prompt frontmatter
  let promptContent = '---\n';
  promptContent += `description: ${frontmatter.description || 'Task management command'}\n`;
  promptContent += '---\n\n';

  // Add $ARGUMENTS placeholder
  promptContent += '$ARGUMENTS\n\n';

  // Add template body (no variable conversion needed - GitHub supports $ARGUMENTS natively)
  promptContent += body;

  return promptContent;
}
```

### Step 3: Implementation Rationale

**Why this approach:**
1. **Minimal Frontmatter**: Matches OpenSpec pattern - just `description` field
2. **$ARGUMENTS Placeholder**: GitHub Copilot supports this natively (no conversion needed)
3. **Body Preservation**: Keep template content as-is for consistency
4. **Reuse Existing Helpers**: Leverage `parseFrontmatter()` for code reuse

**Key Differences from TOML Conversion:**
- No variable transformation (`$ARGUMENTS` stays as-is, not converted to `{{args}}`)
- Simple frontmatter (just description, no metadata section)
- Cleaner output matching GitHub Copilot's expectations

### Step 4: Verify Compilation
```bash
npm run build
```

Ensure no TypeScript errors.

### Testing Approach
This function will be tested through integration tests in a later task that validates the entire prompt file generation flow.

</details>
