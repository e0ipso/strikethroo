import { spawnSync } from 'child_process';
import { buildSync } from 'esbuild';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

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

  it('keeps tasks without routing metadata on native defaults', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'st-dispatch-'));
    const bundle = makeBundle(directory);
    const taskFile = path.join(directory, 'task.md');
    fs.writeFileSync(taskFile, '---\nid: 3\nstatus: pending\n---\n# Task\n');

    const result = run(bundle, ['resolve', taskFile, 'codex', directory, '12', '3']);

    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual({ kind: 'native-default' });
  });

  it('retries an unavailable external target and selects the current harness', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'st-dispatch-'));
    const bundle = makeBundle(directory);
    fs.mkdirSync(path.join(directory, '.ai/strikethroo/config'), { recursive: true });
    fs.writeFileSync(
      path.join(directory, '.ai/strikethroo/config/config.yaml'),
      'execution_routing:\n  profiles:\n    mixed:\n      description: Mixed route.\n' +
        '      models:\n        - model: external/model\n          harness: claude\n' +
        '        - model: native/model\n          harness: codex\n          reasoning_effort: high\n'
    );
    fs.writeFileSync(path.join(directory, 'claude'), '#!/bin/sh\nexit 1\n', { mode: 0o700 });
    const taskFile = path.join(directory, 'task.md');
    fs.writeFileSync(
      taskFile,
      '---\nid: 3\nstatus: pending\nexecution_profile: mixed\n---\n# Task\n'
    );

    const result = run(bundle, ['resolve', taskFile, 'codex', directory, '12', '3'], {
      ...process.env,
      PATH: directory,
    });

    expect(JSON.parse(result.stdout)).toEqual({
      kind: 'native-override',
      model: 'native/model',
      reasoningEffort: 'high',
    });
  });

  it('uses local arguments for readiness and task execution', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'st-dispatch-'));
    const bundle = makeBundle(directory);
    fs.mkdirSync(path.join(directory, '.ai/strikethroo/config'), { recursive: true });
    fs.writeFileSync(
      path.join(directory, '.ai/strikethroo/config/config.yaml'),
      'harnesses:\n  claude:\n    cli_args:\n      - --local-permission\n' +
        'execution_routing:\n  profiles:\n    remote:\n      description: Remote route.\n' +
        '      models:\n        - model: exact/model\n          harness: claude\n'
    );
    fs.writeFileSync(
      path.join(directory, 'claude'),
      `#!${process.execPath}
const fs = require('fs');
const path = require('path');
let stdin = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => { stdin += chunk; });
process.stdin.on('end', () => {
  const evidence = /STRIKETHROO_READINESS=(\\{[^\\n]+\\})/.exec(stdin);
  if (evidence) {
    const value = JSON.parse(evidence[1]);
    fs.writeFileSync(path.join(process.cwd(), value.file), value.content);
  }
  if (stdin.includes('Strikethroo external task dispatch')) {
    fs.writeFileSync(path.join(process.cwd(), 'launched-argv.json'), JSON.stringify(process.argv.slice(2)));
  }
});
`,
      { mode: 0o700 }
    );
    const taskFile = path.join(directory, 'task.md');
    fs.writeFileSync(
      taskFile,
      '---\nid: 3\nstatus: pending\nexecution_profile: remote\n---\n# Task\n'
    );
    const env = { ...process.env, PATH: `${directory}${path.delimiter}${process.env.PATH ?? ''}` };

    const resolved = run(bundle, ['resolve', taskFile, 'codex', directory, '12', '3'], env);
    const route = JSON.parse(resolved.stdout) as { handoff: string };
    expect(JSON.parse(Buffer.from(route.handoff, 'base64url').toString('utf8'))).toEqual({
      version: 1,
      kind: 'external-override',
      harness: 'claude',
      model: 'exact/model',
    });

    const executed = run(
      bundle,
      ['execute', route.handoff, taskFile, 'codex', directory, '12', '3'],
      env
    );
    expect(JSON.parse(executed.stdout)).toEqual({ kind: 'launched-success', exitCode: 0 });
    expect(JSON.parse(fs.readFileSync(path.join(directory, 'launched-argv.json'), 'utf8'))).toEqual(
      ['-p', '--local-permission', '--model', 'exact/model']
    );
  });

  it('fails external resolution when local harness configuration is malformed', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'st-dispatch-'));
    const bundle = makeBundle(directory);
    fs.mkdirSync(path.join(directory, '.ai/strikethroo/config'), { recursive: true });
    fs.writeFileSync(
      path.join(directory, '.ai/strikethroo/config/config.yaml'),
      'harnesses:\n  claude:\n    cli_args: invalid-scalar\n' +
        'execution_routing:\n  profiles:\n    remote:\n      description: Remote route.\n' +
        '      models:\n        - model: exact/model\n          harness: claude\n'
    );
    const taskFile = path.join(directory, 'task.md');
    fs.writeFileSync(
      taskFile,
      '---\nid: 3\nstatus: pending\nexecution_profile: remote\n---\n# Task\n'
    );

    const result = run(bundle, ['resolve', taskFile, 'codex', directory, '12', '3']);

    expect(JSON.parse(result.stdout)).toMatchObject({
      kind: 'fallback',
      reason: 'invalid-execution',
      detail: expect.stringContaining('Harness invocation configuration is invalid'),
    });
  });

  it('keeps current-harness targets native when external configuration is malformed', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'st-dispatch-'));
    const bundle = makeBundle(directory);
    fs.mkdirSync(path.join(directory, '.ai/strikethroo/config'), { recursive: true });
    fs.writeFileSync(
      path.join(directory, '.ai/strikethroo/config/config.yaml'),
      'harnesses:\n  claude:\n    cli_args: invalid-scalar\n' +
        'execution_routing:\n  profiles:\n    native:\n      description: Native route.\n' +
        '      models:\n        - model: native/model\n          harness: codex\n'
    );
    const taskFile = path.join(directory, 'task.md');
    fs.writeFileSync(
      taskFile,
      '---\nid: 3\nstatus: pending\nexecution_profile: native\n---\n# Task\n'
    );

    const result = run(bundle, ['resolve', taskFile, 'codex', directory, '12', '3']);

    expect(JSON.parse(result.stdout)).toEqual({
      kind: 'native-override',
      model: 'native/model',
    });
  });
});
