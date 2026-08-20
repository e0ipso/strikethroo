import { spawn } from 'child_process';

/**
 * The certification half of the code review gate: schema validation of an
 * emitted `review.xml` and a reader for the findings it carries.
 *
 * The gate reports; it does not decide. A second harness gives its opinion on
 * the diff, the findings are recorded, and the implementer reads them and
 * chooses what to act on. `severity` and `confidence` ride along as advisory
 * triage labels and nothing branches on them.
 *
 * One property is load-bearing and must not be softened: an XSD-invalid
 * document is a failed review, never "no findings", and a missing validator is
 * a distinct failure, never a silent pass. Telling "the reviewer found nothing"
 * apart from "the reviewer never ran" is the whole value of the gate.
 */

export type Severity = 'critical' | 'major' | 'minor' | 'info';
export type Confidence = 'high' | 'medium' | 'low';

export const SEVERITIES: readonly Severity[] = ['critical', 'major', 'minor', 'info'];
const CONFIDENCES: readonly Confidence[] = ['high', 'medium', 'low'];

/** Long enough for any plausible review document, short enough to never hang a gate. */
export const XMLLINT_TIMEOUT_MS = 30_000;

const isSeverity = (value: string): value is Severity =>
  (SEVERITIES as readonly string[]).includes(value);
const isConfidence = (value: string): value is Confidence =>
  (CONFIDENCES as readonly string[]).includes(value);

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
 * entity reference reads as an unrecognised enum value, which becomes a null
 * label rather than a guessed one.
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
        // Absent, empty, and unrecognised all become null. The label is
        // advisory, so an unreadable one is dropped rather than guessed at.
        severity: isSeverity(severity) ? severity : null,
        confidence: isConfidence(confidence) ? confidence : null,
        category: null,
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
    }
  }

  return findings;
};

/** How many findings carry each severity label, plus how many carry none. */
export interface FindingCounts {
  total: number;
  critical: number;
  major: number;
  minor: number;
  info: number;
  unlabelled: number;
}

/**
 * Tally findings by severity for the report.
 *
 * This is reporting only. Nothing downstream branches on the result: the
 * implementer reads `review.xml` and decides for itself what deserves a fix.
 */
export const countFindings = (findings: readonly ReviewFinding[]): FindingCounts => {
  const counts: FindingCounts = {
    total: findings.length,
    critical: 0,
    major: 0,
    minor: 0,
    info: 0,
    unlabelled: 0,
  };
  for (const finding of findings) {
    if (finding.severity === null) counts.unlabelled += 1;
    else counts[finding.severity] += 1;
  }
  return counts;
};
