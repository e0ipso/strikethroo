/**
 * Helper Functions for the CLI
 *
 * Validation helpers for the `--assistants` option.
 */

import { Assistant } from './types';

const VALID_ASSISTANTS: readonly Assistant[] = [
  'claude',
  'codex',
  'cursor',
  'gemini',
  'github',
  'opencode',
];

/**
 * Parse comma-separated assistant values into an array
 * @param value - Comma-separated string of assistant names
 * @returns Array of assistant names
 * @throws Error if invalid assistant names are provided
 */
export function parseAssistants(value: string): Assistant[] {
  if (!value.trim()) {
    throw new Error('Assistants parameter cannot be empty');
  }

  const assistants = value
    .split(',')
    .map(a => a.trim().toLowerCase())
    .filter(a => a.length > 0);

  const invalidAssistants = assistants.filter(
    (assistant): assistant is string => !VALID_ASSISTANTS.includes(assistant as Assistant)
  );

  if (invalidAssistants.length > 0) {
    throw new Error(
      `Invalid assistant(s): ${invalidAssistants.join(', ')}. Valid options are: ${VALID_ASSISTANTS.join(', ')}`
    );
  }

  return Array.from(new Set(assistants)) as Assistant[];
}

/**
 * Validate that all assistants are supported
 * @param assistants - Array of assistants to validate
 * @throws Error if any assistant is invalid or array is empty
 */
export function validateAssistants(assistants: Assistant[]): void {
  if (assistants.length === 0) {
    throw new Error('At least one assistant must be specified');
  }

  for (const assistant of assistants) {
    if (!VALID_ASSISTANTS.includes(assistant)) {
      throw new Error(
        `Invalid assistant: ${assistant}. Supported assistants: ${VALID_ASSISTANTS.join(', ')}`
      );
    }
  }
}
