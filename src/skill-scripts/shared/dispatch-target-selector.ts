import * as path from 'path';
import { execFileSync } from 'child_process';
import type { RoutingConfig, RoutingTarget } from './execution-routing';

/** Canonical identity used in retry avoid sets and custom-selector I/O. */
export const executionTargetId = (target: RoutingTarget): string =>
  JSON.stringify([target.model, target.harness ?? null, target.reasoning_effort ?? null]);

export interface DispatchTargetCandidate {
  id: string;
  target: RoutingTarget;
}

export interface CustomSelectorInput {
  version: 1;
  task: { id: number; profile: string };
  candidates: DispatchTargetCandidate[];
  avoid: string[];
}

export type DispatchTargetSelection =
  | { kind: 'selected'; id: string; target: RoutingTarget; source: 'built-in' | 'custom' }
  | {
      kind: 'native-default';
      reason: 'profile-unavailable' | 'targets-exhausted' | 'selector-failure';
      detail: string;
    };

interface SelectorProcessResult {
  ok: boolean;
  stdout?: string;
}

export interface DispatchTargetSelectorOptions {
  projectRoot: string;
  taskId: number;
  timeoutMs?: number;
  runSelector?: (scriptPath: string, input: string, timeoutMs: number) => SelectorProcessResult;
}

const runSelector = (
  scriptPath: string,
  input: string,
  timeoutMs: number
): SelectorProcessResult => {
  try {
    const nodeScript = /\.(?:cjs|mjs|js)$/.test(scriptPath);
    const stdout = nodeScript
      ? execFileSync(process.execPath, [scriptPath], {
          input,
          encoding: 'utf8',
          timeout: timeoutMs,
          maxBuffer: 1024 * 1024,
          stdio: ['pipe', 'pipe', 'pipe'],
        })
      : execFileSync(scriptPath, [], {
          input,
          encoding: 'utf8',
          timeout: timeoutMs,
          maxBuffer: 1024 * 1024,
          stdio: ['pipe', 'pipe', 'pipe'],
        });
    return { ok: true, stdout };
  } catch {
    // Child output and platform-specific errors can contain secrets or paths.
    return { ok: false };
  }
};

const nativeDefault = (
  reason: Extract<DispatchTargetSelection, { kind: 'native-default' }>['reason'],
  detail: string
): DispatchTargetSelection => ({ kind: 'native-default', reason, detail });

const resolveRepositoryScript = (projectRoot: string, configured: string): string | null => {
  if (path.isAbsolute(configured)) return null;
  const root = path.resolve(projectRoot);
  const resolved = path.resolve(root, configured);
  return resolved === root || resolved.startsWith(`${root}${path.sep}`) ? resolved : null;
};

/**
 * Select one configured target for a persisted profile. The built-in policy is
 * the first non-avoided target in configuration order. A custom selector is
 * authoritative: its failure never falls through to the built-in policy.
 *
 * Custom selector protocol (stdin/stdout JSON): stdin is CustomSelectorInput;
 * stdout must be exactly one object shaped as `{ "target": "<candidate id>" }`.
 */
export const selectDispatchTarget = (
  config: RoutingConfig,
  profileName: string,
  avoidedIds: ReadonlySet<string>,
  options: DispatchTargetSelectorOptions
): DispatchTargetSelection => {
  const profile = config.profiles.find(candidate => candidate.name === profileName);
  if (!profile) {
    return nativeDefault(
      'profile-unavailable',
      `Execution profile "${profileName}" is not present in current configuration.`
    );
  }

  const candidates = profile.targets.map(target => ({ id: executionTargetId(target), target }));
  const available = candidates.filter(candidate => !avoidedIds.has(candidate.id));
  if (available.length === 0) {
    return nativeDefault(
      'targets-exhausted',
      `All ${candidates.length} configured target(s) for profile "${profileName}" were avoided.`
    );
  }

  if (config.resolverScript === undefined) {
    const selected = available[0]!;
    return { kind: 'selected', ...selected, source: 'built-in' };
  }

  const scriptPath = resolveRepositoryScript(options.projectRoot, config.resolverScript);
  if (!scriptPath) {
    return nativeDefault(
      'selector-failure',
      'Custom target selector path is not repository-relative.'
    );
  }
  const input: CustomSelectorInput = {
    version: 1,
    task: { id: options.taskId, profile: profileName },
    candidates,
    avoid: [...avoidedIds].sort(),
  };
  const result = (options.runSelector ?? runSelector)(
    scriptPath,
    JSON.stringify(input),
    options.timeoutMs ?? 10_000
  );
  if (!result.ok || result.stdout === undefined) {
    return nativeDefault(
      'selector-failure',
      'Custom target selector did not complete successfully.'
    );
  }

  let output: unknown;
  try {
    output = JSON.parse(result.stdout);
  } catch {
    return nativeDefault('selector-failure', 'Custom target selector returned invalid JSON.');
  }
  if (
    typeof output !== 'object' ||
    output === null ||
    Array.isArray(output) ||
    Object.keys(output).length !== 1 ||
    typeof (output as { target?: unknown }).target !== 'string'
  ) {
    return nativeDefault('selector-failure', 'Custom target selector returned an invalid result.');
  }
  const selectedId = (output as { target: string }).target;
  const selected = candidates.find(candidate => candidate.id === selectedId);
  if (!selected || avoidedIds.has(selected.id)) {
    return nativeDefault(
      'selector-failure',
      'Custom target selector returned an unknown or avoided target.'
    );
  }
  return { kind: 'selected', ...selected, source: 'custom' };
};
