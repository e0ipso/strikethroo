/**
 * Pure form-model boundary for the workspace's generic `config/config.yaml`.
 *
 * The Customize section's Config tab edits config.yaml through a structured
 * form, not a raw text editor. This module is the single place that YAML
 * crosses into and out of that form: `parseWorkspaceConfig` lifts the file
 * into a typed form model (plus the untouched full document, so foreign
 * top-level sections owned by other features survive a save), and
 * `serializeWorkspaceConfig` writes the edited `execution_routing` section
 * back into that document and dumps the whole thing. No component parses or
 * emits YAML on its own.
 *
 * Safety rule: if the `execution_routing` section exists but does not match
 * the shape this form understands, parsing reports `unsupported` and the UI
 * refuses to offer a form save — a form-driven rewrite of content it cannot
 * represent would silently destroy it. Saving also re-serializes the file
 * without comments (a YAML round-trip cannot preserve them); the shipped
 * template and the UI both say so.
 */

import { load, dump } from 'js-yaml';
import { SUPPORTED_HARNESSES } from '../../types';

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
  profiles: RoutingProfileForm[];
  /** '' means "no custom resolver". */
  resolverScript: string;
}

export type ParsedWorkspaceConfig =
  | { kind: 'parsed'; document: Record<string, unknown>; routing: RoutingForm }
  | { kind: 'unsupported'; message: string };

export const EMPTY_ROUTING: RoutingForm = { profiles: [], resolverScript: '' };

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
 * Parses config.yaml content into the full document plus the routing form
 * model. An empty/comment-only file and an absent or empty section both parse
 * to the empty form.
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

  const section = document.execution_routing;
  if (section === undefined || section === null) {
    return { kind: 'parsed', document, routing: EMPTY_ROUTING };
  }
  if (!isPlainObject(section)) {
    return unsupported('The execution_routing section is not a mapping.');
  }
  for (const key of Object.keys(section)) {
    if (key !== 'profiles' && key !== 'resolver') {
      return unsupported(`The execution_routing section has an unrecognized key "${key}".`);
    }
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

  return { kind: 'parsed', document, routing: { profiles, resolverScript } };
}

/**
 * Writes the edited routing form back into the parsed document (preserving
 * every foreign top-level section structurally) and dumps the whole file.
 */
export function serializeWorkspaceConfig(
  document: Record<string, unknown>,
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

  const section: Record<string, unknown> = { profiles };
  if (routing.resolverScript.trim() !== '') {
    section.resolver = { script: routing.resolverScript.trim() };
  }

  const next: Record<string, unknown> = { ...document, execution_routing: section };
  return dump(next, { lineWidth: 100, noRefs: true });
}

/**
 * Client-side validation mirroring the routing helper's contract, so a form
 * save cannot produce a config the deterministic helper would reject.
 */
export function validateRoutingForm(routing: RoutingForm): string[] {
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
