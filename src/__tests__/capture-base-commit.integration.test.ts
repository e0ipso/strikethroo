/**
 * Integration tests for `capture-base-commit.ts` against real, temporary
 * `git init` repositories. Git behaviour around an unborn `HEAD`, and around
 * whether a diff anchor moves, is the thing under test — mocking it would
 * prove nothing, so every repository here is a real one and every commit is
 * a real commit (local `user.name`/`user.email`, never ambient config).
 *
 * `main()` always calls `process.exit`, so it is exercised as a real
 * subprocess (the bundled `.cjs`, built fresh here with esbuild) rather than
 * imported and called in-process, exactly like `dispatch-task-execution`'s
 * own integration suite does.
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { execFileSync, spawnSync } from 'child_process';
import { buildSync } from 'esbuild';
import { CURRENT_WORKSPACE_SCHEMA_VERSION } from '../metadata';
import { execGit } from '../skill-scripts/shared/git-utils';
import { makeReviewGateWorkspace, type ReviewGateWorkspace } from './fixtures/review-gate';

let bundleDir: string;
let bundle: string;

beforeAll(() => {
  bundleDir = fs.mkdtempSync(path.join(os.tmpdir(), 'strikethroo-cbc-bundle-'));
  bundle = path.join(bundleDir, 'capture-base-commit.cjs');
  buildSync({
    entryPoints: [path.resolve(__dirname, '..', 'skill-scripts', 'capture-base-commit.ts')],
    outfile: bundle,
    platform: 'node',
    format: 'cjs',
    bundle: true,
    target: 'node22',
    define: { EXPECTED_WORKSPACE_SCHEMA_VERSION: JSON.stringify(CURRENT_WORKSPACE_SCHEMA_VERSION) },
  });
});

afterAll(() => fs.rmSync(bundleDir, { recursive: true, force: true }));

const git = (dir: string, args: string[]): string =>
  // stdio 'pipe' for stderr too: execFileSync otherwise inherits it, and git's
  // routine chatter (e.g. "Switched to a new branch") would leak into the
  // test run's console output.
  execFileSync('git', args, {
    cwd: dir,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();

/** A real repository with local identity — never ambient/global git config. */
const initRepo = (dir: string): void => {
  git(dir, ['init', '--quiet', '-b', 'main']);
  git(dir, ['config', 'user.name', 'Strikethroo Test']);
  git(dir, ['config', 'user.email', 'test@example.invalid']);
};

const commitAll = (dir: string, message: string): string => {
  git(dir, ['add', '-A']);
  git(dir, ['commit', '--quiet', '-m', message]);
  return git(dir, ['rev-parse', 'HEAD']);
};

/** The exact `git diff <base> --` invocation `code-review.ts`'s readCumulativeDiff uses. */
const diffFromBase = (dir: string, base: string): string =>
  execGit(`git -C ${JSON.stringify(dir)} diff ${base} --`) ?? '';

const runCapture = (dir: string, planArg = '1') =>
  spawnSync(process.execPath, [bundle, planArg], { cwd: dir, encoding: 'utf8' });

