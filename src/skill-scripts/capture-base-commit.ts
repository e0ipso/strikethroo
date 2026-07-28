import * as fs from 'fs';
import * as path from 'path';
import { execGit } from './shared/git-utils';
import { resolvePlan } from './shared/plan-resolve';

const SHA_RE = /^[0-9a-f]{40}$/i;

type CaptureResult =
  | { kind: 'captured'; baseCommit: string; file: string }
  | { kind: 'already-captured'; baseCommit: string; file: string }
  | { kind: 'skipped'; reason: 'not-a-git-repository' | 'no-commits' }
  | { kind: 'error'; detail: string };

const emit = (result: CaptureResult, exitCode: number): never => {
  process.stdout.write(`${JSON.stringify(result)}\n`);
  process.exit(exitCode);
};

const _isGitRepo = (): boolean => execGit('git rev-parse --is-inside-work-tree') === 'true';

const _isValidSha = (value: unknown): value is string =>
  typeof value === 'string' && SHA_RE.test(value);

/**
 * Read a previously captured base commit, if the file exists and is valid.
 * Returns null for a missing file, unparsable JSON, or a shape that lacks a
 * valid 40-hex `baseCommit` — all of which are treated as "not yet captured"
 * so the caller overwrites rather than preserving a corrupt scope anchor.
 */
const _readExistingBaseCommit = (filePath: string): string | null => {
  let raw: string;
  try {
    raw = fs.readFileSync(filePath, 'utf8');
  } catch {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === 'object' &&
      _isValidSha((parsed as { baseCommit?: unknown }).baseCommit)
    ) {
      return (parsed as { baseCommit: string }).baseCommit;
    }
  } catch {
    return null;
  }
  return null;
};

const main = (startPath: string = process.cwd()): void => {
  if (!_isGitRepo()) {
    emit({ kind: 'skipped', reason: 'not-a-git-repository' }, 0);
  }

  const head = execGit('git rev-parse HEAD');
  if (!_isValidSha(head)) {
    emit({ kind: 'skipped', reason: 'no-commits' }, 0);
  }

  const inputId = process.argv[2] ?? '';
  const resolved = resolvePlan(inputId, startPath);
  if (!resolved) {
    emit({ kind: 'error', detail: `Plan "${inputId}" not found or invalid` }, 2);
  }

  const { planDir } = resolved!;
  const reviewDir = path.join(planDir, 'review');
  const filePath = path.join(reviewDir, 'base-commit.json');

  const existing = _readExistingBaseCommit(filePath);
  if (existing) {
    emit({ kind: 'already-captured', baseCommit: existing, file: filePath }, 0);
  }

  fs.mkdirSync(reviewDir, { recursive: true });
  const record = {
    version: 1,
    baseCommit: head as string,
    capturedAt: new Date().toISOString(),
  };
  fs.writeFileSync(filePath, `${JSON.stringify(record)}\n`, 'utf8');

  emit({ kind: 'captured', baseCommit: head as string, file: filePath }, 0);
};

if (require.main === module) {
  main();
}

export { main, _isGitRepo, _isValidSha, _readExistingBaseCommit };
