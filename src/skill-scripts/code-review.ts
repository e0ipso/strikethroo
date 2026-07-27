#!/usr/bin/env node
import * as fs from 'fs';
import * as path from 'path';
import { SUPPORTED_HARNESSES, type Harness } from '../types';
import { execGit } from './shared/git-utils';
import { findStrikethrooRoot } from './shared/root';
import { resolvePlan } from './shared/plan-resolve';
import { discoverHarnesses } from './shared/harness-discovery';
import { dispatchReview } from './shared/external-dispatch';
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

/** Every condition that disables the gate cleanly. Exit 0, empty stderr. */
export type ReviewSkipReason =
  | 'hook-absent'
  | 'hook-empty'
  | 'xsd-absent'
  | 'base-commit-absent'
  | 'no-reviewer-candidate';

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

    if (!fs.existsSync(context.reviewFile)) {
      const detail =
        `The reviewer did not write ${context.reviewFile}. A round with no findings document ` +
        'cannot be read as a round with no findings.';
      record({ ...base, status: 'findings-absent', detail, actionable: [], recorded: [] });
      return { kind: 'findings-absent', detail };
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
 * Limitation, inherent to `git diff`: untracked files are not in the diff. A fix
 * that modifies a tracked file is visible uncommitted; one that adds a brand-new
 * file is visible only once something stages or commits it. Widening this would
 * require writing to the index (`git add -N`), which the gate must not do.
 */
const readCumulativeDiff = (workspace: string, baseCommit: string): string | null =>
  execGit(`git -C ${JSON.stringify(workspace)} diff ${baseCommit} --`);

const defaultDependencies: ReviewRoundDependencies = {
  discover: discoverHarnesses,
  dispatch: dispatchReview,
  readDiff: readCumulativeDiff,
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
  reviewFile: string;
  diff: string;
  adjudicatedFindings: readonly AdjudicatedFinding[];
  skillInstructions: string;
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
    'review.xml at the path named below, plus a short report of the counts.',
    '',
    `Repository / workspace root: ${input.workspace}`,
    `Strikethroo workspace root: ${input.strikethrooRoot}`,
    `Plan document (read it in full): ${input.planFile}`,
    `Review mandate hook: ${input.hookFile}`,
    `Findings schema to validate against: ${input.xsdFile}`,
    `Base commit anchoring this plan's scope: ${input.baseCommit}`,
    `Round: ${input.round}`,
    `Write your findings to: ${input.reviewFile}`,
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
  startPath: string
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

  const resolution = resolveReviewContext(startPath);
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
    reviewFile,
    diff,
    adjudicatedFindings:
      request.adjudicatedFindings ?? _readPriorAdjudicated(planDir, request.round),
    skillInstructions: readReviewerSkill(),
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
  const evaluate = dependencies.evaluateFindings ?? createFindingsGate(mandate);
  const findingsGate = await evaluate({
    reviewFile,
    xsdFile,
    planDir,
    round: request.round,
  });

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
  const resolution = resolveReviewContext(startPath);
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
