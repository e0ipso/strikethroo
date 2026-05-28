---
id: 2
group: "constants-setup"
dependencies: []
status: "completed"
created: "2025-09-08"
skills: ["typescript", "constants-design"]
---
# Create UTF8 pictogram constants for CLI output

## Objective
Create a centralized system of UTF8 pictogram constants that provide visual cues for different types of CLI output without relying on emoji support.

## Skills Required
- **typescript**: TypeScript constants and type definitions
- **constants-design**: Designing maintainable constant systems and naming conventions

## Acceptance Criteria
- [ ] UTF8 pictogram constants object is created with semantic naming
- [ ] Pictograms are chosen for universal terminal compatibility
- [ ] Constants are properly typed for TypeScript usage
- [ ] Pictograms cover all content types mentioned in the plan (setup, workflow, completion, etc.)
- [ ] Constants are exported for use in other modules

## Technical Requirements
- Create constants object mapping semantic names to UTF8 pictogram characters
- Choose pictograms that display correctly across different terminal environments
- Include pictograms for: setup/configuration, workflow steps, completion status, information, warnings
- Provide TypeScript types for the constants
- Follow consistent naming conventions (kebab-case or camelCase)

## Input Dependencies
- TypeScript project structure
- Understanding of terminal compatibility requirements

## Output Artifacts
- Constants file or object with UTF8 pictogram definitions
- TypeScript type definitions for the constants
- Exportable constants ready for import in other modules

## Implementation Notes
<details>
<summary>Detailed Implementation Steps</summary>

1. **Research UTF8 pictograms**:
   - Choose symbols with wide terminal support
   - Avoid complex Unicode that might not render consistently
   - Test common symbols: ⚙️ (setup), ↻ (workflow), ✓ (success), ⚠ (warning), ℹ (info)

2. **Create constants structure**:
   ```typescript
   export const CLI_SYMBOLS = {
     SETUP: '⚙️',
     WORKFLOW: '↻',
     SUCCESS: '✓',
     WARNING: '⚠',
     INFO: 'ℹ',
     ARROW_RIGHT: '→',
     BULLET: '•'
   } as const;

   export type CliSymbol = typeof CLI_SYMBOLS[keyof typeof CLI_SYMBOLS];
   ```

3. **Location considerations**:
   - Add to existing utils.ts or create separate symbols.ts file
   - Consider creating symbols directory if expanding in future
   - Ensure easy import path for other modules

4. **Terminal compatibility testing**:
   - Test in common terminals (macOS Terminal, iTerm2, Windows Terminal)
   - Provide ASCII fallbacks if needed
   - Document any known compatibility issues

5. **Usage patterns**:
   - Design for easy usage: `${CLI_SYMBOLS.SUCCESS} Task completed`
   - Consider helper functions for common combinations
   - Maintain consistency with existing code style

**Expected outcome**: Comprehensive UTF8 pictogram constants ready for integration with boxed formatting.
</details>