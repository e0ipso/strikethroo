---
id: 2
group: "core-infrastructure"
dependencies: [1]
status: "completed"
created: "2025-10-09"
skills:
  - "typescript"
---
# Create TypeScript Type Definitions for Metadata

## Objective
Define TypeScript interfaces and types for the metadata tracking system, including the metadata file structure, file conflict representation, and extended init options.

## Skills Required
- **typescript**: Type system design and interface definitions

## Acceptance Criteria
- [ ] `InitMetadata` interface defined with version, timestamp, and files mapping
- [ ] `FileConflict` interface defined for representing detected conflicts
- [ ] `InitOptions` extended to include optional `force` boolean flag
- [ ] All types properly exported from `src/types.ts`
- [ ] TypeScript compilation succeeds without errors

Use your internal Todo tool to track these and keep on track.

## Technical Requirements
- Extend existing `src/types.ts` file
- Maintain consistency with existing type naming conventions
- Ensure types support JSON serialization for metadata file
- Add JSDoc comments for complex types

## Input Dependencies
- Task 1: Dependencies installed (needed for TypeScript compilation)
- Existing `src/types.ts` structure

## Output Artifacts
- Updated `src/types.ts` with new type definitions:
  - `InitMetadata` interface
  - `FileConflict` interface
  - Updated `InitOptions` interface

## Implementation Notes

<details>
<summary>Detailed implementation steps</summary>

1. **Add InitMetadata interface**:
   ```typescript
   /**
    * Metadata tracking file hashes and version from last init
    */
   export interface InitMetadata {
     version: string;           // Package version (e.g., "1.12.0")
     timestamp: string;          // ISO 8601 timestamp
     files: Record<string, string>;  // Relative path -> SHA-256 hash
   }
   ```

2. **Add FileConflict interface**:
   ```typescript
   /**
    * Represents a detected file conflict between user changes and new version
    */
   export interface FileConflict {
     relativePath: string;       // Path relative to .ai/task-manager/
     userFileContent: string;    // User's current file content
     newFileContent: string;     // New incoming file content
     originalHash: string;       // Hash from metadata
     currentHash: string;        // Calculated hash of user's file
   }
   ```

3. **Extend InitOptions interface**:
   ```typescript
   export interface InitOptions {
     assistants: string;
     destinationDirectory?: string;
     force?: boolean;  // <-- ADD THIS LINE
   }
   ```

4. **Add ConflictResolution type** (for user choices):
   ```typescript
   /**
    * User's choice for resolving a file conflict
    */
   export type ConflictResolution =
     | 'keep'           // Keep user's version
     | 'overwrite'      // Accept new version
     | 'keep-all'       // Keep all remaining
     | 'overwrite-all'; // Overwrite all remaining
   ```

5. **Run TypeScript compiler**:
   ```bash
   npm run build
   ```

**Design rationale**:
- `Record<string, string>` for files mapping allows O(1) hash lookups
- Storing full file content in `FileConflict` enables diff generation without re-reading files
- `ConflictResolution` type ensures type-safe prompt handling

</details>
