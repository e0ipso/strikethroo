#!/usr/bin/env node
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { SUPPORTED_HARNESSES, type Harness } from '../types';
import { execGit, execGitDiffAllowingChanges } from './shared/git-utils';
import { findStrikethrooRoot } from './shared/root';
import { resolvePlan } from './shared/plan-resolve';
import { discoverHarnesses } from './shared/harness-discovery';
import { dispatchReview, executableOnPath } from './shared/external-dispatch';
import {
  MAX_REVIEW_ROUNDS,
  parseReviewFindings,
  parseReviewMandate,
  partitionFindings,
  validateAgainstSchema,
  type Confidence,
  type ReviewMandate,
  type Severity,
} from './shared/review-findings';

/**
 * One round of the unattended code review gate: resolve the mandate, scope the
 * cumulative diff, pick a reviewer harness, dispatch it, and report one JSON
 * line. Detection only — this file never fixes anything and never commits.
 *
 * Everything the gate needs is optional workspace shape. The hook, the vendored
 * schema and the recorded base commit are all absent on a workspace initialized
 * before this feature, because the workspace schema version deliberately did not
 * change. Every absence routes to one documented skip: exit 0, one JSON line on
 * stdout, nothing on stderr. The gate is never the reason a successful plan
 * fails.
 */

const HOOK_RELATIVE_PATH = path.join('config', 'hooks', 'CODE_REVIEW.md');
const XSD_RELATIVE_PATH = path.join('config', 'schemas', 'self-review-v2.xsd');
const REVIEW_DIR_NAME = 'review';
const BASE_COMMIT_FILE_NAME = 'base-commit.json';
const REVIEW_FILE_NAME = 'review.xml';
/** The recorded-versus-actionable partition, written beside each round's review.xml. */
const FINDINGS_FILE_NAME = 'findings.json';
/** The reviewer's captured transcript, written only when a round does not certify. */
const TRANSCRIPT_FILE_NAME = 'reviewer-output.txt';
const SHA_RE = /^[0-9a-f]{40}$/i;

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const readFileOrNull = (filePath: string): string | null => {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return null;
  }
};

/**
 * The reviewer's captured transcript, for a round that did not certify.
 *
 * Best-effort on purpose, and deliberately asymmetric with `record`: the
 * findings partition throws when it cannot be written, because success criterion
 * 8 requires below-floor findings to be inspectable. This is a diagnostic. A
 * transcript that cannot be written is a lost diagnostic, never a changed
 * verdict — turning a decided round into an infrastructure failure would trade
 * the outcome the gate just computed for the artifact that explains it.
 */
const writeTranscript = (roundDir: string, transcript: string | undefined): void => {
  if (transcript === undefined || transcript === '') return;
  try {
    fs.mkdirSync(roundDir, { recursive: true });
    fs.writeFileSync(path.join(roundDir, TRANSCRIPT_FILE_NAME), transcript, 'utf8');
  } catch {
    // Diagnostics are never load-bearing for a verdict.
  }
};

/** Every condition that disables the gate cleanly. Exit 0, empty stderr. */
export type ReviewSkipReason =
  | 'hook-absent'
  | 'hook-empty'
  | 'xsd-absent'
  | 'validator-absent'
  | 'base-commit-absent'
  | 'no-reviewer-candidate'
  | 'empty-diff';

/**
 * A finding from an earlier round, already ruled on. Carried forward so the
 * reviewer does not re-litigate it; carrying it never narrows the diff it sees.
 * A round after the first reads these back from the partitions earlier rounds
 * wrote, unless the caller supplies its own.
 */
export interface AdjudicatedFinding {
  file: string;
  location?: string;
  severity?: string;
  confidence?: string;
  summary: string;
  disposition: 'applied' | 'recorded-below-floor' | 'rejected';
}

/** What a findings gate is handed after a reviewer returns. */
export interface FindingsEvaluationContext {
  reviewFile: string;
  xsdFile: string;
  planDir: string;
  round: number;
  /** Captured reviewer stdout — the only channel the findings document arrives on. */
  reviewerStdout: string;
  /** This dispatch's collision token; without it no delivered region can match. */
  deliveryToken: string;
}

/**
 * The verdict on one round's emitted findings.
 *
 * Every failure mode is a distinct member, and none of them is a permissive
 * default. A document that does not validate, a document that was never
 * written, and a validator that could not be run are three different problems
 * with three different fixes, and **not one of them is "no findings above the
 * floor"**. Reporting any of them as a clean round would turn a broken reviewer
 * into a silent green gate, which is precisely the misread this gate exists to
 * prevent.
 *
 * `not-evaluated` survives from the task-6 seam for a caller that injects its
 * own gate; the mechanism itself always evaluates.
 */
export type FindingsGateOutcome =
  | { kind: 'not-evaluated'; detail: string }
  | { kind: 'findings-absent'; detail: string }
  | { kind: 'validator-unavailable'; detail: string }
  | { kind: 'schema-invalid'; detail: string }
  | {
      kind: 'evaluated';
      /** Findings clearing both floors, whether or not they carry a suggestion. */
      aboveFloor: number;
      /** Findings failing at least one floor. An absent attribute is always here. */
      belowFloor: number;
      /** Clears both floors **and** carries a `<suggestion>`. The only auto-fix set. */
      actionable: number;
      /** Everything else, written to `findingsFile` rather than discarded. */
      recorded: number;
      total: number;
      /** Real findings above both floors that carry no local fix. Never applied. */
      aboveFloorWithoutSuggestion: number;
      severityFloor: Severity;
      confidenceFloor: Confidence;
      /** Where the recorded-versus-actionable partition was written. */
      findingsFile: string;
    };

/** Supply this to evaluate a round's emitted findings. */
export type FindingsGate = (context: FindingsEvaluationContext) => Promise<FindingsGateOutcome>;

