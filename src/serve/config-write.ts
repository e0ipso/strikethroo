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
 * pass it overwrites the file content verbatim. It never deletes or renames.
 * Expected guard failures are returned as a typed result, not thrown; only an
 * unexpected filesystem error surfaces as `fs-error`. Node built-ins only.
 */

import * as fs from 'fs';
import * as path from 'path';

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
  let target: string;
  if (kind === 'workspace') {
    // The workspace's single structured config file. No id namespace exists
    // here — `config` is the only valid id, fixed to config/config.yaml.
    if (id !== 'config') {
      return { ok: false, reason: 'invalid-id', message: 'Invalid config file id.' };
    }
    target = path.resolve(root, 'config', 'config.yaml');
  } else {
    if (!KINDS.has(kind)) {
      return { ok: false, reason: 'invalid-kind', message: `Unknown config kind: ${kind}.` };
    }

    // Reject obvious traversal/nesting attempts early before any resolution.
    if (id === '' || id.includes('/') || id.includes('\\') || id.includes('..')) {
      return { ok: false, reason: 'invalid-id', message: 'Invalid config file id.' };
    }

    const dir = path.resolve(root, 'config', kind);
    target = path.resolve(dir, `${id}.md`);

    // Containment: the resolved target must be a direct, flat child of `dir`.
    const withinDir = target.startsWith(dir + path.sep);
    const isFlatChild = path.dirname(target) === dir;
    if (!withinDir || !isFlatChild) {
      return { ok: false, reason: 'invalid-id', message: 'Invalid config file id.' };
    }
  }

  try {
    const stat = await fs.promises.stat(target);
    if (!stat.isFile()) {
      return { ok: false, reason: 'not-found', message: 'Config file not found.' };
    }
  } catch {
    return { ok: false, reason: 'not-found', message: 'Config file not found.' };
  }

  try {
    await fs.promises.writeFile(target, content, 'utf8');
    return { ok: true };
  } catch {
    return { ok: false, reason: 'fs-error', message: 'Failed to write config file.' };
  }
};
