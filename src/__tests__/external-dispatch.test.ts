import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { afterEach, beforeEach } from 'vitest';

import { SUPPORTED_HARNESSES } from '../types';
import {
  AUTHENTICATION_TIMEOUT_MS,
  authenticateHarness,
  buildExternalCommand,
  buildReviewCommand,
  dispatchExternalTask,
  dispatchReview,
  EXTERNAL_HARNESS_ADAPTERS,
  type ExternalDispatchDependencies,
  type RoutedDispatchRequest,
} from '../skill-scripts/shared/external-dispatch';

const request = (
  harness: (typeof SUPPORTED_HARNESSES)[number],
  reasoningEffort?: string,
  taskMarkdown = '# Implement the task'
) => ({
  harness,
  model: 'vendor/model-X:preview',
  reasoningEffort,
  workspace: '/workspace/project',
  planId: '12',
  taskId: '3',
  taskFile: '/workspace/project/.ai/strikethroo/plans/12--example/tasks/03--task.md',
  taskMarkdown,
});

const readyDependencies = (): ExternalDispatchDependencies => ({
  executableExists: () => true,
  authenticate: async () => ({ ok: true }),
  launch: async () => ({ exitCode: 0 }),
});

describe('external harness adapter registry', () => {
  it('covers the canonical supported harnesses exactly', () => {
    expect(Object.keys(EXTERNAL_HARNESS_ADAPTERS).sort()).toEqual([...SUPPORTED_HARNESSES].sort());
  });

  it.each([
    ['claude', 'claude', ['-p', '--model', 'vendor/model-X:preview']],
    ['codex', 'codex', ['exec', '--model', 'vendor/model-X:preview', '-']],
    ['cursor', 'cursor-agent', ['--print', '--model', 'vendor/model-X:preview']],
    ['gemini', 'gemini', ['--prompt', '', '--model', 'vendor/model-X:preview']],
    ['copilot', 'copilot', ['-p', '', '--model', 'vendor/model-X:preview']],
    ['opencode', 'opencode', ['run', '--model', 'vendor/model-X:preview', '-']],
  ] as const)(
    '%s preserves exact model while keeping task content out of argv',
    (harness, executable, argv) => {
      const command = buildExternalCommand(request(harness));
      expect(command).toMatchObject({ executable, argv, cwd: '/workspace/project' });
      expect(command.stdin).toContain('Plan 12, Task 3');
      expect(command.stdin).toContain('PRE_TASK_EXECUTION.md');
      expect(command.stdin).toContain('You are a delegated execution worker');
      expect(command.stdin).toContain('Do not run check-for-updates.cjs or emit update notices');
      expect(command.stdin).toContain('# Implement the task');
      expect(command.argv.join(' ')).not.toContain('Implement the task');
    }
  );

  it('keeps a large task payload exclusively on stdin', () => {
    const payload = `# Task\n${'sensitive context '.repeat(100_000)}`;
    const command = buildExternalCommand(request('codex', undefined, payload));
    expect(command.stdin).toContain(payload);
    expect(command.argv.join(' ')).not.toContain('sensitive context');
    expect(command.argv.join(' ').length).toBeLessThan(200);
  });

  it('passes local arguments as exact argv elements', () => {
    const command = buildExternalCommand({
      ...request('claude'),
      cliArgs: ['--permission-mode', 'acceptEdits'],
    });
    expect(command.argv).toEqual([
      '-p',
      '--permission-mode',
      'acceptEdits',
      '--model',
      'vendor/model-X:preview',
    ]);
  });

  it.each(SUPPORTED_HARNESSES)('omits optional reasoning argv for %s when absent', harness => {
    expect(buildExternalCommand(request(harness)).argv.join(' ')).not.toContain('reasoning_effort');
    expect(buildExternalCommand(request(harness)).argv).not.toContain('--effort');
    expect(buildExternalCommand(request(harness)).argv).not.toContain('--variant');
  });

  it('uses only documented harness-specific reasoning arguments when supplied', () => {
    expect(buildExternalCommand(request('claude', 'high')).argv).toContain('--effort');
    expect(buildExternalCommand(request('codex', 'high')).argv).toContain(
      'model_reasoning_effort=high'
    );
    expect(buildExternalCommand(request('opencode', 'high')).argv).toContain('--variant');
    for (const harness of ['cursor', 'gemini', 'copilot'] as const) {
      expect(buildExternalCommand(request(harness, 'high')).argv.join(' ')).not.toContain('high');
    }
  });

  it('falls back before launch when a harness lacks reasoning-effort support', async () => {
    let launches = 0;
    const result = await dispatchExternalTask(request('copilot', 'high'), {
      ...readyDependencies(),
      launch: async () => {
        launches += 1;
        return { exitCode: 0 };
      },
    });
    expect(result).toEqual({
      kind: 'fallback',
      reason: 'unsupported-reasoning-effort',
      detail: 'copilot does not support a generic reasoning_effort override.',
    });
    expect(launches).toBe(0);
  });

  it('returns pre-launch fallback without launching when executable is unavailable', async () => {
    let launches = 0;
    const result = await dispatchExternalTask(request('copilot'), {
      ...readyDependencies(),
      executableExists: () => false,
      launch: async () => {
        launches += 1;
        return { exitCode: 0 };
      },
    });
    expect(result).toEqual({
      kind: 'fallback',
      reason: 'executable-unavailable',
      detail: 'copilot is unavailable.',
    });
    expect(launches).toBe(0);
  });

  it('returns pre-launch fallback without launching when authentication fails', async () => {
    let launches = 0;
    const result = await dispatchExternalTask(request('codex'), {
      ...readyDependencies(),
      authenticate: async () => ({ ok: false, detail: 'authentication check failed' }),
      launch: async () => {
        launches += 1;
        return { exitCode: 0 };
      },
    });
    expect(result).toEqual({
      kind: 'fallback',
      reason: 'authentication-failed',
      detail: 'authentication check failed',
    });
    expect(launches).toBe(0);
  });

  it('reports a launched nonzero process as failure and never performs a native retry', async () => {
    let launches = 0;
    const result = await dispatchExternalTask(request('gemini'), {
      ...readyDependencies(),
      launch: async () => {
        launches += 1;
        return { exitCode: 9 };
      },
    });
    expect(result).toEqual({ kind: 'launched-failure', exitCode: 9 });
    expect(launches).toBe(1);
  });

  it('converts spawn errors after launch into infrastructure failure', async () => {
    const result = await dispatchExternalTask(request('claude'), {
      ...readyDependencies(),
      launch: async () => {
        throw new Error('spawn EACCES');
      },
    });
    expect(result).toEqual({
      kind: 'infrastructure-failure',
      detail: 'External task process failed: spawn EACCES',
    });
  });
});