/**
 * The findings gate: validate, partition, record. Built per round from the
 * mandate the hook states, so the floors a user edits are the floors applied.
 *
 * The partition is written to `<plan-dir>/review/round-<n>/findings.json` before
 * this returns, on every outcome including the failures. Below-floor findings
 * are recorded, never discarded, and a failed round leaves behind the reason it
 * failed rather than an empty directory.
 */
export const createFindingsGate =
  (mandate: ReviewMandate): FindingsGate =>
  async (context: FindingsEvaluationContext): Promise<FindingsGateOutcome> => {
    const roundDir = path.dirname(context.reviewFile);
    const findingsFile = path.join(roundDir, FINDINGS_FILE_NAME);
    const record = (payload: Record<string, unknown>): void => {
      try {
        fs.mkdirSync(roundDir, { recursive: true });
        fs.writeFileSync(findingsFile, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
      } catch (error) {
        // Recording is not optional: success criterion 8 requires below-floor
        // findings to be inspectable. A workspace that cannot be written to is
        // an infrastructure failure, which the entrypoint reports as exit 2.
        throw new Error(
          `The review round's findings partition could not be written to ${findingsFile}: ${errorMessage(error)}`
        );
      }
    };
    const base = {
      round: context.round,
      reviewFile: context.reviewFile,
      xsdFile: context.xsdFile,
      severityFloor: mandate.severityFloor,
      confidenceFloor: mandate.confidenceFloor,
    };

    // One channel, and the mechanism owns the write. The reviewer prints; this
    // process — never sandboxed, because it is the orchestrator's own — writes what
    // it printed to the canonical path so it meets the XSD at the one
    // `validateAgainstSchema` call below. There is no second parser and no
    // short-circuit into `parseReviewFindings`, whose linear tag scan is only safe
    // behind validation. `runReviewRound` removed this exact path before dispatch,
    // so nothing here can certify a document from an earlier invocation.
    const delivered = _extractReviewDocument(context.reviewerStdout, context.deliveryToken);
    if (delivered === null) {
      const detail =
        "The reviewer printed no complete findings document between this dispatch's " +
        'delimiters. A round with no findings document cannot be read as a round with no ' +
        'findings.';
      record({ ...base, status: 'findings-absent', detail, actionable: [], recorded: [] });
      return { kind: 'findings-absent', detail };
    }
    try {
      fs.mkdirSync(roundDir, { recursive: true });
      fs.writeFileSync(
        context.reviewFile,
        delivered.endsWith('\n') ? delivered : `${delivered}\n`,
        'utf8'
      );
    } catch (error) {
      // Same convention as `record`'s failure: a workspace that cannot be
      // written to is an infrastructure failure, reported as exit 2.
      throw new Error(
        `The delivered findings document could not be written to ${context.reviewFile}: ` +
          errorMessage(error)
      );
    }

    const validation = await validateAgainstSchema(context.xsdFile, context.reviewFile);
    if (validation.kind === 'validator-unavailable') {
      record({
        ...base,
        status: 'validator-unavailable',
        detail: validation.detail,
        actionable: [],
        recorded: [],
      });
      return { kind: 'validator-unavailable', detail: validation.detail };
    }
    if (validation.kind === 'invalid') {
      const detail =
        `${context.reviewFile} does not validate against ${context.xsdFile}, so its findings ` +
        `were not thresholded and none of them was applied. xmllint reported: ${validation.detail}`;
      record({ ...base, status: 'schema-invalid', detail, actionable: [], recorded: [] });
      return { kind: 'schema-invalid', detail };
    }

    const xml = readFileOrNull(context.reviewFile);
    if (xml === null) {
      const detail = `${context.reviewFile} validated but could not then be read.`;
      record({ ...base, status: 'findings-absent', detail, actionable: [], recorded: [] });
      return { kind: 'findings-absent', detail };
    }

    // Safe only because validation has already run: the scan below relies on the
    // document's shape being constrained by the XSD.
    const partition = partitionFindings(
      parseReviewFindings(xml),
      mandate.severityFloor,
      mandate.confidenceFloor
    );
    record({
      ...base,
      status: 'evaluated',
      counts: partition.counts,
      actionable: partition.actionable,
      recorded: partition.recorded,
    });
    return {
      kind: 'evaluated',
      aboveFloor: partition.counts.aboveFloor,
      belowFloor: partition.counts.belowFloor,
      actionable: partition.counts.actionable,
      recorded: partition.counts.recorded,
      total: partition.counts.total,
      aboveFloorWithoutSuggestion: partition.counts.aboveFloorWithoutSuggestion,
      severityFloor: mandate.severityFloor,
      confidenceFloor: mandate.confidenceFloor,
      findingsFile,
    };
  };

/**
 * Whether another round may run. Computed in compiled code from the clamped
 * budget, and reported so the orchestrating skill cannot advance past it.
 */
export type RoundDecision =
  | { kind: 'gate-passed'; detail: string }
  | { kind: 'fix-and-continue'; nextRound: number; actionable: number; detail: string }
  | { kind: 'budget-exhausted'; actionable: number; detail: string }
  | { kind: 'round-failed'; detail: string };

export type ReviewRoundResult =
  | { kind: 'skipped'; reason: ReviewSkipReason; detail: string }
  | {
      kind: 'reviewed';
      harness: Harness;
      round: number;
      baseCommit: string;
      reviewFile: string;
      reviewFilePresent: boolean;
      findingsGate: FindingsGateOutcome;
      /** Present when the round ran through `runBoundedReviewRound`. */
      decision?: RoundDecision;
      roundBudget?: number;
      roundCeiling?: number;
      mandateNotes?: string[];
    }
  | {
      /** The requested round is past the enforced budget, so no reviewer was dispatched. */
      kind: 'budget-exhausted';
      round: number;
      roundBudget: number;
      roundCeiling: number;
      mandateNotes: string[];
      detail: string;
    }
  | {
      kind: 'launched-failure';
      harness: Harness;
      round: number;
      reviewFile: string;
      exitCode: number;
      detail: string;
    }
  | { kind: 'fallback'; harness: Harness; round: number; reason: string; detail: string }
  | { kind: 'infrastructure-failure'; detail: string };

export interface ReviewRoundRequest {
  /** Plan id or absolute plan-file path, as accepted by `resolvePlan`. */
  plan: string;
  currentHarness: Harness;
  /**
   * 1-based round number. Counting and bounding rounds is task 7's; this
   * runner records the number it is given and never decides whether to run.
   */
  round: number;
  startPath?: string;
  /** SEAM FOR TASK 7 — prior rounds' rulings, rendered into the prompt. */
  adjudicatedFindings?: readonly AdjudicatedFinding[];
}

export interface ReviewRoundDependencies {
  discover: typeof discoverHarnesses;
  dispatch: typeof dispatchReview;
  readDiff: (workspace: string, baseCommit: string) => string | null;
  /** SEAM FOR TASK 7 — absent means the round reports `not-evaluated`. */
  evaluateFindings?: FindingsGate;
  /**
   * Whether the findings validator is usable. Injectable so a test can exercise
   * the soft-dependency skip without mutating the process `PATH`, which leaks
   * into anything else sharing the process.
   */
  validatorAvailable: () => boolean;
}

/**
 * The base commit recorded before phase execution, or null when it is missing,
 * unreadable, unparsable, or not a 40-hex sha. Every one of those means the same
 * thing to this gate: no anchored scope, so no review.
 */
export const _readBaseCommit = (filePath: string): string | null => {
  const raw = readFileOrNull(filePath);
  if (raw === null) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      const candidate = (parsed as { baseCommit?: unknown }).baseCommit;
      if (typeof candidate === 'string' && SHA_RE.test(candidate)) return candidate;
    }
  } catch {
    return null;
  }
  return null;
};

