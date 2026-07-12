import * as fs from 'fs';
import * as path from 'path';

declare const EXPECTED_WORKSPACE_SCHEMA_VERSION: number;

// In the bundled .cjs, esbuild's `define` substitutes the identifier with an
// integer literal. In direct TS execution (Vitest), the ambient declaration
// has no runtime value; the `typeof` guard avoids a ReferenceError and falls
// back to the current schema version used by source-level tests.
const EXPECTED_SCHEMA: number =
  typeof EXPECTED_WORKSPACE_SCHEMA_VERSION !== 'undefined' ? EXPECTED_WORKSPACE_SCHEMA_VERSION : 4;

const isValidStrikethrooRoot = (strikethrooPath: string): boolean => {
  try {
    if (!fs.existsSync(strikethrooPath)) return false;
    if (!fs.lstatSync(strikethrooPath).isDirectory()) return false;

    const metadataPath = path.join(strikethrooPath, '.init-metadata.json');
    if (!fs.existsSync(metadataPath)) return false;

    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
    return metadata && typeof metadata === 'object' && 'version' in metadata;
  } catch (_err) {
    return false;
  }
};

const getStrikethrooAt = (directory: string): string | null => {
  const strikethrooPath = path.join(directory, '.ai', 'strikethroo');
  return isValidStrikethrooRoot(strikethrooPath) ? strikethrooPath : null;
};

const getParentPaths = (currentPath: string, acc: string[] = []): string[] => {
  const absolutePath = path.resolve(currentPath);
  const nextAcc = [...acc, absolutePath];
  const parentPath = path.dirname(absolutePath);
  if (parentPath === absolutePath) return nextAcc;
  return getParentPaths(parentPath, nextAcc);
};

const checkWorkspaceSchema = (metadataPath: string): void => {
  let metadata: { workspaceSchemaVersion?: unknown };
  try {
    metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
  } catch {
    return;
  }
  const actual =
    typeof metadata.workspaceSchemaVersion === 'number' ? metadata.workspaceSchemaVersion : 1;
  if (actual === EXPECTED_SCHEMA) return;
  if (actual < EXPECTED_SCHEMA) {
    process.stderr.write(
      `Workspace schema v${actual} is older than this skill requires (v${EXPECTED_SCHEMA}). ` +
        'Re-run `npx strikethroo init` with the latest CLI to update.\n'
    );
  } else {
    process.stderr.write(
      `This skill (built for workspace schema v${EXPECTED_SCHEMA}) is older than the workspace (v${actual}). ` +
        'Re-run `npx skills add e0ipso/strikethroo` to update skills.\n'
    );
  }
  process.exit(1);
};

export const findStrikethrooRoot = (startPath: string = process.cwd()): string | null => {
  const paths = getParentPaths(startPath);
  const found = paths.find(p => getStrikethrooAt(p));
  if (!found) return null;
  const root = getStrikethrooAt(found);
  if (root) checkWorkspaceSchema(path.join(root, '.init-metadata.json'));
  return root;
};
