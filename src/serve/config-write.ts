/**
 * Guarded config-write operation for `npx strikethroo serve`.
 *
 * The serve web app is a read-only viewer over `.ai/strikethroo/` with two
 * sanctioned mutations: the archive directory move (`archive.ts`) and this — an
 * in-place overwrite of an existing hook or template file under `config/`. This
 * module is that mutation's authoritative guard: a single, HTTP-free function
 * the route handler and the tests both call.
 *
 * It enforces a strict allowlist: the `kind` must be `hooks` or `templates`
 * (resolving to a single flat filename `config/<kind>/<id>.md` that stays
 * inside the intended directory — no path separators, no `..`, no traversal),
 * or the special `workspace` kind whose only valid `id` is `config`, mapping
 * to the workspace's structured configuration file `config/config.yaml` (the
 * file behind the Customize section's Config form). In every case the target
 * file must ALREADY exist (this never creates a new file). When the guards
 * pass it overwrites the file content verbatim through the shared containment
 * helper, so a symlinked file or directory anywhere below the workspace root
 * (or a non-regular file at the target) is refused as `not-found` rather than
 * followed. It never deletes or renames the target itself. Expected guard
 * failures are returned as a typed result, not thrown; only an unexpected
 * filesystem error surfaces as `fs-error`. Node built-ins only.
 */

import * as path from 'path';
import { writeFileAtomic } from '../skill-scripts/shared/safe-fs';

/**
 * Outcome of a {@link writeConfigFile} call. A discriminated union mirroring the
 * serve layer's existing result convention (see `archive.ts`): callers map
 * `reason` to HTTP status codes without re-deriving anything.
 */
export type ConfigWriteResult =
  | { ok: true }
  | {
      ok: false;
      reason: 'invalid-kind' | 'invalid-id' | 'not-found' | 'fs-error';
      message: string;
    };

/** The directory-backed config kinds that may be written. */
const KINDS = new Set(['hooks', 'templates']);

/**
 * Overwrites an existing config file under `root` (the absolute
 * `.ai/strikethroo` directory) with `content`, after validating the strict
 * allowlist: `config/<kind>/<id>.md` for the `hooks`/`templates` kinds, or
 * `config/config.yaml` for `workspace`/`config`. Returns a typed result;
 * performs zero filesystem changes on any guard failure.
 */
export const writeConfigFile = async (
  root: string,
  kind: string,
  id: string,
  content: string
): Promise<ConfigWriteResult> => {
  /** Target path relative to `root`; the helper does the on-disk containment. */
  let relTarget: string;
  if (kind === 'workspace') {
    // The workspace's single structured config file. No id namespace exists
    // here — `config` is the only valid id, fixed to config/config.yaml.
    if (id !== 'config') {
      return { ok: false, reason: 'invalid-id', message: 'Invalid config file id.' };
    }
    relTarget = path.join('config', 'config.yaml');
  } else {
    if (!KINDS.has(kind)) {
      return { ok: false, reason: 'invalid-kind', message: `Unknown config kind: ${kind}.` };
    }

    // Reject obvious traversal/nesting attempts early before any resolution.
    if (id === '' || id.includes('/') || id.includes('\\') || id.includes('..')) {
      return { ok: false, reason: 'invalid-id', message: 'Invalid config file id.' };
    }

    const dir = path.resolve(root, 'config', kind);
    const target = path.resolve(dir, `${id}.md`);

    // Lexical containment: the resolved target must be a direct, flat child of
    // `dir`. The on-disk walk below is what rejects links and special files.
    const withinDir = target.startsWith(dir + path.sep);
    const isFlatChild = path.dirname(target) === dir;
    if (!withinDir || !isFlatChild) {
      return { ok: false, reason: 'invalid-id', message: 'Invalid config file id.' };
    }
    relTarget = path.join('config', kind, `${id}.md`);
  }

  const written = await writeFileAtomic(root, relTarget, content, { mustExist: true });
  if (!('error' in written)) return { ok: true };
  // Anything the helper refused to resolve (missing, linked, special, escaped)
  // is reported as absent; only a genuine I/O failure is an fs-error.
  if (written.error === 'fs-error' || written.error === 'too-large') {
    return { ok: false, reason: 'fs-error', message: 'Failed to write config file.' };
  }
  return { ok: false, reason: 'not-found', message: 'Config file not found.' };
};
