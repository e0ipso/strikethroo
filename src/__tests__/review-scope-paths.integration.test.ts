/**
 * The review scope is collected by running Git over repository filenames, and
 * repository filenames are authored by whoever produced the files under review.
 * These tests build a real repository whose tracked and untracked paths carry
 * shell metacharacters, quotes, whitespace, a newline, non-ASCII, a leading
 * dash, and shell operators, and prove three things about `_readCumulativeDiff`:
 * every one of them reaches the diff, none of them executes anything, and the
 * index is untouched. A second group proves that a failing Git step surfaces
 * as `null` (infrastructure failure) rather than quietly shrinking the scope.
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { execFileSync, spawnSync } from 'child_process';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { _readCumulativeDiff } from '../skill-scripts/code-review';

const git = (cwd: string, args: string[]): string =>
  execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();

const initRepo = (dir: string): void => {
  git(dir, ['init', '--quiet', '-b', 'main']);
  git(dir, ['config', 'user.name', 'Strikethroo Test']);
  git(dir, ['config', 'user.email', 'test@example.invalid']);
  git(dir, ['config', 'core.hooksPath', '/dev/null']);
};

const commitAll = (dir: string, message: string): string => {
  git(dir, ['add', '-A']);
  git(dir, ['commit', '--quiet', '-m', message]);
  return git(dir, ['rev-parse', 'HEAD']);
};

/** Exit status of `git diff --cached --quiet`: 0 means the index matches HEAD. */
const cachedDiffStatus = (dir: string): number | null =>
  spawnSync('git', ['diff', '--cached', '--quiet'], { cwd: dir, stdio: 'ignore' }).status;

/**
 * Filenames an adversarial (or merely unusual) author might produce. Each is
 * exercised twice: as a tracked file modified in the working tree, and as an
 * untracked file. The content marker is what the assertions look for, since
 * Git's diff headers quote `"`, newlines and non-ASCII bytes.
 */
const HOSTILE_NAMES = [
  '$(touch m1)',
  '`touch m2`',
  'a b',
  'quote"d',
  "it's",
  'line1\nline2',
  'ünïcode.txt',
  '-leading-dash',
  'x&y|z;w',
] as const;

