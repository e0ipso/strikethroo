/**
 * Metadata gate: workspace-shape checks derived from `<root>/.init-metadata.json`.
 *
 * Three findings come out of this file — an unreadable or unparsable metadata
 * file, an absent `files` map, a `workspaceSchemaVersion` other than the current
 * constant, and any path recorded in `files` that is no longer on disk.
 *
 * Hash drift is deliberately NOT reported. `src/conflict-detector.ts` documents
 * that a hash mismatch is how the tool detects *user modification* — a
 * first-class, protected state that the whole hash-tracking mechanism exists to
 * preserve. Reporting it would fire on every customized or profiled workspace.
 * Only deletions are reported.
 *
 * `isFileDeleted` from `src/conflict-detector.ts` is not reused: it evaluates
 * `relativePath in metadata.files`, which throws when `files` is `undefined` —
 * exactly the state of the committed `serve-workspace` fixture's metadata. The
 * absent-map finding therefore short-circuits the deletion scan below.
 */

import * as fs from 'fs';
import * as path from 'path';
import { CURRENT_WORKSPACE_SCHEMA_VERSION } from '../metadata';
import { Finding } from './types';

const METADATA_FILENAME = '.init-metadata.json';

/** Shape actually observed on disk — every field is untrusted. */
type RawMetadata = Record<string, unknown>;

/**
 * Reads and parses `<root>/.init-metadata.json`.
 *
 * Returns `null` when the file is missing, unreadable, unparsable, or not a
 * JSON object. Never throws: an unreadable metadata file is a finding, not a
 * crash.
 */
const readMetadata = (root: string): RawMetadata | null => {
  try {
    const parsed: unknown = JSON.parse(
      fs.readFileSync(path.join(root, METADATA_FILENAME), 'utf-8')
    );
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return null;
    return parsed as RawMetadata;
  } catch {
    return null;
  }
};

/**
 * Runs the metadata gate against an already-resolved absolute workspace root.
 *
 * Pure: reads only, never writes, never exits.
 */
export function metadataGate(root: string): Finding[] {
  const findings: Finding[] = [];
  const metadata = readMetadata(root);

  if (metadata === null) {
    findings.push({
      check: 'metadata/unreadable',
      path: METADATA_FILENAME,
      message: `${METADATA_FILENAME} is missing, unreadable, or not a JSON object. Run \`npx strikethroo init\` to initialize the workspace.`,
    });
    return findings;
  }

  const recordedVersion = metadata.workspaceSchemaVersion;
  if (recordedVersion !== CURRENT_WORKSPACE_SCHEMA_VERSION) {
    const shown = recordedVersion === undefined ? 'absent' : JSON.stringify(recordedVersion);
    findings.push({
      check: 'metadata/schema-version-skew',
      path: METADATA_FILENAME,
      message: `workspaceSchemaVersion is ${shown}, but this build expects ${CURRENT_WORKSPACE_SCHEMA_VERSION}. Re-run \`npx strikethroo init\` to bring the workspace to current shape.`,
    });
  }

  const files = metadata.files;
  if (typeof files !== 'object' || files === null || Array.isArray(files)) {
    findings.push({
      check: 'metadata/files-map-absent',
      path: METADATA_FILENAME,
      message: `${METADATA_FILENAME} has no \`files\` map, so tracked-file deletions cannot be detected. Re-run \`npx strikethroo init\` to record it.`,
    });
    // Short-circuit: without a map there is nothing to scan for deletions.
    return findings;
  }

  for (const relativePath of Object.keys(files as Record<string, unknown>)) {
    if (!fs.existsSync(path.join(root, relativePath))) {
      findings.push({
        check: 'metadata/file-deleted',
        path: relativePath,
        message: `${relativePath} is recorded in .init-metadata.json but no longer exists on disk. Restore it or re-run \`npx strikethroo init\`.`,
      });
    }
  }

  return findings;
}
