#!/usr/bin/env node
import * as fs from 'fs';
import * as path from 'path';
import { SUPPORTED_HARNESSES, type Harness } from '../types';
import { readBaseCommit } from './shared/git-utils';
import { readCumulativeDiff } from './shared/review-scope';
import {
  makeDeliveryToken,
  extractReviewDocument,
  buildReviewerPrompt,
} from './shared/review-delivery';
import { checkWorkspaceSchema } from './shared/root';
import { loadCodeReviewConfiguration } from './shared/code-review-configuration';
import { discoverPlanWorkspace, resolvePlan } from './shared/plan-resolve';
import { discoverHarnesses } from './shared/harness-discovery';
import { executableResolves } from './shared/executable-resolution';
import { dispatchReview } from './shared/external-dispatch';
import {
  countFindingsWithXmllint,
  readFindingsWithXmllint,
  hasForbiddenDeclarations,
  SEVERITIES,
  validateAgainstSchema,
  type FindingCounts,
} from './shared/review-findings';

export { readCumulativeDiff as _readCumulativeDiff } from './shared/review-scope';
export {
  makeDeliveryToken as _makeDeliveryToken,
  extractReviewDocument as _extractReviewDocument,
  buildReviewerPrompt,
  type ReviewerPromptInput,
} from './shared/review-delivery';

/**
 * The code review gate: scope the plan's cumulative diff, dispatch a second
 * harness to review it, certify the findings, and emit one JSON line. It
 * reports; it never fixes, commits, or judges findings. Rationale for each
 * decision below is in `.ai/kenkeep/nodes/code-review/`.
 */

const HOOK_RELATIVE_PATH = path.join('config', 'hooks', 'CODE_REVIEW.md');
const XSD_RELATIVE_PATH = path.join('config', 'schemas', 'self-review-v2.xsd');
const REVIEW_DIR_NAME = 'review';
const BASE_COMMIT_FILE_NAME = 'base-commit.json';
const REVIEW_FILE_NAME = 'review.xml';
/** The recorded findings and the reason a review did not certify, beside review.xml. */
const FINDINGS_FILE_NAME = 'findings.json';
/** The reviewer's captured transcript, written only when a review does not certify. */
const TRANSCRIPT_FILE_NAME = 'reviewer-output.txt';

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
 * Best-effort, unlike `record`: a lost transcript is a lost diagnostic, never a
 * changed outcome.
 */
const writeTranscript = (reviewDir: string, transcript: string | undefined): void => {
  if (transcript === undefined || transcript === '') return;
  try {
    fs.mkdirSync(reviewDir, { recursive: true });
    fs.writeFileSync(path.join(reviewDir, TRANSCRIPT_FILE_NAME), transcript, 'utf8');
  } catch {
    // Diagnostic only.
  }
};

/** Every condition that disables the gate cleanly. Exit 0, empty stderr. */
export type ReviewSkipReason =
  | 'review-disabled'
  | 'hook-absent'
  | 'hook-empty'
  | 'xsd-absent'
  | 'validator-absent'
  | 'base-commit-absent'
  | 'no-reviewer-candidate'
  | 'empty-diff';

/** What a findings gate is handed after a reviewer returns. */
export interface FindingsEvaluationContext {
  reviewFile: string;
  xsdFile: string;
  planDir: string;
  /** Captured reviewer stdout — the only channel the findings document arrives on. */
  reviewerStdout: string;
  /** This dispatch's collision token; without it no delivered region can match. */
  deliveryToken: string;
}

/**
 * Each non-certifying member is a distinct failure with a distinct fix, and
 * none is ever reported as a clean review. `not-evaluated` is the seam for an
 * injected gate; the built-in gate always evaluates.
 */
export type FindingsGateOutcome =
  | { kind: 'not-evaluated'; detail: string }
  | { kind: 'findings-absent'; detail: string }
  | { kind: 'validator-unavailable'; detail: string }
  | { kind: 'schema-invalid'; detail: string }
  | {
      kind: 'evaluated';
      /** Advisory tally by severity label. Nothing branches on it. */
      counts: FindingCounts;
      /** Where the findings were written for the implementer to read. */
      findingsFile: string;
    };

/** Supply this to evaluate the reviewer's emitted findings. */
export type FindingsGate = (context: FindingsEvaluationContext) => Promise<FindingsGateOutcome>;

/**
 * Refuse DTD syntax, validate the delivered document against the XSD, read
 * libxml's advisory counts, and record the outcome
 * to `<plan-dir>/review/findings.json`, on every outcome including failures.
 */
