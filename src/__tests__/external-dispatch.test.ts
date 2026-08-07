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
      expect(command.stdin).toContain('# Implement the task');
      expect(command.argv.join(' ')).not.toContain('Implement the task');
    }
  );

  it('kiro sends task via stdin without model or reasoning-effort flags', () => {
    const command = buildExternalCommand(request('kiro'));
    expect(command).toMatchObject({
      executable: 'kiro-cli',
      argv: ['chat', '--no-interactive', '--trust-tools=read,write,glob,grep,shell'],
      cwd: '/workspace/project',
    });
    expect(command.stdin).toContain('Plan 12, Task 3');
    expect(command.stdin).toContain('PRE_TASK_EXECUTION.md');
    expect(command.stdin).toContain('# Implement the task');
    expect(command.argv.join(' ')).not.toContain('model');
    expect(command.argv.join(' ')).not.toContain('Implement the task');
  });

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
    for (const harness of ['cursor', 'gemini', 'copilot', 'kiro'] as const) {
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
    // Kiro does not support --model; its argv is identical with or without.
    kiro: ['chat', '--no-interactive', '--trust-tools=read,write,glob,grep,shell'],
  };
  const WITHOUT_MODEL: Record<(typeof SUPPORTED_HARNESSES)[number], string[]> = {
    claude: ['-p'],
    codex: ['exec', '-'],
    cursor: ['--print'],
    gemini: ['--prompt', ''],
    copilot: ['-p', ''],
    opencode: ['run', '-'],
    kiro: ['chat', '--no-interactive', '--trust-tools=read,write,glob,grep,shell'],
  };

  it.each(SUPPORTED_HARNESSES)(
    '%s: a model produces --model with the exact value, an absent model produces neither token, and the rest of argv is unchanged',
    harness => {
      const withModel = buildExternalCommand(request(harness));
      const without = buildReviewCommand({ harness, workspace: '/w', prompt: 'p' });

      expect(withModel.argv).toEqual(WITH_MODEL[harness]);
      expect(without.argv).toEqual(WITHOUT_MODEL[harness]);
      // Kiro ignores --model entirely; its argv is identical with or without.
      if (harness !== 'kiro') {
        expect(withModel.argv).toContain('--model');
      }
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
