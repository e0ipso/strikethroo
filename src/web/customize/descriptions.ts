import descriptions from './descriptions.yaml';

/**
 * Build-time registry of config-file descriptions, keyed by config `id` (the
 * file basename without `.md`, matching the serve workspace model). Authored in
 * descriptions.yaml and imported via the Vite YAML plugin — no runtime
 * dependency is added.
 */
const registry = descriptions as Record<string, string>;

/**
 * Look up the human-authored description for a config file `id` (basename
 * without `.md`). Returns `undefined` for ids that have no entry; never throws.
 */
export function descriptionFor(id: string): string | undefined {
  return registry[id];
}
