/**
 * Filesystem containment for reads and writes under a selected workspace root.
 *
 * Shared by serve, the CLI domain, and the skill bundles. Every entry point
 * takes the workspace root plus a path and refuses to touch anything that is
 * not a plain file (or directory) reached through plain directories below the
 * canonical root. Links above the root (a symlinked home directory, a
 * canonicalized temp dir) are fine: only the components below it are walked.
 *
 * What this module guarantees and what it does not:
 *
 * - The component walk is `lstat`-based and therefore racy on its own: a link
 *   planted between the walk and the operation is not seen by the walk. Reads
 *   close that window with `O_NOFOLLOW` on the final open plus an `fstat` of
 *   the descriptor; writes close it with `O_EXCL` on the temp file (which never
 *   follows a link) and a re-check of the target immediately before `rename`.
 *   A pre-write `realpath` alone is never treated as evidence of containment.
 * - Hard links are not detected and are out of scope.
 * - On Windows `O_NOFOLLOW` is undefined, so the read path relies on the
 *   `lstat` walk plus a `dev`/`ino` comparison between the `lstat` result and
 *   the `fstat` of the opened descriptor. That narrows the race but does not
 *   eliminate it.
 */

import * as fs from 'fs';
import * as path from 'path';
import { randomBytes } from 'crypto';

/** Why a path was refused. Callers map these to their own result unions. */
export type SafeFsErrorCode =
  | 'invalid-path'
  | 'outside-root'
  | 'symlink'
  | 'not-found'
  | 'not-a-directory'
  | 'not-a-file'
  | 'too-large'
  | 'fs-error';

/** The failure shape every export returns; never thrown. */
export interface SafeFsError {
  error: SafeFsErrorCode;
  message: string;
}

export interface ResolveContainedOptions {
  /** Accept a leaf that does not exist yet (its parents must still exist). */
  allowMissingLeaf?: boolean;
  /** Required kind of an existing leaf. Defaults to `file`. */
  expect?: 'file' | 'directory';
}

export interface ContainedPath {
  /** Canonical absolute path: the canonical root joined with the checked components. */
  path: string;
  /** Path relative to the canonical root, with platform separators. */
  relative: string;
  /** `false` only when `allowMissingLeaf` was set and the leaf is absent. */
  exists: boolean;
  /** `lstat` of the leaf when it exists. */
  stats?: fs.Stats;
}

export interface ReadContainedOptions {
  /** Maximum bytes accepted. Defaults to {@link DEFAULT_MAX_READ_BYTES}. */
  maxBytes?: number;
}

export interface WriteFileAtomicOptions {
  /** Refuse to create the file; it must already exist as a regular file. */
  mustExist?: boolean;
  /** Mode for the written file. Defaults to the existing file's mode, else 0o600. */
  mode?: number;
}

export const DEFAULT_MAX_READ_BYTES = 8 * 1024 * 1024;

const fail = (error: SafeFsErrorCode, message: string): SafeFsError => ({ error, message });

const errno = (err: unknown): string | undefined =>
  typeof err === 'object' && err !== null && 'code' in err
    ? String((err as { code: unknown }).code)
    : undefined;

const canonicalRootOf = (root: string): string | SafeFsError => {
  try {
    return fs.realpathSync.native(path.resolve(root));
  } catch {
    return fail('not-found', 'Workspace root does not exist.');
  }
};

/**
 * Checks every component of `input` below `root` with `lstat` and returns the
 * canonical path, or a typed error. Rejects any symbolic link below the root,
 * any non-directory intermediate, and any existing leaf that is not of the
 * expected kind (FIFOs, sockets, devices, and directories for `file`).
 */
export const resolveContained = (
  root: string,
  input: string,
  options: ResolveContainedOptions = {}
): ContainedPath | SafeFsError => {
  if (typeof input !== 'string' || input.includes('\0')) {
    return fail('invalid-path', 'Path is not valid.');
  }
  const givenRoot = path.resolve(root);
  const canonicalRoot = canonicalRootOf(givenRoot);
  if (typeof canonicalRoot !== 'string') return canonicalRoot;

  // Absolute inputs are usually spelled through the root as the caller knows
  // it, which may be a non-canonical alias; re-base them on the given root
  // before joining onto the canonical one.
  const rel = path.isAbsolute(input) ? path.relative(givenRoot, input) : input;
  const target = path.resolve(canonicalRoot, rel);
  const relative = path.relative(canonicalRoot, target);
  if (
    path.isAbsolute(relative) ||
    relative === '..' ||
    relative.startsWith(`..${path.sep}`) ||
    relative.includes('\0')
  ) {
    return fail('outside-root', 'Path is outside the workspace root.');
  }

  const kind = options.expect ?? 'file';
  const parts = relative === '' ? [] : relative.split(path.sep);
  let current = canonicalRoot;
  // Seeded with the root so an empty `parts` (the root itself) has leaf stats.
  let stats: fs.Stats;
  try {
    stats = fs.lstatSync(canonicalRoot);
  } catch {
    return fail('fs-error', 'Could not inspect path.');
  }

  for (let i = 0; i < parts.length; i += 1) {
    const isLeaf = i === parts.length - 1;
    current = path.join(current, parts[i] as string);
    try {
      stats = fs.lstatSync(current);
    } catch (err) {
      const code = errno(err);
      if (code === 'ENOENT' || code === 'ENOTDIR') {
        if (isLeaf && options.allowMissingLeaf) {
          return { path: current, relative, exists: false };
        }
        return fail('not-found', 'Path does not exist.');
      }
      return fail('fs-error', 'Could not inspect path.');
    }
    if (stats.isSymbolicLink()) {
      return fail('symlink', 'Symbolic links inside the workspace are not allowed.');
    }
    if (!isLeaf && !stats.isDirectory()) {
      return fail('not-a-directory', 'A path component is not a directory.');
    }
  }

  if (kind === 'directory' && !stats.isDirectory()) {
    return fail('not-a-directory', 'Path is not a directory.');
  }
  if (kind === 'file' && !stats.isFile()) {
    return fail('not-a-file', 'Path is not a regular file.');
  }
  return { path: current, relative, exists: true, stats };
};

