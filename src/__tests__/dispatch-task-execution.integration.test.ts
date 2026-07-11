import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { spawnSync } from 'child_process';
import { buildSync } from 'esbuild';

const makeBundle = (directory: string): string => {
  const outfile = path.join(directory, 'dispatch-task-execution.cjs');
  buildSync({
    entryPoints: [path.resolve('src/skill-scripts/dispatch-task-execution.ts')],
    outfile,
    platform: 'node',
    format: 'cjs',
    bundle: true,
    target: 'node22',
    define: { EXPECTED_WORKSPACE_SCHEMA_VERSION: '3' },
  });
  return outfile;
};

const run = (bundle: string, args: string[], env = process.env) =>
  spawnSync(process.execPath, [bundle, ...args], { encoding: 'utf8', env });

describe('dispatch task execution entrypoint', () => {
  it('emits one infrastructure JSON line for an unreadable task file', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'st-dispatch-'));
    const bundle = makeBundle(directory);
    const result = run(bundle, [path.join(directory, 'missing.md'), 'codex', directory, '12', '3']);

    expect(result.status).toBe(2);
    expect(result.stderr).toBe('');
    expect(result.stdout.trim().split('\n')).toHaveLength(1);
    expect(JSON.parse(result.stdout)).toMatchObject({
      kind: 'infrastructure-failure',
      detail: expect.stringContaining('ENOENT'),
    });
  });

  it('resolves an external route without checking or launching its executable', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'st-dispatch-'));
    const bundle = makeBundle(directory);
    const taskFile = path.join(directory, 'task.md');
    fs.writeFileSync(
      taskFile,
      '---\nid: 3\nstatus: pending\nexecution:\n  harness: claude\n  model: exact/model\n---\n# Task\n'
    );
    const result = run(bundle, ['resolve', taskFile, 'codex', directory, '12', '3'], {
      ...process.env,
      PATH: '',
    });

    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual({
      kind: 'external-override',
      harness: 'claude',
      model: 'exact/model',
    });
  });

  it('emits infrastructure failure when the executable disappears after preflight', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'st-dispatch-'));
    const bundle = makeBundle(directory);
    const executable = path.join(directory, 'claude');
    fs.writeFileSync(
      executable,
      '#!/bin/sh\nif [ "$1" = "auth" ]; then rm -- "$0"; exit 0; fi\nexit 0\n',
      { mode: 0o700 }
    );
    const taskFile = path.join(directory, 'task.md');
    fs.writeFileSync(
      taskFile,
      '---\nid: 3\nstatus: pending\nexecution:\n  harness: claude\n  model: exact/model\n---\n# Task\n'
    );
    const result = run(bundle, [taskFile, 'codex', directory, '12', '3'], {
      ...process.env,
      PATH: `${directory}${path.delimiter}${process.env.PATH ?? ''}`,
    });

    expect(result.status).toBe(2);
    expect(result.stderr).toBe('');
    expect(result.stdout.trim().split('\n')).toHaveLength(1);
    expect(JSON.parse(result.stdout)).toMatchObject({
      kind: 'infrastructure-failure',
      detail: expect.stringContaining('ENOENT'),
    });
  });
});