describe('model-optional review dispatch (buildReviewCommand / dispatchReview)', () => {
  // The with-model column locks today's execution_routing/task-dispatch argv —
  // identical to the table above, restated here so the with/without pairing is
  // visible in one place. The without-model column is what a discovered
  // reviewer harness actually receives: same adapter, same positional
  // placeholders, no model pair at all.
  const WITH_MODEL: Record<(typeof SUPPORTED_HARNESSES)[number], string[]> = {
    claude: ['-p', '--model', 'vendor/model-X:preview'],
    codex: ['exec', '--model', 'vendor/model-X:preview', '-'],
    cursor: ['--print', '--model', 'vendor/model-X:preview'],
    gemini: ['--prompt', '', '--model', 'vendor/model-X:preview'],
    copilot: ['-p', '', '--model', 'vendor/model-X:preview'],
    opencode: ['run', '--model', 'vendor/model-X:preview', '-'],
  };
  const WITHOUT_MODEL: Record<(typeof SUPPORTED_HARNESSES)[number], string[]> = {
    claude: ['-p'],
    codex: ['exec', '-'],
    cursor: ['--print'],
    gemini: ['--prompt', ''],
    copilot: ['-p', ''],
    opencode: ['run', '-'],
  };

  it.each(SUPPORTED_HARNESSES)(
    '%s: a model produces --model with the exact value, an absent model produces neither token, and the rest of argv is unchanged',
    harness => {
      const withModel = buildExternalCommand(request(harness));
      const without = buildReviewCommand({ harness, workspace: '/w', prompt: 'p' });

      expect(withModel.argv).toEqual(WITH_MODEL[harness]);
      expect(without.argv).toEqual(WITHOUT_MODEL[harness]);
      expect(withModel.argv).toContain('--model');
      expect(without.argv).not.toContain('--model');
      // gemini/copilot keep their empty-string positional placeholder even
      // with the model pair dropped.
      if (harness === 'gemini' || harness === 'copilot') {
        expect(without.argv).toContain('');
      }
      // Every token in the without-model argv also appears, in order, in the
      // with-model argv — the model pair is a pure splice, not a rewrite.
      const withoutModelTokens = withModel.argv.filter(
        token => token !== '--model' && token !== 'vendor/model-X:preview'
      );
      expect(withoutModelTokens).toEqual(without.argv);
    }
  );

  it('keeps the execution_routing dispatch path (a required model) emitting --model unchanged', () => {
    const routed: RoutedDispatchRequest = { ...request('claude'), model: 'routed/model-Z' };
    expect(buildExternalCommand(routed).argv).toEqual(['-p', '--model', 'routed/model-Z']);
  });

  it('dispatchReview never includes a model token, and sends the prompt verbatim on stdin', async () => {
    let launchedArgv: string[] | undefined;
    let launchedStdin: string | undefined;
    const result = await dispatchReview(
      { harness: 'codex', workspace: '/w', prompt: 'Review this diff for defects.' },
      {
        ...readyDependencies(),
        launch: async command => {
          launchedArgv = command.argv;
          launchedStdin = command.stdin;
          return { exitCode: 0 };
        },
      }
    );
    expect(result).toEqual({ kind: 'launched-success', exitCode: 0 });
    expect(launchedArgv).not.toContain('--model');
    expect(launchedStdin).toBe('Review this diff for defects.');
  });

  it('passes the same local arguments to reviewer commands', () => {
    const command = buildReviewCommand({
      harness: 'codex',
      cliArgs: ['--sandbox', 'workspace-write'],
      workspace: '/w',
      prompt: 'p',
    });
    expect(command.argv).toEqual(['exec', '--sandbox', 'workspace-write', '-']);
  });

  /**
   * Stdout capture is scoped to the review path and nothing else. Asserted at
   * the launcher seam rather than by spawning a real process: what matters is
   * which call site *requests* capture and which result carries the text back.
   */
  it('requests capture for the reviewer and surfaces its stdout, while task dispatch neither requests nor returns it', async () => {
    let reviewCapture: boolean | undefined;
    const reviewed = await dispatchReview(
      { harness: 'codex', workspace: '/w', prompt: 'p' },
      {
        ...readyDependencies(),
        launch: async (_command, options) => {
          reviewCapture = options?.captureStdout;
          return { exitCode: 0, stdout: 'reviewer text' };
        },
      }
    );
    expect(reviewCapture).toBe(true);
    expect(reviewed).toEqual({ kind: 'launched-success', exitCode: 0, stdout: 'reviewer text' });

    let taskCapture: boolean | undefined;
    const task = await dispatchExternalTask(request('codex'), {
      ...readyDependencies(),
      launch: async (_command, options) => {
        taskCapture = options?.captureStdout;
        return { exitCode: 0 };
      },
    });
    expect(taskCapture).not.toBe(true);
    expect(task).toEqual({ kind: 'launched-success', exitCode: 0 });
    expect(task).not.toHaveProperty('stdout');
  });

  it('falls back before launch when the reviewer executable is unavailable, without launching', async () => {
    let launches = 0;
    const result = await dispatchReview(
      { harness: 'gemini', workspace: '/w', prompt: 'p' },
      {
        ...readyDependencies(),
        executableExists: () => false,
        launch: async () => {
          launches += 1;
          return { exitCode: 0 };
        },
      }
    );
    expect(result).toEqual({
      kind: 'fallback',
      reason: 'executable-unavailable',
      detail: 'gemini is unavailable.',
    });
    expect(launches).toBe(0);
  });
});

