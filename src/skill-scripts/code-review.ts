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
  countFindings,
  parseReviewFindings,
  SEVERITIES,
  validateAgainstSchema,
  type FindingCounts,
} from './shared/review-findings';

/**
 * The code review gate: scope the plan's cumulative diff, dispatch a second
 * harness to review it, certify the findings, and emit one JSON line. It
 * reports; it never fixes, commits, or judges findings. Rationale for each
 * decision below is in AGENTS.md, "Code Review Gate".
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
 * Validate the delivered document against the XSD and record the outcome to
 * `<plan-dir>/review/findings.json`, on every outcome including failures.
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

    // The reviewer prints; this process writes. The document meets the XSD at
    // the single `validateAgainstSchema` call below before anything parses it.
    const delivered = _extractReviewDocument(context.reviewerStdout, context.deliveryToken);
    if (delivered === null) {
      const detail =
        "The reviewer printed no complete findings document between this dispatch's " +
        'delimiters. A review with no findings document cannot be read as a review with ' +
        'no findings.';
      record({ ...base, status: 'findings-absent', detail, findings: [] });
      return { kind: 'findings-absent', detail };
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

    const validation = await validateAgainstSchema(context.xsdFile, context.reviewFile);
    if (validation.kind === 'validator-unavailable') {
      record({
        ...base,
        status: 'validator-unavailable',
        detail: validation.detail,
        findings: [],
      });
      return { kind: 'validator-unavailable', detail: validation.detail };
    }
    if (validation.kind === 'invalid') {
      const detail =
        `${context.reviewFile} does not validate against ${context.xsdFile}, so its findings ` +
        `could not be certified and none of them was recorded. xmllint reported: ${validation.detail}`;
      record({ ...base, status: 'schema-invalid', detail, findings: [] });
      return { kind: 'schema-invalid', detail };
    }

    const xml = readFileOrNull(context.reviewFile);
    if (xml === null) {
      const detail = `${context.reviewFile} validated but could not then be read.`;
      record({ ...base, status: 'findings-absent', detail, findings: [] });
      return { kind: 'findings-absent', detail };
    }

    // Safe only after validation: the scan assumes the XSD's shape.
    const findings = parseReviewFindings(xml);
    const counts = countFindings(findings);
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

type WithAction<T> = T extends unknown ? T & { action: ReviewAction } : never;

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

/** Compile an outcome into a result by stamping its action onto it. */
const decide = <T extends ReviewOutcome>(outcome: T): T & { action: ReviewAction } => ({
  ...outcome,
  action: _classify(outcome).action,
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

/** The recorded base commit, or null when missing, unreadable, or not a 40-hex sha. */
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

/**
 * Changed paths marked generated or vendored. `--no-renames` so `--name-only`
 * lists both sides of a rename; excluding only the destination would leave the
 * source in the diff as a full deletion.
 */
const excludedPaths = (workspace: string, baseCommit: string): string[] => {
  const changed = execGit(
    `git -C ${JSON.stringify(workspace)} diff --no-renames --name-only ${baseCommit} --`
  );
  if (changed === null || changed.trim() === '') return [];
  const files = changed.split('\n').filter(line => line.trim() !== '');
  return [...attributeExcluded(workspace, files)];
};

/**
 * Untracked, unignored paths minus generated and vendored ones.
 * `core.quotePath=false`: a quoted non-ASCII name would not resolve in
 * `git diff --no-index`, and the file would silently drop out.
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

/** Add-diff for one untracked file. `--no-index` numbers the prefixes otherwise. */
const untrackedDiff = (workspace: string, file: string): string | null =>
  execGitDiffAllowingChanges(
    `git -C ${JSON.stringify(workspace)} diff --no-index --src-prefix=a/ --dst-prefix=b/ ` +
      `-- /dev/null ${JSON.stringify(file)}`
  );

/**
 * Scope: two-dot `git diff <base>` against the working tree, plus an add-diff
 * per untracked unignored path, minus paths `.gitattributes` marks generated
 * or vendored. Why each: AGENTS.md, "Code Review Gate".
 */
export const _readCumulativeDiff = (workspace: string, baseCommit: string): string | null => {
  const exclusions = excludedPaths(workspace, baseCommit)
    .map(file => ` ${JSON.stringify(`:(exclude,literal)${file}`)}`)
    .join('');
  const tracked = execGit(
    `git -C ${JSON.stringify(workspace)} diff ${baseCommit} -- .${exclusions}`
  );
  // A failed tracked read is infrastructure; a failed untracked diff is dropped.
  if (tracked === null) return null;
  const added = untrackedPaths(workspace)
    .map(file => untrackedDiff(workspace, file))
    .filter((diff): diff is string => diff !== null && diff.trim() !== '');
  return [tracked, ...added].filter(part => part.trim() !== '').join('\n');
};

const defaultDependencies: ReviewDependencies = {
  discover: discoverHarnesses,
  dispatch: dispatchReview,
  readDiff: _readCumulativeDiff,
  validatorAvailable: () => executableOnPath('xmllint'),
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

/** Per-dispatch collision token for the delimiters. Not a secret; the reviewer sees it. */
export const _makeDeliveryToken = (): string => crypto.randomBytes(6).toString('hex');

/** Both ends of the channel use these; a drift would silently disable delivery. */
const beginMarker = (token: string): string => `<<<BEGIN REVIEW XML ${token}>>>`;
const endMarker = (token: string): string => `<<<END REVIEW XML ${token}>>>`;

/** CSI sequences. The leading ESC is required, or `<![CDATA[` would be stripped. */
// eslint-disable-next-line no-control-regex
const ANSI_PATTERN = /\u001b\[[0-9;?]*[ -/]*[@-~]/g;

/**
 * The last complete token-bearing region of reviewer stdout that looks like an
 * XML document. Last, because a harness may print the block twice; XML-shaped,
 * because the prompt itself contains the markers. `null` keeps the caller's
 * `findings-absent` outcome.
 */
export const _extractReviewDocument = (stdout: string, token: string): string | null => {
  const clean = stdout.replace(ANSI_PATTERN, '');
  const begin = beginMarker(token);
  const end = endMarker(token);
  // `lastIndexOf(x, -1)` searches from 0, so -1 terminates rather than wraps.
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
  diff: string;
  skillInstructions: string;
  /** This dispatch's collision token, spliced into the delivery delimiters. */
  deliveryToken: string;
}

/**
 * The reviewer dispatch. Travels on stdin, so it is neither argv-visible nor
 * bounded by ARG_MAX. Markers, not a fence, delimit the diff: a markdown diff
 * contains fences.
 */
export const buildReviewerPrompt = (input: ReviewerPromptInput): string =>
  [
    `Strikethroo code review gate — Plan ${input.planId}.`,
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
    '',
    '## How to deliver your findings',
    '',
    'Print the complete findings document as the final thing you print, between these',
    'exact lines:',
    '',
    beginMarker(input.deliveryToken),
    // Must not begin with `<?xml` or `<review`: `_extractReviewDocument` rejects
    // such a region, which is what stops an echoed prompt from reading as a document.
    '... the complete findings document, beginning with its XML declaration ...',
    endMarker(input.deliveryToken),
    '',
    'Copy those two lines from this dispatch; never invent a token. Print nothing after',
    'the closing line. Do not write the document to a file — this channel is the only',
    'one that is read. The document is validated against the schema named above, so an',
    'incomplete or invented document fails the review. Being unable to read the',
    'repository is not a reason to emit this block: a review you could not perform is a',
    'failed review, and emitting well-formed XML instead of reporting that failure is a',
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

const skip = (reason: ReviewSkipReason, detail: string): ReviewResult =>
  decide({ kind: 'skipped', reason, detail });

interface ReviewContext {
  strikethrooRoot: string;
  workspace: string;
  hookFile: string;
  hookContent: string;
  xsdFile: string;
}

/** The workspace shape the gate needs, or the skip or failure that ends the run. */
const resolveReviewContext = (
  startPath: string,
  validatorAvailable: () => boolean = () => executableOnPath('xmllint')
): { kind: 'resolved'; context: ReviewContext } | { kind: 'ended'; result: ReviewResult } => {
  // findStrikethrooRoot owns the workspace schema check; never bypass it.
  const strikethrooRoot = findStrikethrooRoot(startPath);
  if (!strikethrooRoot) {
    return {
      kind: 'ended',
      result: decide({
        kind: 'infrastructure-failure',
        detail: `No Strikethroo workspace was found from ${startPath}.`,
      }),
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

  // `xmllint` is a soft dependency: absence is a clean skip, checked before any
  // reviewer is dispatched. A skip is not a pass; its reason says the gate did not run.
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
    },
  };
};

/** Resolve, guard, discover, scope, dispatch, evaluate, report. Once; there is no loop. */
export const runReview = async (
  request: ReviewRequest,
  overrides: Partial<ReviewDependencies> = {}
): Promise<ReviewResult> => {
  const dependencies = { ...defaultDependencies, ...overrides };
  const startPath = request.startPath ?? process.cwd();

  const resolution = resolveReviewContext(startPath, dependencies.validatorAvailable);
  if (resolution.kind === 'ended') return resolution.result;
  const { strikethrooRoot, workspace, hookFile, hookContent, xsdFile } = resolution.context;

  const resolved = resolvePlan(request.plan, startPath);
  if (!resolved) {
    return decide({
      kind: 'infrastructure-failure',
      detail: `Plan "${request.plan}" was not found or is invalid.`,
    });
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
      `No harness other than \`${request.currentHarness}\` is installed and responsive, so the ` +
        'review gate was skipped.'
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
    diff,
    skillInstructions: readReviewerSkill(),
    deliveryToken,
  });

  const invocation = discovery.reviewerInvocations?.[harness];
  const dispatched = await dependencies.dispatch({
    harness,
    workspace,
    prompt,
    ...(invocation === undefined
      ? {}
      : {
          cliArgs: invocation.cliArgs,
        }),
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
