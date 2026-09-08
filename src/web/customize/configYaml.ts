/**
 * Pure form-model boundary for the workspace's generic `config/config.yaml`.
 *
 * The Customize section's Config tab edits config.yaml through a structured
 * form, not a raw text editor. This module is the single place that YAML
 * crosses into and out of that form: `parseWorkspaceConfig` lifts the file
 * into a typed form model (plus the untouched full document, so foreign
 * top-level sections owned by other features survive a save), and
 * `serializeWorkspaceConfig` writes the edited `harnesses` and
 * `execution_routing` sections back into that document and dumps the whole
 * thing, including the `execution_routing.enabled` switch. No component
 * parses or emits YAML on its own.
 *
 * Safety rule: if either managed section exists but does not match the shape
 * this form understands, parsing reports `unsupported` and the UI
 * refuses to offer a form save — a form-driven rewrite of content it cannot
 * represent would silently destroy it. Saving also re-serializes the file
 * without comments (a YAML round-trip cannot preserve them); the shipped
 * template and the UI both say so.
 */

import { load, dump } from 'js-yaml';
import { SUPPORTED_HARNESSES, type Harness } from '../../types';

/** One exact execution target row in the form ('' means "not set"). */
export interface RoutingTargetForm {
  model: string;
  harness: string;
  reasoningEffort: string;
}

/** One named profile in the form. */
export interface RoutingProfileForm {
  name: string;
  description: string;
  targets: RoutingTargetForm[];
}

/** The whole execution_routing section as the form edits it. */
export interface RoutingForm {
  /** Absent in the file means true. */
  enabled: boolean;
  profiles: RoutingProfileForm[];
  /** '' means "no custom resolver". */
  resolverScript: string;
}

/** One harness's ordered `cli_args`, held exactly as the loader reads them. */
export interface HarnessArgsEntry {
  cliArgs: string[];
}

/** The whole harnesses section as the form edits it, in SUPPORTED_HARNESSES order. */
export type HarnessArgsForm = Record<Harness, HarnessArgsEntry>;

export type ParsedWorkspaceConfig =
  | {
      kind: 'parsed';
      document: Record<string, unknown>;
      harnesses: HarnessArgsForm;
      routing: RoutingForm;
    }
  | { kind: 'unsupported'; message: string };

export const EMPTY_ROUTING: RoutingForm = { enabled: true, profiles: [], resolverScript: '' };

/** Shared; callers copy before mutating. */
export const EMPTY_HARNESSES: HarnessArgsForm = Object.fromEntries(
  SUPPORTED_HARNESSES.map(harness => [harness, { cliArgs: [] as string[] }])
) as HarnessArgsForm;

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isOptionalString = (value: unknown): value is string | undefined =>
  value === undefined || typeof value === 'string';

const unsupported = (message: string): ParsedWorkspaceConfig => ({
  kind: 'unsupported',
  message,
});

/** Lifts one `models` entry into a form row, or null when unrepresentable. */
const parseTarget = (raw: unknown): RoutingTargetForm | null => {
  if (!isPlainObject(raw)) return null;
  for (const key of Object.keys(raw)) {
    if (key !== 'model' && key !== 'harness' && key !== 'reasoning_effort') return null;
  }
  if (typeof raw.model !== 'string') return null;
  if (!isOptionalString(raw.harness) || !isOptionalString(raw.reasoning_effort)) return null;
  return {
    model: raw.model,
    harness: raw.harness ?? '',
    reasoningEffort: raw.reasoning_effort ?? '',
  };
};

/**
 * Lifts the `harnesses` section into the form model, mirroring the shape
 * rules of `validateHarnessEntry` in
 * `skill-scripts/shared/harness-configuration.ts`. Argument strings stay
 * verbatim — an empty or NUL-bearing one parses so the form can show it, and
 * `validateHarnessForm` reports it rather than the whole file being refused.
 */
