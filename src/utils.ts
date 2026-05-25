/**
 * Helper Functions for the CLI
 *
 * Validation helpers for the `--harnesses` option.
 */

import { Harness } from './types';

const VALID_HARNESSES: readonly Harness[] = [
  'claude',
  'codex',
  'cursor',
  'gemini',
  'github',
  'opencode',
];

/**
 * Parse comma-separated harness values into an array
 * @param value - Comma-separated string of harness names
 * @returns Array of harness names
 * @throws Error if invalid harness names are provided
 */
export function parseHarnesses(value: string): Harness[] {
  if (!value.trim()) {
    throw new Error('Harnesses parameter cannot be empty');
  }

  const harnesses = value
    .split(',')
    .map(a => a.trim().toLowerCase())
    .filter(a => a.length > 0);

  const invalidHarnesses = harnesses.filter(
    (harness): harness is string => !VALID_HARNESSES.includes(harness as Harness)
  );

  if (invalidHarnesses.length > 0) {
    throw new Error(
      `Invalid harness(es): ${invalidHarnesses.join(', ')}. Valid options are: ${VALID_HARNESSES.join(', ')}`
    );
  }

  return Array.from(new Set(harnesses)) as Harness[];
}

/**
 * Validate that all harnesses are supported
 * @param harnesses - Array of harnesses to validate
 * @throws Error if any harness is invalid or array is empty
 */
export function validateHarnesses(harnesses: Harness[]): void {
  if (harnesses.length === 0) {
    throw new Error('At least one harness must be specified');
  }

  for (const harness of harnesses) {
    if (!VALID_HARNESSES.includes(harness)) {
      throw new Error(
        `Invalid harness: ${harness}. Supported harnesses: ${VALID_HARNESSES.join(', ')}`
      );
    }
  }
}
