---
id: 3
group: "core-infrastructure"
dependencies: [2]
status: "completed"
created: "2025-10-09"
skills:
  - "typescript"
  - "nodejs"
---
# Implement File Hashing Utilities

## Objective
Create utility functions for calculating SHA-256 hashes of files and managing the metadata file (read/write operations).

## Skills Required
- **typescript**: Function implementation and async/await patterns
- **nodejs**: Using Node.js crypto module and fs operations

## Acceptance Criteria
- [ ] `calculateFileHash()` function generates SHA-256 hashes from file paths
- [ ] `loadMetadata()` function reads and parses `.init-metadata.json`
- [ ] `saveMetadata()` function writes metadata to `.init-metadata.json`
- [ ] Error handling for missing files, corrupted JSON, and I/O errors
- [ ] Functions are async and use promises
- [ ] Unit tests verify hash consistency and metadata operations

Use your internal Todo tool to track these and keep on track.

## Technical Requirements
- Add functions to `src/utils.ts` or create new `src/metadata.ts` file
- Use Node.js built-in `crypto` module (no external dependencies for hashing)
- Use `fs-extra` for file operations (already a dependency)
- Handle edge cases: missing metadata, invalid JSON, file access errors

## Input Dependencies
- Task 2: Type definitions for `InitMetadata` interface

## Output Artifacts
- New utility functions in `src/utils.ts` or `src/metadata.ts`:
  - `calculateFileHash(filePath: string): Promise<string>`
  - `loadMetadata(metadataPath: string): Promise<InitMetadata | null>`
  - `saveMetadata(metadataPath: string, metadata: InitMetadata): Promise<void>`

## Implementation Notes

<details>
<summary>Detailed implementation steps</summary>

1. **Create hash calculation function**:
   ```typescript
   import * as crypto from 'crypto';
   import * as fs from 'fs-extra';

   /**
    * Calculate SHA-256 hash of a file
    * @param filePath - Absolute path to file
    * @returns Promise resolving to hex-encoded hash string
    */
   export async function calculateFileHash(filePath: string): Promise<string> {
     return new Promise((resolve, reject) => {
       const hash = crypto.createHash('sha256');
       const stream = fs.createReadStream(filePath);

       stream.on('data', (data) => hash.update(data));
       stream.on('end', () => resolve(hash.digest('hex')));
       stream.on('error', reject);
     });
   }
   ```

2. **Create metadata loading function**:
   ```typescript
   /**
    * Load metadata from .init-metadata.json file
    * @param metadataPath - Path to metadata file
    * @returns Promise resolving to metadata object or null if not found/invalid
    */
   export async function loadMetadata(
     metadataPath: string
   ): Promise<InitMetadata | null> {
     try {
       if (!(await fs.pathExists(metadataPath))) {
         return null;
       }

       const content = await fs.readFile(metadataPath, 'utf-8');
       const metadata = JSON.parse(content) as InitMetadata;

       // Validate structure
       if (!metadata.version || !metadata.timestamp || !metadata.files) {
         console.warn('Invalid metadata structure, treating as first-time init');
         return null;
       }

       return metadata;
     } catch (error) {
       console.warn('Failed to load metadata, treating as first-time init:', error);
       return null;
     }
   }
   ```

3. **Create metadata saving function**:
   ```typescript
   /**
    * Save metadata to .init-metadata.json file
    * @param metadataPath - Path to metadata file
    * @param metadata - Metadata object to save
    */
   export async function saveMetadata(
     metadataPath: string,
     metadata: InitMetadata
   ): Promise<void> {
     await fs.ensureDir(path.dirname(metadataPath));
     await fs.writeFile(
       metadataPath,
       JSON.stringify(metadata, null, 2),
       'utf-8'
     );
   }
   ```

4. **Add helper function for getting current package version**:
   ```typescript
   /**
    * Get current package version from package.json
    */
   export function getPackageVersion(): string {
     const packageJson = require('../package.json');
     return packageJson.version;
   }
   ```

**Performance considerations**:
- Stream-based hashing prevents loading entire file into memory
- Suitable for files of any size
- Average time: <10ms per file for typical config files (<100KB)

**Error handling strategy**:
- Missing files: Return null for metadata, throw for hash calculation
- Corrupted JSON: Warn and return null (treat as first-time init)
- Permission errors: Propagate to caller for proper error reporting

</details>
