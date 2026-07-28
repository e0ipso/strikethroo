import { spawn } from 'child_process';

/**
 * The enforcement half of the code review gate: schema validation of an emitted
 * `review.xml`, the severity/confidence floors, and the compiled round ceiling.
 *
 * Everything here exists to counter one risk the plan names as its top one — an
 * over-rejecting reviewer auto-applying speculative changes to working code.
 * Three properties are load-bearing and must not be softened:
 *
 * 1. An absent `severity` or `confidence` falls below every floor. The schema
 *    declares both `use="optional"` with no default on purpose. There is no
 *    inference from the finding's text and no "unknown, so allow".
 * 2. An XSD-invalid document is a round failure, never "no findings". A missing
 *    validator is a distinct failure, never a silent pass.
 * 3. The round budget is read from user-editable prose but enforced here,
 *    clamped to `MAX_REVIEW_ROUNDS`. A user may tighten it, never loosen it.
 */

export type Severity = 'critical' | 'major' | 'minor' | 'info';
export type Confidence = 'high' | 'medium' | 'low';

/** Most to least consequential. */
const SEVERITY_RANK: Record<Severity, number> = { critical: 4, major: 3, minor: 2, info: 1 };
/** Most to least sure. */
const CONFIDENCE_RANK: Record<Confidence, number> = { high: 3, medium: 2, low: 1 };

/**
 * The compiled round ceiling. The hook states a budget in prose; this bounds it.
 * Rewriting or deleting the hook's budget line cannot raise it, so no edit to
 * `CODE_REVIEW.md` can produce a non-terminating review loop.
 */
export const MAX_REVIEW_ROUNDS = 3;

export const DEFAULT_SEVERITY_FLOOR: Severity = 'major';
export const DEFAULT_CONFIDENCE_FLOOR: Confidence = 'high';

/** Long enough for any plausible review document, short enough to never hang a gate. */
export const XMLLINT_TIMEOUT_MS = 30_000;

const isSeverity = (value: string): value is Severity => value in SEVERITY_RANK;
const isConfidence = (value: string): value is Confidence => value in CONFIDENCE_RANK;

/**
 * The mandate the hook expresses in prose. `notes` records every place a stated
 * value was clamped or ignored, so a user can see that their edit was bounded.
 */
export interface ReviewMandate {
  severityFloor: Severity;
  confidenceFloor: Confidence;
  /** Already clamped to `MAX_REVIEW_ROUNDS`. */
  roundBudget: number;
  notes: string[];
}

// Deliberately loose about the heading level and the surrounding backticks, and
// deliberately strict about the value: a hook edited into any shape still yields
// a bounded budget, and an unrecognised value never widens enforcement.
const SEVERITY_FLOOR_RE = /^[ \t]*#{0,6}[ \t]*severity floor[ \t]*:[ \t]*`?([a-z]+)`?/im;
const CONFIDENCE_FLOOR_RE = /^[ \t]*#{0,6}[ \t]*confidence floor[ \t]*:[ \t]*`?([a-z]+)`?/im;
const ROUND_BUDGET_RE = /^[ \t]*#{0,6}[ \t]*round budget[ \t]*:[ \t]*`?(-?\d{1,9})`?/im;

/**
 * Read the floors and the round budget out of `CODE_REVIEW.md`.
 *
 * Forgiving in exactly one direction. A floor the hook does not state falls back
 * to the compiled default. A budget the hook does not state, states as
 * nonsense, or states above the ceiling is clamped to `MAX_REVIEW_ROUNDS`; a
 * smaller positive budget is honoured, because tightening is the user's to do.
 */
