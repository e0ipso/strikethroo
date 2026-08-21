import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { SUPPORTED_HARNESSES } from '../types';
import {
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
  taskMarkdown = '# Implement the task',
  cliArgs: readonly string[] = []
) => ({
  harness,
  model: 'vendor/model-X:preview',
  reasoningEffort,
  cliArgs,
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

  const LOCAL_ARGS = ['--local-policy', 'value with spaces; $(echo no)'] as const;

  it.each([
    ['claude', ['-p', ...LOCAL_ARGS, '--model', 'vendor/model-X:preview', '--effort', 'high']],
    [
      'codex',
      [
        'exec',
        ...LOCAL_ARGS,
        '--model',
        'vendor/model-X:preview',
        '--config',
        'model_reasoning_effort=high',
        '-',
      ],
    ],
    ['cursor', ['--print', ...LOCAL_ARGS, '--model', 'vendor/model-X:preview']],
    ['gemini', ['--prompt', '', ...LOCAL_ARGS, '--model', 'vendor/model-X:preview']],
    ['copilot', ['-p', '', ...LOCAL_ARGS, '--model', 'vendor/model-X:preview']],
    [
      'opencode',
      ['run', ...LOCAL_ARGS, '--model', 'vendor/model-X:preview', '--variant', 'high', '-'],
    ],
  ] as const)(
    '%s inserts exact local args before model, reasoning, and terminal prompt argv',
    (harness, argv) => {
      const command = buildExternalCommand(
        request(harness, 'high', '# Implement the task', LOCAL_ARGS)
      );

      expect(command.argv).toEqual(argv);
      expect(command.argv).toContain('value with spaces; $(echo no)');
    }
  );

  it.each([
    ['claude', ['-p', ...LOCAL_ARGS]],
    ['codex', ['exec', ...LOCAL_ARGS, '-']],
    ['cursor', ['--print', ...LOCAL_ARGS]],
    ['gemini', ['--prompt', '', ...LOCAL_ARGS]],
    ['copilot', ['-p', '', ...LOCAL_ARGS]],
    ['opencode', ['run', ...LOCAL_ARGS, '-']],
  ] as const)('%s applies the same local args to model-free review argv', (harness, argv) => {
    expect(
      buildReviewCommand({
        harness,
        workspace: '/w',
        prompt: 'Review this diff.',
        cliArgs: LOCAL_ARGS,
      }).argv
    ).toEqual(argv);
  });

  it.each([
    ['claude', ['auth', 'status']],
    ['codex', ['login', 'status']],
    ['cursor', ['status']],
    ['gemini', ['auth', 'status']],
    ['copilot', ['auth', 'status']],
    ['opencode', ['auth', 'list']],
  ] as const)(
    '%s keeps literal authentication argv separate and exposes version argv',
    (harness, authenticationArgv) => {
      const adapter = EXTERNAL_HARNESS_ADAPTERS[harness];
      expect(adapter.authenticationArgv()).toEqual(authenticationArgv);
      expect(adapter.versionArgv()).toEqual(['--version']);
    }
  );

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

  it('launches the exact executable and local arguments proven during discovery', async () => {
    const executableExists = vi.fn(() => true);
    const authenticate = vi.fn(async () => ({ ok: true }));
    const launch = vi.fn(async () => ({ exitCode: 0 }));

    await dispatchReview(
      {
        harness: 'codex',
        cliArgs: ['--sandbox', 'workspace-write'],
        executableIdentity: '/opt/codex/bin/codex',
        workspace: '/w',
        prompt: 'Review this diff.',
      },
      { executableExists, authenticate, launch }
    );

    expect(executableExists).toHaveBeenCalledWith('/opt/codex/bin/codex');
    expect(authenticate.mock.calls[0]?.[0]).toMatchObject({
      executable: '/opt/codex/bin/codex',
    });
    expect(launch.mock.calls[0]?.[0]).toMatchObject({
      executable: '/opt/codex/bin/codex',
      argv: ['exec', '--sandbox', 'workspace-write', '-'],
    });
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

describe('real-process adapter boundaries', () => {
  const authenticationArgv: Record<(typeof SUPPORTED_HARNESSES)[number], string[]> = {
    claude: ['auth', 'status'],
    codex: ['login', 'status'],
    cursor: ['status'],
    gemini: ['auth', 'status'],
    copilot: ['auth', 'status'],
    opencode: ['auth', 'list'],
  };

  it.each(SUPPORTED_HARNESSES)(
    '%s spawns exact task/review argv in a Unicode path without shell interpretation',
    async harness => {
      const root = fs.mkdtempSync(path.join(os.tmpdir(), 'strikethroo argv Ω-'));
      const executable = path.join(root, 'bin with spaces', 'fake-agent.CMD');
      const log = path.join(root, 'argv.jsonl');
      const secondCommand = path.join(root, 'must-not-exist');
      const cliArgs = [
        '--local-policy',
        `value with spaces; touch ${secondCommand}`,
        '$(printf shell-must-not-run)',
      ];
      fs.mkdirSync(path.dirname(executable), { recursive: true });
      fs.writeFileSync(
        executable,
        `#!${process.execPath}
const fs = require('fs');
let stdin = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => { stdin += chunk; });
process.stdin.on('end', () => {
  fs.appendFileSync(process.env.STRIKETHROO_FAKE_ARGV_LOG, JSON.stringify({
    argv: process.argv.slice(2),
    cwd: process.cwd(),
    stdin,
  }) + '\\n');
});
`,
        { mode: 0o700 }
      );
      const previousLog = process.env.STRIKETHROO_FAKE_ARGV_LOG;
      process.env.STRIKETHROO_FAKE_ARGV_LOG = log;
      try {
        const taskRequest = {
          ...request(harness, undefined, '# Implement from the exact task payload', cliArgs),
          workspace: root,
          executableIdentity: executable,
        };
        expect(await dispatchExternalTask(taskRequest)).toEqual({
          kind: 'launched-success',
          exitCode: 0,
        });
        expect(
          await dispatchReview({
            harness,
            cliArgs,
            executableIdentity: executable,
            workspace: root,
            prompt: 'Review from the exact review payload',
          })
        ).toEqual({ kind: 'launched-success', exitCode: 0, stdout: '' });

        const records = fs
          .readFileSync(log, 'utf8')
          .trim()
          .split('\n')
          .map(line => JSON.parse(line) as { argv: string[]; cwd: string; stdin: string });
        expect(records).toHaveLength(4);
        expect(records[0]?.argv).toEqual(authenticationArgv[harness]);
        expect(records[2]?.argv).toEqual(authenticationArgv[harness]);
        expect(records[1]).toMatchObject({
          argv: buildExternalCommand(taskRequest).argv,
          cwd: root,
          stdin: expect.stringContaining('# Implement from the exact task payload'),
        });
        expect(records[3]).toMatchObject({
          argv: buildReviewCommand({
            harness,
            cliArgs,
            executableIdentity: executable,
            workspace: root,
            prompt: 'Review from the exact review payload',
          }).argv,
          cwd: root,
          stdin: 'Review from the exact review payload',
        });
        expect(records[1]?.argv).toEqual(expect.arrayContaining(cliArgs));
        expect(records[3]?.argv).toEqual(expect.arrayContaining(cliArgs));
        expect(fs.existsSync(secondCommand)).toBe(false);
      } finally {
        if (previousLog === undefined) delete process.env.STRIKETHROO_FAKE_ARGV_LOG;
        else process.env.STRIKETHROO_FAKE_ARGV_LOG = previousLog;
        fs.rmSync(root, { recursive: true, force: true });
      }
    }
  );
});