/** Names whose literal spelling survives Git's header quoting unchanged. */
const literalInHeaders = (name: string): boolean =>
  !/["\n]/.test(name) && /^[\x20-\x7e]*$/.test(name);

const markerFor = (kind: 'tracked' | 'untracked', index: number): string =>
  `MARKER_${kind.toUpperCase()}_${index}_${Buffer.from(HOSTILE_NAMES[index]!).toString('hex')}`;

/** Writes a file, returning false where the filesystem rejects the name. */
const tryWrite = (file: string, content: string): boolean => {
  try {
    fs.writeFileSync(file, content);
    return true;
  } catch {
    return false;
  }
};

describe('review scope: filenames are data, never commands', () => {
  let repo: string;
  const markerLocations = (): string[] =>
    ['m1', 'm2'].flatMap(m => [path.join(repo, m), path.join(process.cwd(), m)]);
  let preexistingMarkers: Set<string>;

  beforeEach(() => {
    repo = fs.mkdtempSync(path.join(os.tmpdir(), 'st-scope-paths-'));
    initRepo(repo);
    preexistingMarkers = new Set(markerLocations().filter(f => fs.existsSync(f)));
  });

  afterEach(() => {
    // A regression here would drop markers into the shell's cwd, which is the
    // repository running the tests; never leave those behind.
    for (const marker of markerLocations()) {
      if (!preexistingMarkers.has(marker)) fs.rmSync(marker, { force: true });
    }
    fs.rmSync(repo, { recursive: true, force: true });
  });

  it('includes every hostile tracked and untracked name, creates no marker files, and leaves the index alone', () => {
    fs.mkdirSync(path.join(repo, 'tracked'));
    fs.mkdirSync(path.join(repo, 'untracked'));
    const trackedNames: number[] = [];
    HOSTILE_NAMES.forEach((name, index) => {
      if (tryWrite(path.join(repo, 'tracked', name), `original ${index}\n`))
        trackedNames.push(index);
    });
    expect(trackedNames.length).toBeGreaterThan(0);
    const base = commitAll(repo, 'base with hostile tracked names');

    for (const index of trackedNames) {
      fs.writeFileSync(
        path.join(repo, 'tracked', HOSTILE_NAMES[index]!),
        `${markerFor('tracked', index)}\n`
      );
    }
    const untrackedNames: number[] = [];
    HOSTILE_NAMES.forEach((name, index) => {
      if (tryWrite(path.join(repo, 'untracked', name), `${markerFor('untracked', index)}\n`)) {
        untrackedNames.push(index);
      }
    });

    expect(cachedDiffStatus(repo)).toBe(0);

    const diff = _readCumulativeDiff(repo, base);

    expect(diff).not.toBeNull();
    for (const index of trackedNames) {
      expect(diff).toContain(markerFor('tracked', index));
      if (literalInHeaders(HOSTILE_NAMES[index]!)) {
        expect(diff).toContain(`tracked/${HOSTILE_NAMES[index]}`);
      }
    }
    for (const index of untrackedNames) {
      expect(diff).toContain(markerFor('untracked', index));
      if (literalInHeaders(HOSTILE_NAMES[index]!)) {
        expect(diff).toContain(
          `diff --git a/untracked/${HOSTILE_NAMES[index]} b/untracked/${HOSTILE_NAMES[index]}`
        );
      }
    }

    for (const marker of markerLocations()) {
      if (!preexistingMarkers.has(marker)) expect(fs.existsSync(marker)).toBe(false);
    }
    expect(cachedDiffStatus(repo)).toBe(0);
  });

  it('still drops generated, vendored and ignored paths, including ones with hostile names', () => {
    fs.writeFileSync(
      path.join(repo, '.gitattributes'),
      'gen/** linguist-generated=true\nvendor/** linguist-vendored=true\n'
    );
    fs.writeFileSync(path.join(repo, '.gitignore'), 'ignored/\n');
    fs.mkdirSync(path.join(repo, 'gen'));
    fs.writeFileSync(path.join(repo, 'gen/$(touch m1).cjs'), 'generated original\n');
    fs.writeFileSync(path.join(repo, 'src.ts'), 'export const real = 1;\n');
    const base = commitAll(repo, 'base');

    fs.writeFileSync(path.join(repo, 'gen/$(touch m1).cjs'), 'GENERATED_REBUILT\n');
    fs.mkdirSync(path.join(repo, 'vendor'));
    fs.writeFileSync(path.join(repo, 'vendor/`touch m2`.xsd'), 'VENDORED_UNTRACKED\n');
    fs.mkdirSync(path.join(repo, 'ignored'));
    fs.writeFileSync(path.join(repo, 'ignored/a b.txt'), 'IGNORED_OUTPUT\n');
    fs.writeFileSync(path.join(repo, 'src.ts'), 'export const real = 2;\n');
    fs.writeFileSync(path.join(repo, "kept it's.ts"), 'KEPT_UNTRACKED\n');

    const diff = _readCumulativeDiff(repo, base);

    expect(diff).toContain('export const real = 2;');
    expect(diff).toContain('KEPT_UNTRACKED');
    expect(diff).not.toContain('GENERATED_REBUILT');
    expect(diff).not.toContain('VENDORED_UNTRACKED');
    expect(diff).not.toContain('IGNORED_OUTPUT');
    for (const marker of markerLocations()) {
      if (!preexistingMarkers.has(marker)) expect(fs.existsSync(marker)).toBe(false);
    }
  });
});

describe('review scope: a failing Git step is an infrastructure failure, not a smaller scope', () => {
  let repo: string;
  let fakeBin: string;
  const originalPath = process.env.PATH;

  beforeEach(() => {
    repo = fs.mkdtempSync(path.join(os.tmpdir(), 'st-scope-fail-'));
    initRepo(repo);
    fs.writeFileSync(path.join(repo, 'seed.ts'), 'export const seed = 1;\n');
    commitAll(repo, 'seed');
    fs.writeFileSync(path.join(repo, 'seed.ts'), 'export const seed = 2;\n');
    fs.writeFileSync(path.join(repo, 'added.ts'), 'export const ADDED = 1;\n');

    const realGit = execFileSync('sh', ['-c', 'command -v git'], { encoding: 'utf8' }).trim();
    fakeBin = fs.mkdtempSync(path.join(os.tmpdir(), 'st-fake-git-'));
    fs.writeFileSync(
      path.join(fakeBin, 'git'),
      [
        '#!/bin/sh',
        'for arg in "$@"; do',
        '  if [ "$arg" = "$ST_FAIL_ON_ARG" ]; then',
        '    echo "simulated git failure" >&2',
        '    exit 2',
        '  fi',
        'done',
        `exec "${realGit}" "$@"`,
        '',
      ].join('\n')
    );
    fs.chmodSync(path.join(fakeBin, 'git'), 0o755);
    process.env.PATH = `${fakeBin}${path.delimiter}${originalPath ?? ''}`;
  });

  afterEach(() => {
    process.env.PATH = originalPath;
    delete process.env.ST_FAIL_ON_ARG;
    fs.rmSync(repo, { recursive: true, force: true });
    fs.rmSync(fakeBin, { recursive: true, force: true });
  });

  it('sanity: the real scope through the wrapper has both files', () => {
    const diff = _readCumulativeDiff(repo, git(repo, ['rev-parse', 'HEAD']));
    expect(diff).toContain('export const seed = 2;');
    expect(diff).toContain('export const ADDED = 1;');
  });

  it.each([
    ['changed-path listing', '--name-only'],
    ['untracked listing', 'ls-files'],
    ['attribute check', 'check-attr'],
    ['untracked add-diff', '--no-index'],
  ])('returns null when the %s fails', (_step, failingArg) => {
    process.env.ST_FAIL_ON_ARG = failingArg;
    const base = git(repo, ['rev-parse', 'HEAD']);

    expect(_readCumulativeDiff(repo, base)).toBeNull();
  });
});
