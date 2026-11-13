import { execFile, spawnSync } from 'child_process';
import { promisify } from 'util';
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

const execFileAsync = promisify(execFile);

/** The fake worker performs real task-status writes after the compiled dispatcher launches it. */
const workflowFixture = () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'st-dispatch-workflow-'));
  const bundle = makeBundle(directory);
  const configFile = path.join(directory, '.ai/strikethroo/config/config.yaml');
  fs.mkdirSync(path.dirname(configFile), { recursive: true });
  fs.writeFileSync(
    configFile,
    'harnesses:\n  claude:\n    cli_args: [--ready]\nexecution_routing:\n' +
      '  allow_external_harness_execution: true\n  profiles:\n    external:\n' +
      '      description: Workflow test.\n      models: [{model: resolved/model, harness: claude}]\n'
  );
  fs.writeFileSync(
    path.join(directory, 'claude'),
    `#!${process.execPath}
const fs = require('fs');
const path = require('path');
let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => { input += chunk; });
process.stdin.on('end', () => {
  const proof = /STRIKETHROO_READINESS=(\\{[^\\n]+\\})/.exec(input);
  if (proof) {
    const evidence = JSON.parse(proof[1]);
    fs.writeFileSync(path.join(process.cwd(), evidence.file), evidence.content);
  }
  if (!input.includes('Strikethroo external task dispatch')) return;
  const taskFile = /^Task file: (.+)$/m.exec(input)[1];
  const before = fs.readFileSync(taskFile, 'utf8');
  const status = /^status: (.+)$/m.exec(before)[1];
  fs.writeFileSync(taskFile, before.replace(/^status: .*$/m, 'status: in-progress'));
  fs.writeFileSync(path.join(process.cwd(), path.basename(taskFile) + '.launch.json'),
    JSON.stringify({ statusBeforeLaunch: status, argv: process.argv.slice(2) }));
  fs.writeFileSync(taskFile, before.replace(/^status: .*$/m, 'status: completed'));
});
`,
    { mode: 0o700 }
  );
  const env = { ...process.env, PATH: `${directory}${path.delimiter}${process.env.PATH ?? ''}` };
  const task = (id: number) => {
    const file = path.join(directory, `task-${id}.md`);
    fs.writeFileSync(
      file,
      `---\nid: ${id}\nstatus: pending\nexecution_profile: external\n---\n# Task ${id}\n`
    );
    return file;
  };
  const resolve = (file: string, id: number) => [
    'resolve',
    file,
    'codex',
    directory,
    '12',
    String(id),
  ];
  const launchFile = (file: string) => path.join(directory, path.basename(file) + '.launch.json');
  return {
    directory,
    bundle,
    configFile,
    env,
    task,
    resolve,
    launchFile,
    cleanup: () => fs.rmSync(directory, { recursive: true, force: true }),
  };
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

  it('keeps tasks without routing metadata on native defaults', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'st-dispatch-'));
    const bundle = makeBundle(directory);
    const taskFile = path.join(directory, 'task.md');
    fs.writeFileSync(taskFile, '---\nid: 3\nstatus: pending\n---\n# Task\n');

    const result = run(bundle, ['resolve', taskFile, 'codex', directory, '12', '3']);

    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual({ kind: 'native-default' });
  });

  it('rejects executable frontmatter languages without evaluating them', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'st-dispatch-'));
    const bundle = makeBundle(directory);
    const marker = path.join(directory, 'marker');
    const payload = `require('fs').writeFileSync(${JSON.stringify(marker)}, 'x')`;
    for (const tag of ['js', 'javascript', 'coffee', ' js ']) {
      const taskFile = path.join(directory, 'task.md');
      fs.writeFileSync(
        taskFile,
        `---${tag}\n${payload}; module.exports = { execution_profile: 'x' };\n---\n# Task\n`
      );

      const result = run(bundle, ['resolve', taskFile, 'codex', directory, '12', '3']);

      expect(fs.existsSync(marker)).toBe(false);
      expect(result.status).toBe(2);
      expect(result.stderr).toBe('');
      expect(result.stdout.trim().split('\n')).toHaveLength(1);
      expect(JSON.parse(result.stdout)).toEqual({
        kind: 'infrastructure-failure',
        detail: expect.stringContaining('Task metadata rejected'),
      });
    }
  });

  it('rejects malformed task metadata with a structured failure', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'st-dispatch-'));
    const bundle = makeBundle(directory);
    const taskFile = path.join(directory, 'task.md');
    const cases = [
      '---\nexecution_profile: [unclosed\n---\n# Task\n',
      '---\n- id: 3\n- execution_profile: mixed\n---\n# Task\n',
      '---\njust a scalar\n---\n# Task\n',
      '---\nid: 3\nexecution_profile: 5\n---\n# Task\n',
      '---\nid: 3\nexecution_profile: "  "\n---\n# Task\n',
      '---\nid: 3\nexecution_profile: !!js/function "function () {}"\n---\n# Task\n',
      '---\nid: 3\nexecution_profile: mixed\n# Task without a closing fence\n',
      `---\nid: 3\nnotes: "${'a'.repeat(70 * 1024)}"\n---\n# Task\n`,
    ];
    for (const markdown of cases) {
      fs.writeFileSync(taskFile, markdown);

      const result = run(bundle, ['resolve', taskFile, 'codex', directory, '12', '3']);

      expect(result.status).toBe(2);
      expect(result.stderr).toBe('');
      expect(result.stdout.trim().split('\n')).toHaveLength(1);
      expect(JSON.parse(result.stdout)).toEqual({
        kind: 'infrastructure-failure',
        detail: expect.stringMatching(/^Task metadata rejected: /),
      });
    }
  });

  it('reads ordinary YAML task metadata across line endings and without frontmatter', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'st-dispatch-'));
    const bundle = makeBundle(directory);
    fs.mkdirSync(path.join(directory, '.ai/strikethroo/config'), { recursive: true });
    fs.writeFileSync(
      path.join(directory, '.ai/strikethroo/config/config.yaml'),
      'execution_routing:\n  enabled: false\n'
    );
    const taskFile = path.join(directory, 'task.md');
    const resolve = (markdown: string) => {
      fs.writeFileSync(taskFile, markdown);
      const result = run(bundle, ['resolve', taskFile, 'codex', directory, '12', '3']);
      expect(result.status).toBe(0);
      expect(result.stderr).toBe('');
      return JSON.parse(result.stdout) as Record<string, unknown>;
    };

    expect(resolve('# Task without metadata\n')).toEqual({ kind: 'native-default' });
    expect(resolve('---\r\nid: 3\r\nstatus: pending\r\n---\r\n# Task\r\n')).toEqual({
      kind: 'native-default',
    });
    expect(resolve('---\n---\n# Task\n')).toEqual({ kind: 'native-default' });
    for (const markdown of [
      '---\r\nid: 3\r\nexecution_profile: mixed\r\n---\r\n# Task\r\n',
      '﻿---  \nid: 3\nexecution_profile: mixed\n...\n# Task\n',
    ]) {
      expect(resolve(markdown)).toEqual({
        kind: 'fallback',
        reason: 'invalid-execution',
        detail: expect.stringContaining('Execution profile "mixed"'),
      });
    }
  });

  it('retries an unavailable external target and selects the current harness', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'st-dispatch-'));
    const bundle = makeBundle(directory);
    fs.mkdirSync(path.join(directory, '.ai/strikethroo/config'), { recursive: true });
    fs.writeFileSync(
      path.join(directory, '.ai/strikethroo/config/config.yaml'),
      'execution_routing:\n  allow_external_harness_execution: true\n  profiles:\n    mixed:\n      description: Mixed route.\n' +
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

  it.each(['', '  allow_external_harness_execution: false\n'])(
    'keeps existing profiles native without probing external harnesses (%s)',
    setting => {
      const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'st-dispatch-'));
      const bundle = makeBundle(directory);
      const configPath = path.join(directory, '.ai/strikethroo/config/config.yaml');
      fs.mkdirSync(path.dirname(configPath), { recursive: true });
      const taskFile = path.join(directory, 'task.md');
      fs.writeFileSync(taskFile, '---\nid: 3\nexecution_profile: mixed\n---\n# Task\n');
      const marker = path.join(directory, 'external-probed');
      fs.writeFileSync(
        path.join(directory, 'claude'),
        `#!${process.execPath}\nrequire('fs').writeFileSync(${JSON.stringify(marker)}, 'called');\n`,
        { mode: 0o700 }
      );
      const env = {
        ...process.env,
        PATH: `${directory}${path.delimiter}${process.env.PATH ?? ''}`,
      };
      const prefix = `execution_routing:\n${setting}  profiles:\n    mixed:\n      description: Mixed route.\n      models:\n`;
      const external = '        - model: external/model\n          harness: claude\n';
      for (const nativeHarness of ['          harness: codex\n', '']) {
        fs.writeFileSync(
          configPath,
          prefix +
            external +
            `        - model: native/model\n${nativeHarness}          reasoning_effort: high\n`
        );
        const result = run(bundle, ['resolve', taskFile, 'codex', directory, '12', '3'], env);
        expect(result.status).toBe(0);
        expect(JSON.parse(result.stdout)).toEqual({
          kind: 'native-override',
          model: 'native/model',
          reasoningEffort: 'high',
        });
      }
      fs.writeFileSync(configPath, prefix + external);
      const result = run(bundle, ['resolve', taskFile, 'codex', directory, '12', '3'], env);
      expect(result.status).toBe(0);
      expect(JSON.parse(result.stdout)).toMatchObject({
        kind: 'fallback',
        reason: 'targets-exhausted',
      });
      expect(fs.existsSync(marker)).toBe(false);
      expect(fs.existsSync(path.join(directory, '.ai/strikethroo/runtime'))).toBe(false);
    }
  );

  it('falls back to the current harness when execution routing is disabled', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'st-dispatch-'));
    const bundle = makeBundle(directory);
    fs.mkdirSync(path.join(directory, '.ai/strikethroo/config'), { recursive: true });
    fs.writeFileSync(
      path.join(directory, '.ai/strikethroo/config/config.yaml'),
      'execution_routing:\n  enabled: false\n  profiles:\n    mixed:\n      description: Mixed route.\n' +
        '      models:\n        - model: external/model\n          harness: claude\n' +
        '        - model: native/model\n          harness: codex\n          reasoning_effort: high\n'
    );
    const taskFile = path.join(directory, 'task.md');
    fs.writeFileSync(
      taskFile,
      '---\nid: 3\nstatus: pending\nexecution_profile: mixed\n---\n# Task\n'
    );

    const result = run(bundle, ['resolve', taskFile, 'codex', directory, '12', '3']);

    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual({
      kind: 'fallback',
      reason: 'invalid-execution',
      detail: expect.stringContaining('disabled'),
    });
  });

  it('executes only the resolved task revision with captured arguments and keeps large content on stdin', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'st-dispatch-'));
    const bundle = makeBundle(directory);
    fs.mkdirSync(path.join(directory, '.ai/strikethroo/config'), { recursive: true });
    fs.writeFileSync(
      path.join(directory, '.ai/strikethroo/config/config.yaml'),
      'harnesses:\n  claude:\n    cli_args:\n      - --local-permission\n' +
        'execution_routing:\n  allow_external_harness_execution: true\n  profiles:\n    remote:\n      description: Remote route.\n' +
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
    fs.writeFileSync(path.join(process.cwd(), 'launched-task.txt'), stdin);
  }
});
`,
      { mode: 0o700 }
    );
    const taskFile = path.join(directory, 'task.md');
    const markdown =
      '---\nid: 3\nstatus: pending\nexecution_profile: remote\n---\n# Task A\n' +
      'large body '.repeat(20_000);
    fs.writeFileSync(taskFile, markdown);
    const env = { ...process.env, PATH: `${directory}${path.delimiter}${process.env.PATH ?? ''}` };
    const resolved = run(bundle, ['resolve', taskFile, 'codex', directory, '12', '3'], env);
    expect(resolved.status).toBe(0);
    const route = JSON.parse(resolved.stdout) as { handoff: string };
    expect(route.handoff.length).toBeLessThan(4096);

    // Configuration drift cannot replace the invocation that passed readiness.
    const configFile = path.join(directory, '.ai/strikethroo/config/config.yaml');
    fs.writeFileSync(
      configFile,
      fs.readFileSync(configFile, 'utf8').replace('--local-permission', '--changed')
    );
    const otherTask = path.join(directory, 'other-task.md');
    fs.writeFileSync(otherTask, '---\nid: 4\nstatus: pending\n---\n# Task B\n');
    const substitution = run(
      bundle,
      ['execute', route.handoff, otherTask, 'codex', directory, '12', '4'],
      env
    );
    expect(substitution.status).toBe(2);
    expect(JSON.parse(substitution.stdout).kind).toBe('infrastructure-failure');
    expect(fs.existsSync(path.join(directory, 'launched-argv.json'))).toBe(false);

    fs.writeFileSync(taskFile, markdown + '\nChanged after resolution.');
    const drift = run(bundle, ['execute', route.handoff], env);
    expect(drift.status).toBe(2);
    expect(JSON.parse(drift.stdout)).toMatchObject({
      kind: 'infrastructure-failure',
      detail: expect.stringContaining('changed after route resolution'),
    });
    expect(fs.existsSync(path.join(directory, 'launched-argv.json'))).toBe(false);

    fs.writeFileSync(taskFile, markdown);
    const executed = run(bundle, ['execute', route.handoff], env);
    expect(executed.status).toBe(0);
    expect(JSON.parse(executed.stdout)).toEqual({ kind: 'launched-success', exitCode: 0 });
    expect(JSON.parse(fs.readFileSync(path.join(directory, 'launched-argv.json'), 'utf8'))).toEqual(
      ['-p', '--local-permission', '--model', 'exact/model']
    );
    const prompt = fs.readFileSync(path.join(directory, 'launched-task.txt'), 'utf8');
    expect(prompt).toContain('Plan 12, Task 3');
    expect(prompt).toContain(`Task file: ${taskFile}`);
    expect(prompt.endsWith(markdown)).toBe(true);
  });

  it.each(['not-json', [], { model: 'forged' }])(
    'rejects invalid execution requests without launching (%j)',
    value => {
      const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'st-dispatch-'));
      const bundle = makeBundle(directory);
      const handoff = Buffer.from(
        typeof value === 'string' ? value : JSON.stringify(value)
      ).toString('base64url');
      const result = run(bundle, ['execute', handoff]);
      expect(result.status).toBe(2);
      expect(result.stderr).toBe('');
      expect(result.stdout.trim().split('\n')).toHaveLength(1);
      expect(JSON.parse(result.stdout).kind).toBe('infrastructure-failure');
    }
  );

  it('executes the execute-task workflow after its pre-resolution in-progress transition', () => {
    const fixture = workflowFixture();
    try {
      const taskFile = fixture.task(3);
      fs.writeFileSync(
        taskFile,
        fs.readFileSync(taskFile, 'utf8').replace('status: pending', 'status: in-progress')
      );
      const resolution = run(fixture.bundle, fixture.resolve(taskFile, 3), fixture.env);
      expect(resolution.status).toBe(0);
      const { handoff } = JSON.parse(resolution.stdout);
      expect(fs.existsSync(fixture.launchFile(taskFile))).toBe(false);
      fs.writeFileSync(
        fixture.configFile,
        fs
          .readFileSync(fixture.configFile, 'utf8')
          .replace('--ready', '--changed')
          .replace('resolved/model', 'changed/model')
      );
      const executed = run(fixture.bundle, ['execute', handoff], fixture.env);
      expect(executed.status).toBe(0);
      expect(JSON.parse(executed.stdout)).toEqual({ kind: 'launched-success', exitCode: 0 });
      expect(JSON.parse(fs.readFileSync(fixture.launchFile(taskFile), 'utf8'))).toEqual({
        statusBeforeLaunch: 'in-progress',
        argv: ['-p', '--ready', '--model', 'resolved/model'],
      });
      expect(fs.readFileSync(taskFile, 'utf8')).toContain('status: completed');
    } finally {
      fixture.cleanup();
    }
  });

  it('executes a blueprint phase after assignment edits, with every route resolved before parallel launches', async () => {
    const fixture = workflowFixture();
    try {
      const tasks = [fixture.task(1), fixture.task(2)];
      for (const taskFile of tasks) {
        fs.appendFileSync(taskFile, '\nAssignment hook selected an external worker.\n');
      }
      const resolved = await Promise.all(
        tasks.map((taskFile, index) =>
          execFileAsync(
            process.execPath,
            [fixture.bundle, ...fixture.resolve(taskFile, index + 1)],
            { env: fixture.env }
          )
        )
      );
      for (const taskFile of tasks) {
        expect(fs.existsSync(fixture.launchFile(taskFile))).toBe(false);
        expect(fs.readFileSync(taskFile, 'utf8')).toContain('status: pending');
      }
      const executed = await Promise.all(
        resolved.map(result =>
          execFileAsync(
            process.execPath,
            [fixture.bundle, 'execute', JSON.parse(result.stdout).handoff],
            { env: fixture.env }
          )
        )
      );
      for (const result of executed) {
        expect(JSON.parse(result.stdout)).toEqual({ kind: 'launched-success', exitCode: 0 });
      }
      for (const taskFile of tasks) {
        expect(
          JSON.parse(fs.readFileSync(fixture.launchFile(taskFile), 'utf8')).statusBeforeLaunch
        ).toBe('pending');
        expect(fs.readFileSync(taskFile, 'utf8')).toContain('status: completed');
      }
    } finally {
      fixture.cleanup();
    }
  });

  it('halts when an orchestrator changes task status after resolving its route', () => {
    const fixture = workflowFixture();
    try {
      const taskFile = fixture.task(3);
      const { handoff } = JSON.parse(
        run(fixture.bundle, fixture.resolve(taskFile, 3), fixture.env).stdout
      );
      fs.writeFileSync(
        taskFile,
        fs.readFileSync(taskFile, 'utf8').replace('status: pending', 'status: in-progress')
      );
      const result = run(fixture.bundle, ['execute', handoff], fixture.env);
      expect(result.status).toBe(2);
      expect(JSON.parse(result.stdout)).toMatchObject({
        kind: 'infrastructure-failure',
        detail: expect.stringContaining('changed after route resolution'),
      });
      expect(fs.existsSync(fixture.launchFile(taskFile))).toBe(false);
    } finally {
      fixture.cleanup();
    }
  });

  it('fails safe for legacy request data and mixed old/new execute signatures', () => {
    const fixture = workflowFixture();
    try {
      const taskFile = fixture.task(3);
      const { handoff } = JSON.parse(
        run(fixture.bundle, fixture.resolve(taskFile, 3), fixture.env).stdout
      );
      const legacy = Buffer.from(
        JSON.stringify({
          version: 1,
          kind: 'external-override',
          harness: 'claude',
          model: 'resolved/model',
        })
      ).toString('base64url');
      for (const args of [
        ['execute', legacy],
        ['execute', legacy, taskFile, 'codex', fixture.directory, '12', '3'],
        ['execute', handoff, taskFile, 'codex', fixture.directory, '12', '3'],
      ]) {
        const result = run(fixture.bundle, args, fixture.env);
        expect(result.status).toBe(2);
        expect(result.stdout.trim().split('\n')).toHaveLength(1);
        expect(JSON.parse(result.stdout).kind).toBe('infrastructure-failure');
        expect(fs.existsSync(fixture.launchFile(taskFile))).toBe(false);
      }
    } finally {
      fixture.cleanup();
    }
  });

  it('fails external resolution when local harness configuration is malformed', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'st-dispatch-'));
    const bundle = makeBundle(directory);
    fs.mkdirSync(path.join(directory, '.ai/strikethroo/config'), { recursive: true });
    fs.writeFileSync(
      path.join(directory, '.ai/strikethroo/config/config.yaml'),
      'harnesses:\n  claude:\n    cli_args: invalid-scalar\n' +
        'execution_routing:\n  allow_external_harness_execution: true\n  profiles:\n    remote:\n      description: Remote route.\n' +
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
        'execution_routing:\n  allow_external_harness_execution: true\n  profiles:\n    native:\n      description: Native route.\n' +
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
