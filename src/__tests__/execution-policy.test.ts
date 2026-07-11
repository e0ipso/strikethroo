import { readTaskExecutionPolicy } from '../skill-scripts/shared/execution-policy';
import { rewriteTaskStatus } from '../skill-scripts/shared/task-file';

const supportedHarnesses = ['claude', 'codex', 'cursor', 'gemini', 'copilot', 'opencode'] as const;

const task = (execution = '') => `---
id: 1
status: "pending"
${execution}---
# Task
`;

describe('task execution policy', () => {
  it('keeps tasks without an execution mapping on the native default path', () => {
    expect(
      readTaskExecutionPolicy(task(), { currentHarness: 'codex', supportedHarnesses })
    ).toEqual({
      kind: 'native-default',
    });
  });

  it('preserves an exact model and optional reasoning effort for a native override', () => {
    expect(
      readTaskExecutionPolicy(
        task('execution:\n  model: "openai/gpt-5.6-terra:preview"\n  reasoning_effort: high\n'),
        { currentHarness: 'codex', supportedHarnesses }
      )
    ).toEqual({
      kind: 'native-override',
      model: 'openai/gpt-5.6-terra:preview',
      reasoningEffort: 'high',
    });
  });

  it('returns a valid external override for a different supported harness', () => {
    expect(
      readTaskExecutionPolicy(task('execution:\n  model: vendor/model-X\n  harness: copilot\n'), {
        currentHarness: 'codex',
        supportedHarnesses,
      })
    ).toEqual({ kind: 'external-override', harness: 'copilot', model: 'vendor/model-X' });
  });

  it.each([
    ['missing-model', 'execution: {}\n'],
    ['invalid-model', 'execution:\n  model: 12\n'],
    ['invalid-reasoning-effort', 'execution:\n  model: exact\n  reasoning_effort: 2\n'],
    ['unsupported-harness', 'execution:\n  model: exact\n  harness: unknown\n'],
    ['same-orchestrator-harness', 'execution:\n  model: exact\n  harness: codex\n'],
  ])('falls back before launch for %s', (reason, execution) => {
    const result = readTaskExecutionPolicy(task(execution), {
      currentHarness: 'codex',
      supportedHarnesses,
    });
    expect(result).toMatchObject({ kind: 'fallback', reason });
    expect(result.detail).toBeTruthy();
  });
});

describe('lossless task status rewrite', () => {
  it('changes only the root frontmatter status and preserves nested execution bytes', () => {
    const source = `---\r
id: 1\r
status: "pending" # lifecycle\r
execution:\r
  model: "vendor/model-X"\r
  reasoning_effort: high\r
  metadata:\r
    status: untouched\r
skills:\r
  - typescript\r
---\r
# Task\r
\r
status: body text\r
`;
    expect(rewriteTaskStatus(source, 'in-progress')).toBe(
      source.replace('status: "pending" # lifecycle', 'status: "in-progress" # lifecycle')
    );
  });

  it.each([
    ['# Task\n', 'missing frontmatter'],
    ['---\nid: 1\n---\n# Task\n', 'missing root status'],
    ['---\nstatus: pending\nstatus: done\n---\n# Task\n', 'duplicate root status'],
  ])('rejects a %s document', (source, message) => {
    expect(() => rewriteTaskStatus(source, 'completed')).toThrow(message);
  });
});