/**
 * Reads a contained regular file as UTF-8 with a size bound. Opens with
 * `O_NOFOLLOW` where available and `O_NONBLOCK` so a FIFO cannot block the
 * process, then requires the descriptor to be a regular file.
 */
export const readContainedFile = (
  root: string,
  input: string,
  options: ReadContainedOptions = {}
): { path: string; content: string } | SafeFsError => {
  const resolved = resolveContained(root, input);
  if ('error' in resolved) return resolved;
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_READ_BYTES;
  const { O_RDONLY, O_NOFOLLOW, O_NONBLOCK } = fs.constants as Record<string, number | undefined>;
  const flags = (O_RDONLY ?? 0) | (O_NOFOLLOW ?? 0) | (O_NONBLOCK ?? 0);

  let fd: number;
  try {
    fd = fs.openSync(resolved.path, flags);
  } catch (err) {
    const code = errno(err);
    if (code === 'ELOOP')
      return fail('symlink', 'Symbolic links inside the workspace are not allowed.');
    if (code === 'ENOENT') return fail('not-found', 'Path does not exist.');
    return fail('fs-error', 'Could not open file.');
  }

  try {
    const opened = fs.fstatSync(fd);
    if (!opened.isFile()) return fail('not-a-file', 'Path is not a regular file.');
    if (O_NOFOLLOW === undefined && resolved.stats) {
      // Windows: no O_NOFOLLOW, so require the opened file to be the one lstat saw.
      if (opened.dev !== resolved.stats.dev || opened.ino !== resolved.stats.ino) {
        return fail('symlink', 'Path changed between inspection and open.');
      }
    }
    if (opened.size > maxBytes) return fail('too-large', 'File exceeds the size limit.');

    const chunks: Buffer[] = [];
    let total = 0;
    const chunk = Buffer.alloc(64 * 1024);
    for (;;) {
      const read = fs.readSync(fd, chunk, 0, chunk.length, null);
      if (read === 0) break;
      total += read;
      if (total > maxBytes) return fail('too-large', 'File exceeds the size limit.');
      chunks.push(Buffer.from(chunk.subarray(0, read)));
    }
    return { path: resolved.path, content: Buffer.concat(chunks, total).toString('utf8') };
  } catch {
    return fail('fs-error', 'Could not read file.');
  } finally {
    fs.closeSync(fd);
  }
};

/**
 * Writes `content` to a contained path atomically: an exclusive, randomly
 * named temp file in the same directory is written, `fsync`ed, and renamed
 * over the target. The temp file is removed on every failure path. With
 * `mustExist` the target has to be a regular file already; otherwise a
 * missing leaf is created with `mode` (default 0o600).
 */
export const writeFileAtomic = async (
  root: string,
  input: string,
  content: string | Buffer,
  options: WriteFileAtomicOptions = {}
): Promise<{ path: string } | SafeFsError> => {
  const mustExist = options.mustExist === true;
  const resolved = resolveContained(root, input, { allowMissingLeaf: !mustExist });
  if ('error' in resolved) return resolved;
  if (mustExist && !resolved.exists) return fail('not-found', 'Path does not exist.');

  const target = resolved.path;
  const dir = path.dirname(target);
  const mode =
    options.mode ?? (resolved.exists && resolved.stats ? resolved.stats.mode & 0o777 : 0o600);
  const temp = path.join(dir, `.${path.basename(target)}.${randomBytes(8).toString('hex')}.tmp`);

  let handle: fs.promises.FileHandle | undefined;
  let renamed = false;
  try {
    // 'wx' is O_CREAT|O_EXCL: it fails rather than follow a link at `temp`.
    handle = await fs.promises.open(temp, 'wx', 0o600);
    await handle.writeFile(content);
    await handle.sync();
    if (mode !== 0o600) await handle.chmod(mode);
    await handle.close();
    handle = undefined;

    // Re-check the target right before the rename; see the module comment for
    // what this does and does not close.
    try {
      const again = fs.lstatSync(target);
      if (again.isSymbolicLink()) {
        return fail('symlink', 'Symbolic links inside the workspace are not allowed.');
      }
      if (!again.isFile()) return fail('not-a-file', 'Path is not a regular file.');
    } catch (err) {
      if (errno(err) !== 'ENOENT') return fail('fs-error', 'Could not inspect path.');
      if (mustExist) return fail('not-found', 'Path does not exist.');
    }

    await fs.promises.rename(temp, target);
    renamed = true;
    return { path: target };
  } catch {
    return fail('fs-error', 'Could not write file.');
  } finally {
    if (handle) await handle.close().catch(() => undefined);
    if (!renamed) await fs.promises.unlink(temp).catch(() => undefined);
  }
};