/**
 * The probe deadline is compiled. `config.yaml` configures what a harness is
 * launched with, never how long orchestration may wait for its status check. A
 * configurable bound could be set back to "forever", which is the hang this
 * exists to stop.
 */
describe('the authentication deadline', () => {
  it('is a compiled constant in the tens of seconds that no configuration can reach', () => {
    expect(Number.isInteger(AUTHENTICATION_TIMEOUT_MS)).toBe(true);
    expect(AUTHENTICATION_TIMEOUT_MS).toBeGreaterThanOrEqual(10_000);
    expect(AUTHENTICATION_TIMEOUT_MS).toBeLessThanOrEqual(60_000);
    const lines = fs
      .readFileSync(
        path.resolve(__dirname, '..', 'skill-scripts', 'shared', 'external-dispatch.ts'),
        'utf8'
      )
      .split('\n');

    // A plain numeric literal, not an expression that something could feed.
    expect(lines.find(line => line.startsWith('export const AUTHENTICATION_TIMEOUT_MS'))).toMatch(
      /^export const AUTHENTICATION_TIMEOUT_MS = [\d_]+;$/
    );
    // And nothing the module imports can read a configuration file, which is
    // the only way a local value could reach the deadline at all.
    const imported = lines
      .filter(line => line.startsWith('import '))
      .map(line => line.replace(/^.*from '([^']+)';$/, '$1'));
    expect(imported).not.toContain('./harness-configuration');
    expect(imported.filter(specifier => specifier.includes('config'))).toEqual([]);
  });
});

