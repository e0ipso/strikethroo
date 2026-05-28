---
id: 2
group: "code-removal"
dependencies: [1]
status: "completed"
created: 2025-11-20
skills:
  - typescript
---
# Remove Agent Tracking Integration Points

## Objective
Remove the conditional block in createAssistantStructure() that calls copyAgentTemplates(), eliminating the integration between the main workflow and agent file tracking.

## Skills Required
- TypeScript code modification

## Acceptance Criteria
- [ ] Conditional block calling copyAgentTemplates() removed from createAssistantStructure()
- [ ] No references to agent tracking remain in createAssistantStructure()
- [ ] Other functionality in createAssistantStructure() remains intact
- [ ] Code compiles successfully

## Technical Requirements
- Location: src/index.ts, createAssistantStructure() function
- Remove: Lines 486-489 (conditional block with copyAgentTemplates() call)
- Preserve: All other command copying and template processing logic

## Input Dependencies
- Task 1 must be completed first (functions must be removed before removing their call sites)

## Output Artifacts
- Modified src/index.ts with integration point removed
- createAssistantStructure() function with simplified logic

<details>
<summary>Implementation Notes</summary>

**Step-by-step approach**:

1. Read the createAssistantStructure() function to locate the exact integration point:
   ```typescript
   // Look for this pattern around line 487-489:
   if (assistant === 'claude') {
     await copyAgentTemplates(assistantDir, sourceDir, force);
   }
   ```

2. Remove the entire conditional block:
   - Use the Edit tool to remove these 3 lines
   - Make sure to preserve any code before and after this block

3. Verify the function still has all its other logic:
   - Command copying functionality
   - Template processing
   - Directory creation

4. Check compilation:
   ```bash
   npm run build
   ```

5. Verify no other calls to copyAgentTemplates exist:
   ```bash
   grep -n "copyAgentTemplates" src/
   ```
   Should return no results after this task.

**Context**: This block was added in commit 36f6aa71 and is the main integration point between the assistant setup workflow and agent file tracking.
</details>