export const createFindingsGate =
  (): FindingsGate =>
  async (context: FindingsEvaluationContext): Promise<FindingsGateOutcome> => {
    const reviewDir = path.dirname(context.reviewFile);
    const findingsFile = path.join(reviewDir, FINDINGS_FILE_NAME);
    const record = (payload: Record<string, unknown>): void => {
      try {
        fs.mkdirSync(reviewDir, { recursive: true });
        fs.writeFileSync(findingsFile, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
      } catch (error) {
        // The findings are the gate's product; failing to record them is exit 2.
        throw new Error(
          `The review findings could not be written to ${findingsFile}: ${errorMessage(error)}`
        );
      }
    };
    const base = { reviewFile: context.reviewFile, xsdFile: context.xsdFile };

    const fail = (
      kind: Exclude<FindingsGateOutcome, { kind: 'evaluated' }>['kind'],
      detail: string
    ): FindingsGateOutcome => {
      record({ ...base, status: kind, detail, findings: [] });
      return { kind, detail };
    };

    // The reviewer prints; this process writes. The document meets the XSD at
    // the single `validateAgainstSchema` call below before anything parses it.
    const delivered = extractReviewDocument(context.reviewerStdout, context.deliveryToken);
    if (delivered === null) {
      const detail =
        "The reviewer printed no complete findings document between this dispatch's " +
        'delimiters. A review with no findings document cannot be read as a review with ' +
        'no findings.';
      return fail('findings-absent', detail);
    }
    try {
      fs.mkdirSync(reviewDir, { recursive: true });
      fs.writeFileSync(
        context.reviewFile,
        delivered.endsWith('\n') ? delivered : `${delivered}\n`,
        'utf8'
      );
    } catch (error) {
      // As with `record`: an unwritable workspace is exit 2.
      throw new Error(
        `The delivered findings document could not be written to ${context.reviewFile}: ` +
          errorMessage(error)
      );
    }

    if (hasForbiddenDeclarations(delivered)) {
      const detail =
        `${context.reviewFile} carries a DOCTYPE or entity declaration (<!DOCTYPE, <!ENTITY, ` +
        "<!ELEMENT, <!ATTLIST or <!NOTATION). The review gate accepts only the schema's own " +
        'syntax, so the document was refused before validation and none of its findings was ' +
        'recorded.';
      return fail('schema-invalid', detail);
    }

    const validation = await validateAgainstSchema(context.xsdFile, context.reviewFile);
    if (validation.kind === 'validator-unavailable') {
      return fail('validator-unavailable', validation.detail);
    }
    if (validation.kind === 'invalid') {
      const detail =
        `${context.reviewFile} does not validate against ${context.xsdFile}, so its findings ` +
        `could not be certified and none of them was recorded. xmllint reported: ${validation.detail}`;
      return fail('schema-invalid', detail);
    }

    const counts = await countFindingsWithXmllint(context.reviewFile);
    if (counts === null) {
      return fail(
        'validator-unavailable',
        `${context.reviewFile} validated, but xmllint could not read its finding counts, so the review could not be certified.`
      );
    }
    const findings = await readFindingsWithXmllint(context.reviewFile, counts.total);
    if (findings === null) {
      return fail(
        'validator-unavailable',
        `${context.reviewFile} validated, but xmllint could not project its findings, so the review could not be certified.`
      );
    }
    record({ ...base, status: 'evaluated', counts, findings });
    return { kind: 'evaluated', counts, findingsFile };
  };

/** The gate's one decision. Derived by `_classify`, so it matches the exit code. */
export type ReviewAction = 'continue' | 'halt';

/** Whether the reviewed findings were certified and recorded. */
export type ReviewVerdict = { kind: 'review-recorded' } | { kind: 'review-failed' };

/**
 * A result before `action` is stamped on. `detail` is top-level on every
 * variant. Delivery diagnostics stay in `findings.json`, never here.
 */
export type ReviewOutcome =
  | { kind: 'skipped'; reason: ReviewSkipReason; detail: string }
  | ({
      kind: 'reviewed';
      harness: Harness;
      baseCommit: string;
      reviewFile: string;
      detail: string;
    } & (
      | { verdict: { kind: 'review-recorded' }; counts: FindingCounts }
      | { verdict: { kind: 'review-failed' } }
    ))
  | {
      kind: 'launched-failure';
      harness: Harness;
      reviewFile: string;
      exitCode: number;
      detail: string;
    }
  | { kind: 'fallback'; harness: Harness; reason: string; detail: string }
  | { kind: 'infrastructure-failure'; detail: string };

type WithAction<T> = T extends unknown ? T & { action: ReviewAction; codeReview: string } : never;

/** What the gate emits: one outcome, plus the action compiled from it. */
export type ReviewResult = WithAction<ReviewOutcome>;

/**
 * Action and exit code from one switch, so they cannot disagree. Exit codes
 * mirror `dispatch-task-execution.cjs`: 2 infrastructure, 1 reviewer failure or
 * uncertified review, 0 for everything the caller can proceed past.
 */
export interface ReviewClassification {
  action: ReviewAction;
  exitCode: 0 | 1 | 2;
}

const CONTINUE: ReviewClassification = { action: 'continue', exitCode: 0 };
const HALT_REVIEW: ReviewClassification = { action: 'halt', exitCode: 1 };
const HALT_INFRASTRUCTURE: ReviewClassification = { action: 'halt', exitCode: 2 };

export const _classify = (outcome: ReviewOutcome): ReviewClassification => {
  switch (outcome.kind) {
    case 'infrastructure-failure':
      return HALT_INFRASTRUCTURE;
    case 'launched-failure':
      return HALT_REVIEW;
    case 'reviewed':
      return outcome.verdict.kind === 'review-recorded' ? CONTINUE : HALT_REVIEW;
    case 'skipped':
    case 'fallback':
      return CONTINUE;
  }
};

/** Presentation only; findings never change the gate action or exit code. */
const reviewSummary = (outcome: ReviewOutcome): string => {
  if (outcome.kind === 'skipped' && outcome.reason === 'review-disabled') {
    return `Skipped; ${outcome.detail}`;
  }
  const reviewer =
    'harness' in outcome
      ? `Harness: ${outcome.harness}; model: CLI-selected (exact model unknown).`
      : 'No reviewer performed a certified review.';
  if (
    outcome.kind === 'reviewed' &&
    outcome.verdict.kind === 'review-recorded' &&
    'counts' in outcome
  ) {
    return `${outcome.counts.total === 0 ? 'Pass' : 'Address'}; ${reviewer} Findings: ${outcome.counts.total}.`;
  }
  return `Failed; ${reviewer} ${outcome.detail}`.replace(/\s+/g, ' ').trim();
};

/** Compile an outcome into a result by stamping its action onto it. */
const decide = <T extends ReviewOutcome>(
  outcome: T
): T & { action: ReviewAction; codeReview: string } => ({
  ...outcome,
  action: _classify(outcome).action,
  codeReview: reviewSummary(outcome),
});

export interface ReviewRequest {
  /** Plan id or absolute plan-file path, as accepted by `resolvePlan`. */
  plan: string;
  currentHarness: Harness;
  startPath?: string;
}

export interface ReviewDependencies {
  discover: typeof discoverHarnesses;
  dispatch: typeof dispatchReview;
  readDiff: (workspace: string, baseCommit: string) => string | null;
  /** Injectable gate; absent means the mechanism builds its own. */
  evaluateFindings?: FindingsGate;
  /** Injectable so tests can simulate a missing `xmllint` without editing `PATH`. */
  validatorAvailable: () => boolean;
}

export { readBaseCommit as _readBaseCommit } from './shared/git-utils';

const defaultDependencies: ReviewDependencies = {
  discover: discoverHarnesses,
  dispatch: dispatchReview,
  readDiff: readCumulativeDiff,
  validatorAvailable: () => executableResolves('xmllint'),
};

/** The reviewer skill's SKILL.md, inlined; falls back to naming the skill. */
const readReviewerSkill = (): string => {
  const skillFile = path.resolve(__dirname, '..', 'SKILL.md');
  const content = readFileOrNull(skillFile);
  return content === null
    ? 'Load the `st-code-review` skill and follow its Operating Procedure. If that ' +
        'skill is not installed on this harness, follow the mandate below exactly.'
    : content;
};

const skip = (reason: ReviewSkipReason, detail: string): ReviewResult =>
  decide({ kind: 'skipped', reason, detail });

/** Resolve, guard, discover, scope, dispatch, evaluate, report. Runs once. */
export const runReview = async (
  request: ReviewRequest,
  overrides: Partial<ReviewDependencies> = {}
): Promise<ReviewResult> => {
  const dependencies = { ...defaultDependencies, ...overrides };
  const startPath = request.startPath ?? process.cwd();
  const strikethrooRoot = discoverPlanWorkspace(request.plan, startPath);
  if (!strikethrooRoot) {
    return decide({
      kind: 'infrastructure-failure',
      detail: `No Strikethroo workspace was found for plan "${request.plan}" from ${startPath}.`,
    });
  }

  const configuration = loadCodeReviewConfiguration(strikethrooRoot);
  if (configuration.kind === 'invalid') {
    return decide({ kind: 'infrastructure-failure', detail: configuration.detail });
  }
  if (!configuration.enabled) {
    return skip(
      'review-disabled',
      'Code review is disabled. Set code_review.enabled to true in config/config.yaml or ' +
        'select Enable code review in Customize to opt in.'
    );
  }

  checkWorkspaceSchema(strikethrooRoot);

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
      `The code review mandate at ${hookFile} is empty, so the opted-in review gate was skipped.`
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

  // `xmllint` is a soft dependency: absence is a clean skip, checked before any
  // reviewer is dispatched. A skip is not a pass; its reason says the gate did not run.
  if (!dependencies.validatorAvailable()) {
    return skip(
      'validator-absent',
      'No `xmllint` on PATH, so emitted findings could not be validated against the vendored ' +
        'schema and the review gate was skipped. Install libxml2-utils (Debian/Ubuntu), ' +
        'libxml2 (Homebrew), or your platform equivalent to enable the gate.'
    );
  }

  const workspace = path.dirname(path.dirname(strikethrooRoot));

  const resolved = resolvePlan(request.plan, startPath);
  if (!resolved) {
    return decide({
      kind: 'infrastructure-failure',
      detail: `Plan "${request.plan}" was not found or is invalid.`,
    });
  }
  if (resolved.strikethrooRoot !== strikethrooRoot) {
    return decide({
      kind: 'infrastructure-failure',
      detail: `Plan "${request.plan}" resolved outside the workspace whose review preference was checked.`,
    });
  }
  const { planDir, planFile, planId } = resolved;

  const baseCommitFile = path.join(planDir, REVIEW_DIR_NAME, BASE_COMMIT_FILE_NAME);
  const baseCommit = readBaseCommit(baseCommitFile);
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
  if (discovery.configurationErrors !== undefined) {
    return decide({
      kind: 'infrastructure-failure',
      detail: `Harness invocation configuration is invalid: ${discovery.configurationErrors.join(
        ' '
      )}`,
    });
  }
  const harness = discovery.reviewerCandidates[0];
  if (harness === undefined) {
    return skip(
      'no-reviewer-candidate',
      `No reviewer candidate; review gate skipped. ${request.currentHarness} is excluded as the current harness. ` +
        SUPPORTED_HARNESSES.filter(candidate => candidate !== request.currentHarness)
          .map(candidate => {
            const outcome = discovery.outcomes.find(item => item.harness === candidate);
            return (
              `${candidate}: ${outcome?.reason ?? 'No availability outcome was reported.'}` +
              (outcome?.source === 'cache' ? ' (cached readiness result)' : '')
            );
          })
          .join(' ')
    );
  }

  const diff = dependencies.readDiff(workspace, baseCommit);
  if (diff === null) {
    return decide({
      kind: 'infrastructure-failure',
      detail:
        `git diff ${baseCommit} failed in ${workspace}. The base commit was recorded, so this ` +
        'is a real failure rather than an absent-scope skip.',
    });
  }

  // Reported, never certified: no findings from nothing reads like a clean review.
  if (diff.trim() === '') {
    return skip(
      'empty-diff',
      `The diff from ${baseCommit} to the working tree in ${workspace} is empty, so there was ` +
        'nothing to review. No reviewer was dispatched, and nothing was certified.'
    );
  }

  const reviewDir = path.join(planDir, REVIEW_DIR_NAME);
  const reviewFile = path.join(reviewDir, REVIEW_FILE_NAME);
  try {
    fs.mkdirSync(reviewDir, { recursive: true });
  } catch (error) {
    return decide({
      kind: 'infrastructure-failure',
      detail: `Could not create the review directory ${reviewDir}: ${errorMessage(error)}`,
    });
  }

  // Remove exactly the two paths this invocation may write, and nothing else,
  // so no earlier run's document can be certified. The transcript is included
  // because it is written only on failure and would otherwise outlive a later
  // certified review. `findings.json` is rewritten on every outcome and stays.
  const staleArtifacts = [reviewFile, path.join(reviewDir, TRANSCRIPT_FILE_NAME)];
  for (const stale of staleArtifacts) {
    try {
      fs.rmSync(stale, { force: true });
    } catch (error) {
      return decide({
        kind: 'infrastructure-failure',
        detail: `Could not remove the stale review artifact ${stale}: ${errorMessage(error)}`,
      });
    }
  }

  const deliveryToken = makeDeliveryToken();

  const prompt = buildReviewerPrompt({
    planId,
    planFile,
    strikethrooRoot,
    workspace,
    hookFile,
    hookContent,
    xsdFile,
    baseCommit,
    diff,
    skillInstructions: readReviewerSkill(),
    deliveryToken,
  });

  const invocation = discovery.reviewerInvocations?.[harness];
  const dispatched = await dependencies.dispatch({
    harness,
    workspace,
    prompt,
    ...(invocation === undefined ? {} : { cliArgs: invocation.cliArgs }),
  });
  if (dispatched.kind === 'infrastructure-failure') {
    return decide({ kind: 'infrastructure-failure', detail: dispatched.detail });
  }
  if (dispatched.kind === 'fallback') {
    return decide({
      kind: 'fallback',
      harness,
      reason: dispatched.reason,
      detail: dispatched.detail,
    });
  }
  if (dispatched.kind === 'launched-failure') {
    // Returns before the findings gate, so the transcript is written here.
    writeTranscript(reviewDir, dispatched.stdout);
    return decide({
      kind: 'launched-failure',
      harness,
      reviewFile,
      exitCode: dispatched.exitCode,
      detail: `The ${harness} reviewer exited ${dispatched.exitCode}.`,
    });
  }

  // Only a `launched-success` reviewer's stdout reaches evaluation.
  const evaluate = dependencies.evaluateFindings ?? createFindingsGate();
  const findingsGate = await evaluate({
    reviewFile,
    xsdFile,
    planDir,
    reviewerStdout: dispatched.stdout ?? '',
    deliveryToken,
  });

  // A review that does not certify leaves its transcript; a certified one does not.
  if (findingsGate.kind !== 'evaluated') {
    writeTranscript(reviewDir, dispatched.stdout);
  }

  return decide({
    kind: 'reviewed',
    harness,
    baseCommit,
    reviewFile,
    ...reviewedFieldsFor(findingsGate),
  });
};

/**
 * Where certification becomes the verdict: only `evaluated` is `review-recorded`;
 * everything else is `review-failed` and never clean. Counts exist only after
 * certification.
 */
const reviewedFieldsFor = (
  outcome: FindingsGateOutcome
):
  | { verdict: { kind: 'review-recorded' }; counts: FindingCounts; detail: string }
  | { verdict: { kind: 'review-failed' }; detail: string } => {
  if (outcome.kind !== 'evaluated') {
    return { verdict: { kind: 'review-failed' }, detail: outcome.detail };
  }

  const { counts, findingsFile } = outcome;
  if (counts.total === 0) {
    return {
      verdict: { kind: 'review-recorded' },
      counts,
      detail: `The reviewer raised no findings. See ${findingsFile}.`,
    };
  }
  const byLabel = SEVERITIES.filter(label => counts[label] > 0)
    .map(label => `${counts[label]} ${label}`)
    .concat(counts.unlabelled > 0 ? [`${counts.unlabelled} unlabelled`] : [])
    .join(', ');
  return {
    verdict: { kind: 'review-recorded' },
    counts,
    detail:
      `The reviewer raised ${counts.total} finding(s) (${byLabel}). They are recorded, not ` +
      `applied: read them and decide which to act on. See ${findingsFile}.`,
  };
};

/** The gate's entire stdout: one JSON line, and nothing else, ever. */
export const _resultLine = (result: ReviewResult): string => `${JSON.stringify(result)}\n`;

const emit = (result: ReviewResult): never => {
  process.stdout.write(_resultLine(result));
  process.exit(_classify(result).exitCode);
};

const main = async (startPath: string = process.cwd()): Promise<void> => {
  const [planArg, harnessArg] = process.argv.slice(2);
  if (!planArg || !harnessArg || !SUPPORTED_HARNESSES.includes(harnessArg as Harness)) {
    emit(
      decide({
        kind: 'infrastructure-failure',
        detail:
          'Usage: code-review.cjs <plan-id-or-path> <current-harness>. ' +
          `<current-harness> is one of: ${SUPPORTED_HARNESSES.join(', ')}.`,
      })
    );
  }
  // `emit` never returns; the non-null assertion mirrors dispatch-task-execution.ts.
  const result = await runReview({
    plan: planArg!,
    currentHarness: harnessArg as Harness,
    startPath,
  });
  emit(result);
};

if (require.main === module) {
  main().catch(error => {
    emit(
      decide({
        kind: 'infrastructure-failure',
        detail: `Code review gate infrastructure failed: ${errorMessage(error)}`,
      })
    );
  });
}

export { main };