export const parseReviewMandate = (hookContent: string): ReviewMandate => {
  const notes: string[] = [];

  const severityMatch = SEVERITY_FLOOR_RE.exec(hookContent);
  const statedSeverity = (severityMatch?.[1] ?? '').toLowerCase();
  let severityFloor: Severity = DEFAULT_SEVERITY_FLOOR;
  if (isSeverity(statedSeverity)) {
    severityFloor = statedSeverity;
  } else {
    notes.push(
      `The hook states no recognised severity floor, so the compiled default \`${DEFAULT_SEVERITY_FLOOR}\` applies.`
    );
  }

  const confidenceMatch = CONFIDENCE_FLOOR_RE.exec(hookContent);
  const statedConfidence = (confidenceMatch?.[1] ?? '').toLowerCase();
  let confidenceFloor: Confidence = DEFAULT_CONFIDENCE_FLOOR;
  if (isConfidence(statedConfidence)) {
    confidenceFloor = statedConfidence;
  } else {
    notes.push(
      `The hook states no recognised confidence floor, so the compiled default \`${DEFAULT_CONFIDENCE_FLOOR}\` applies.`
    );
  }

  const budgetMatch = ROUND_BUDGET_RE.exec(hookContent);
  let roundBudget = MAX_REVIEW_ROUNDS;
  if (budgetMatch === null) {
    notes.push(
      `The hook states no round budget, so the compiled ceiling of ${MAX_REVIEW_ROUNDS} rounds applies.`
    );
  } else {
    const stated = Number(budgetMatch[1]);
    if (!Number.isInteger(stated) || stated < 1) {
      notes.push(
        `The hook states a round budget of "${budgetMatch[1]}", which is not a positive whole number of rounds, so the compiled ceiling of ${MAX_REVIEW_ROUNDS} applies.`
      );
    } else if (stated > MAX_REVIEW_ROUNDS) {
      notes.push(
        `The hook states a round budget of ${stated}, above the compiled ceiling of ${MAX_REVIEW_ROUNDS}. The ceiling is enforced in code and cannot be raised by editing the hook, so ${MAX_REVIEW_ROUNDS} rounds apply.`
      );
    } else {
      roundBudget = stated;
    }
  }

  return { severityFloor, confidenceFloor, roundBudget, notes };
};

export type SchemaValidation =
  | { kind: 'valid' }
  | { kind: 'invalid'; detail: string }
  | { kind: 'validator-unavailable'; detail: string };

/**
 * Validate one document against the vendored XSD by shelling out to `xmllint`.
 * `spawn`, never `exec`: no shell, arguments passed as argv, so a path with
 * spaces or shell metacharacters cannot become a command.
 *
 * Three outcomes, kept distinct on purpose. An invalid document is a round
 * failure that names the document; a validator that could not produce a verdict
 * — not installed, not executable, or hung — is a round failure that names the
 * validator. Neither is ever reported as a clean review.
 */
export const validateAgainstSchema = (
  xsdFile: string,
  xmlFile: string,
  timeoutMs: number = XMLLINT_TIMEOUT_MS
): Promise<SchemaValidation> =>
  new Promise(resolve => {
    let settled = false;
    let diagnostics = '';
    const finish = (result: SchemaValidation): void => {
      if (settled) return;
      settled = true;
      resolve(result);
    };
    // --nonet: the schema and the document are both local, so nothing here has
    // any business reaching the network to resolve an entity or an import.
    const child = spawn('xmllint', ['--nonet', '--schema', xsdFile, xmlFile, '--noout'], {
      shell: false,
      stdio: ['ignore', 'ignore', 'pipe'],
    });
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      finish({
        kind: 'validator-unavailable',
        detail: `xmllint did not return a verdict on ${xmlFile} within ${timeoutMs} ms, so the findings could not be validated.`,
      });
    }, timeoutMs);
    child.stderr?.on('data', chunk => {
      if (diagnostics.length < 2000) {
        diagnostics += String(chunk).slice(0, 2000 - diagnostics.length);
      }
    });
    child.once('error', error => {
      clearTimeout(timer);
      const code = (error as { code?: string }).code;
      finish({
        kind: 'validator-unavailable',
        detail:
          code === 'ENOENT'
            ? '`xmllint` was not found on PATH. The review gate validates every emitted review.xml against the vendored schema and cannot certify findings without it. Install libxml2-utils (or your platform equivalent) and re-run.'
            : `\`xmllint\` could not be run (${code ?? 'unknown error'}): ${error.message}`,
      });
    });
    child.once('close', code => {
      clearTimeout(timer);
      finish(
        code === 0
          ? { kind: 'valid' }
          : {
              kind: 'invalid',
              detail: diagnostics.trim() || `xmllint exited ${code ?? 'with no status'}.`,
            }
      );
    });
  });

export interface ReviewFinding {
  /** `path` of the enclosing `<file>`. */
  file: string;
  /** e.g. `new:42-44`, `old:17-17`, or null for a file-level comment. */
  location: string | null;
  severity: Severity | null;
  confidence: Confidence | null;
  category: string | null;
  /** Whether the comment carries a `<suggestion>`, i.e. a local text replacement. */
  hasSuggestion: boolean;
  /** The `<body>` text, truncated. Enough to identify the finding in the artifact. */
  summary: string;
}

const SUMMARY_LIMIT = 400;

const decodeEntities = (text: string): string =>
  text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_match, digits: string) => String.fromCodePoint(Number(digits)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_match, hex: string) =>
      String.fromCodePoint(parseInt(hex, 16))
    )
    .replace(/&amp;/g, '&');

const localName = (raw: string): string => {
  const colon = raw.indexOf(':');
  return colon === -1 ? raw : raw.slice(colon + 1);
};

