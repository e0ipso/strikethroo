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
 *
 * Launches are bounded: a {@link LaunchRegistry} tracks the plans whose child is
 * still running, refusing a duplicate for the same plan and anything past
 * {@link MAX_CONCURRENT_SELF_REVIEWS}. The registry is in-memory and per server
 * instance: a restart resets the accounting, and the detached children — which
 * the viewer never waits on — can outlive it. It is not a job manager.
 */

import * as fs from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';
import { resolveContained } from '../skill-scripts/shared/safe-fs';

/** The binary name looked up on PATH and spawned. */
export const SELF_REVIEW_BINARY = 'self-review';

/** Upper bound on self-review children running at once per server instance. */
export const MAX_CONCURRENT_SELF_REVIEWS = 2;

/** Seconds a client should wait before retrying a `429` launch. */
const BUSY_RETRY_AFTER_SECONDS = 30;

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
  /** Extra response headers (e.g. `Retry-After` on a busy refusal). */
  headers?: Record<string, string>;
}

/**
 * The plans (by canonical absolute path) whose self-review child is running.
 * One per server instance; see the module comment for what it is not.
 */
export type LaunchRegistry = Set<string>;

/** Creates an empty {@link LaunchRegistry}. */
export const createLaunchRegistry = (): LaunchRegistry => new Set<string>();

/** Fallback registry for callers that do not own one (tests pass their own). */
const defaultRegistry = createLaunchRegistry();

/** The slice of `ChildProcess` the launcher relies on; fakes implement it. */
export interface SpawnedChild {
  once(event: string, listener: (...args: never[]) => void): unknown;
  unref(): void;
}

/** Seams for testing: availability probe, the spawn, and the registry. */
export interface LaunchDeps {
  available?: () => boolean;
  spawn?: (command: string, args: string[]) => SpawnedChild;
  registry?: LaunchRegistry;
}

/** Spawns the binary detached with no stdio so it can outlive the request. */
const spawnDetached = (command: string, args: string[]): SpawnedChild =>
  spawn(command, args, { stdio: 'ignore', detached: true });

/** Resolves once the child reports `spawn`; rejects on a launch `error`. */
const awaitSpawn = (child: SpawnedChild): Promise<void> =>
  new Promise((resolve, reject) => {
    child.once('spawn', () => resolve());
    child.once('error', (err: unknown) => reject(err));
  });

const LAUNCH_FAILED: LaunchResult = {
  status: 500,
  body: { ok: false, error: 'Failed to launch self-review.' },
};

/**
 * Resolves a client-supplied plan path to an absolute path, requiring it to be
 * an existing file inside `<root>/plans` or `<root>/archive`. Returns the
 * absolute path on success or a user-facing error otherwise.
 *
 * `root` is the absolute `.ai/strikethroo` directory; client paths are the
 * workspace-relative form the SPA shows (e.g. `.ai/strikethroo/plans/NN--s/…`),
 * so they are resolved against the project root (`root/../..`). Absolute client
 * paths are accepted too — the containment check is what enforces safety: the
 * lexical check below picks the subtree, and the shared helper walks the real
 * components so a symlinked plan file or directory is refused rather than
 * followed out of the workspace.
 */
export const resolveReviewPath = (
  root: string,
  clientPath: string
): { absPath: string } | { error: string; status: number } => {
  if (typeof clientPath !== 'string' || clientPath.trim() === '') {
    return { error: 'A plan path is required.', status: 400 };
  }

  const absRoot = path.resolve(root);
  const projectRoot = path.resolve(absRoot, '..', '..');
  const resolved = path.resolve(projectRoot, clientPath);
  const rel = path.relative(absRoot, resolved);
  const first = rel.split(path.sep)[0];
  const outside = {
    error: 'Plan path must be inside the workspace plans/ or archive/ directory.',
    status: 400,
  };

  if (path.isAbsolute(rel) || first === '..' || (first !== 'plans' && first !== 'archive')) {
    return outside;
  }

  const contained = resolveContained(absRoot, rel);
  if ('error' in contained) {
    switch (contained.error) {
      case 'not-found':
        return { error: 'Plan file not found.', status: 404 };
      case 'not-a-file':
      case 'not-a-directory':
        return { error: 'Plan path does not point to a file.', status: 404 };
      case 'fs-error':
        return { error: 'Plan path could not be inspected.', status: 500 };
      default:
        // invalid-path, outside-root, symlink: the path does not denote a plain
        // file inside the workspace.
        return outside;
    }
  }

  return { absPath: resolved };
};

/**
 * Validates `clientPath` and, if the binary is available and a slot is free,
 * launches `self-review <absolutePath>` detached. Resolves `200` only after the
 * child's `spawn` event; a launch `error` (e.g. `ENOENT`) is a fixed `500`. The
 * plan's slot is taken synchronously before the spawn, so two simultaneous
 * requests for one plan cannot both launch, and is released — idempotently —
 * when the child exits, errors, or fails to launch. Pure of HTTP concerns:
 * returns the status/body the endpoint should send so it stays unit-testable.
 */
export const launchSelfReview = async (
  root: string,
  clientPath: string,
  deps: LaunchDeps = {}
): Promise<LaunchResult> => {
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

  const registry = deps.registry ?? defaultRegistry;
  const key = resolved.absPath;
  if (registry.has(key)) {
    return {
      status: 409,
      body: { ok: false, error: 'A self-review is already running for this plan.' },
    };
  }
  if (registry.size >= MAX_CONCURRENT_SELF_REVIEWS) {
    return {
      status: 429,
      body: {
        ok: false,
        error: `Too many self-reviews are running (limit ${MAX_CONCURRENT_SELF_REVIEWS}). Try again when one finishes.`,
      },
      headers: { 'Retry-After': String(BUSY_RETRY_AFTER_SECONDS) },
    };
  }

  registry.add(key);
  const release = (): void => {
    registry.delete(key);
  };

  let child: SpawnedChild;
  try {
    child = (deps.spawn ?? spawnDetached)(SELF_REVIEW_BINARY, [key]);
    await awaitSpawn(child);
  } catch {
    release();
    return LAUNCH_FAILED;
  }

  child.once('exit', release);
  child.once('error', release);
  child.unref();
  return { status: 200, body: { ok: true } };
};
