---
id: 2
group: "validation"
dependencies: [1]
status: "completed"
created: "2025-09-06"
skills: ["typescript"]
---

# Update Assistant Validation Logic

## Objective
Update the `parseAssistants()` and `validateAssistants()` functions in `src/utils.ts` to recognize and validate `'opencode'` as a valid assistant choice.

## Skills Required
- **typescript**: Modify validation functions and update validation logic

## Acceptance Criteria
- [ ] `parseAssistants()` function accepts `'opencode'` in assistant lists
- [ ] `validateAssistants()` function validates `'opencode'` as a valid option
- [ ] Mixed assistant combinations work: `--assistants claude,opencode,gemini`
- [ ] Error handling provides appropriate feedback for invalid assistant names
- [ ] Existing Claude/Gemini validation continues to work unchanged

## Technical Requirements
- Locate validation functions in `src/utils.ts`
- Add `'opencode'` to any hardcoded valid assistant arrays or validation lists
- Ensure case-insensitive validation if applicable
- Update error messages to include Open Code in valid options list

## Input Dependencies
- Task 1: Updated `Assistant` type definition must be completed first

## Output Artifacts
- Updated validation functions that recognize Open Code
- Proper error handling for Open Code assistant validation

## Implementation Notes
Look for arrays or constants that define valid assistant names. These likely need to be updated to include `'opencode'`. Check if there are any helper functions that enumerate valid assistants for error messages or help text that also need updating.