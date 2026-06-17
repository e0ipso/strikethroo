/**
 * Self-review launch capability for `npx strikethroo serve`.
 *
 * The serve API is otherwise read-only. This module adds the single, narrowly
 * scoped exception the SPA's "Launch self-review" button needs:
 *
 *   - {@link isSelfReviewAvailable} — a PATH scan answering "is the `self-review`
 *     binary installed?", exposed to the SPA via `GET /api/capabilities` so the
 *     button only renders when launching can actually succeed;
 *   - {@link launchSelfReview} — validates a client-supplied plan path stays
 *     inside the workspace's `plans/` or `archive/` subtree, then spawns the
 *     binary detached (fire-and-forget, like the browser auto-open).
 *
 * Untrusted input (the path string) is never passed to the shell: `spawn` is
 * invoked with an argv array, and the path is rejected before spawning unless it
 * resolves to an existing file under `plans/` or `archive/`. Node built-ins only.
 */

import * as fs from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';

/** The binary name looked up on PATH and spawned. */
export const SELF_REVIEW_BINARY = 'self-review';

/** Where to obtain self-review; surfaced by the SPA when it is not installed. */
export const SELF_REVIEW_URL = 'https://github.com/e0ipso/self-review';

/** Cache key derived from the environment inputs that affect the PATH scan. */
const availabilityCacheKey = (env: Record<string, string | undefined>): string => {
  const pathVar = env.PATH ?? env.Path ?? '';
  const pathext = process.platform === 'win32' ? (env.PATHEXT ?? '') : '';
  return `${process.platform}:${pathVar}:${pathext}`;
};

/** In-memory cache so repeated `/api/capabilities` calls avoid re-scanning PATH. */
const availabilityCache = new Map<string, boolean>();

const computeSelfReviewAvailable = (
  env: Record<string, string | undefined>,
  platform: typeof process.platform
): boolean => {
  const pathVar = env.PATH ?? env.Path ?? '';
  if (!pathVar) return false;

  const exts =
    platform === 'win32' ? (env.PATHEXT ?? '.EXE;.CMD;.BAT;.COM').split(';').filter(Boolean) : [''];

  for (const dir of pathVar.split(path.delimiter).filter(Boolean)) {
    for (const ext of exts) {
      const candidate = path.join(dir, SELF_REVIEW_BINARY + ext);
      try {
        if (fs.statSync(candidate).isFile()) return true;
      } catch {
        // Not present in this directory; keep scanning.
      }
    }
  }
  return false;
};

/**
 * Returns `true` when the `self-review` binary is found on the process `PATH`.
 *
 * A presence check, matching the literal "binary is in path" contract: each
 * `PATH` entry is probed for a regular file named `self-review` (plus the
 * `PATHEXT` variants on Windows). It deliberately does not execute the binary,
 * so it cannot hang and has no side effects. The result is cached in-memory
 * keyed by the relevant environment inputs.
 */
export const isSelfReviewAvailable = (
  env: Record<string, string | undefined> = process.env
): boolean => {
  const key = availabilityCacheKey(env);
  const cached = availabilityCache.get(key);
  if (cached !== undefined) return cached;

  const result = computeSelfReviewAvailable(env, process.platform);
  availabilityCache.set(key, result);
  return result;
};

/** Outcome of resolving and launching a self-review request. */
export interface LaunchResult {
  /** HTTP status the endpoint should send. */
  status: number;
  /** JSON body the endpoint should send. */
  body: { ok: true } | { ok: false; error: string };
}

/** Seams for testing: availability probe and the detached spawn. */
export interface LaunchDeps {
  available?: () => boolean;
  spawnDetached?: (command: string, args: string[]) => void;
}

/** Spawns the binary detached and unref'd so it outlives the request. */
const spawnDetached = (command: string, args: string[]): void => {
  const child = spawn(command, args, { stdio: 'ignore', detached: true });
  child.on('error', () => {
    /* a failed launch must not crash the server */
  });
  child.unref();
};

/**
 * Resolves a client-supplied plan path to an absolute path, requiring it to be
 * an existing file inside `<root>/plans` or `<root>/archive`. Returns the
 * absolute path on success or a user-facing error otherwise.
 *
 * `root` is the absolute `.ai/strikethroo` directory; client paths are the
 * workspace-relative form the SPA shows (e.g. `.ai/strikethroo/plans/NN--s/…`),
 * so they are resolved against the project root (`root/../..`). Absolute client
 * paths are accepted too — the containment check is what enforces safety.
 */
export const resolveReviewPath = (
  root: string,
  clientPath: string
): { absPath: string } | { error: string; status: number } => {
  if (typeof clientPath !== 'string' || clientPath.trim() === '') {
    return { error: 'A plan path is required.', status: 400 };
  }

  const projectRoot = path.resolve(root, '..', '..');
  const resolved = path.resolve(projectRoot, clientPath);

  const plansDir = path.join(root, 'plans');
  const archiveDir = path.join(root, 'archive');
  const within = (dir: string): boolean => resolved === dir || resolved.startsWith(dir + path.sep);

  if (!within(plansDir) && !within(archiveDir)) {
    return {
      error: 'Plan path must be inside the workspace plans/ or archive/ directory.',
      status: 400,
    };
  }

  try {
    if (!fs.statSync(resolved).isFile()) {
      return { error: 'Plan path does not point to a file.', status: 404 };
    }
  } catch {
    return { error: 'Plan file not found.', status: 404 };
  }

  return { absPath: resolved };
};

/**
 * Validates `clientPath` and, if the binary is available, launches
 * `self-review <absolutePath>` detached. Pure of HTTP concerns: returns the
 * status/body the endpoint should send so it stays unit-testable.
 */
export const launchSelfReview = (
  root: string,
  clientPath: string,
  deps: LaunchDeps = {}
): LaunchResult => {
  const available = deps.available ?? isSelfReviewAvailable;
  if (!available()) {
    return {
      status: 409,
      body: { ok: false, error: 'self-review is not installed on PATH.' },
    };
  }

  const resolved = resolveReviewPath(root, clientPath);
  if ('error' in resolved) {
    return { status: resolved.status, body: { ok: false, error: resolved.error } };
  }

  try {
    (deps.spawnDetached ?? spawnDetached)(SELF_REVIEW_BINARY, [resolved.absPath]);
  } catch (err) {
    return {
      status: 500,
      body: { ok: false, error: `Failed to launch self-review: ${(err as Error).message}` },
    };
  }

  return { status: 200, body: { ok: true } };
};
