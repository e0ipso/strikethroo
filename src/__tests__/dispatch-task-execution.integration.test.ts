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

const writePlan14ClaudeFixture = (directory: string, cliArgs: readonly string[]): void => {
  const configDirectory = path.join(directory, '.ai/strikethroo/config');
  fs.mkdirSync(configDirectory, { recursive: true });
  fs.writeFileSync(
    path.join(configDirectory, 'config.yaml'),
    `harnesses:\n  claude:\n    cli_args:${
      cliArgs.length === 0
        ? ' []'
        : `\n${cliArgs.map(argument => `      - ${JSON.stringify(argument)}`).join('\n')}`
    }\n` +
      'execution_routing:\n  profiles:\n    plan-14:\n      description: Plan 14 regression.\n' +
      '      models:\n        - model: opus\n          harness: claude\n'
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
  fs.appendFileSync(process.env.STRIKETHROO_PLAN14_LOG, JSON.stringify({
    argv: process.argv.slice(2),
    cwd: process.cwd(),
    stdin,
  }) + '\\n');
  if (process.argv.includes('--version')) {
    process.stdout.write('fake-claude-plan14 1.0\\n');
    return;
  }
  const evidenceMatch = /STRIKETHROO_EVIDENCE=(\\{[^\\n]+\\})/.exec(stdin);
  const hasPermission = process.argv.includes('--dangerously-skip-permissions');
  if (evidenceMatch && !hasPermission) {
    process.stdout.write('I analyzed the request but permission denied every write.\\n');
    return;
  }
  if (evidenceMatch) {
    const evidence = JSON.parse(evidenceMatch[1]);
    if (evidence.phase === 'create') {
      fs.writeFileSync(path.join(process.cwd(), evidence.create.file), evidence.create.content);
      fs.writeFileSync(
        path.join(process.cwd(), evidence.modify.file),
        evidence.modify.initialContent
      );
      return;
    }
    fs.writeFileSync(path.join(process.cwd(), evidence.modify.file), evidence.modify.finalContent);
    fs.writeFileSync(path.join(process.cwd(), evidence.command.file), evidence.command.content);
    return;
  }
  if (stdin.includes('Strikethroo external task dispatch')) {
    fs.writeFileSync(
      path.join(process.cwd(), 'task-evidence.json'),
      JSON.stringify({ implemented: true, verification: 'passed', permission: hasPermission })
    );
  }
});
`,
    { mode: 0o700 }
  );
  fs.writeFileSync(
    path.join(directory, 'task.md'),
    '---\nid: 3\nstatus: pending\nexecution_profile: plan-14\n---\n# Plan 14 task\n'
  );
};

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

  it('rejects the Plan 14 read-only-zero-exit harness before task launch', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'st-plan14-read-only-'));
    try {
      const bundle = makeBundle(directory);
      writePlan14ClaudeFixture(directory, []);
      const taskFile = path.join(directory, 'task.md');
      const log = path.join(directory, 'plan14-invocations.jsonl');
      const env = {
        ...process.env,
        PATH: `${directory}${path.delimiter}${process.env.PATH ?? ''}`,
        STRIKETHROO_PLAN14_LOG: log,
      };

      const resolved = run(bundle, ['resolve', taskFile, 'codex', directory, '14', '3'], env);

      expect(resolved.status).toBe(0);
      expect(JSON.parse(resolved.stdout)).toMatchObject({
        kind: 'fallback',
        reason: 'invalid-execution',
        detail: expect.stringContaining('claude (fresh)'),
      });
      const invocations = fs
        .readFileSync(log, 'utf8')
        .trim()
        .split('\n')
        .map(line => JSON.parse(line) as { argv: string[]; stdin: string });
      expect(invocations.map(invocation => invocation.argv)).toEqual([
        ['--version'],
        ['auth', 'status'],
        ['-p'],
        ['-p'],
      ]);
      expect(invocations[2]?.stdin).toBe('Reply with OK.');
      expect(invocations[3]?.stdin).toContain('STRIKETHROO_EVIDENCE=');
      expect(
        invocations.some(invocation => invocation.stdin.includes('external task dispatch'))
      ).toBe(false);
      expect(fs.existsSync(path.join(directory, 'task-evidence.json'))).toBe(false);
    } finally {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });

  it('uses the same Plan 14 fake after its local permission arg proves implementation capability', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'st-plan14-permitted-'));
    try {
      const bundle = makeBundle(directory);
      writePlan14ClaudeFixture(directory, ['--dangerously-skip-permissions']);
      const taskFile = path.join(directory, 'task.md');
      const log = path.join(directory, 'plan14-invocations.jsonl');
      const env = {
        ...process.env,
        PATH: `${directory}${path.delimiter}${process.env.PATH ?? ''}`,
        STRIKETHROO_PLAN14_LOG: log,
      };

      const resolved = run(bundle, ['resolve', taskFile, 'codex', directory, '14', '3'], env);
      const route = JSON.parse(resolved.stdout) as { kind: string; handoff: string };
      expect(route).toMatchObject({ kind: 'external-override', handoff: expect.any(String) });
      const executed = run(
        bundle,
        ['execute', route.handoff, taskFile, 'codex', directory, '14', '3'],
        env
      );

      expect(executed.status, executed.stdout).toBe(0);
      expect(JSON.parse(executed.stdout)).toEqual({ kind: 'launched-success', exitCode: 0 });
      expect(
        JSON.parse(fs.readFileSync(path.join(directory, 'task-evidence.json'), 'utf8'))
      ).toEqual({
        implemented: true,
        verification: 'passed',
        permission: true,
      });
      const invocations = fs
        .readFileSync(log, 'utf8')
        .trim()
        .split('\n')
        .map(line => JSON.parse(line) as { argv: string[]; stdin: string });
      expect(
        invocations.filter(invocation => invocation.stdin.includes('STRIKETHROO_EVIDENCE='))
      ).toHaveLength(2);
      expect(invocations.at(-1)?.argv).toEqual([
        '-p',
        '--dangerously-skip-permissions',
        '--model',
        'opus',
      ]);
      expect(invocations.at(-1)?.stdin).toContain('Strikethroo external task dispatch');
    } finally {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });

  it('executes the resolved external handoff after configuration drift', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'st-dispatch-'));
    const bundle = makeBundle(directory);
    const configDir = path.join(directory, '.ai/strikethroo/config');
    fs.mkdirSync(configDir, { recursive: true });
    const config = path.join(configDir, 'config.yaml');
    fs.writeFileSync(
      config,
      'harnesses:\n  claude:\n    cli_args:\n      - --resolved-permission\n' +
        'execution_routing:\n  profiles:\n    remote:\n      description: Remote route.\n      models:\n        - model: exact/model\n          harness: claude\n'
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
  if (process.argv.includes('--version')) {
    process.stdout.write('fake-claude 1.0\\n');
    return;
  }
  const match = /STRIKETHROO_EVIDENCE=(\\{[^\\n]+\\})/.exec(stdin);
  if (!match) {
    if (stdin.includes('Strikethroo external task dispatch')) {
      fs.writeFileSync(path.join(process.cwd(), 'launched-argv.json'), JSON.stringify(process.argv.slice(2)));
    }
    return;
  }
  const evidence = JSON.parse(match[1]);
  if (evidence.phase === 'create') {
    fs.writeFileSync(path.join(process.cwd(), evidence.create.file), evidence.create.content);
    fs.writeFileSync(path.join(process.cwd(), evidence.modify.file), evidence.modify.initialContent);
    return;
  }
  fs.writeFileSync(path.join(process.cwd(), evidence.modify.file), evidence.modify.finalContent);
  fs.writeFileSync(path.join(process.cwd(), evidence.command.file), evidence.command.content);
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
    const route = JSON.parse(resolved.stdout) as { kind: string; handoff: string };
    expect(route).toMatchObject({
      kind: 'external-override',
      harness: 'claude',
      model: 'exact/model',
      handoff: expect.any(String),
    });

    const decoded = JSON.parse(Buffer.from(route.handoff, 'base64url').toString('utf8')) as {
      cliArgs: string[];
      cliArgsHash: string;
      executableIdentity: string;
    };
    expect(decoded.cliArgs).toEqual(['--resolved-permission']);
    expect(decoded.cliArgsHash).toMatch(/^[a-f0-9]{64}$/);
    expect(decoded.executableIdentity).toBe(path.join(directory, 'claude'));

    fs.writeFileSync(
      config,
      'harnesses:\n  claude:\n    cli_args:\n      - --drifted-permission\n' +
        'execution_routing:\n  profiles: {}\n'
    );
    const executed = run(
      bundle,
      ['execute', route.handoff, taskFile, 'codex', directory, '12', '3'],
      env
    );
    expect(executed.status, executed.stdout).toBe(0);
    expect(JSON.parse(executed.stdout)).toEqual({ kind: 'launched-success', exitCode: 0 });
    expect(JSON.parse(fs.readFileSync(path.join(directory, 'launched-argv.json'), 'utf8'))).toEqual(
      ['-p', '--resolved-permission', '--model', 'exact/model']
    );
  });

  it('fails external resolution when local harness configuration is malformed', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'st-dispatch-'));
    const bundle = makeBundle(directory);
    fs.mkdirSync(path.join(directory, '.ai/strikethroo/config'), { recursive: true });
    fs.writeFileSync(
      path.join(directory, '.ai/strikethroo/config/config.yaml'),
      'harnesses:\n  claude:\n    cli_args: --dangerously-skip-permissions\n' +
        'execution_routing:\n  profiles:\n    remote:\n      description: Remote route.\n      models:\n        - model: exact/model\n          harness: claude\n'
    );
    const taskFile = path.join(directory, 'task.md');
    fs.writeFileSync(
      taskFile,
      '---\nid: 3\nstatus: pending\nexecution_profile: remote\n---\n# Task\n'
    );

    const result = run(bundle, ['resolve', taskFile, 'codex', directory, '12', '3']);

    expect(result.status).toBe(0);
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
        'execution_routing:\n  profiles:\n    native:\n      description: Native route.\n      models:\n        - model: native/model\n          harness: codex\n'
    );
    const taskFile = path.join(directory, 'task.md');
    fs.writeFileSync(
      taskFile,
      '---\nid: 3\nstatus: pending\nexecution_profile: native\n---\n# Task\n'
    );

    const result = run(bundle, ['resolve', taskFile, 'codex', directory, '12', '3']);

    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual({
      kind: 'native-override',
      model: 'native/model',
    });
  });

  it('rejects a handoff whose bound arguments no longer match its hash', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'st-dispatch-'));
    const bundle = makeBundle(directory);
    const taskFile = path.join(directory, 'task.md');
    fs.writeFileSync(taskFile, '---\nid: 3\nstatus: pending\n---\n# Task\n');
    const handoff = Buffer.from(
      JSON.stringify({
        version: 2,
        kind: 'external-override',
        harness: 'claude',
        model: 'exact/model',
        cliArgs: ['--changed'],
        cliArgsHash: '0'.repeat(64),
        executableIdentity: path.join(directory, 'claude'),
        executableVersion: 'fake 1.0',
        normalizationVersion: 1,
        probeRegistryVersion: 2,
      })
    ).toString('base64url');

    const result = run(bundle, ['execute', handoff, taskFile, 'codex', directory, '12', '3']);

    expect(result.status).toBe(2);
    expect(JSON.parse(result.stdout)).toMatchObject({
      kind: 'infrastructure-failure',
      detail: expect.stringContaining('invalid shape'),
    });
  });
});
