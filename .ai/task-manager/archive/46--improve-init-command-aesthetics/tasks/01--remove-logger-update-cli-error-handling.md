---
id: 1
group: logger-removal
dependencies: []
status: completed
created: 2025-10-20T00:00:00.000Z
skills:
  - typescript
  - refactoring
---
# Remove Logger Module and Update CLI Error Handling

## Objective

Remove the logger module abstraction from `src/cli.ts` and replace it with direct console output, eliminating unnecessary complexity while maintaining all error handling and exit code behavior.

## Skills Required

- **typescript**: Modify TypeScript source files and ensure type safety
- **refactoring**: Remove module dependencies and update code patterns

## Acceptance Criteria

- [ ] Remove all logger imports from `src/cli.ts`
- [ ] Remove all `initLogger()` calls from `src/cli.ts`
- [ ] Replace `logger.error()` calls with `console.error()`
- [ ] Maintain all error exit codes and control flow
- [ ] Delete `src/logger.ts` file completely
- [ ] Code compiles without TypeScript errors
- [ ] No remaining imports of logger module in the codebase

## Technical Requirements

**File modifications:**
- `src/cli.ts`: Remove logger import, replace logger calls with console methods
- `src/logger.ts`: Delete this file entirely

**Verification:**
- Run `npm run build` to ensure TypeScript compilation succeeds
- Check for orphaned logger imports: `grep -r "from './logger'" src/`

## Input Dependencies

None - this task can start immediately.

## Output Artifacts

- Updated `src/cli.ts` using direct console output
- Deleted `src/logger.ts` file
- Clean TypeScript build

<details>
<summary>Implementation Notes</summary>

### Step-by-Step Implementation

1. **Open `src/cli.ts`** and locate all logger usage:
   - Find: `import * as logger from './logger'`
   - Find all calls: `logger.error()`, `logger.initLogger()`

2. **Replace logger calls**:
   - Replace `await logger.error(message)` with `console.error(message)`
   - Remove all `await logger.initLogger()` calls

3. **Remove logger import**:
   - Delete the line: `import * as logger from './logger'`

4. **Delete logger file**:
   - Remove `src/logger.ts`
   - Note: TypeScript compilation artifacts in `dist/` will be regenerated on next build

5. **Verify changes**:
   ```bash
   npm run build
   grep -r "from './logger'" src/
   ```

### Example Transformation

**Before:**
```typescript
import * as logger from './logger';

try {
  await logger.initLogger();
  // ... code ...
} catch (error) {
  await logger.error(`Error: ${error.message}`);
  process.exit(1);
}
```

**After:**
```typescript
try {
  // ... code ...
} catch (error) {
  console.error(`Error: ${error.message}`);
  process.exit(1);
}
```

### Important Notes

- Maintain exact same error messages (don't change wording)
- Preserve all `process.exit()` codes
- Keep try/catch error handling structure intact
- The logger module had special formatting (✗ symbol, red color) - for this task, just use plain console.error. Color formatting will be addressed in later tasks for index.ts
</details>
