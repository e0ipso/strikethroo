import * as fs from 'fs';
import * as path from 'path';
import { execFileSync } from 'child_process';
import * as yaml from 'js-yaml';

/**
 * Execution routing: turns a transient LLM task-to-profile classification
 * into PR #53's exact per-task `execution` frontmatter. Profiles and their
 * candidate targets are configuration-driven; nothing here discovers models,
 * translates identifiers, or invents defaults beyond "first configured
 * target wins".
 */

export const ROUTING_CONFIG_RELPATH = path.join('config', 'execution-routing.yaml');

export interface RoutingTarget {
  model: string;
  harness?: string;
  reasoning_effort?: string;
}

export interface RoutingProfile {
  name: string;
  description: string;
  targets: RoutingTarget[];
}

export interface RoutingConfig {
  profiles: RoutingProfile[];
  resolverScript?: string;
}

export type RoutingConfigResult =
  | { kind: 'no-config' }
  | { kind: 'disabled' }
  | { kind: 'config'; config: RoutingConfig }
  | { kind: 'invalid'; errors: string[] };

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const validateTarget = (
  profileName: string,
  index: number,
  raw: unknown,
  supportedHarnesses: readonly string[],
  errors: string[]
): RoutingTarget | null => {
  const label = `profile "${profileName}" models[${index}]`;
  if (!isPlainObject(raw)) {
    errors.push(`${label} must be a mapping with an exact "model" string.`);
    return null;
  }
  for (const key of Object.keys(raw)) {
    if (key !== 'model' && key !== 'harness' && key !== 'reasoning_effort') {
      errors.push(`${label} has unknown key "${key}".`);
      return null;
    }
  }
  if (!isNonEmptyString(raw.model)) {
    errors.push(`${label} requires a non-empty exact "model" string.`);
    return null;
  }
  const target: RoutingTarget = { model: raw.model };
  if ('harness' in raw) {
    if (!isNonEmptyString(raw.harness)) {
      errors.push(`${label} "harness" must be a non-empty string when provided.`);
      return null;
    }
    if (!supportedHarnesses.includes(raw.harness)) {
      errors.push(`${label} harness "${raw.harness}" is not a supported harness.`);
      return null;
    }
    target.harness = raw.harness;
  }
  if ('reasoning_effort' in raw) {
    if (!isNonEmptyString(raw.reasoning_effort)) {
      errors.push(`${label} "reasoning_effort" must be a non-empty string when provided.`);
      return null;
    }
    target.reasoning_effort = raw.reasoning_effort;
  }
  return target;
};

const validateProfile = (
  name: string,
  raw: unknown,
  supportedHarnesses: readonly string[],
  errors: string[]
): RoutingProfile | null => {
  if (!isPlainObject(raw)) {
    errors.push(`profile "${name}" must be a mapping with "description" and "models".`);
    return null;
  }
  if ('resolver' in raw) {
    errors.push(
      `profile "${name}" configures a per-profile resolver; only the single ` +
        'top-level "resolver" is supported.'
    );
    return null;
  }
  for (const key of Object.keys(raw)) {
    if (key !== 'description' && key !== 'models') {
      errors.push(`profile "${name}" has unknown key "${key}".`);
      return null;
    }
  }
  if (!isNonEmptyString(raw.description)) {
    errors.push(`profile "${name}" requires a non-empty LLM-facing "description".`);
    return null;
  }
  if (!Array.isArray(raw.models) || raw.models.length === 0) {
    errors.push(`profile "${name}" requires a non-empty ordered "models" array.`);
    return null;
  }
  const targets: RoutingTarget[] = [];
  for (let i = 0; i < raw.models.length; i += 1) {
    const target = validateTarget(name, i, raw.models[i], supportedHarnesses, errors);
    if (!target) return null;
    targets.push(target);
  }
  return { name, description: raw.description.trim(), targets };
};

/**
 * Loads and validates `config/execution-routing.yaml` under the workspace
 * root. An absent file is `no-config`; a present file whose `profiles`
 * mapping is empty is `disabled`. Both mean "generate tasks without
 * execution metadata", the pre-routing behavior.
 */
