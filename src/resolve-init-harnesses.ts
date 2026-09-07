/**
 * Resolve harness selection for init (and future update) commands.
 *
 * Order: explicit --harnesses first, saved metadata second, otherwise error.
 */

import { Harness, SUPPORTED_HARNESSES } from './types';
import { parseHarnesses, validateHarnesses } from './utils';

export interface ResolveInitHarnessesInput {
  /**
   * Raw value from --harnesses when the flag was supplied.
   * Omitted (undefined) is distinct from an explicit empty string.
   */
  explicit?: string;
  /**
   * Harness list from existing .init-metadata.json, if any.
   */
  saved?: Harness[];
}

/**
 * Normalize a persisted harness list. Invalid or empty values are treated as absent.
 */
export function normalizeSavedHarnesses(saved: unknown): Harness[] | undefined {
  if (!Array.isArray(saved) || saved.length === 0) {
    return undefined;
  }

  const harnesses = saved.map(entry => String(entry).trim().toLowerCase()) as Harness[];
  const invalid = harnesses.filter(h => !SUPPORTED_HARNESSES.includes(h));
  if (invalid.length > 0 || harnesses.length === 0) {
    return undefined;
  }

  return Array.from(new Set(harnesses)) as Harness[];
}

/**
 * Resolve the harness list for init/update.
 *
 * @throws when explicit input is empty/invalid or when no explicit or saved selection exists
 */
export function resolveInitHarnesses(input: ResolveInitHarnessesInput): { harnesses: Harness[] } {
  if (input.explicit !== undefined) {
    const harnesses = parseHarnesses(input.explicit);
    validateHarnesses(harnesses);
    return { harnesses };
  }

  const saved = normalizeSavedHarnesses(input.saved);
  if (saved) {
    validateHarnesses(saved);
    return { harnesses: saved };
  }

  throw new Error(
    'Missing harness selection. Specify --harnesses <claude,codex,cursor,gemini,copilot,opencode>.'
  );
}
