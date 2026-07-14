import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

/**
 * Execution routing configuration and generation-time profile persistence.
 * Generation validates the complete task-to-profile classification and stores
 * only the durable profile name. Concrete target selection belongs to task
 * dispatch, where current executable availability can be evaluated.
 */

/**
 * The workspace's single structured configuration file. Every configurable
 * feature claims one top-level section in it; this module owns only the
 * `execution_routing` section and ignores the rest.
 */
export const WORKSPACE_CONFIG_RELPATH = path.join('config', 'config.yaml');
export const EXECUTION_ROUTING_SECTION = 'execution_routing';

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
 * Loads and validates the `execution_routing` section of the workspace's
 * generic `config/config.yaml`. An absent file is `no-config`; an absent or
 * empty section (or empty `profiles`) is `disabled`. Both mean "generate
 * tasks without execution metadata", the pre-routing behavior. Top-level
 * keys other than the routing section belong to other features and are
 * ignored here.
 */
export const loadRoutingConfig = (
  strikethrooRoot: string,
  supportedHarnesses: readonly string[]
): RoutingConfigResult => {
  const configPath = path.join(strikethrooRoot, WORKSPACE_CONFIG_RELPATH);
  let contents: string;
  try {
    contents = fs.readFileSync(configPath, 'utf8');
  } catch {
    return { kind: 'no-config' };
  }

  // js-yaml v5 throws on an empty document, and a config.yaml reduced to
  // comments/blank lines is legitimately "nothing configured".
  const hasContent = contents.split(/\r?\n/).some(line => {
    const trimmed = line.trim();
    return trimmed !== '' && !trimmed.startsWith('#');
  });
  if (!hasContent) return { kind: 'disabled' };

  let document: unknown;
  try {
    document = yaml.load(contents);
  } catch (error) {
    return {
      kind: 'invalid',
      errors: [
        `config.yaml is not valid YAML: ${error instanceof Error ? error.message : String(error)}`,
      ],
    };
  }

  if (document === null || document === undefined) return { kind: 'disabled' };
  if (!isPlainObject(document)) {
    return { kind: 'invalid', errors: ['config.yaml must be a YAML mapping.'] };
  }

  const section = document[EXECUTION_ROUTING_SECTION];
  if (section === null || section === undefined) return { kind: 'disabled' };

  const errors: string[] = [];
  if (!isPlainObject(section)) {
    return {
      kind: 'invalid',
      errors: [`config.yaml "${EXECUTION_ROUTING_SECTION}" must be a YAML mapping.`],
    };
  }
  for (const key of Object.keys(section)) {
    if (key !== 'profiles' && key !== 'resolver') {
      errors.push(`${EXECUTION_ROUTING_SECTION} has unknown key "${key}".`);
    }
  }
  // A bare `profiles:` key (everything commented out) reads as null; treat it
  // like the shipped `profiles: {}` template — routing configured off.
  const rawProfiles = 'profiles' in section && section.profiles == null ? {} : section.profiles;
  if (!('profiles' in section) || !isPlainObject(rawProfiles)) {
    errors.push(`${EXECUTION_ROUTING_SECTION} requires a "profiles" mapping.`);
    return { kind: 'invalid', errors };
  }

  const profiles: RoutingProfile[] = [];
  for (const [name, rawProfile] of Object.entries(rawProfiles)) {
    const profile = validateProfile(name, rawProfile, supportedHarnesses, errors);
    if (profile) profiles.push(profile);
  }

  let resolverScript: string | undefined;
  if ('resolver' in section) {
    const resolver = section.resolver;
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

/**
 * Writes one `execution_profile` scalar into a task document's leading YAML
 * frontmatter, preserving every unrelated byte. The unreleased root-level
 * `execution` mapping is removed when encountered so generation never leaves
 * concrete target metadata behind. Re-running is idempotent.
 */
export const writeExecutionProfileFrontmatter = (taskMarkdown: string, profile: string): string => {
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
    if (/^execution_profile\s*:/.test(line)) continue;
    if (/^execution\s*:/.test(line)) {
      inExecutionBlock = true;
      continue;
    }
    if (inExecutionBlock && /^[ \t]/.test(line)) continue;
    inExecutionBlock = false;
    kept.push(line);
  }

  const newFrontmatter = [...kept, `execution_profile: ${JSON.stringify(profile)}`].join(eol);
  return `${opening}${newFrontmatter}${closing}${taskMarkdown.slice(match[0].length)}`;
};
