import { SUPPORTED_HARNESSES } from '../types';
import {
  buildExternalCommand,
  dispatchExternalTask,
  EXTERNAL_HARNESS_ADAPTERS,
  type ExternalDispatchDependencies,
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
