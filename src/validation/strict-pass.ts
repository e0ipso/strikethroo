/**
 * Strict frontmatter pass over `plans/<plan>/plan-<name>.md` and
 * `plans/<plan>/tasks/<name>.md`.
 *
 * Deliberately independent of `src/serve/markdown.ts`: the viewer's parser is
 * lenient by design and cannot distinguish a missing field from a malformed one,
 * which is precisely the distinction a validator must report. The two coexist
 * with different tolerance contracts.
 *
 * Stub: the orchestrator already calls this, so the implementation lands here
 * without touching `workspace.ts`.
 */

import { Finding } from './types';

/**
 * Runs the strict frontmatter pass against an already-resolved absolute
 * workspace root. Pure: reads only, never writes, never exits.
 */
export function strictPass(root: string): Finding[] {
  // Stub — no checks implemented yet. The parameter is part of the settled
  // signature and is referenced here only to keep the unused-argument rule
  // satisfied until the checks land.
  void root;
  return [];
}
