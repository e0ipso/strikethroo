/**
 * The findings model for `strikethroo validate`.
 *
 * There is deliberately no severity field. Plan 110's clarification 3 settled
 * that every finding is an error, which collapses the exit rule to a single
 * predicate over list emptiness (`findings.length > 0`). Re-introducing a
 * severity axis is a scope change needing its own justification, not an
 * implementation detail.
 */

/** A single proven inconsistency in a workspace. */
export interface Finding {
  /**
   * Stable short identifier of the check that produced this finding, e.g.
   * `metadata/files-map-absent`. Tests and downstream tooling assert on it, so
   * it is a contract: rename only with the consumers.
   */
  check: string;
  /** Human-readable description naming the specific defect. */
  message: string;
  /**
   * Workspace-relative path the finding is about, using the separator recorded
   * by its source. Omitted when the finding is not about a single file.
   */
  path?: string;
}

/** The complete result of validating one workspace. */
export interface ValidationResult {
  findings: Finding[];
}
