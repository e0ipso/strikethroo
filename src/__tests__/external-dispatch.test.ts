import { SUPPORTED_HARNESSES } from '../types';
import {
  buildExternalCommand,
  dispatchExternalTask,
  EXTERNAL_HARNESS_ADAPTERS,
  type ExternalDispatchDependencies,
} from '../skill-scripts/shared/external-dispatch';

const request = (harness: (typeof SUPPORTED_HARNESSES)[number], reasoningEffort?: string) => ({
  harness,
  model: 'vendor/model-X:preview',
  reasoningEffort,
  workspace: '/workspace/project',
  planId: '12',
  taskId: '3',
  taskFile: '/workspace/project/.ai/strikethroo/plans/12--example/tasks/03--task.md',
  taskMarkdown: '# Implement the task',
});

const readyDependencies = (): ExternalDispatchDependencies => ({
  executableExists: () => true,
  authenticate: () => ({ ok: true }),
  launch: () => ({ exitCode: 0 }),
});

describe('external harness adapter registry', () => {
  it('covers the canonical supported harnesses exactly', () => {
    expect(Object.keys(EXTERNAL_HARNESS_ADAPTERS).sort()).toEqual([...SUPPORTED_HARNESSES].sort());
  });

  it.each([
    ['claude', 'claude', ['-p', expect.any(String), '--model', 'vendor/model-X:preview']],
    ['codex', 'codex', ['exec', '--model', 'vendor/model-X:preview', expect.any(String)]],
    [
      'cursor',
      'cursor-agent',
      ['--print', '--model', 'vendor/model-X:preview', expect.any(String)],
    ],
    ['gemini', 'gemini', ['--prompt', expect.any(String), '--model', 'vendor/model-X:preview']],
    ['copilot', 'copilot', ['-p', expect.any(String), '--model', 'vendor/model-X:preview']],
    ['opencode', 'opencode', ['run', '--model', 'vendor/model-X:preview', expect.any(String)]],
  ] as const)(
    '%s preserves exact model in structured argv',
    (harness, executable, expectedArgv) => {
      const command = buildExternalCommand(request(harness));
      expect(command).toMatchObject({ executable, argv: expectedArgv, cwd: '/workspace/project' });
      expect(command.argv.join(' ')).toContain('Plan 12, Task 3');
    }
  );

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

  it('falls back before launch when a harness lacks reasoning-effort support', () => {
    let launches = 0;
    const result = dispatchExternalTask(request('copilot', 'high'), {
      ...readyDependencies(),
      launch: () => {
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

  it('returns pre-launch fallback without launching when executable is unavailable', () => {
    let launches = 0;
    const result = dispatchExternalTask(request('copilot'), {
      ...readyDependencies(),
      executableExists: () => false,
      launch: () => {
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

  it('returns pre-launch fallback without launching when authentication fails', () => {
    let launches = 0;
    const result = dispatchExternalTask(request('codex'), {
      ...readyDependencies(),
      authenticate: () => ({ ok: false, detail: 'authentication check failed' }),
      launch: () => {
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

  it('reports a launched nonzero process as failure and never performs a native retry', () => {
    let launches = 0;
    const result = dispatchExternalTask(request('gemini'), {
      ...readyDependencies(),
      launch: () => {
        launches += 1;
        return { exitCode: 9 };
      },
    });
    expect(result).toEqual({ kind: 'launched-failure', exitCode: 9 });
    expect(launches).toBe(1);
  });
});