/**
 * The plan's cumulative diff: the recorded base commit against the current
 * working tree. Two-dot and HEAD-free on purpose — `POST_EXECUTION`'s cleanup
 * and any fix an earlier round applied are uncommitted when the gate runs, and
 * `<base>...HEAD` would see none of them.
 *
 * Untracked files are in scope, and the gate does not write to the index to get
 * them there. Plain `git diff` sees only what git already tracks, which made the
 * reviewed scope depend on something having committed — in practice the
 * `POST_PHASE.md` hook, which is user-editable, which this gate does not own,
 * and whose absence would have shrunk the diff silently rather than failing.
 * A repository whose pre-commit hook runs the test suite cannot commit between
 * phases at all, because the tree is intentionally partial there; every file the
 * plan created would have been invisible to the reviewer. So the scope is the
 * working tree against the base commit, in the plain sense: tracked changes from
 * `git diff`, plus a synthesized add-diff per untracked path via `git diff
 * --no-index` against `/dev/null`. Both are reads.
 *
 * `--exclude-standard` applies the project's ignore rules, so ignored paths stay
 * out — including this gate's own `review/` output, which the workspace
 * `.gitignore` covers. What remains is untracked *and* unignored: files the
 * project intends to track and has not yet. Those are precisely the plan's new
 * work. There is deliberately no size cap on them; a cap would reintroduce the
 * silent scope collapse this scoping exists to remove, and a project with
 * genuinely unreviewable bulk has two declarative ways to say so — `.gitignore`
 * and the generated/vendored markers below. Binary files cost nothing either
 * way: git emits a one-line "Binary files differ" instead of their contents.
 *
 * Build output and vendored files are removed from the scope. A finding against
 * generated code is unfixable by construction: the suggestion is applied as a
 * text replacement, the mandatory full `POST_EXECUTION` re-run rebuilds the
 * file, the fix disappears, and the next round raises the identical finding
 * because its source was never touched — a fix/erase/re-find loop that spends
 * the whole round budget and halts. Vendored files carry the same problem for a
 * different reason: they must stay byte-identical to upstream.
 *
 * The exclusion is driven by `.gitattributes` rather than a hard-coded list,
 * because this gate runs inside the user's project and knows nothing about
 * which paths that project generates. Any repository already marking build
 * output `linguist-generated` — the same marker GitHub uses to collapse those
 * files in pull requests — gets the right scope with no extra configuration.
 */
const GENERATED_ATTRIBUTES = ['linguist-generated', 'linguist-vendored'] as const;

/** The subset of `files` that `.gitattributes` marks generated or vendored. */
const attributeExcluded = (workspace: string, files: readonly string[]): Set<string> => {
  const excluded = new Set<string>();
  if (files.length === 0) return excluded;
  const report = execGit(
    `git -C ${JSON.stringify(workspace)} check-attr ${GENERATED_ATTRIBUTES.join(' ')} -- ` +
      files.map(file => JSON.stringify(file)).join(' ')
  );
  if (report === null) return excluded;
  // Each line is `<path>: <attribute>: <value>`; a path may appear once per
  // attribute. Split from the right so a path containing ": " stays intact.
  for (const line of report.split('\n')) {
    const marker = line.lastIndexOf(': ');
    if (marker === -1 || line.slice(marker + 2).trim() !== 'true') continue;
    const withoutValue = line.slice(0, marker);
    const attribute = withoutValue.lastIndexOf(': ');
    if (attribute === -1) continue;
    excluded.add(withoutValue.slice(0, attribute));
  }
  return excluded;
};

/** Paths in the tracked diff that `.gitattributes` marks as generated or vendored. */
const excludedPaths = (workspace: string, baseCommit: string): string[] => {
  const changed = execGit(`git -C ${JSON.stringify(workspace)} diff --name-only ${baseCommit} --`);
  if (changed === null || changed.trim() === '') return [];
  const files = changed.split('\n').filter(line => line.trim() !== '');
  return [...attributeExcluded(workspace, files)];
};

