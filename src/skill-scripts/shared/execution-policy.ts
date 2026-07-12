import matter from 'gray-matter';

export interface ExecutionPolicyContext {
  currentHarness: string;
  supportedHarnesses: readonly string[];
}

export type ExecutionPolicy =
  | { kind: 'native-default' }
  | { kind: 'native-override'; model: string; reasoningEffort?: string }
  | {
      kind: 'external-override';
      harness: string;
      model: string;
      reasoningEffort?: string;
    }
  | {
      kind: 'fallback';
      reason:
        | 'invalid-frontmatter'
        | 'invalid-execution'
        | 'missing-model'
        | 'invalid-model'
        | 'invalid-reasoning-effort'
        | 'invalid-harness'
        | 'unsupported-harness'
        | 'same-orchestrator-harness';
      detail: string;
    };

const fallback = (
  reason: Extract<ExecutionPolicy, { kind: 'fallback' }>['reason'],
  detail: string
): ExecutionPolicy => ({ kind: 'fallback', reason, detail });

const hasOwn = (value: Record<string, unknown>, key: string): boolean =>
  Object.prototype.hasOwnProperty.call(value, key);

/**
 * Reads only a task document's optional execution mapping. It deliberately has
 * no plan input, preventing defaults or inheritance from entering the contract.
 */
export const readTaskExecutionPolicy = (
  taskMarkdown: string,
  context: ExecutionPolicyContext
): ExecutionPolicy => {
  let data: Record<string, unknown>;
  try {
    // The empty options object bypasses gray-matter's content-keyed cache,
    // whose cached copies drop the non-enumerable `matter` property and make
    // a repeated parse of identical content misread as "no frontmatter".
    const parsed = matter(taskMarkdown, {});
    if (!parsed.matter) return { kind: 'native-default' };
    data = parsed.data;
  } catch (error) {
    return fallback(
      'invalid-frontmatter',
      `Task execution override was skipped: ${error instanceof Error ? error.message : 'invalid YAML'}`
    );
  }

  if (!hasOwn(data, 'execution')) return { kind: 'native-default' };
  const execution = data.execution;
  if (!execution || Array.isArray(execution) || typeof execution !== 'object') {
    return fallback('invalid-execution', 'Task execution override must be a YAML mapping.');
  }

  const policy = execution as Record<string, unknown>;
  if (!hasOwn(policy, 'model')) {
    return fallback('missing-model', 'Task execution override requires an exact model string.');
  }
  if (typeof policy.model !== 'string' || policy.model.length === 0) {
    return fallback('invalid-model', 'Task execution model must be a non-empty string.');
  }
  if (hasOwn(policy, 'reasoning_effort') && typeof policy.reasoning_effort !== 'string') {
    return fallback(
      'invalid-reasoning-effort',
      'Task reasoning_effort must be a string when provided.'
    );
  }

  const model = policy.model;
  const reasoningEffort = policy.reasoning_effort as string | undefined;
  if (!hasOwn(policy, 'harness')) {
    return reasoningEffort === undefined
      ? { kind: 'native-override', model }
      : { kind: 'native-override', model, reasoningEffort };
  }

  if (typeof policy.harness !== 'string' || policy.harness.length === 0) {
    return fallback(
      'invalid-harness',
      'Task execution harness must be a non-empty string when provided.'
    );
  }
  if (!context.supportedHarnesses.includes(policy.harness)) {
    return fallback(
      'unsupported-harness',
      `Task execution harness "${policy.harness}" is not supported.`
    );
  }
  if (policy.harness === context.currentHarness) {
    return fallback(
      'same-orchestrator-harness',
      'Task execution harness must differ from the current orchestrator.'
    );
  }

  return reasoningEffort === undefined
    ? { kind: 'external-override', harness: policy.harness, model }
    : { kind: 'external-override', harness: policy.harness, model, reasoningEffort };
};
