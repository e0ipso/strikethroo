---
id: 4
group: "utility-framework"
dependencies: [1, 2]
status: "completed"
created: "2025-09-08"
skills: ["typescript", "utility-design"]
---
# Create reusable formatting utilities for consistent CLI output

## Objective
Establish a framework of reusable formatting utilities that provide consistent boxed output styling patterns for current and future CLI enhancements.

## Skills Required
- **typescript**: TypeScript utility function design and type definitions
- **utility-design**: Creating maintainable, reusable utility functions and APIs

## Acceptance Criteria
- [ ] Utility functions for common box styles are created
- [ ] Pictogram integration patterns are standardized
- [ ] Functions are designed for reusability across the CLI application
- [ ] TypeScript types are properly defined for all utilities
- [ ] Utilities support different content types and formatting needs
- [ ] Documentation is provided for utility usage

## Technical Requirements
- Create utility functions for standard box formatting patterns
- Establish consistent pictogram integration helpers
- Design flexible API that supports various content types
- Provide TypeScript types for utility parameters and return values
- Create helper functions for common formatting combinations
- Design for extensibility to support future CLI output enhancements

## Input Dependencies
- boxen dependency installed and available (Task 1)
- UTF8 pictogram constants defined and exportable (Task 2)
- Understanding of formatting needs from displayWorkflowHelp transformation

## Output Artifacts
- Utility functions for consistent box formatting
- Helper functions for pictogram integration
- TypeScript type definitions for utility APIs
- Reusable formatting patterns for future CLI features

## Implementation Notes
<details>
<summary>Detailed Implementation Steps</summary>

1. **Design utility API**:
   ```typescript
   interface BoxConfig {
     title?: string;
     style?: 'info' | 'success' | 'warning' | 'error';
     pictogram?: string;
     padding?: number;
   }

   export function formatBox(content: string, config?: BoxConfig): string;
   export function formatList(items: string[], config?: BoxConfig): string;
   export function formatHeader(text: string, pictogram?: string): string;
   ```

2. **Create standard box styles**:
   - Info box: neutral styling for information
   - Success box: green styling for completion/success
   - Warning box: yellow styling for warnings
   - Error box: red styling for errors
   - Header box: prominent styling for section headers

3. **Pictogram integration helpers**:
   ```typescript
   export function withPictogram(text: string, symbol: string): string;
   export function formatStep(stepText: string, stepNumber?: number): string;
   export function formatStatus(status: string, isSuccess: boolean): string;
   ```

4. **Box configuration presets**:
   - Common box configurations for different use cases
   - Consistent styling that can be applied across the application
   - Terminal-responsive settings that adapt to capabilities

5. **Content formatting helpers**:
   ```typescript
   export function formatWorkflowStep(step: string, index: number): string;
   export function formatInstructionList(instructions: string[]): string;
   export function formatCompletionMessage(message: string): string;
   ```

6. **Location and organization**:
   - Create dedicated formatting utilities file (e.g., `cliFormatting.ts`)
   - Export utilities for easy import across the project
   - Group related utilities logically
   - Consider creating formatting namespace/module

7. **Testing framework consideration**:
   - Design utilities to be easily testable
   - Consider providing test utilities for box output verification
   - Ensure utilities work consistently across environments

**Expected outcome**: Comprehensive formatting utility framework ready for use in current displayWorkflowHelp implementation and future CLI enhancements.
</details>