const parseHarnesses = (section: unknown): HarnessArgsForm | { message: string } => {
  if (section === undefined || section === null) return EMPTY_HARNESSES;
  if (!isPlainObject(section)) return { message: 'The harnesses section is not a mapping.' };
  for (const key of Object.keys(section)) {
    if (!(SUPPORTED_HARNESSES as readonly string[]).includes(key)) {
      return { message: `harnesses.${key} is not a supported harness.` };
    }
  }

  const form = {} as HarnessArgsForm;
  for (const harness of SUPPORTED_HARNESSES) {
    if (!(harness in section)) {
      form[harness] = { cliArgs: [] };
      continue;
    }
    const entry = section[harness];
    if (!isPlainObject(entry)) return { message: `harnesses.${harness} is not a mapping.` };
    for (const key of Object.keys(entry)) {
      if (key !== 'cli_args') return { message: `harnesses.${harness}.${key} is not supported.` };
    }
    if (!('cli_args' in entry)) {
      form[harness] = { cliArgs: [] };
      continue;
    }
    if (!Array.isArray(entry.cli_args)) {
      return { message: `harnesses.${harness}.cli_args must be a list of exact strings.` };
    }
    const cliArgs: string[] = [];
    for (const [index, value] of entry.cli_args.entries()) {
      if (typeof value !== 'string') {
        return { message: `harnesses.${harness}.cli_args[${index}] is not a string.` };
      }
      cliArgs.push(value);
    }
    form[harness] = { cliArgs };
  }
  return form;
};

/**
 * Parses config.yaml content into the full document plus the harness and
 * routing form models. An empty/comment-only file, and an absent or empty
 * section, both parse to the empty form.
 */
