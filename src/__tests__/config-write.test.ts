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
import { execFileSync } from 'child_process';
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
  fs.writeFileSync(
    path.join(root, 'config', 'config.yaml'),
    'execution_routing:\n  profiles: {}\n',
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

  it('overwrites the workspace config.yaml via the workspace kind', async () => {
    const next =
      'execution_routing:\n  profiles:\n    routine:\n      description: d\n      models:\n        - model: m\n';
    const result = await writeConfigFile(root, 'workspace', 'config', next);
    expect(result).toEqual({ ok: true });
    expect(fs.readFileSync(path.join(root, 'config', 'config.yaml'), 'utf8')).toBe(next);
  });

  it('rejects any workspace id other than "config" with invalid-id', async () => {
    const result = await writeConfigFile(root, 'workspace', 'other', 'x');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('invalid-id');
  });

  it('reports not-found for the workspace kind when config.yaml is absent', async () => {
    fs.rmSync(path.join(root, 'config', 'config.yaml'));
    const result = await writeConfigFile(root, 'workspace', 'config', 'x');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('not-found');
    expect(fs.existsSync(path.join(root, 'config', 'config.yaml'))).toBe(false);
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

describe('writeConfigFile filesystem containment', () => {
  let outside: string;
  let sentinel: string;
  const tmpFilesIn = (dir: string): string[] =>
    fs.existsSync(dir) ? fs.readdirSync(dir).filter(n => /\.tmp$/.test(n)) : [];

  beforeEach(() => {
    outside = path.join(tmpRoot, 'outside');
    fs.mkdirSync(outside, { recursive: true });
    sentinel = path.join(outside, 'sentinel.md');
    fs.writeFileSync(sentinel, 'untouched\n', 'utf8');
  });

  it('refuses a symlinked hook file, a symlinked hooks dir, and a symlinked config.yaml', async () => {
    fs.symlinkSync(sentinel, path.join(root, 'config', 'hooks', 'LINKED.md'));
    fs.rmSync(path.join(root, 'config', 'templates'), { recursive: true, force: true });
    fs.symlinkSync(outside, path.join(root, 'config', 'templates'), 'dir');
    fs.rmSync(path.join(root, 'config', 'config.yaml'));
    fs.symlinkSync(sentinel, path.join(root, 'config', 'config.yaml'));

    const attempts = [
      await writeConfigFile(root, 'hooks', 'LINKED', 'pwned'),
      await writeConfigFile(root, 'templates', 'sentinel', 'pwned'),
      await writeConfigFile(root, 'workspace', 'config', 'pwned'),
    ];
    for (const result of attempts) {
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(['not-found', 'invalid-id']).toContain(result.reason);
        expect(result.message).not.toMatch(/symlink|outside|\//);
      }
    }
    expect(fs.readFileSync(sentinel, 'utf8')).toBe('untouched\n');
    expect(tmpFilesIn(outside)).toEqual([]);
    expect(tmpFilesIn(path.join(root, 'config', 'hooks'))).toEqual([]);
    // Unlinked siblings keep working.
    expect(await writeConfigFile(root, 'hooks', 'SAMPLE', '# still fine\n')).toEqual({ ok: true });
  });

  it.skipIf(process.platform === 'win32')(
    'refuses a FIFO at a hook path without blocking',
    async () => {
      const fifo = path.join(root, 'config', 'hooks', 'FIFO.md');
      execFileSync('mkfifo', [fifo]);
      const result = await writeConfigFile(root, 'hooks', 'FIFO', 'x');
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toBe('not-found');
      expect(fs.lstatSync(fifo).isFIFO()).toBe(true);
      expect(tmpFilesIn(path.join(root, 'config', 'hooks'))).toEqual([]);
    },
    5000
  );

  it('refuses a directory at a hook path and leaves it and its contents in place', async () => {
    const dir = path.join(root, 'config', 'hooks', 'DIR.md');
    fs.mkdirSync(dir);
    fs.writeFileSync(path.join(dir, 'inner.md'), 'inner\n', 'utf8');
    const result = await writeConfigFile(root, 'hooks', 'DIR', 'x');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('not-found');
    expect(fs.lstatSync(dir).isDirectory()).toBe(true);
    expect(fs.readFileSync(path.join(dir, 'inner.md'), 'utf8')).toBe('inner\n');
    expect(tmpFilesIn(path.join(root, 'config', 'hooks'))).toEqual([]);
  });
});