/**
 * The probe runs before every task dispatch and every reviewer dispatch, so a
 * harness CLI whose status check waits on a prompt, a stuck network call, or a
 * lock file used to hang orchestration with no output at all.
 *
 * These cases drive real children, a fake `claude` on a temporary PATH and never
 * a harness CLI. What is under test is a child's lifecycle: killed at a deadline
 * on the probe path, left alone on the launch path. A mocked `spawn` shows
 * neither. The deadline is injected short here; `AUTHENTICATION_TIMEOUT_MS` is
 * asserted above.
 *
 * PATH is replaced rather than prepended. An installed `claude` must stay
 * unreachable even in the case that writes no fake at all, and prepending did
 * reach it there. Nothing in the suite needs another executable, because the
 * fake's shebang names this process's own interpreter.
 */
describe.skipIf(process.platform === 'win32')('bounded authentication probe', () => {
  const DEADLINE_MS = 500;
  /** Four times the injected deadline: a launch that inherited it would die. */
  const SLOW_CHILD_MS = 2_000;

  let dir: string;
  let systemPath: string | undefined;
  let pidFile: string;
  let probeArgvFile: string;
  let launchArgvFile: string;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'external-dispatch-probe-'));
    pidFile = path.join(dir, 'probe.pid');
    probeArgvFile = path.join(dir, 'probe.argv.json');
    launchArgvFile = path.join(dir, 'launch.argv.json');
    systemPath = process.env.PATH;
    // The only directory searched, so `spawn('claude', …)` either reaches the
    // script written below or nothing at all.
    process.env.PATH = dir;
  });

  afterEach(() => {
    process.env.PATH = systemPath;
    // A probe left running by a failing assertion must not outlive the suite.
    if (fs.existsSync(pidFile)) {
      const pid = Number(fs.readFileSync(pidFile, 'utf8'));
      if (Number.isInteger(pid)) {
        try {
          process.kill(pid, 'SIGKILL');
        } catch {
          /* already gone */
        }
      }
    }
    fs.rmSync(dir, { recursive: true, force: true });
  });

  /**
   * One fake `claude`: the adapter's literal `auth status` argv takes the probe
   * branch, anything else is a dispatch. Both record their own argv, so "the
   * probe never ran" and "the launch never happened" are observable facts
   * rather than inferences.
   */
  const writeFakeClaude = (probeBody: string, launchBody = 'drain();'): void => {
    fs.writeFileSync(
      path.join(dir, 'claude'),
      [
        // This process's own interpreter, by absolute path: the fake needs no
        // PATH lookup of its own, so PATH can stay empty of everything else.
        `#!${process.execPath}`,
        "const fs = require('fs');",
        'const record = file => fs.writeFileSync(file, JSON.stringify(process.argv.slice(2)));',
        'const drain = () => {',
        '  process.stdin.resume();',
        "  process.stdin.on('end', () => process.exit(0));",
        '};',
        "if (process.argv[2] === 'auth' && process.argv[3] === 'status') {",
        `  record(${JSON.stringify(probeArgvFile)});`,
        `  ${probeBody}`,
        '} else {',
        `  record(${JSON.stringify(launchArgvFile)});`,
        `  ${launchBody}`,
        '}',
        '',
      ].join('\n'),
      { mode: 0o755 }
    );
  };

  const boundedProbe = (): Pick<ExternalDispatchDependencies, 'authenticate'> => ({
    authenticate: (commandSpec, adapter) => authenticateHarness(commandSpec, adapter, DEADLINE_MS),
  });

  const taskRequest = () => ({
    ...request('claude'),
    workspace: dir,
    cliArgs: ['--local-flag'],
  });

  /** `ps` is the orphan check. An absent pid, or a not-yet-reaped zombie, is
   * gone; anything else is a surviving process. `ps` needs the system PATH back,
   * which the suite has replaced. */
  const gone = async (pid: number): Promise<string> => {
    for (let attempt = 0; attempt < 40; attempt += 1) {
      const state = spawnSync('ps', ['-p', String(pid), '-o', 'stat='], {
        encoding: 'utf8',
        env: { ...process.env, PATH: systemPath },
      }).stdout.trim();
      if (state === '' || state.startsWith('Z')) return 'gone';
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    return 'still running';
  };

  it('kills a hanging probe at the deadline, reports the timeout, and leaves no orphan', async () => {
    writeFakeClaude(
      `fs.writeFileSync(${JSON.stringify(pidFile)}, String(process.pid));\n` +
        '  setTimeout(() => {}, 600000);'
    );

    const started = Date.now();
    const result = await dispatchExternalTask(taskRequest(), boundedProbe());
    const elapsed = Date.now() - started;

    expect(result).toEqual({
      kind: 'fallback',
      reason: 'authentication-failed',
      detail: `claude authentication check timed out after ${DEADLINE_MS} ms and was terminated.`,
    });
    expect(elapsed).toBeGreaterThanOrEqual(DEADLINE_MS - 100);
    expect(elapsed).toBeLessThan(5_000);
    expect(fs.existsSync(launchArgvFile)).toBe(false);

    const pid = Number(fs.readFileSync(pidFile, 'utf8'));
    expect(Number.isInteger(pid)).toBe(true);
    expect(await gone(pid)).toBe('gone');
  }, 15_000);

  it('names the exit code when the probe exits non-zero, and never launches', async () => {
    writeFakeClaude('process.exit(3);');

    const result = await dispatchExternalTask(taskRequest(), boundedProbe());

    expect(result).toEqual({
      kind: 'fallback',
      reason: 'authentication-failed',
      detail: 'claude authentication check failed: exited 3.',
    });
    expect(fs.existsSync(launchArgvFile)).toBe(false);
  });

  it('names the underlying code when the probe cannot launch at all', async () => {
    // No script is written, and the presence check is forced past: this is the
    // real race where the CLI disappears between the check and the probe.
    const result = await dispatchExternalTask(taskRequest(), {
      ...boundedProbe(),
      executableExists: () => true,
    });

    expect(result).toMatchObject({ kind: 'fallback', reason: 'authentication-failed' });
    const detail = (result as { detail: string }).detail;
    expect(detail).toContain('claude authentication check could not launch');
    expect(detail).toContain('ENOENT');
    expect(detail).not.toContain('timed out');
    expect(detail).not.toContain('exited');
  });

  it('launches after a zero-exit probe, whose argv stays literal', async () => {
    writeFakeClaude('process.exit(0);');

    const result = await dispatchExternalTask(taskRequest(), boundedProbe());

    expect(result).toEqual({ kind: 'launched-success', exitCode: 0 });
    // The adapter's authentication command is literal by contract: configured
    // cli_args reach the dispatch and never the probe.
    expect(JSON.parse(fs.readFileSync(probeArgvFile, 'utf8'))).toEqual(['auth', 'status']);
    expect(JSON.parse(fs.readFileSync(launchArgvFile, 'utf8'))).toEqual([
      '-p',
      '--local-flag',
      '--model',
      'vendor/model-X:preview',
    ]);
  });

  it('leaves task dispatch and reviewer dispatch unbounded past the probe deadline', async () => {
    writeFakeClaude(
      'process.exit(0);',
      [
        "process.stdout.write('slow child output');",
        '  process.stdin.resume();',
        `  setTimeout(() => process.exit(0), ${SLOW_CHILD_MS});`,
      ].join('\n')
    );

    const taskStarted = Date.now();
    const task = await dispatchExternalTask(taskRequest(), boundedProbe());
    const taskElapsed = Date.now() - taskStarted;
    expect(task).toEqual({ kind: 'launched-success', exitCode: 0 });
    expect(taskElapsed).toBeGreaterThan(SLOW_CHILD_MS - 100);

    const reviewStarted = Date.now();
    const review = await dispatchReview(
      { harness: 'claude', workspace: dir, prompt: 'Review this diff.' },
      boundedProbe()
    );
    const reviewElapsed = Date.now() - reviewStarted;
    expect(review).toMatchObject({ kind: 'launched-success', exitCode: 0 });
    expect((review as { stdout?: string }).stdout).toContain('slow child output');
    expect(reviewElapsed).toBeGreaterThan(SLOW_CHILD_MS - 100);
  }, 30_000);
});