export function parseWorkspaceConfig(content: string): ParsedWorkspaceConfig {
  const hasContent = content
    .split(/\r?\n/)
    .some(line => line.trim() !== '' && !line.trim().startsWith('#'));

  let document: unknown = {};
  if (hasContent) {
    try {
      document = load(content) ?? {};
    } catch (err) {
      return unsupported(
        `config.yaml is not valid YAML: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }
  if (!isPlainObject(document)) {
    return unsupported('config.yaml must be a YAML mapping of feature sections.');
  }

  const harnesses = parseHarnesses(document.harnesses);
  if ('message' in harnesses) return unsupported(harnesses.message);

  const section = document.execution_routing;
  if (section === undefined || section === null) {
    return { kind: 'parsed', document, harnesses, routing: EMPTY_ROUTING };
  }
  if (!isPlainObject(section)) {
    return unsupported('The execution_routing section is not a mapping.');
  }
  for (const key of Object.keys(section)) {
    if (key !== 'enabled' && key !== 'profiles' && key !== 'resolver') {
      return unsupported(`The execution_routing section has an unrecognized key "${key}".`);
    }
  }

  let enabled = true;
  if (section.enabled !== undefined) {
    if (typeof section.enabled !== 'boolean') {
      return unsupported('execution_routing.enabled must be true or false.');
    }
    enabled = section.enabled;
  }

  const rawProfiles = section.profiles ?? {};
  if (!isPlainObject(rawProfiles)) {
    return unsupported('execution_routing.profiles is not a mapping.');
  }
  const profiles: RoutingProfileForm[] = [];
  for (const [name, rawProfile] of Object.entries(rawProfiles)) {
    if (!isPlainObject(rawProfile)) {
      return unsupported(`Profile "${name}" is not a mapping.`);
    }
    for (const key of Object.keys(rawProfile)) {
      if (key !== 'description' && key !== 'models') {
        return unsupported(`Profile "${name}" has an unrecognized key "${key}".`);
      }
    }
    if (!isOptionalString(rawProfile.description)) {
      return unsupported(`Profile "${name}" has a non-string description.`);
    }
    const rawModels = rawProfile.models ?? [];
    if (!Array.isArray(rawModels)) {
      return unsupported(`Profile "${name}" has a non-array models list.`);
    }
    const targets: RoutingTargetForm[] = [];
    for (const rawTarget of rawModels) {
      const target = parseTarget(rawTarget);
      if (!target) {
        return unsupported(`Profile "${name}" has a target this form cannot represent.`);
      }
      targets.push(target);
    }
    profiles.push({ name, description: (rawProfile.description ?? '').trim(), targets });
  }

  let resolverScript = '';
  if (section.resolver !== undefined && section.resolver !== null) {
    const resolver = section.resolver;
    if (
      !isPlainObject(resolver) ||
      typeof resolver.script !== 'string' ||
      Object.keys(resolver).some(key => key !== 'script')
    ) {
      return unsupported('execution_routing.resolver has an unrecognized shape.');
    }
    resolverScript = resolver.script;
  }

  return { kind: 'parsed', document, harnesses, routing: { enabled, profiles, resolverScript } };
}

/**
 * Writes the edited harness and routing forms back into the parsed document
 * (preserving every foreign top-level section structurally) and dumps the
 * whole file.
 */
export function serializeWorkspaceConfig(
  document: Record<string, unknown>,
  harnesses: HarnessArgsForm,
  routing: RoutingForm
): string {
  const profiles: Record<string, unknown> = {};
  for (const profile of routing.profiles) {
    const models = profile.targets.map(target => {
      const entry: Record<string, string> = {};
      if (target.harness.trim() !== '') entry.harness = target.harness.trim();
      entry.model = target.model.trim();
      if (target.reasoningEffort.trim() !== '')
        entry.reasoning_effort = target.reasoningEffort.trim();
      return entry;
    });
    profiles[profile.name.trim()] = { description: profile.description.trim(), models };
  }

  // Key order is what js-yaml dumps, so the switch lands first.
  const section: Record<string, unknown> = { enabled: routing.enabled, profiles };
  if (routing.resolverScript.trim() !== '') {
    section.resolver = { script: routing.resolverScript.trim() };
  }

  // Never trimmed: the loader reads every argument byte-for-byte.
  const harnessSection = Object.fromEntries(
    SUPPORTED_HARNESSES.map(harness => [harness, { cli_args: [...harnesses[harness].cliArgs] }])
  );

  // Dropped first so both managed sections are emitted in a stable order
  // after whatever foreign sections the document carried.
  const { harnesses: _oldHarnesses, execution_routing: _oldRouting, ...rest } = document;
  const next: Record<string, unknown> = {
    ...rest,
    harnesses: harnessSection,
    execution_routing: section,
  };
  return dump(next, { lineWidth: 100, noRefs: true });
}

/**
 * Client-side validation mirroring `validateHarnessEntry`'s per-argument
 * rules, so a form save cannot produce a config the loader would reject.
 */
export function validateHarnessForm(harnesses: HarnessArgsForm): string[] {
  const errors: string[] = [];
  for (const harness of SUPPORTED_HARNESSES) {
    harnesses[harness].cliArgs.forEach((value, index) => {
      const label = `${harness}, argument ${index + 1}`;
      if (value === '') errors.push(`${label}: an argument cannot be empty.`);
      else if (value.includes('\0'))
        errors.push(`${label}: an argument cannot contain a NUL character.`);
    });
  }
  return errors;
}

/**
 * Client-side validation mirroring the routing helper's contract, so a form
 * save cannot produce a config the deterministic helper would reject.
 */
export function validateRoutingForm(routing: RoutingForm): string[] {
  // Mirrors the loader, which skips profile validation while routing is off.
  if (!routing.enabled) return [];
  const errors: string[] = [];
  const seen = new Set<string>();
  for (const profile of routing.profiles) {
    const name = profile.name.trim();
    const label = name === '' ? 'Unnamed profile' : `Profile "${name}"`;
    if (name === '') errors.push('Every profile needs a name.');
    if (seen.has(name)) errors.push(`Duplicate profile name "${name}".`);
    seen.add(name);
    if (profile.description.trim() === '') {
      errors.push(`${label} needs a description — it is what the LLM classifies against.`);
    }
    if (profile.targets.length === 0) {
      errors.push(`${label} needs at least one execution target.`);
    }
    profile.targets.forEach((target, index) => {
      if (target.model.trim() === '') {
        errors.push(`${label}, target ${index + 1}: an exact model identifier is required.`);
      }
      const harness = target.harness.trim();
      if (harness !== '' && !(SUPPORTED_HARNESSES as readonly string[]).includes(harness)) {
        errors.push(`${label}, target ${index + 1}: unsupported harness "${harness}".`);
      }
    });
  }
  return errors;
}