export const loadRoutingConfig = (
  strikethrooRoot: string,
  supportedHarnesses: readonly string[]
): RoutingConfigResult => {
  const configPath = path.join(strikethrooRoot, ROUTING_CONFIG_RELPATH);
  let contents: string;
  try {
    contents = fs.readFileSync(configPath, 'utf8');
  } catch {
    return { kind: 'no-config' };
  }

  let data: unknown;
  try {
    data = yaml.load(contents);
  } catch (error) {
    return {
      kind: 'invalid',
      errors: [
        `execution-routing.yaml is not valid YAML: ${error instanceof Error ? error.message : String(error)}`,
      ],
    };
  }

  if (data === null || data === undefined) return { kind: 'disabled' };

  const errors: string[] = [];
  if (!isPlainObject(data)) {
    return { kind: 'invalid', errors: ['execution-routing.yaml must be a YAML mapping.'] };
  }
  for (const key of Object.keys(data)) {
    if (key !== 'profiles' && key !== 'resolver') {
      errors.push(`execution-routing.yaml has unknown top-level key "${key}".`);
    }
  }
  // A bare `profiles:` key (everything commented out) reads as null; treat it
  // like the shipped `profiles: {}` template — routing configured off.
  const rawProfiles = 'profiles' in data && data.profiles == null ? {} : data.profiles;
  if (!('profiles' in data) || !isPlainObject(rawProfiles)) {
    errors.push('execution-routing.yaml requires a "profiles" mapping.');
    return { kind: 'invalid', errors };
  }

  const profiles: RoutingProfile[] = [];
  for (const [name, rawProfile] of Object.entries(rawProfiles)) {
    const profile = validateProfile(name, rawProfile, supportedHarnesses, errors);
    if (profile) profiles.push(profile);
  }

  let resolverScript: string | undefined;
  if ('resolver' in data) {
    const resolver = data.resolver;
    if (!isPlainObject(resolver) || !isNonEmptyString(resolver.script)) {
      errors.push('resolver must be a mapping with a non-empty "script" path.');
    } else {
      for (const key of Object.keys(resolver)) {
        if (key !== 'script') errors.push(`resolver has unknown key "${key}".`);
      }
      resolverScript = resolver.script;
    }
  }

  if (errors.length > 0) return { kind: 'invalid', errors };
  if (profiles.length === 0) return { kind: 'disabled' };
  const config: RoutingConfig = { profiles };
  if (resolverScript !== undefined) config.resolverScript = resolverScript;
  return { kind: 'config', config };
};

export type AssignmentResult =
  | { kind: 'assignments'; assignments: Map<number, string> }
  | { kind: 'invalid'; errors: string[] };

/**
 * Validates the transient LLM task-to-profile mapping: every generated task
 * ID exactly once, no unknown task IDs, only configured profile names.
 * Missing, duplicate, or unknown assignments are failures — never guesses.
 */
export const validateAssignments = (
  rawMap: unknown,
  taskIds: readonly number[],
  profileNames: readonly string[]
): AssignmentResult => {
  const errors: string[] = [];
  if (!isPlainObject(rawMap)) {
    return {
      kind: 'invalid',
      errors: ['assignment map must be a JSON object of task-ID to profile-name.'],
    };
  }

  const assignments = new Map<number, string>();
  const known = new Set(taskIds);
  for (const [rawId, rawProfile] of Object.entries(rawMap)) {
    if (!/^\d+$/.test(rawId.trim())) {
      errors.push(`assignment key "${rawId}" is not a task ID.`);
      continue;
    }
    const id = parseInt(rawId, 10);
    if (assignments.has(id)) {
      errors.push(`task ${id} is assigned more than once.`);
      continue;
    }
    if (!known.has(id)) {
      errors.push(`assignment references unknown task ID ${id}.`);
      continue;
    }
    if (typeof rawProfile !== 'string' || !profileNames.includes(rawProfile)) {
      errors.push(`task ${id} is assigned unknown profile "${String(rawProfile)}".`);
      continue;
    }
    assignments.set(id, rawProfile);
  }

  for (const id of taskIds) {
    if (!assignments.has(id)) errors.push(`task ${id} has no profile assignment.`);
  }

  if (errors.length > 0) return { kind: 'invalid', errors };
  return { kind: 'assignments', assignments };
};

export type TargetSelectionResult =
  | { kind: 'selected'; selections: Map<number, RoutingTarget> }
  | { kind: 'resolver-failure'; detail: string };

