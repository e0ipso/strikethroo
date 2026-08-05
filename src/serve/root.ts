/**
 * Self-contained workspace root resolver for the CLI's workspace-scoped
 * commands, `serve` and `validate`.
 *
 * Determines which initialized `.ai/strikethroo/` workspace to act on. Discovery
 * keys on the presence of `.init-metadata.json`, the same contract the skills
 * use, but the logic is reimplemented here with Node built-ins only.
 *
 * This deliberately does NOT import `findStrikethrooRoot` from
 * `src/skill-scripts/shared/`: that subtree carries the skill-bundle build
 * contract (esbuild, schema-version `define`), and `findStrikethrooRoot` calls
 * `process.exit(1)` on schema-version skew. Both are wrong for a CLI runtime
 * path — `validate` reports that skew as a finding rather than dying on it. The
 * discovery walk is short and cheap to keep self-contained.
 *
 * Note that `src/skill-scripts/**` appearing in `tsconfig.json`'s `exclude` does
 * not by itself keep that subtree out of `dist/`: `exclude` filters the root
 * file set, not the module graph, so any file imported from an included one is
 * still compiled and emitted. Keeping this resolver self-contained is what
 * actually holds the line here.
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
 * - When `options.workspace` is given it is tried two ways, in this order:
 *   first as a *project* directory, validating
 *   `<workspace>/.ai/strikethroo/.init-metadata.json`; then as the workspace
 *   directory *itself*, validating `<workspace>/.init-metadata.json`. Project
 *   semantics come first so every path that already resolved keeps its meaning
 *   — the direct form only rescues paths that previously errored.
 *
 *   The direct form exists because a workspace tree is not always nested under
 *   a project: the committed fixtures (`src/__tests__/fixtures/serve-workspace`,
 *   `src/capture/fixtures/capture-workspace`) hold `config/`, `plans/`, and
 *   `.init-metadata.json` at their top level with no `.ai/` above them. Without
 *   it, no CLI command can be pointed at a bare workspace directory.
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
    const given = path.resolve(options.workspace);
    const nested = path.join(given, '.ai', 'strikethroo');
    if (isInitializedStrikethrooDir(nested)) {
      return { root: nested };
    }
    if (isInitializedStrikethrooDir(given)) {
      return { root: given };
    }
    return {
      error:
        `Path ${given} is not an initialized strikethroo workspace: ` +
        `neither it nor ${nested} holds .init-metadata.json. ${INIT_MESSAGE}`,
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