/**
 * Untracked, unignored paths, minus the generated and vendored ones.
 *
 * `core.quotePath=false` matters: git otherwise escapes non-ASCII paths, and a
 * quoted name would not resolve when handed back to `git diff --no-index` — the
 * file would drop out of the review with nothing said. Fail-open is fine for the
 * exclusion lookup, where a miss only means more gets reviewed; here a miss
 * means less does.
 */
const untrackedPaths = (workspace: string): string[] => {
  const listed = execGit(
    `git -c core.quotePath=false -C ${JSON.stringify(workspace)} ls-files --others --exclude-standard`
  );
  if (listed === null || listed.trim() === '') return [];
  const files = listed.split('\n').filter(line => line.trim() !== '');
  const excluded = attributeExcluded(workspace, files);
  return files.filter(file => !excluded.has(file));
};

/**
 * A synthesized add-diff for one untracked file: the file against `/dev/null`.
 * The prefixes are forced back to `a/` and `b/` because `--no-index` otherwise
 * numbers them (`1/`, `2/`), which would hand the reviewer a diff that no longer
 * looks like the rest of the scope.
 */
const untrackedDiff = (workspace: string, file: string): string | null =>
  execGitDiffAllowingChanges(
    `git -C ${JSON.stringify(workspace)} diff --no-index --src-prefix=a/ --dst-prefix=b/ ` +
      `-- /dev/null ${JSON.stringify(file)}`
  );

export const _readCumulativeDiff = (workspace: string, baseCommit: string): string | null => {
  const exclusions = excludedPaths(workspace, baseCommit)
    .map(file => ` ${JSON.stringify(`:(exclude,literal)${file}`)}`)
    .join('');
  const tracked = execGit(
    `git -C ${JSON.stringify(workspace)} diff ${baseCommit} -- .${exclusions}`
  );
  // Only the tracked read proves the repository is readable at all; a failure
  // there is the infrastructure failure the caller reports. An untracked path
  // that fails to diff is dropped rather than escalated, so one unreadable file
  // cannot sink a round.
  if (tracked === null) return null;
  const added = untrackedPaths(workspace)
    .map(file => untrackedDiff(workspace, file))
    .filter((diff): diff is string => diff !== null && diff.trim() !== '');
  return [tracked, ...added].filter(part => part.trim() !== '').join('\n');
};

const defaultDependencies: ReviewRoundDependencies = {
  discover: discoverHarnesses,
  dispatch: dispatchReview,
  readDiff: _readCumulativeDiff,
  validatorAvailable: () => executableOnPath('xmllint'),
};

/**
 * The assembled reviewer prompt that ships beside this bundle, inlined so the
 * reviewer carries the mandate even on a harness where `st-code-review` is not
 * installed. Falls back to naming the skill when the file cannot be read.
 */
const readReviewerSkill = (): string => {
  const skillFile = path.resolve(__dirname, '..', 'SKILL.md');
  const content = readFileOrNull(skillFile);
  return content === null
    ? 'Load the `st-code-review` skill and follow its Operating Procedure. If that ' +
        'skill is not installed on this harness, follow the mandate below exactly.'
    : content;
};

const renderAdjudicated = (findings: readonly AdjudicatedFinding[]): string => {
  if (findings.length === 0) {
    return 'None. This is the first round, or no earlier finding has been ruled on.';
  }
  return findings
    .map(finding => {
      const attributes = [
        finding.severity === undefined ? null : `severity=${finding.severity}`,
        finding.confidence === undefined ? null : `confidence=${finding.confidence}`,
      ]
        .filter(part => part !== null)
        .join(' ');
      const where =
        finding.location === undefined ? finding.file : `${finding.file}:${finding.location}`;
      return `- [${finding.disposition}] ${where}${attributes ? ` (${attributes})` : ''} — ${finding.summary}`;
    })
    .join('\n');
};

/**
 * A per-dispatch collision token spliced into the delivery delimiters. It exists
 * so marker-shaped text already present in the diff or in the prompt cannot be
 * mistaken for this dispatch's output. It is not authentication — the reviewer
 * is shown the token.
 */
export const _makeDeliveryToken = (): string => crypto.randomBytes(6).toString('hex');

/**
 * The delivery delimiters, in the same style as the cumulative-diff markers
 * below. Both ends of the channel call these; the literal is never hand-written
 * in two places, because a drift between the prompt and the extractor would
 * silently disable delivery rather than fail.
 */
const beginMarker = (token: string): string => `<<<BEGIN REVIEW XML ${token}>>>`;
const endMarker = (token: string): string => `<<<END REVIEW XML ${token}>>>`;

/**
 * CSI sequences a harness may interleave with its output. The leading ESC is
 * part of the pattern on purpose: without it this would also strip ordinary
 * bracketed text such as the `[C` of `<![CDATA[`, corrupting the very document
 * it is meant to deliver.
 */
