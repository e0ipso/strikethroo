---
id: 2
group: "schema-foundation"
dependencies: []
status: "completed"
created: "2025-10-20"
skills:
  - nodejs
---
# Enhance set-approval-method.cjs Script with Field Parameter

## Objective

Extend the `set-approval-method.cjs` script to accept an optional third parameter that specifies which approval field to update (`plan` or `tasks`), with backward-compatible default to `plan`.

## Skills Required

- **nodejs**: JavaScript/Node.js scripting and parameter handling

## Acceptance Criteria

- [ ] Script accepts optional third parameter for field type (`plan` or `tasks`)
- [ ] Defaults to `plan` if third parameter not provided (backward compatibility)
- [ ] Updates `approval_method_plan` when field type is `plan`
- [ ] Updates `approval_method_tasks` when field type is `tasks`
- [ ] Error handling for invalid field types
- [ ] Usage documentation updated in error messages
- [ ] Maintains all existing validation and error handling

Use your internal Todo tool to track these and keep on track.

## Technical Requirements

**File to update:** `templates/ai-task-manager/config/scripts/set-approval-method.cjs`

**New interface:**
```bash
node set-approval-method.cjs <file-path> <auto|manual> [plan|tasks]
```

**Parameter handling:**
- `args[0]`: file path (required)
- `args[1]`: approval value (required, `auto` or `manual`)
- `args[2]`: field type (optional, `plan` or `tasks`, default: `plan`)

**Field name mapping:**
- `plan` → updates `approval_method_plan` field
- `tasks` → updates `approval_method_tasks` field

**Validation:**
- Reject field types other than `plan` or `tasks`
- Maintain existing validation for file path and approval value
- Clear error messages for all failure scenarios

## Input Dependencies

None - this is a foundational script enhancement.

## Output Artifacts

Enhanced `set-approval-method.cjs` script that:
- Supports both approval method fields
- Maintains backward compatibility
- Provides clear error messages
- Follows existing code patterns

## Implementation Notes

<details>
<summary>Detailed Implementation Steps</summary>

1. **Read the current implementation:**
   ```bash
   # File location
   templates/ai-task-manager/config/scripts/set-approval-method.cjs
   ```

2. **Update parameter extraction (around line 69-78):**
   ```javascript
   const args = process.argv.slice(2);

   if (args.length < 2) {
     console.error('Usage: set-approval-method.cjs <file-path> <approval-method> [field-type]');
     console.error('  file-path: Path to the plan file');
     console.error('  approval-method: "auto" or "manual"');
     console.error('  field-type: "plan" or "tasks" (default: "plan")');
     process.exit(1);
   }

   const [filePath, approvalMethod, fieldType = 'plan'] = args;
   ```

3. **Add field type validation:**
   ```javascript
   // After existing validation
   if (fieldType && !['plan', 'tasks'].includes(fieldType)) {
     throw new Error('Field type must be "plan" or "tasks"');
   }
   ```

4. **Update the setApprovalMethod function (around line 12):**
   ```javascript
   function setApprovalMethod(filePath, approvalMethod, fieldType = 'plan') {
     // ... existing validation ...

     // Determine field name based on field type
     const fieldName = fieldType === 'plan' ? 'approval_method_plan' : 'approval_method_tasks';

     // Update or add the appropriate field
     let approvalMethodFound = false;
     const updatedFrontmatter = frontmatterLines.map(line => {
       const trimmed = line.trim();
       if (trimmed.startsWith(`${fieldName}:`)) {
         approvalMethodFound = true;
         return `${fieldName}: ${approvalMethod}`;
       }
       return line;
     });

     // Add field if not found
     if (!approvalMethodFound) {
       updatedFrontmatter.push(`${fieldName}: ${approvalMethod}`);
     }

     // ... rest of function ...
   }
   ```

5. **Update success message:**
   ```javascript
   console.log(`✓ Successfully set ${fieldName} to "${approvalMethod}" in ${path.basename(resolvedPath)}`);
   ```

6. **Update function call in main execution:**
   ```javascript
   setApprovalMethod(resolvedPath, approvalMethod, fieldType);
   ```

7. **Test the changes:**
   - Test with 2 parameters (backward compatibility): should update `approval_method_plan`
   - Test with 3 parameters `plan`: should update `approval_method_plan`
   - Test with 3 parameters `tasks`: should update `approval_method_tasks`
   - Test with invalid field type: should show error
   - Test error cases: invalid file, invalid approval method

</details>