const runCustomResolver = (
  scriptPath: string,
  input: string
): { stdout: string } | { error: string } => {
  try {
    const isNodeScript = /\.(cjs|mjs|js)$/.test(scriptPath);
    const stdout = isNodeScript
      ? execFileSync(process.execPath, [scriptPath], { input, encoding: 'utf8' })
      : execFileSync(scriptPath, { input, encoding: 'utf8' });
    return { stdout };
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
};

/**
 * Selects one exact target per task within its LLM-assigned profile. The
 * default resolver takes the first configured target (array order is
 * priority order). One optional global custom resolver may replace that
 * choice, but only by index into the assigned profile's configured
 * candidates — it can never introduce an unconfigured target.
 */
export const selectTargets = (
  config: RoutingConfig,
  assignments: ReadonlyMap<number, string>,
  options: { planId: number; projectRoot: string }
): TargetSelectionResult => {
  const profilesByName = new Map(config.profiles.map(p => [p.name, p]));
  const tasks = [...assignments.entries()]
    .sort(([a], [b]) => a - b)
    .map(([id, profileName]) => {
      const profile = profilesByName.get(profileName);
      if (!profile) throw new Error(`unvalidated profile "${profileName}"`);
      return { id, profile: profileName, candidates: profile.targets };
    });

  if (!config.resolverScript) {
    const selections = new Map<number, RoutingTarget>();
    for (const task of tasks) {
      const first = task.candidates[0];
      if (!first) throw new Error(`profile "${task.profile}" has no targets`);
      selections.set(task.id, first);
    }
    return { kind: 'selected', selections };
  }

  const scriptPath = path.resolve(options.projectRoot, config.resolverScript);
  if (!fs.existsSync(scriptPath)) {
    return {
      kind: 'resolver-failure',
      detail: `custom resolver script not found: ${scriptPath}`,
    };
  }

  const request = JSON.stringify({ planId: options.planId, tasks });
  const outcome = runCustomResolver(scriptPath, request);
  if ('error' in outcome) {
    return { kind: 'resolver-failure', detail: `custom resolver failed: ${outcome.error}` };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(outcome.stdout);
  } catch {
    return {
      kind: 'resolver-failure',
      detail: 'custom resolver did not print a JSON object on stdout.',
    };
  }
  if (!isPlainObject(parsed) || !isPlainObject(parsed.selections)) {
    return {
      kind: 'resolver-failure',
      detail: 'custom resolver output must be {"selections": {"<taskId>": <candidateIndex>}}.',
    };
  }

  const rawSelections = parsed.selections;
  const selections = new Map<number, RoutingTarget>();
  for (const task of tasks) {
    const raw = rawSelections[String(task.id)];
    if (typeof raw !== 'number' || !Number.isInteger(raw)) {
      return {
        kind: 'resolver-failure',
        detail: `custom resolver returned no integer candidate index for task ${task.id}.`,
      };
    }
    const target = task.candidates[raw];
    if (raw < 0 || !target) {
      return {
        kind: 'resolver-failure',
        detail:
          `custom resolver selected candidate ${raw} for task ${task.id}, which is ` +
          `outside profile "${task.profile}"'s configured targets.`,
      };
    }
    selections.set(task.id, target);
  }
  const extras = Object.keys(rawSelections).filter(
    key => !tasks.some(task => String(task.id) === key)
  );
  if (extras.length > 0) {
    return {
      kind: 'resolver-failure',
      detail: `custom resolver returned selections for unknown task IDs: ${extras.join(', ')}.`,
    };
  }

  return { kind: 'selected', selections };
};

export interface ResolvedExecution {
  model: string;
  harness?: string;
  reasoning_effort?: string;
}

/**
 * Projects a configured target onto PR #53's exact frontmatter semantics:
 * the `harness` key is present only when it names a harness other than the
 * one orchestrating this generation run.
 */
export const toExecutionMapping = (
  target: RoutingTarget,
  currentHarness: string
): ResolvedExecution => {
  const execution: ResolvedExecution = { model: target.model };
  if (target.harness !== undefined && target.harness !== currentHarness) {
    execution.harness = target.harness;
  }
  if (target.reasoning_effort !== undefined) {
    execution.reasoning_effort = target.reasoning_effort;
  }
  return execution;
};

/**
 * Writes the exact `execution` mapping into a task document's leading YAML
 * frontmatter, preserving every other byte of frontmatter and body. Any
 * existing root-level `execution` block is replaced so re-running routing is
 * idempotent.
 */
export const writeExecutionFrontmatter = (
  taskMarkdown: string,
  execution: ResolvedExecution
): string => {
  const match = taskMarkdown.match(/^(---\r?\n)([\s\S]*?)(\r?\n---)/);
  if (!match) throw new Error('missing frontmatter');
  const opening = match[1];
  const frontmatter = match[2];
  const closing = match[3];
  if (opening === undefined || frontmatter === undefined || closing === undefined) {
    throw new Error('missing frontmatter');
  }

  const eol = frontmatter.includes('\r\n') ? '\r\n' : '\n';
  const lines = frontmatter.split(/\r?\n/);
  const kept: string[] = [];
  let inExecutionBlock = false;
  for (const line of lines) {
    if (/^execution\s*:/.test(line)) {
      inExecutionBlock = true;
      continue;
    }
    if (inExecutionBlock && /^[ \t]/.test(line)) continue;
    inExecutionBlock = false;
    kept.push(line);
  }

  const executionLines = ['execution:'];
  if (execution.harness !== undefined) {
    executionLines.push(`  harness: ${JSON.stringify(execution.harness)}`);
  }
  executionLines.push(`  model: ${JSON.stringify(execution.model)}`);
  if (execution.reasoning_effort !== undefined) {
    executionLines.push(`  reasoning_effort: ${JSON.stringify(execution.reasoning_effort)}`);
  }

  const newFrontmatter = [...kept, ...executionLines].join(eol);
  return `${opening}${newFrontmatter}${closing}${taskMarkdown.slice(match[0].length)}`;
};
