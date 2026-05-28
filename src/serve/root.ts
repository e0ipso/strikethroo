/**
 * Self-contained workspace root resolver for `npx strikethroo serve`.
 *
 * Determines which initialized `.ai/strikethroo/` workspace the `serve` command
 * should host. Discovery keys on the presence of
 * `<root>/.ai/strikethroo/.init-metadata.json`, the same contract the skills use,
 * but the logic is reimplemented here with Node built-ins only.
 *
 * This deliberately does NOT import `findStrikethrooRoot` from
 * `src/skill-scripts/shared/`: that subtree carries the skill-bundle build
 * contract (esbuild, schema-version `define`) and is excluded from the main `tsc`
 * pipeline. Crossing that boundary would drag build-time concerns into the
 * runtime path. The discovery walk is short and cheap to keep self-contained.
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * Successful resolution. `root` is the absolute path of the `.ai/strikethroo`
 * directory itself (NOT the repository root) so it can be passed directly to the
 * workspace model's `root` argument, whose readers join `plans`/`archive`/`config`
 * onto it.
 */
export interface ResolvedRoot {
  root: string;
}

/** Failure result carrying a user-facing message. Never a stack trace. */
export interface ResolveError {
  error: string;
}

export type ResolveResult = ResolvedRoot | ResolveError;

/** Narrows a {@link ResolveResult} to its error variant. */
export const isResolveError = (result: ResolveResult): result is ResolveError =>
  (result as ResolveError).error !== undefined;

const INIT_MESSAGE = 'Run `npx strikethroo init` first.';

/** True when `<dir>/.init-metadata.json` exists and `<dir>` is a directory. */
const isInitializedStrikethrooDir = (strikethrooDir: string): boolean => {
  try {
    if (!fs.statSync(strikethrooDir).isDirectory()) return false;
    const metadataPath = path.join(strikethrooDir, '.init-metadata.json');
    return fs.statSync(metadataPath).isFile();
  } catch {
    return false;
  }
};

/**
 * Resolves the `.ai/strikethroo` workspace directory to host.
 *
 * - When `options.workspace` is given, it is treated as a project directory; the
 *   resolver validates that `<workspace>/.ai/strikethroo/.init-metadata.json`
 *   exists and returns that `.ai/strikethroo` directory.
 * - Otherwise it walks upward from `options.cwd` (default `process.cwd()`),
 *   testing each ancestor for `.ai/strikethroo/.init-metadata.json`.
 *
 * On failure it returns an `{ error }` shape with a clear, user-facing message
 * so the command layer can print it and exit non-zero. It never throws an
 * unhandled error for the "not found" case.
 */
export const resolveWorkspaceRoot = (
  options: { workspace?: string; cwd?: string } = {}
): ResolveResult => {
  if (options.workspace) {
    const projectDir = path.resolve(options.workspace);
    const strikethrooDir = path.join(projectDir, '.ai', 'strikethroo');
    if (isInitializedStrikethrooDir(strikethrooDir)) {
      return { root: strikethrooDir };
    }
    return {
      error: `Path ${projectDir} is not an initialized strikethroo workspace. ${INIT_MESSAGE}`,
    };
  }

  let current = path.resolve(options.cwd ?? process.cwd());
  // Walk upward until the filesystem root, where dirname(current) === current.
  for (;;) {
    const strikethrooDir = path.join(current, '.ai', 'strikethroo');
    if (isInitializedStrikethrooDir(strikethrooDir)) {
      return { root: strikethrooDir };
    }
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }

  return {
    error: `No initialized strikethroo workspace found from ${path.resolve(
      options.cwd ?? process.cwd()
    )} upward. ${INIT_MESSAGE}`,
  };
};
