/**
 * Integration tests for the filesystem containment helper
 * (`src/skill-scripts/shared/safe-fs.ts`).
 *
 * Every scenario builds real links, directories, and (on POSIX) FIFOs inside a
 * disposable temp tree, then exercises the helper's three exports against them.
 * The helper is the single primitive serve and the CLI rely on to keep reads
 * and writes inside the selected workspace, so these tests pin the rejection
 * codes callers map to HTTP statuses, the FIFO non-hang guarantee, and the
 * atomic-write invariants (no stray temp files, complete content under
 * concurrent writers).
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { execFileSync } from 'child_process';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  resolveContained,
  readContainedFile,
  writeFileAtomic,
} from '../skill-scripts/shared/safe-fs';

const isWindows = process.platform === 'win32';
const posixOnly = it.skipIf(isWindows);

let tmp: string;
let root: string;
let outside: string;
let sentinel: string;

beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'safe-fs-'));
  root = path.join(tmp, 'ws');
  outside = path.join(tmp, 'outside');
  fs.mkdirSync(path.join(root, 'config', 'hooks'), { recursive: true });
  fs.mkdirSync(outside, { recursive: true });
  fs.writeFileSync(path.join(root, 'config', 'hooks', 'A.md'), '# a\n');
  sentinel = path.join(outside, 'sentinel.md');
  fs.writeFileSync(sentinel, 'untouched\n');
});

afterEach(() => {
  fs.rmSync(tmp, { recursive: true, force: true });
});

const tmpFilesIn = (dir: string): string[] => fs.readdirSync(dir).filter(n => /\.tmp$/.test(n));

const errorCode = (result: unknown): string | undefined =>
  typeof result === 'object' && result !== null && 'error' in result
    ? (result as { error: string }).error
    : undefined;

describe('resolveContained', () => {
  it('returns the canonical path of a regular file below the root', () => {
    const result = resolveContained(root, 'config/hooks/A.md');
    expect('error' in result).toBe(false);
    if ('error' in result) return;
    expect(result.path).toBe(fs.realpathSync.native(path.join(root, 'config', 'hooks', 'A.md')));
    expect(result.exists).toBe(true);
  });

  it('rejects traversal, absolute escapes, and NUL bytes without touching the disk', () => {
    expect(errorCode(resolveContained(root, '../outside/sentinel.md'))).toBe('outside-root');
    expect(errorCode(resolveContained(root, sentinel))).toBe('outside-root');
    expect(errorCode(resolveContained(root, 'config/\0/A.md'))).toBe('invalid-path');
  });

  it('rejects a symlinked leaf and a symlinked intermediate directory', () => {
    fs.symlinkSync(sentinel, path.join(root, 'config', 'hooks', 'LINK.md'));
    fs.symlinkSync(outside, path.join(root, 'config', 'linked-dir'), 'dir');
    expect(errorCode(resolveContained(root, 'config/hooks/LINK.md'))).toBe('symlink');
    expect(errorCode(resolveContained(root, 'config/linked-dir/sentinel.md'))).toBe('symlink');
    // A link whose target is itself inside the root is still rejected: the
    // helper never follows links below the root.
    fs.symlinkSync(
      path.join(root, 'config', 'hooks', 'A.md'),
      path.join(root, 'config', 'hooks', 'INNER.md')
    );
    expect(errorCode(resolveContained(root, 'config/hooks/INNER.md'))).toBe('symlink');
  });

  it('distinguishes a missing leaf from a missing or non-directory intermediate', () => {
    expect(errorCode(resolveContained(root, 'config/hooks/NEW.md'))).toBe('not-found');
    const allowed = resolveContained(root, 'config/hooks/NEW.md', { allowMissingLeaf: true });
    expect('error' in allowed).toBe(false);
    if (!('error' in allowed)) expect(allowed.exists).toBe(false);
    // Missing intermediate stays not-found even when the leaf may be missing.
    expect(
      errorCode(resolveContained(root, 'config/nope/NEW.md', { allowMissingLeaf: true }))
    ).toBe('not-found');
    // A regular file used as a directory component.
    expect(errorCode(resolveContained(root, 'config/hooks/A.md/x'))).toBe('not-a-directory');
  });

  it('enforces the expected leaf kind', () => {
    expect(errorCode(resolveContained(root, 'config/hooks'))).toBe('not-a-file');
    const dir = resolveContained(root, 'config/hooks', { expect: 'directory' });
    expect('error' in dir).toBe(false);
    expect(errorCode(resolveContained(root, 'config/hooks/A.md', { expect: 'directory' }))).toBe(
      'not-a-directory'
    );
  });

  it('allows links above the root and reports paths relative to the canonical root', () => {
    const linkedRoot = path.join(tmp, 'ws-link');
    fs.symlinkSync(root, linkedRoot, 'dir');
    const viaLink = resolveContained(linkedRoot, 'config/hooks/A.md');
    expect('error' in viaLink).toBe(false);
    if ('error' in viaLink) return;
    expect(viaLink.path).toBe(fs.realpathSync.native(path.join(root, 'config', 'hooks', 'A.md')));
    // An absolute input spelled through the non-canonical root is contained too.
    const absViaLink = resolveContained(
      linkedRoot,
      path.join(linkedRoot, 'config', 'hooks', 'A.md')
    );
    expect('error' in absViaLink).toBe(false);
  });
});

describe('readContainedFile', () => {
  it('reads a regular file and refuses a linked one', () => {
    const ok = readContainedFile(root, 'config/hooks/A.md');
    expect('error' in ok).toBe(false);
    if (!('error' in ok)) expect(ok.content).toBe('# a\n');
    fs.symlinkSync(sentinel, path.join(root, 'config', 'hooks', 'LINK.md'));
    expect(errorCode(readContainedFile(root, 'config/hooks/LINK.md'))).toBe('symlink');
  });

  it('applies the size bound', () => {
    fs.writeFileSync(path.join(root, 'config', 'hooks', 'BIG.md'), 'x'.repeat(64));
    expect(errorCode(readContainedFile(root, 'config/hooks/BIG.md', { maxBytes: 16 }))).toBe(
      'too-large'
    );
  });

  posixOnly(
    'rejects a FIFO without blocking',
    () => {
      const fifo = path.join(root, 'config', 'hooks', 'FIFO.md');
      execFileSync('mkfifo', [fifo]);
      expect(errorCode(readContainedFile(root, 'config/hooks/FIFO.md'))).toBe('not-a-file');
      expect(errorCode(resolveContained(root, 'config/hooks/FIFO.md'))).toBe('not-a-file');
    },
    5000
  );
});

describe('writeFileAtomic', () => {
  it('overwrites an existing file, preserves its mode, and leaves no temp file', async () => {
    const target = path.join(root, 'config', 'hooks', 'A.md');
    if (!isWindows) fs.chmodSync(target, 0o640);
    const result = await writeFileAtomic(root, 'config/hooks/A.md', 'rewritten\n', {
      mustExist: true,
    });
    expect('error' in result).toBe(false);
    expect(fs.readFileSync(target, 'utf8')).toBe('rewritten\n');
    if (!isWindows) expect(fs.statSync(target).mode & 0o777).toBe(0o640);
    expect(tmpFilesIn(path.dirname(target))).toEqual([]);
  });

  it('creates a new file only when mustExist is false, with mode 0600', async () => {
    const missing = await writeFileAtomic(root, 'config/hooks/NEW.md', 'x', { mustExist: true });
    expect(errorCode(missing)).toBe('not-found');
    expect(fs.existsSync(path.join(root, 'config', 'hooks', 'NEW.md'))).toBe(false);

    const created = await writeFileAtomic(root, 'config/hooks/NEW.md', 'created\n');
    expect('error' in created).toBe(false);
    const target = path.join(root, 'config', 'hooks', 'NEW.md');
    expect(fs.readFileSync(target, 'utf8')).toBe('created\n');
    if (!isWindows) expect(fs.statSync(target).mode & 0o777).toBe(0o600);
    expect(tmpFilesIn(path.dirname(target))).toEqual([]);
  });

  it('refuses linked leaves and linked parents, keeping the outside file intact', async () => {
    fs.symlinkSync(sentinel, path.join(root, 'config', 'hooks', 'LINK.md'));
    fs.symlinkSync(outside, path.join(root, 'config', 'linked-dir'), 'dir');
    const leaf = await writeFileAtomic(root, 'config/hooks/LINK.md', 'pwned', { mustExist: true });
    expect(errorCode(leaf)).toBe('symlink');
    const parent = await writeFileAtomic(root, 'config/linked-dir/sentinel.md', 'pwned', {
      mustExist: true,
    });
    expect(errorCode(parent)).toBe('symlink');
    expect(fs.readFileSync(sentinel, 'utf8')).toBe('untouched\n');
    expect(tmpFilesIn(outside)).toEqual([]);
    expect(tmpFilesIn(path.join(root, 'config', 'hooks'))).toEqual([]);
  });

  posixOnly(
    'refuses a FIFO target without blocking',
    async () => {
      const fifo = path.join(root, 'config', 'hooks', 'FIFO.md');
      execFileSync('mkfifo', [fifo]);
      const result = await writeFileAtomic(root, 'config/hooks/FIFO.md', 'x', { mustExist: true });
      expect(errorCode(result)).toBe('not-a-file');
      expect(fs.lstatSync(fifo).isFIFO()).toBe(true);
      expect(tmpFilesIn(path.dirname(fifo))).toEqual([]);
    },
    5000
  );

  it('leaves complete content from one writer after concurrent writes to one target', async () => {
    const payloads = Array.from({ length: 12 }, (_, i) => `writer-${i}\n`.repeat(2000));
    const results = await Promise.all(
      payloads.map(p => writeFileAtomic(root, 'config/hooks/A.md', p, { mustExist: true }))
    );
    for (const r of results) expect('error' in r).toBe(false);
    const final = fs.readFileSync(path.join(root, 'config', 'hooks', 'A.md'), 'utf8');
    expect(payloads).toContain(final);
    expect(tmpFilesIn(path.join(root, 'config', 'hooks'))).toEqual([]);
  });
});
