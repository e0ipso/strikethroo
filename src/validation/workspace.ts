/**
 * The pure validation core behind `strikethroo validate`.
 *
 * `validateWorkspace` takes an already-resolved absolute workspace root (the
 * `.ai/strikethroo` directory itself) and returns a findings list. It performs
 * no root discovery, writes nothing, prints nothing, and never terminates the
 * process — the CLI shell owns resolution, reporting, and the exit code. That
 * purity is what makes the same function reusable from CI and testable without
 * spawning a process.
 *
 * The root resolver in `src/skill-scripts/shared/root.ts` must never be used
 * here: it terminates the process on a schema-version mismatch, which would
 * kill the validator on precisely the workspace it is most useful against.
 * Schema skew is reported as a finding instead. The CLI shell resolves the root
 * with `resolveWorkspaceRoot` from `src/serve/root.ts`, the same resolver
 * `serve` uses.
 *
 * The orchestrator calls every check group and concatenates the results, so a
 * check group is implemented by editing its own file — never this one.
 */

import { metadataGate } from './metadata-gate';
import { strictPass } from './strict-pass';
import { graphChecks } from './graph-checks';
import { Finding, ValidationResult } from './types';

/**
 * Total order over findings: `check`, then `path` (absent sorts first), then
 * `message`.
 *
 * Directory enumeration order is filesystem-dependent and CI runs on Windows,
 * so unsorted output would make both test assertions and reports unstable.
 */
const compareFindings = (a: Finding, b: Finding): number =>
  a.check.localeCompare(b.check) ||
  (a.path ?? '').localeCompare(b.path ?? '') ||
  a.message.localeCompare(b.message);

/**
 * Validates a workspace and returns every proven inconsistency.
 *
 * @param root - Absolute path to the `.ai/strikethroo` directory, already resolved.
 * @returns All findings, in a deterministic order. Every finding is an error;
 *          there is no severity axis, so the caller's exit rule is
 *          `findings.length > 0`.
 */
export function validateWorkspace(root: string): ValidationResult {
  const findings: Finding[] = [...metadataGate(root), ...strictPass(root), ...graphChecks(root)];

  return { findings: findings.sort(compareFindings) };
}