describe('capture-base-commit — real git repositories', () => {
  let ws: ReviewGateWorkspace;

  afterEach(() => ws?.cleanup());

  it('captures the current HEAD as the base commit on first run', () => {
    ws = makeReviewGateWorkspace();
    initRepo(ws.root);
    fs.writeFileSync(path.join(ws.root, 'seed.txt'), 'seed\n');
    const headSha = commitAll(ws.root, 'initial commit');

    const result = runCapture(ws.root);
    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
    expect(JSON.parse(result.stdout.trim())).toEqual({
      kind: 'captured',
      baseCommit: headSha,
      file: ws.baseCommitFile,
    });
    const recorded = JSON.parse(fs.readFileSync(ws.baseCommitFile, 'utf8'));
    expect(recorded.baseCommit).toBe(headSha);
  });

  it('reports already-captured on a later run without moving the recorded base', () => {
    ws = makeReviewGateWorkspace();
    initRepo(ws.root);
    fs.writeFileSync(path.join(ws.root, 'seed.txt'), 'seed\n');
    const headSha = commitAll(ws.root, 'initial commit');
    runCapture(ws.root);

    fs.writeFileSync(path.join(ws.root, 'seed.txt'), 'seed v2\n');
    commitAll(ws.root, 'a later commit that must not become the recorded base');

    const second = runCapture(ws.root);
    expect(second.status).toBe(0);
    expect(JSON.parse(second.stdout.trim())).toEqual({
      kind: 'already-captured',
      baseCommit: headSha,
      file: ws.baseCommitFile,
    });
  });

  it('overwrites a corrupted base-commit.json rather than treating it as already captured', () => {
    ws = makeReviewGateWorkspace();
    initRepo(ws.root);
    fs.writeFileSync(path.join(ws.root, 'seed.txt'), 'seed\n');
    const headSha = commitAll(ws.root, 'initial commit');
    fs.mkdirSync(path.dirname(ws.baseCommitFile), { recursive: true });
    fs.writeFileSync(ws.baseCommitFile, '{ this is not valid json');

    const result = runCapture(ws.root);
    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout.trim())).toEqual({
      kind: 'captured',
      baseCommit: headSha,
      file: ws.baseCommitFile,
    });
  });

  it('skips cleanly with exit 0, empty stderr, for a directory that is not a git repository', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'strikethroo-not-git-'));
    try {
      const result = spawnSync(process.execPath, [bundle, '1'], { cwd: dir, encoding: 'utf8' });
      expect(result.status).toBe(0);
      expect(result.stderr).toBe('');
      expect(JSON.parse(result.stdout.trim())).toEqual({
        kind: 'skipped',
        reason: 'not-a-git-repository',
      });
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('skips cleanly with exit 0, empty stderr, for a git repository with zero commits', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'strikethroo-zero-commit-'));
    try {
      initRepo(dir);
      const result = spawnSync(process.execPath, [bundle, '1'], { cwd: dir, encoding: 'utf8' });
      expect(result.status).toBe(0);
      expect(result.stderr).toBe('');
      expect(JSON.parse(result.stdout.trim())).toEqual({ kind: 'skipped', reason: 'no-commits' });
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('anchors the review scope to the recorded base: a further commit widens the diff without moving the base', () => {
    ws = makeReviewGateWorkspace();
    initRepo(ws.root);
    fs.writeFileSync(path.join(ws.root, 'unchanged.txt'), 'unchanged\n');
    fs.writeFileSync(path.join(ws.root, 'b.txt'), 'original\n');
    fs.writeFileSync(path.join(ws.root, 'c.txt'), 'original\n');
    const baseSha = commitAll(ws.root, 'commit A');

    const captured = runCapture(ws.root);
    expect(JSON.parse(captured.stdout.trim())).toMatchObject({
      kind: 'captured',
      baseCommit: baseSha,
    });

    // A committed change...
    fs.writeFileSync(path.join(ws.root, 'b.txt'), 'changed by commit B\n');
    commitAll(ws.root, 'commit B');
    // ...and an uncommitted change. Both must be in scope from the recorded base.
    fs.writeFileSync(path.join(ws.root, 'c.txt'), 'changed, left uncommitted\n');

    const scopeAfterB = diffFromBase(ws.root, baseSha);
    expect(scopeAfterB).toContain('b.txt');
    expect(scopeAfterB).toContain('c.txt');
    expect(scopeAfterB).not.toContain('unchanged.txt');

    // Re-running capture must not shift the recorded base to commit B.
    const second = runCapture(ws.root);
    expect(JSON.parse(second.stdout.trim())).toEqual({
      kind: 'already-captured',
      baseCommit: baseSha,
      file: ws.baseCommitFile,
    });

    fs.writeFileSync(path.join(ws.root, 'c.txt'), 'committed by commit C\n');
    commitAll(ws.root, 'commit C');

    const third = runCapture(ws.root);
    expect(JSON.parse(third.stdout.trim())).toEqual({
      kind: 'already-captured',
      baseCommit: baseSha,
      file: ws.baseCommitFile,
    });

    const scopeAfterC = diffFromBase(ws.root, baseSha);
    // Widened, not shifted: commit B's change is still visible even though the
    // base is still A and a further commit (C) has since landed.
    expect(scopeAfterC).toContain('b.txt');
    expect(scopeAfterC).toContain('c.txt');
    expect(scopeAfterC).not.toContain('unchanged.txt');
  });

  it('excludes unrelated prior commits on a non-main branch: the anchored diff is not a merge-base diff against main', () => {
    ws = makeReviewGateWorkspace();
    initRepo(ws.root);
    fs.writeFileSync(path.join(ws.root, 'seed.txt'), 'seed\n');
    commitAll(ws.root, 'main: initial commit');

    git(ws.root, ['checkout', '-b', 'feature']);
    fs.writeFileSync(path.join(ws.root, 'unrelated.txt'), 'unrelated prior work\n');
    commitAll(ws.root, 'feature: unrelated prior commit, before this plan started');

    const baseSha = git(ws.root, ['rev-parse', 'HEAD']);
    const captured = runCapture(ws.root);
    expect(JSON.parse(captured.stdout.trim())).toMatchObject({
      kind: 'captured',
      baseCommit: baseSha,
    });

    fs.writeFileSync(path.join(ws.root, 'plan-file.txt'), 'plan work\n');
    commitAll(ws.root, 'feature: plan commit');
    fs.writeFileSync(path.join(ws.root, 'seed.txt'), 'plan work, uncommitted\n');

    const mergeBaseSha = git(ws.root, ['merge-base', 'main', 'HEAD']);
    // Sanity: the recorded base and a main-relative merge-base genuinely differ,
    // so this scenario actually exercises the property under test.
    expect(mergeBaseSha).not.toBe(baseSha);
    const mergeBaseDiff = diffFromBase(ws.root, mergeBaseSha);
    expect(mergeBaseDiff).toContain('unrelated.txt');

    const anchoredDiff = diffFromBase(ws.root, baseSha);
    expect(anchoredDiff).toContain('plan-file.txt');
    expect(anchoredDiff).toContain('seed.txt');
    expect(anchoredDiff).not.toContain('unrelated.txt');
  });
});
