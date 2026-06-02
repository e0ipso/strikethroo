/**
 * Unit tests for the guarded config-write operation (`src/serve/config-write.ts`).
 *
 * These exercise the strict-allowlist guard logic at the filesystem boundary —
 * the custom business logic that warrants tests — against a disposable, per-test
 * workspace fixture in the OS temp dir. The repository's own `.ai/strikethroo/`
 * is never touched. We do not test `fs` itself.
 *
 * Coverage: unknown kind -> invalid-kind; traversal id -> invalid-id;
 * non-existent file -> not-found; happy path overwrites verbatim and the new
 * bytes are readable; and the no-create / no-collateral-write invariant.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { writeConfigFile } from '../serve/config-write';

let tmpRoot: string;
let root: string;

beforeEach(() => {
  tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'config-write-test-'));
  root = path.join(tmpRoot, '.ai', 'strikethroo');
  fs.mkdirSync(path.join(root, 'config', 'hooks'), { recursive: true });
  fs.mkdirSync(path.join(root, 'config', 'templates'), { recursive: true });
  fs.writeFileSync(path.join(root, 'config', 'hooks', 'SAMPLE.md'), '# original\n', 'utf8');
  fs.writeFileSync(
    path.join(root, 'config', 'templates', 'PLAN_TEMPLATE.md'),
    '# plan template\n',
    'utf8'
  );
  // A secret file outside config/<kind>/ to assert traversal never reaches it.
  fs.writeFileSync(path.join(root, 'secret.md'), '# do not touch\n', 'utf8');
});

afterEach(() => {
  fs.rmSync(tmpRoot, { recursive: true, force: true });
});

describe('writeConfigFile', () => {
  it('rejects an unknown kind with invalid-kind and writes nothing', async () => {
    const result = await writeConfigFile(root, 'secrets', 'SAMPLE', 'x');
    expect(result).toEqual({
      ok: false,
      reason: 'invalid-kind',
      message: 'Unknown config kind: secrets.',
    });
    expect(fs.readFileSync(path.join(root, 'config', 'hooks', 'SAMPLE.md'), 'utf8')).toBe(
      '# original\n'
    );
  });

  it('rejects a traversal id with invalid-id and never escapes the directory', async () => {
    const result = await writeConfigFile(root, 'hooks', '../../secret', 'pwned');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('invalid-id');
    // The out-of-tree file is untouched.
    expect(fs.readFileSync(path.join(root, 'secret.md'), 'utf8')).toBe('# do not touch\n');
  });

  it('rejects a separator/backslash/dotdot id with invalid-id', async () => {
    for (const id of ['a/b', 'a\\b', '..', 'x..y', '']) {
      const result = await writeConfigFile(root, 'hooks', id, 'x');
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toBe('invalid-id');
    }
  });

  it('rejects a non-existent file with not-found and does not create it', async () => {
    const result = await writeConfigFile(root, 'hooks', 'DOES_NOT_EXIST', 'new');
    expect(result).toEqual({
      ok: false,
      reason: 'not-found',
      message: 'Config file not found.',
    });
    expect(fs.existsSync(path.join(root, 'config', 'hooks', 'DOES_NOT_EXIST.md'))).toBe(false);
  });

  it('overwrites an existing hook verbatim and the new bytes are readable', async () => {
    const next = '# rewritten\n\nLine with trailing content.\n';
    const result = await writeConfigFile(root, 'hooks', 'SAMPLE', next);
    expect(result).toEqual({ ok: true });
    expect(fs.readFileSync(path.join(root, 'config', 'hooks', 'SAMPLE.md'), 'utf8')).toBe(next);
  });

  it('overwrites an existing template verbatim', async () => {
    const next = '# new plan template\n';
    const result = await writeConfigFile(root, 'templates', 'PLAN_TEMPLATE', next);
    expect(result).toEqual({ ok: true });
    expect(
      fs.readFileSync(path.join(root, 'config', 'templates', 'PLAN_TEMPLATE.md'), 'utf8')
    ).toBe(next);
  });
});
