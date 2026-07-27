#!/usr/bin/env node
import * as fs from 'fs';
import * as path from 'path';
import { SUPPORTED_HARNESSES, type Harness } from '../types';
import { execGit } from './shared/git-utils';
import { findStrikethrooRoot } from './shared/root';
import { resolvePlan } from './shared/plan-resolve';
import { discoverHarnesses } from './shared/harness-discovery';
import { dispatchReview } from './shared/external-dispatch';

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
const SHA_RE = /^[0-9a-f]{40}$/i;

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
 * Rounds after the first are task 7's to drive, so the CLI supplies none.
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
 * SEAM FOR TASK 7 — schema validation and the severity/confidence floors.
 *
 * `not-evaluated` is the only outcome this file can produce, and it is a
 * distinct member of the union rather than a permissive default: a consumer
 * cannot read an unevaluated round as a clean one, and adding the real
 * implementation is a compile-visible change rather than a silent one.
 */
export type FindingsGateOutcome =
  | { kind: 'not-evaluated'; detail: string }
  | { kind: 'schema-invalid'; detail: string }
  | { kind: 'evaluated'; aboveFloor: number; belowFloor: number };

/** SEAM FOR TASK 7 — supply this to evaluate a round's emitted findings. */
export type FindingsGate = (context: FindingsEvaluationContext) => Promise<FindingsGateOutcome>;

const NOT_EVALUATED: FindingsGateOutcome = {
  kind: 'not-evaluated',
  detail:
    'Findings were not validated or thresholded: no findings gate was supplied to this review round.',
};

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

const skip = (reason: ReviewSkipReason, detail: string): ReviewRoundResult => ({
  kind: 'skipped',
  reason,
  detail,
});

/**
 * Resolve → guard → discover → scope → dispatch → report. Rounds are driven from
 * outside: this runs the round it is handed, exactly once.
 */
export const runReviewRound = async (
  request: ReviewRoundRequest,
  overrides: Partial<ReviewRoundDependencies> = {}
): Promise<ReviewRoundResult> => {
  const dependencies = { ...defaultDependencies, ...overrides };
  const startPath = request.startPath ?? process.cwd();

  // findStrikethrooRoot owns the workspace schema check; never bypass it.
  const strikethrooRoot = findStrikethrooRoot(startPath);
  if (!strikethrooRoot) {
    return {
      kind: 'infrastructure-failure',
      detail: `No Strikethroo workspace was found from ${startPath}.`,
    };
  }
  const workspace = path.dirname(path.dirname(strikethrooRoot));

  const hookFile = path.join(strikethrooRoot, HOOK_RELATIVE_PATH);
  const hookContent = readFileOrNull(hookFile);
  if (hookContent === null) {
    return skip(
      'hook-absent',
      `No code review mandate at ${hookFile}, so the review gate was skipped. Re-run ` +
        '`npx strikethroo init` to add it.'
    );
  }
  if (hookContent.trim().length === 0) {
    return skip(
      'hook-empty',
      `The code review mandate at ${hookFile} is empty, which is the documented way to ` +
        'disable the gate, so the review gate was skipped.'
    );
  }

  const xsdFile = path.join(strikethrooRoot, XSD_RELATIVE_PATH);
  if (!fs.existsSync(xsdFile)) {
    return skip(
      'xsd-absent',
      `No findings schema at ${xsdFile}, so findings could not be validated and the review ` +
        'gate was skipped. Re-run `npx strikethroo init` to add it.'
    );
  }

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
    adjudicatedFindings: request.adjudicatedFindings ?? [],
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

  const findingsGate = dependencies.evaluateFindings
    ? await dependencies.evaluateFindings({
        reviewFile,
        xsdFile,
        planDir,
        round: request.round,
      })
    : NOT_EVALUATED;

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

const emit = (result: ReviewRoundResult, exitCode: number): never => {
  process.stdout.write(`${JSON.stringify(result)}\n`);
  process.exit(exitCode);
};

/**
 * Exit codes mirror `dispatch-task-execution.cjs`: 2 for infrastructure, 1 for a
 * launched failure, 0 for everything the caller can proceed past — including a
 * pre-launch fallback, which means the gate did not run rather than that it
 * failed.
 */
export const _exitCodeFor = (result: ReviewRoundResult): number => {
  if (result.kind === 'infrastructure-failure') return 2;
  if (result.kind === 'launched-failure') return 1;
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
  const result = await runReviewRound({
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
