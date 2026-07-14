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
    const result = run(bundle, [
      'resolve',
      path.join(directory, 'missing.md'),
      'codex',
      directory,
      '12',
      '3',
    ]);

    expect(result.status).toBe(2);
    expect(result.stderr).toBe('');
    expect(result.stdout.trim().split('\n')).toHaveLength(1);
    expect(JSON.parse(result.stdout)).toMatchObject({
      kind: 'infrastructure-failure',
      detail: expect.stringContaining('ENOENT'),
    });
  });

  it('keeps released tasks without routing metadata on native defaults', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'st-dispatch-'));
    const bundle = makeBundle(directory);
    const taskFile = path.join(directory, 'task.md');
    fs.writeFileSync(taskFile, '---\nid: 3\nstatus: pending\n---\n# Task\n');
    const result = run(bundle, ['resolve', taskFile, 'codex', directory, '12', '3'], {
      ...process.env,
      PATH: '',
    });

    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual({ kind: 'native-default' });
  });

  it('retries an unavailable external target and selects a current-harness target', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'st-dispatch-'));
    const bundle = makeBundle(directory);
    fs.mkdirSync(path.join(directory, '.ai/strikethroo/config'), { recursive: true });
    fs.writeFileSync(
      path.join(directory, '.ai/strikethroo/config/config.yaml'),
      'execution_routing:\n  profiles:\n    mixed:\n      description: Mixed route.\n      models:\n        - model: external/model\n          harness: claude\n        - model: native/model\n          harness: codex\n          reasoning_effort: high\n'
    );
    const executable = path.join(directory, 'claude');
    fs.writeFileSync(executable, '#!/bin/sh\nexit 1\n', { mode: 0o700 });
    const taskFile = path.join(directory, 'task.md');
    fs.writeFileSync(
      taskFile,
      '---\nid: 3\nstatus: pending\nexecution_profile: mixed\n---\n# Task\n'
    );
    const result = run(bundle, ['resolve', taskFile, 'codex', directory, '12', '3'], {
      ...process.env,
      PATH: directory,
    });

    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
    expect(JSON.parse(result.stdout)).toEqual({
      kind: 'native-override',
      model: 'native/model',
      reasoningEffort: 'high',
    });
  });

  it('executes the resolved external handoff after configuration drift', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'st-dispatch-'));
    const bundle = makeBundle(directory);
    const configDir = path.join(directory, '.ai/strikethroo/config');
    fs.mkdirSync(configDir, { recursive: true });
    const config = path.join(configDir, 'config.yaml');
    fs.writeFileSync(
      config,
      'execution_routing:\n  profiles:\n    remote:\n      description: Remote route.\n      models:\n        - model: exact/model\n          harness: claude\n'
    );
    fs.writeFileSync(
      path.join(directory, 'claude'),
      '#!/bin/sh\nwhile IFS= read -r line; do :; done\nexit 0\n',
      { mode: 0o700 }
    );
    const taskFile = path.join(directory, 'task.md');
    fs.writeFileSync(
      taskFile,
      '---\nid: 3\nstatus: pending\nexecution_profile: remote\n---\n# Task\n'
    );
    const env = { ...process.env, PATH: directory };
    const resolved = run(bundle, ['resolve', taskFile, 'codex', directory, '12', '3'], env);
    const route = JSON.parse(resolved.stdout) as { kind: string; handoff: string };
    expect(route).toMatchObject({
      kind: 'external-override',
      harness: 'claude',
      model: 'exact/model',
      handoff: expect.any(String),
    });

    fs.writeFileSync(config, 'execution_routing:\n  profiles: {}\n');
    const executed = run(
      bundle,
      ['execute', route.handoff, taskFile, 'codex', directory, '12', '3'],
      env
    );
    expect(executed.status, executed.stdout).toBe(0);
    expect(JSON.parse(executed.stdout)).toEqual({ kind: 'launched-success', exitCode: 0 });
  });
});