// eslint-disable-next-line no-control-regex
const ANSI_PATTERN = /\u001b\[[0-9;?]*[ -/]*[@-~]/g;

/**
 * Read the delivered findings document out of captured reviewer stdout. This is
 * the only channel the document arrives on, so this runs on every round.
 *
 * Takes the LAST complete token-bearing region, because a harness may print the
 * block more than once and the final emission is the reviewer's actual answer.
 * A region that does not look like an XML document is skipped rather than
 * returned: the prompt itself contains these marker literals, so a reviewer
 * echoing its own instructions would otherwise become a false positive. When
 * nothing qualifies this returns `null` and the caller keeps its existing
 * `findings-absent` outcome — a malformed capture must not invent a new failure
 * mode.
 */
export const _extractReviewDocument = (stdout: string, token: string): string | null => {
  const clean = stdout.replace(ANSI_PATTERN, '');
  const begin = beginMarker(token);
  const end = endMarker(token);
  // Walk backwards so the last qualifying pair wins while earlier pairs stay
  // reachable when the last one is an echoed instruction. `searchFrom` reaching
  // -1 is the terminating case rather than a wraparound: `lastIndexOf(x, -1)`
  // searches from index 0 and would re-find the region just rejected.
  let searchFrom = clean.length;
  while (searchFrom >= 0) {
    const endIndex = clean.lastIndexOf(end, searchFrom);
    if (endIndex === -1) return null;
    const beginIndex = clean.lastIndexOf(begin, endIndex);
    if (beginIndex === -1) return null;
    const inner = clean.slice(beginIndex + begin.length, endIndex).trim();
    if (inner.startsWith('<?xml') || inner.startsWith('<review')) return inner;
    searchFrom = beginIndex - 1;
  }
  return null;
};

export interface ReviewerPromptInput {
  planId: number;
  planFile: string;
  strikethrooRoot: string;
  workspace: string;
  hookFile: string;
  hookContent: string;
  xsdFile: string;
  baseCommit: string;
  round: number;
  diff: string;
  adjudicatedFindings: readonly AdjudicatedFinding[];
  skillInstructions: string;
  /** This dispatch's collision token, spliced into the delivery delimiters. */
  deliveryToken: string;
}

/**
 * The whole reviewer dispatch: mandate, plan pointer, schema pointer, scope, and
 * the diff itself. It travels on stdin through `dispatchReview`, so a large diff
 * is neither process-visible argv nor bounded by ARG_MAX. The diff is delimited
 * by explicit markers rather than a code fence, because a diff of markdown files
 * contains fences of its own.
 */
export const buildReviewerPrompt = (input: ReviewerPromptInput): string =>
  [
    `Strikethroo code review gate — Plan ${input.planId}, review round ${input.round}.`,
    '',
    'You are the independent reviewer, running on a different harness than the one',
    'that wrote this code. You detect; you never fix. Do not edit, create, or delete',
    'source files. Do not run formatters. Do not commit. Your entire output is one',
    'findings document, printed as described below, plus a short report of the counts.',
    '',
    `Repository / workspace root: ${input.workspace}`,
    `Strikethroo workspace root: ${input.strikethrooRoot}`,
    `Plan document (read it in full): ${input.planFile}`,
    `Review mandate hook: ${input.hookFile}`,
    `Findings schema to validate against: ${input.xsdFile}`,
    `Base commit anchoring this plan's scope: ${input.baseCommit}`,
    `Round: ${input.round}`,
    '',
    '## How to deliver your findings',
    '',
    'Print the complete findings document as the final thing you print, between these',
    'exact lines:',
    '',
    beginMarker(input.deliveryToken),
    // The placeholder deliberately does not begin with `<?xml` or `<review`.
    // `_extractReviewDocument` rejects a region on exactly that test, which is what
    // stops a reviewer that echoes these instructions back from being read as a
    // delivered document. A placeholder shaped like a real document would defeat
    // it — keep this line prose, here and in any mirror of it.
    '... the complete findings document, beginning with its XML declaration ...',
    endMarker(input.deliveryToken),
    '',
    'Copy those two lines from this dispatch; never invent a token. Print nothing after',
    'the closing line. Do not write the document to a file — this channel is the only',
    'one that is read. The document is validated against the schema named above, so an',
    'incomplete or invented document fails the round. Being unable to read the',
    'repository is not a reason to emit this block: a review you could not perform is a',
    'failed round, and emitting well-formed XML instead of reporting that failure is a',
    'worse outcome than the failure.',
    '',
    '## Review mandate (authoritative — it overrides the reviewer instructions below)',
    '',
    input.hookContent.trim(),
    '',
    '## Reviewer instructions',
    '',
    input.skillInstructions.trim(),
    '',
    '## Prior adjudicated findings — do not re-litigate these',
    '',
    renderAdjudicated(input.adjudicatedFindings),
    '',
    '## Cumulative diff',
    '',
    `Produced with \`git diff ${input.baseCommit} --\` in ${input.workspace}: the recorded`,
    'base commit against the current working tree. Committed phase work and',
    'uncommitted changes are both in scope. Review this diff, not an incremental one.',
    input.diff.trim().length === 0
      ? '\nThe cumulative diff is empty. Emit a <review> with no <file> children and report\nzero findings. That is not an error.'
      : `\n<<<BEGIN CUMULATIVE DIFF>>>\n${input.diff}\n<<<END CUMULATIVE DIFF>>>`,
    '',
  ].join('\n');

const asAdjudicated = (
  value: unknown,
  disposition: AdjudicatedFinding['disposition']
): AdjudicatedFinding[] => {
  if (!Array.isArray(value)) return [];
  const adjudicated: AdjudicatedFinding[] = [];
  for (const entry of value as unknown[]) {
    if (entry === null || typeof entry !== 'object') continue;
    const finding = entry as Record<string, unknown>;
    if (typeof finding['file'] !== 'string') continue;
    adjudicated.push({
      file: finding['file'],
      ...(typeof finding['location'] === 'string' ? { location: finding['location'] } : {}),
      ...(typeof finding['severity'] === 'string' ? { severity: finding['severity'] } : {}),
      ...(typeof finding['confidence'] === 'string' ? { confidence: finding['confidence'] } : {}),
      summary: typeof finding['summary'] === 'string' ? finding['summary'] : '',
      disposition,
    });
  }
  return adjudicated;
};

/**
 * Every earlier round's rulings, read back from the partitions this gate wrote.
 *
 * Carrying them forward stops the reviewer re-litigating a finding that was
 * already ruled on, and it never narrows what the reviewer sees: the diff is the
 * cumulative one every round. Actionable findings are reported as `applied`
 * because the loop's contract is that they are dispatched to the implementer
 * route before the next round runs; a malformed or missing partition simply
 * carries nothing rather than failing the round.
 *
 * A finding reported in several rounds is carried once, with the most recent
 * round's ruling, so the list a later round receives does not grow by repetition.
 */
export const _readPriorAdjudicated = (planDir: string, round: number): AdjudicatedFinding[] => {
  const carried = new Map<string, AdjudicatedFinding>();
  for (let prior = 1; prior < round; prior += 1) {
    const raw = readFileOrNull(
      path.join(planDir, REVIEW_DIR_NAME, `round-${prior}`, FINDINGS_FILE_NAME)
    );
    if (raw === null) continue;
    try {
      const parsed: unknown = JSON.parse(raw);
      if (parsed === null || typeof parsed !== 'object') continue;
      const partition = parsed as Record<string, unknown>;
      const roundFindings = [
        ...asAdjudicated(partition['actionable'], 'applied'),
        ...asAdjudicated(partition['recorded'], 'recorded-below-floor'),
      ];
      for (const finding of roundFindings) {
        carried.set(`${finding.file}|${finding.location ?? ''}|${finding.summary}`, finding);
      }
    } catch {
      continue;
    }
  }
  return [...carried.values()];
};

const skip = (reason: ReviewSkipReason, detail: string): ReviewRoundResult => ({
  kind: 'skipped',
  reason,
  detail,
});

interface ReviewContext {
  strikethrooRoot: string;
  workspace: string;
  hookFile: string;
  hookContent: string;
  xsdFile: string;
  mandate: ReviewMandate;
}

/**
 * The workspace shape the gate needs, or the result that ends the run.
 *
 * Shared by the single round and by the bounding layer above it, so there is one
 * implementation of the skip semantics: the round budget cannot be enforced
 * without the hook, and reading the hook twice is cheaper than two copies of the
 * fail-safe branches.
 */
const resolveReviewContext = (
  startPath: string,
  validatorAvailable: () => boolean = () => executableOnPath('xmllint')
): { kind: 'resolved'; context: ReviewContext } | { kind: 'ended'; result: ReviewRoundResult } => {
  // findStrikethrooRoot owns the workspace schema check; never bypass it.
  const strikethrooRoot = findStrikethrooRoot(startPath);
  if (!strikethrooRoot) {
    return {
      kind: 'ended',
      result: {
        kind: 'infrastructure-failure',
        detail: `No Strikethroo workspace was found from ${startPath}.`,
      },
    };
  }

  const hookFile = path.join(strikethrooRoot, HOOK_RELATIVE_PATH);
  const hookContent = readFileOrNull(hookFile);
  if (hookContent === null) {
    return {
      kind: 'ended',
      result: skip(
        'hook-absent',
        `No code review mandate at ${hookFile}, so the review gate was skipped. Re-run ` +
          '`npx strikethroo init` to add it.'
      ),
    };
  }
  if (hookContent.trim().length === 0) {
    return {
      kind: 'ended',
      result: skip(
        'hook-empty',
        `The code review mandate at ${hookFile} is empty, which is the documented way to ` +
          'disable the gate, so the review gate was skipped.'
      ),
    };
  }

  const xsdFile = path.join(strikethrooRoot, XSD_RELATIVE_PATH);
  if (!fs.existsSync(xsdFile)) {
    return {
      kind: 'ended',
      result: skip(
        'xsd-absent',
        `No findings schema at ${xsdFile}, so findings could not be validated and the review ` +
          'gate was skipped. Re-run `npx strikethroo init` to add it.'
      ),
    };
  }

  // `xmllint` is a soft dependency. Findings are validated by shelling out to
  // it, so without it no round can be certified — but a missing system package
  // must never turn an otherwise successful plan into a failure. Absence joins
  // the clean-skip set rather than halting, and is checked here, before a
  // reviewer is dispatched, so no external harness is spent on a round that
  // could not have been certified anyway.
  //
  // A skip is not a pass. It records that the gate did not run, and the
  // distinct reason says why, so this cannot be misread as a clean review.
  if (!validatorAvailable()) {
    return {
      kind: 'ended',
      result: skip(
        'validator-absent',
        'No `xmllint` on PATH, so emitted findings could not be validated against the vendored ' +
          'schema and the review gate was skipped. Install libxml2-utils (Debian/Ubuntu), ' +
          'libxml2 (Homebrew), or your platform equivalent to enable the gate.'
      ),
    };
  }

  return {
    kind: 'resolved',
    context: {
      strikethrooRoot,
      workspace: path.dirname(path.dirname(strikethrooRoot)),
      hookFile,
      hookContent,
      xsdFile,
      mandate: parseReviewMandate(hookContent),
    },
  };
};

/**
 * Resolve → guard → discover → scope → dispatch → evaluate → report. Rounds are
 * driven from outside: this runs the round it is handed, exactly once, and never
 * decides whether another may run. `runBoundedReviewRound` owns that.
 */
export const runReviewRound = async (
  request: ReviewRoundRequest,
  overrides: Partial<ReviewRoundDependencies> = {}
): Promise<ReviewRoundResult> => {
  const dependencies = { ...defaultDependencies, ...overrides };
  const startPath = request.startPath ?? process.cwd();

  const resolution = resolveReviewContext(startPath, dependencies.validatorAvailable);
  if (resolution.kind === 'ended') return resolution.result;
  const { strikethrooRoot, workspace, hookFile, hookContent, xsdFile, mandate } =
    resolution.context;

  const resolved = resolvePlan(request.plan, startPath);
  if (!resolved) {
    return {
      kind: 'infrastructure-failure',
      detail: `Plan "${request.plan}" was not found or is invalid.`,
    };
  }
  const { planDir, planFile, planId } = resolved;

  const baseCommitFile = path.join(planDir, REVIEW_DIR_NAME, BASE_COMMIT_FILE_NAME);
  const baseCommit = _readBaseCommit(baseCommitFile);
  if (baseCommit === null) {
    return skip(
      'base-commit-absent',
      `No base commit was recorded at ${baseCommitFile}, so the review had no anchored diff ` +
        'scope and the review gate was skipped.'
    );
  }

  const discovery = await dependencies.discover({
    strikethrooRoot,
    workspace,
    currentHarness: request.currentHarness,
  });
  const harness = discovery.reviewerCandidates[0];
  if (harness === undefined) {
    return skip(
      'no-reviewer-candidate',
      `No harness other than \`${request.currentHarness}\` is installed and responsive, so the ` +
        'review gate was skipped.'
    );
  }

  const diff = dependencies.readDiff(workspace, baseCommit);
  if (diff === null) {
    return {
      kind: 'infrastructure-failure',
      detail:
        `git diff ${baseCommit} failed in ${workspace}. The base commit was recorded, so this ` +
        'is a real failure rather than an absent-scope skip.',
    };
  }

  // An empty scope is reported, never certified. A round dispatched with nothing
  // to read comes back with no findings, which is indistinguishable from a clean
  // review — so the one observable symptom of a collapsed scope would be a pass.
  // Whatever the cause, saying so is the only honest outcome.
  if (diff.trim() === '') {
    return skip(
      'empty-diff',
      `The diff from ${baseCommit} to the working tree in ${workspace} is empty, so there was ` +
        'nothing to review. No reviewer was dispatched, and no round was certified.'
    );
  }

  const roundDir = path.join(planDir, REVIEW_DIR_NAME, `round-${request.round}`);
  const reviewFile = path.join(roundDir, REVIEW_FILE_NAME);
  try {
    fs.mkdirSync(roundDir, { recursive: true });
  } catch (error) {
    return {
      kind: 'infrastructure-failure',
      detail: `Could not create the review round directory ${roundDir}: ${errorMessage(error)}`,
    };
  }

  // Defensive, now that the gate performs the only write: no foreign document
  // survives into the round, so what ends up at these paths is always this
  // invocation's. Remove the two exact paths this invocation may write and
  // nothing else: never glob for XML, never read `.self-review.yaml`, never
  // follow a custom output name.
  //
  // The transcript joins the removal for a reason `findings.json` does not:
  // `record` rewrites the partition on every outcome, so it can never be stale,
  // while the transcript is written only when a round fails to certify. Re-run a
  // round number that failed and then certified, and a transcript from the
  // earlier attempt would sit beside a freshly certified `review.xml` — reading
  // exactly like a round that had failed. Prior `findings.json` still stays put
  // as evidence of the earlier attempt. `force: true` makes absence a no-op,
  // which is the common case for both.
  const staleArtifacts = [reviewFile, path.join(roundDir, TRANSCRIPT_FILE_NAME)];
  for (const stale of staleArtifacts) {
    try {
      fs.rmSync(stale, { force: true });
    } catch (error) {
      return {
        kind: 'infrastructure-failure',
        detail: `Could not remove the stale round artifact ${stale}: ${errorMessage(error)}`,
      };
    }
  }

  const deliveryToken = _makeDeliveryToken();

  const prompt = buildReviewerPrompt({
    planId,
    planFile,
    strikethrooRoot,
    workspace,
    hookFile,
    hookContent,
    xsdFile,
    baseCommit,
    round: request.round,
    diff,
    adjudicatedFindings:
      request.adjudicatedFindings ?? _readPriorAdjudicated(planDir, request.round),
    skillInstructions: readReviewerSkill(),
    deliveryToken,
  });

  const dispatched = await dependencies.dispatch({ harness, workspace, prompt });
  if (dispatched.kind === 'infrastructure-failure') {
    return { kind: 'infrastructure-failure', detail: dispatched.detail };
  }
  if (dispatched.kind === 'fallback') {
    return {
      kind: 'fallback',
      harness,
      round: request.round,
      reason: dispatched.reason,
      detail: dispatched.detail,
    };
  }
  if (dispatched.kind === 'launched-failure') {
    // The darkest case: this branch returns before the findings gate runs, so a
    // reviewer that reviewed, printed a valid document, and then exited non-zero
    // would otherwise leave nothing at all behind.
    writeTranscript(roundDir, dispatched.stdout);
    return {
      kind: 'launched-failure',
      harness,
      round: request.round,
      reviewFile,
      exitCode: dispatched.exitCode,
      detail: `The ${harness} reviewer exited ${dispatched.exitCode}.`,
    };
  }

  // The gate is not optional. An override may replace it; nothing removes it.
  // Only a `launched-success` reviewer's stdout reaches evaluation: the
  // `launched-failure` branch above returns first, so a non-zero exit is never
  // certified and its output stays diagnostic.
  const evaluate = dependencies.evaluateFindings ?? createFindingsGate(mandate);
  const findingsGate = await evaluate({
    reviewFile,
    xsdFile,
    planDir,
    round: request.round,
    reviewerStdout: dispatched.stdout ?? '',
    deliveryToken,
  });

  // Every non-certifying outcome — `findings-absent`, `schema-invalid`,
  // `validator-unavailable`, and the injected-gate `not-evaluated` seam — leaves
  // the transcript that explains it. A certified round does not.
  if (findingsGate.kind !== 'evaluated') {
    writeTranscript(roundDir, dispatched.stdout);
  }

  return {
    kind: 'reviewed',
    harness,
    round: request.round,
    baseCommit,
    reviewFile,
    reviewFilePresent: fs.existsSync(reviewFile),
    findingsGate,
  };
};

/**
 * Whether the round that just ran may be followed by another.
 *
 * Only an `evaluated` outcome can pass the gate or license another round. Every
 * other outcome is a round failure: the reviewer's findings were not certified,
 * and an uncertified round is not a clean one.
 */
export const _decideRound = (
  outcome: FindingsGateOutcome,
  round: number,
  roundBudget: number
): RoundDecision => {
  if (outcome.kind !== 'evaluated') {
    return { kind: 'round-failed', detail: outcome.detail };
  }
  const recorded =
    `${outcome.recorded} finding(s) were recorded without being applied, of which ` +
    `${outcome.aboveFloorWithoutSuggestion} cleared both floors but carried no local fix. ` +
    `See ${outcome.findingsFile}.`;
  if (outcome.actionable === 0) {
    return {
      kind: 'gate-passed',
      detail:
        `No finding cleared the \`${outcome.severityFloor}\` severity floor and the ` +
        `\`${outcome.confidenceFloor}\` confidence floor with a local fix attached, so the review ` +
        `gate passed on round ${round}. ${recorded}`,
    };
  }
  if (round >= roundBudget) {
    return {
      kind: 'budget-exhausted',
      actionable: outcome.actionable,
      detail:
        `Round ${round} of an enforced ${roundBudget}-round budget still reports ` +
        `${outcome.actionable} actionable finding(s), so the review gate halts with the budget ` +
        `exhausted. The plan stays in \`plans/\` and every round's findings are recorded under ` +
        `its \`review/\` directory. ${recorded}`,
    };
  }
  return {
    kind: 'fix-and-continue',
    nextRound: round + 1,
    actionable: outcome.actionable,
    detail:
      `${outcome.actionable} finding(s) clear both floors and carry a local fix. Dispatch them on ` +
      `the implementer route, re-run POST_EXECUTION in full, then run round ${round + 1} of ` +
      `${roundBudget}. ${recorded}`,
  };
};

/**
 * One review round with the budget enforced around it.
 *
 * The budget is read from the hook and clamped to `MAX_REVIEW_ROUNDS` before it
 * is applied, so rewriting or deleting the hook's budget line cannot raise it.
 * A round past the budget is refused before any reviewer is dispatched, and a
 * round at the budget that still reports actionable findings halts. Termination
 * therefore holds however the orchestrating skill behaves.
 */
export const runBoundedReviewRound = async (
  request: ReviewRoundRequest,
  overrides: Partial<ReviewRoundDependencies> = {}
): Promise<ReviewRoundResult> => {
  const startPath = request.startPath ?? process.cwd();
  const resolution = resolveReviewContext(
    startPath,
    { ...defaultDependencies, ...overrides }.validatorAvailable
  );
  if (resolution.kind === 'ended') return resolution.result;
  const { mandate } = resolution.context;

  if (request.round > mandate.roundBudget) {
    return {
      kind: 'budget-exhausted',
      round: request.round,
      roundBudget: mandate.roundBudget,
      roundCeiling: MAX_REVIEW_ROUNDS,
      mandateNotes: mandate.notes,
      detail:
        `Round ${request.round} was requested, but the review gate enforces a ${mandate.roundBudget}-round ` +
        `budget (compiled ceiling ${MAX_REVIEW_ROUNDS}). No reviewer was dispatched. The plan stays ` +
        'in `plans/` and the rounds already run are recorded under its `review/` directory.',
    };
  }

  const result = await runReviewRound(request, overrides);
  if (result.kind !== 'reviewed') return result;
  return {
    ...result,
    decision: _decideRound(result.findingsGate, request.round, mandate.roundBudget),
    roundBudget: mandate.roundBudget,
    roundCeiling: MAX_REVIEW_ROUNDS,
    mandateNotes: mandate.notes,
  };
};

const emit = (result: ReviewRoundResult, exitCode: number): never => {
  process.stdout.write(`${JSON.stringify(result)}\n`);
  process.exit(exitCode);
};

/**
 * Exit codes mirror `dispatch-task-execution.cjs`: 2 for infrastructure, 1 for a
 * launched failure, 0 for everything the caller can proceed past — including a
 * pre-launch fallback, which means the gate did not run rather than that it
 * failed.
 *
 * A round the gate could not certify, and an exhausted budget, both exit 1: they
 * halt exactly as any other mechanical gate failure does. Only a round the gate
 * certified — passed, or licensed to continue — exits 0.
 */
export const _exitCodeFor = (result: ReviewRoundResult): number => {
  if (result.kind === 'infrastructure-failure') return 2;
  if (result.kind === 'launched-failure') return 1;
  if (result.kind === 'budget-exhausted') return 1;
  if (result.kind === 'reviewed' && result.decision !== undefined) {
    return result.decision.kind === 'budget-exhausted' || result.decision.kind === 'round-failed'
      ? 1
      : 0;
  }
  return 0;
};

const main = async (startPath: string = process.cwd()): Promise<void> => {
  const [planArg, harnessArg, roundArg] = process.argv.slice(2);
  if (!planArg || !harnessArg || !SUPPORTED_HARNESSES.includes(harnessArg as Harness)) {
    emit(
      {
        kind: 'infrastructure-failure',
        detail:
          'Usage: code-review.cjs <plan-id-or-path> <current-harness> [round]. ' +
          `<current-harness> is one of: ${SUPPORTED_HARNESSES.join(', ')}.`,
      },
      2
    );
  }
  const round = roundArg === undefined ? 1 : Number(roundArg);
  if (!Number.isInteger(round) || round < 1) {
    emit(
      { kind: 'infrastructure-failure', detail: `Round "${roundArg}" is not a positive integer.` },
      2
    );
  }

  // `emit` never returns, but a `never`-returning arrow behind an unannotated
  // const does not narrow here; the same assertion pattern is used in
  // dispatch-task-execution.ts.
  const result = await runBoundedReviewRound({
    plan: planArg!,
    currentHarness: harnessArg as Harness,
    round,
    startPath,
  });
  emit(result, _exitCodeFor(result));
};

if (require.main === module) {
  main().catch(error => {
    emit(
      {
        kind: 'infrastructure-failure',
        detail: `Code review gate infrastructure failed: ${errorMessage(error)}`,
      },
      2
    );
  });
}

export { main };
/**
 * Re-exported so the enforced ceiling and the mandate parser are reachable from
 * the bundle itself, not only from the TypeScript source: the ceiling is the
 * number a test asserts against instead of a magic 3.
 */
export { MAX_REVIEW_ROUNDS, parseReviewMandate };