const ATTRIBUTE_RE = /([A-Za-z_:][-.\w:]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;

const parseAttributes = (source: string): Record<string, string> => {
  const attributes: Record<string, string> = {};
  ATTRIBUTE_RE.lastIndex = 0;
  let match = ATTRIBUTE_RE.exec(source);
  while (match !== null) {
    attributes[localName(match[1]!)] = decodeEntities(match[2] ?? match[3] ?? '');
    match = ATTRIBUTE_RE.exec(source);
  }
  return attributes;
};

/** Index just past the `>` that closes the tag starting at `start`, quote-aware. */
const findTagEnd = (xml: string, start: number): number => {
  let quote: string | null = null;
  for (let index = start + 1; index < xml.length; index += 1) {
    const character = xml[index]!;
    if (quote !== null) {
      if (character === quote) quote = null;
      continue;
    }
    if (character === '"' || character === "'") {
      quote = character;
      continue;
    }
    if (character === '>') return index + 1;
  }
  return xml.length;
};

const lineRange = (attributes: Record<string, string>): string | null => {
  const newStart = attributes['new-line-start'];
  const newEnd = attributes['new-line-end'];
  if (newStart !== undefined) return `new:${newStart}-${newEnd ?? newStart}`;
  const oldStart = attributes['old-line-start'];
  const oldEnd = attributes['old-line-end'];
  if (oldStart !== undefined) return `old:${oldStart}-${oldEnd ?? oldStart}`;
  return null;
};

interface PartialFinding {
  file: string;
  location: string | null;
  severity: Severity | null;
  confidence: Confidence | null;
  category: string | null;
  hasSuggestion: boolean;
  summary: string;
}

/**
 * Read every `<comment>` out of a `review.xml`.
 *
 * This is a linear tag scan rather than a parse through an XML library, because
 * the skill-scripts subtree carries no runtime dependencies and `package.json`
 * has none to offer. It is defensible only in one position: **the caller has
 * already validated the document against the vendored XSD with `xmllint`**, so
 * the element nesting, the attribute enums, and the child ordering are all
 * constrained before this function sees the text. An unvalidated scan of
 * arbitrary XML would not be defensible; run `validateAgainstSchema` first.
 *
 * Namespaces are handled by comparing local names, which is why no prefix has to
 * be bound: the document declares `urn:self-review:v2` as its default namespace
 * and a reviewer emitting it under a prefix is read identically.
 *
 * Comments, CDATA sections, processing instructions and doctype declarations are
 * skipped rather than scanned, so a `<body>` quoting XML at itself cannot be
 * mistaken for structure. An attribute value that arrives as an unexpanded
 * entity reference reads as an unrecognised enum value, which falls below every
 * floor — the safe direction.
 */
export const parseReviewFindings = (xml: string): ReviewFinding[] => {
  const findings: ReviewFinding[] = [];
  let file: string | null = null;
  let comment: PartialFinding | null = null;
  let capture: 'body' | 'category' | null = null;
  let buffer = '';
  let index = 0;

  const appendText = (text: string): void => {
    if (capture !== null) buffer += text;
  };

  while (index < xml.length) {
    const open = xml.indexOf('<', index);
    if (open === -1) break;
    if (open > index) appendText(decodeEntities(xml.slice(index, open)));

    if (xml.startsWith('<!--', open)) {
      const end = xml.indexOf('-->', open + 4);
      index = end === -1 ? xml.length : end + 3;
      continue;
    }
    if (xml.startsWith('<![CDATA[', open)) {
      const end = xml.indexOf(']]>', open + 9);
      appendText(xml.slice(open + 9, end === -1 ? xml.length : end));
      index = end === -1 ? xml.length : end + 3;
      continue;
    }
    if (xml.startsWith('<?', open)) {
      const end = xml.indexOf('?>', open + 2);
      index = end === -1 ? xml.length : end + 2;
      continue;
    }
    if (xml.startsWith('<!', open)) {
      index = findTagEnd(xml, open);
      continue;
    }

    const tagEnd = findTagEnd(xml, open);
    const raw = xml.slice(open + 1, tagEnd - 1);
    index = tagEnd;
    const closing = raw.startsWith('/');
    const selfClosing = !closing && raw.trimEnd().endsWith('/');
    const body = closing ? raw.slice(1) : selfClosing ? raw.trimEnd().slice(0, -1) : raw;
    const nameMatch = /^\s*([^\s/>]+)/.exec(body);
    if (nameMatch === null) continue;
    const name = localName(nameMatch[1]!);
    const rest = body.slice(nameMatch[0].length);

    if (closing) {
      if (name === 'body' && capture === 'body') {
        if (comment !== null) comment.summary = buffer.trim().slice(0, SUMMARY_LIMIT);
        capture = null;
      } else if (name === 'category' && capture === 'category') {
        if (comment !== null) comment.category = buffer.trim() || null;
        capture = null;
      } else if (name === 'comment') {
        if (comment !== null) findings.push({ ...comment });
        comment = null;
        capture = null;
      } else if (name === 'file') {
        file = null;
      }
      continue;
    }

    const attributes = parseAttributes(rest);
    if (name === 'file') {
      if (!selfClosing) file = attributes['path'] ?? '';
      continue;
    }
    if (name === 'comment') {
      // No case folding: the schema's enumerations are case-sensitive, so a
      // value this reads must be exactly a value the validator accepted.
      const severity = attributes['severity'] ?? '';
      const confidence = attributes['confidence'] ?? '';
      comment = {
        file: file ?? '',
        location: lineRange(attributes),
        // Absent, empty, and unrecognised all become null, and null falls below
        // every floor. This is the one place the fail-safe default lives.
        severity: isSeverity(severity) ? severity : null,
        confidence: isConfidence(confidence) ? confidence : null,
        category: null,
        hasSuggestion: false,
        summary: '',
      };
      capture = null;
      if (selfClosing) {
        findings.push({ ...comment });
        comment = null;
      }
      continue;
    }
    if (comment === null) continue;
    if (name === 'body') {
      capture = 'body';
      buffer = '';
    } else if (name === 'category') {
      capture = 'category';
      buffer = '';
    } else if (name === 'suggestion') {
      comment.hasSuggestion = true;
    }
  }

  return findings;
};

/** Why a finding was recorded rather than queued for an automatic fix. */
export type NonActionableReason =
  | 'severity-absent'
  | 'severity-below-floor'
  | 'confidence-absent'
  | 'confidence-below-floor'
  | 'no-suggestion';

export interface RecordedFinding extends ReviewFinding {
  reasons: NonActionableReason[];
}

export interface FindingsPartition {
  severityFloor: Severity;
  confidenceFloor: Confidence;
  actionable: ReviewFinding[];
  recorded: RecordedFinding[];
  counts: {
    total: number;
    /** Clears both floors, whether or not it carries a suggestion. */
    aboveFloor: number;
    /** Fails at least one floor, including every absent attribute. */
    belowFloor: number;
    /** Clears both floors **and** carries a suggestion. The only auto-fix set. */
    actionable: number;
    /** Everything not actionable. */
    recorded: number;
    /** Clears both floors but carries no suggestion: real findings, never applied. */
    aboveFloorWithoutSuggestion: number;
  };
}

/**
 * Split findings into the set an automatic fix round may act on and the set that
 * is only recorded.
 *
 * A finding is actionable only when all three hold: `severity` is present and at
 * or above the floor, `confidence` is present and at or above the floor, and it
 * carries a `<suggestion>`. The third condition is not an extra hurdle invented
 * here — `<suggestion>` requires `original-code` copied verbatim and is applied
 * by text matching, so a fix that cannot be expressed as a local text
 * replacement structurally cannot carry one. That is what keeps broad
 * speculative refactors out of the auto-fix set.
 */
export const partitionFindings = (
  findings: readonly ReviewFinding[],
  severityFloor: Severity,
  confidenceFloor: Confidence
): FindingsPartition => {
  const actionable: ReviewFinding[] = [];
  const recorded: RecordedFinding[] = [];
  let aboveFloor = 0;
  let aboveFloorWithoutSuggestion = 0;

  for (const finding of findings) {
    const reasons: NonActionableReason[] = [];
    if (finding.severity === null) {
      reasons.push('severity-absent');
    } else if (SEVERITY_RANK[finding.severity] < SEVERITY_RANK[severityFloor]) {
      reasons.push('severity-below-floor');
    }
    if (finding.confidence === null) {
      reasons.push('confidence-absent');
    } else if (CONFIDENCE_RANK[finding.confidence] < CONFIDENCE_RANK[confidenceFloor]) {
      reasons.push('confidence-below-floor');
    }
    const clearsFloors = reasons.length === 0;
    if (clearsFloors) aboveFloor += 1;
    if (!finding.hasSuggestion) {
      reasons.push('no-suggestion');
      if (clearsFloors) aboveFloorWithoutSuggestion += 1;
    }
    if (reasons.length === 0) {
      actionable.push(finding);
    } else {
      recorded.push({ ...finding, reasons });
    }
  }

  return {
    severityFloor,
    confidenceFloor,
    actionable,
    recorded,
    counts: {
      total: findings.length,
      aboveFloor,
      belowFloor: findings.length - aboveFloor,
      actionable: actionable.length,
      recorded: recorded.length,
      aboveFloorWithoutSuggestion,
    },
  };
};
