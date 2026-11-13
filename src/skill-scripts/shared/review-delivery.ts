import * as crypto from 'crypto';

/** Per-dispatch collision token for the delimiters. Not a secret; the reviewer sees it. */
export const makeDeliveryToken = (): string => crypto.randomBytes(6).toString('hex');

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
export const extractReviewDocument = (stdout: string, token: string): string | null => {
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
  `Strikethroo code review gate — Plan ${input.planId}.

You are the independent reviewer on a different harness than the implementer.
Do not edit, create, or delete source files. Do not run formatters or commit.
Report finding counts, then print one complete findings document as your final output.

Repository / workspace root: ${input.workspace}
Strikethroo workspace root: ${input.strikethrooRoot}
Plan document (read it in full): ${input.planFile}
Review mandate hook: ${input.hookFile}
Findings schema to validate against: ${input.xsdFile}
Base commit anchoring this plan's scope: ${input.baseCommit}

## How to deliver your findings

Print the complete XML document, beginning with its XML declaration, between these exact lines:

${beginMarker(input.deliveryToken)}
... the complete findings document, beginning with its XML declaration ...
${endMarker(input.deliveryToken)}

Copy the delimiters exactly; never invent a token. Print nothing after the closing line.
Do not write the document to a file. Only stdout is read. Validate against the schema above;
an incomplete or invented document fails review. If you cannot read the repository or perform
the review, report that failure without emitting a findings block.

## Review mandate (authoritative — it overrides the reviewer instructions below)

${input.hookContent.trim()}

## Reviewer instructions

${input.skillInstructions.trim()}

## Cumulative diff

Produced with \`git diff ${input.baseCommit} --\` in ${input.workspace}, from the recorded base
commit against the current working tree. Committed and uncommitted changes are both in scope.
Review this cumulative diff, not an incremental one.
${
  input.diff.trim().length === 0
    ? '\nThe cumulative diff is empty. Emit a <review> with no <file> children and report\nzero findings. That is not an error.'
    : `\n<<<BEGIN CUMULATIVE DIFF>>>\n${input.diff}\n<<<END CUMULATIVE DIFF>>>`
}
`;
