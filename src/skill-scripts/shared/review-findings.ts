import { spawn } from 'child_process';

/** Certify review.xml and project its findings through libxml. JavaScript never parses XML. */

export type Severity = 'critical' | 'major' | 'minor' | 'info';
export const SEVERITIES: readonly Severity[] = ['critical', 'major', 'minor', 'info'];

/** Long enough for any plausible review document, short enough to never hang a gate. */
export const XMLLINT_TIMEOUT_MS = 30_000;

export type SchemaValidation =
  | { kind: 'valid' }
  | { kind: 'invalid'; detail: string }
  | { kind: 'validator-unavailable'; detail: string };

type XmllintRun =
  | { kind: 'exited'; code: number | null; stdout: string; stderr: string }
  | { kind: 'launch-failed'; code: string | undefined; message: string }
  | { kind: 'timed-out' }
  | { kind: 'output-limit' };

const OUTPUT_CAP = 2000;

/**
 * One `xmllint` run. `spawn`, never `exec`, so a path cannot become a command.
 * `--nonet` is unconditional: the schema and the document are both local, so
 * nothing here has any business reaching the network. Entity expansion is never
 * enabled (no `--noent`, `--dtdattr`, `--loaddtd`); do not add those flags.
 */
const runXmllint = (
  args: readonly string[],
  timeoutMs: number,
  stdoutLimit = OUTPUT_CAP
): Promise<XmllintRun> =>
  new Promise(resolve => {
    let settled = false;
    let stdout = '';
    let stderr = '';
    const finish = (run: XmllintRun): void => {
      if (settled) return;
      settled = true;
      resolve(run);
    };
    const capped = (current: string, chunk: unknown): string =>
      current.length < OUTPUT_CAP
        ? current + String(chunk).slice(0, OUTPUT_CAP - current.length)
        : current;
    const child = spawn('xmllint', ['--nonet', ...args], {
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      finish({ kind: 'timed-out' });
    }, timeoutMs);
    child.stdout?.setEncoding('utf8');
    child.stderr?.setEncoding('utf8');
    child.stdout?.on('data', (chunk: string) => {
      if (stdout.length + chunk.length > stdoutLimit) {
        child.kill('SIGKILL');
        clearTimeout(timer);
        finish({ kind: 'output-limit' });
      } else {
        stdout += chunk;
      }
    });
    child.stderr?.on('data', chunk => {
      stderr = capped(stderr, chunk);
    });
    child.once('error', error => {
      clearTimeout(timer);
      finish({
        kind: 'launch-failed',
        code: (error as { code?: string }).code,
        message: error.message,
      });
    });
    child.once('close', code => {
      clearTimeout(timer);
      finish({ kind: 'exited', code, stdout, stderr });
    });
  });

/**
 * Validate one document against the XSD via `xmllint`. An invalid document and
 * an unavailable validator are distinct outcomes; neither is ever a clean review.
 */
export const validateAgainstSchema = async (
  xsdFile: string,
  xmlFile: string,
  timeoutMs: number = XMLLINT_TIMEOUT_MS
): Promise<SchemaValidation> => {
  const run = await runXmllint(['--schema', xsdFile, xmlFile, '--noout'], timeoutMs);
  switch (run.kind) {
    case 'output-limit':
      return {
        kind: 'validator-unavailable',
        detail: `xmllint exceeded its output limit for ${xmlFile}.`,
      };
    case 'timed-out':
      return {
        kind: 'validator-unavailable',
        detail: `xmllint did not return a verdict on ${xmlFile} within ${timeoutMs} ms, so the findings could not be validated.`,
      };
    case 'launch-failed':
      return {
        kind: 'validator-unavailable',
        detail:
          run.code === 'ENOENT'
            ? '`xmllint` was not found on PATH. The review gate validates every emitted review.xml against the vendored schema and cannot certify findings without it. Install libxml2-utils (or your platform equivalent) and re-run.'
            : `\`xmllint\` could not be run (${run.code ?? 'unknown error'}): ${run.message}`,
      };
    case 'exited':
      return run.code === 0
        ? { kind: 'valid' }
        : {
            kind: 'invalid',
            detail: run.stderr.trim() || `xmllint exited ${run.code ?? 'with no status'}.`,
          };
  }
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

const COUNT_FIELDS = ['total', ...SEVERITIES, 'unlabelled'] as const;
const COMMENTS_XPATH =
  "/*[local-name()='review' and namespace-uri()='urn:self-review:v2']" +
  "/*[local-name()='file' and namespace-uri()='urn:self-review:v2']" +
  "/*[local-name()='comment' and namespace-uri()='urn:self-review:v2']";
const LABELLED = SEVERITIES.map(label => `@severity='${label}'`).join(' or ');
const COUNTS_XPATH = `concat(${[
  `count(${COMMENTS_XPATH})`,
  ...SEVERITIES.map(label => `count(${COMMENTS_XPATH}[@severity='${label}'])`),
  `count(${COMMENTS_XPATH}[not(${LABELLED})])`,
  'count(/*/*/*)',
].join(", ',', ")})`;

/** Read all tallies in one native XPath evaluation after schema validation. */
export const countFindingsWithXmllint = async (
  xmlFile: string,
  timeoutMs: number = XMLLINT_TIMEOUT_MS
): Promise<FindingCounts | null> => {
  const run = await runXmllint(['--xpath', COUNTS_XPATH, xmlFile], timeoutMs);
  if (run.kind !== 'exited' || run.code !== 0) return null;
  const values = run.stdout.trim().split(',');
  if (
    values.length !== COUNT_FIELDS.length + 1 ||
    values.some(value => !/^\d+(?:\.0+)?$/.test(value))
  ) {
    return null;
  }
  const counts = Object.fromEntries(
    COUNT_FIELDS.map((field, index) => [field, Number(values[index])])
  ) as unknown as FindingCounts;
  if (
    Object.values(counts).some(value => !Number.isSafeInteger(value)) ||
    counts.total !== Number(values[COUNT_FIELDS.length]) ||
    counts.total !== SEVERITIES.reduce((sum, label) => sum + counts[label], counts.unlabelled)
  ) {
    return null;
  }
  return counts;
};

export type Confidence = 'high' | 'medium' | 'low';
export interface ReviewFinding {
  file: string;
  location: string | null;
  severity: Severity | null;
  confidence: Confidence | null;
  category: string | null;
  summary: string;
}

const PROJECTION_BATCH_SIZE = 8;
const PROJECTION_BATCH_OUTPUT_LIMIT = 8 * 1024 * 1024;
const PROJECTION_TOTAL_OUTPUT_LIMIT = 64 * 1024 * 1024;
const SUMMARY_LIMIT = 400;

/** Each XPath string is framed by its Unicode code-point length, not a sentinel that data can contain. */
const frameXPath = (expression: string): string =>
  `string-length(string(${expression})), ':', string(${expression})`;

const projectionXPath = (start: number, end: number): string => {
  const fields: string[] = [];
  for (let index = start; index < end; index++) {
    // XSD certification and the structural tally above establish that every
    // third-level element is a qualified comment. Avoid re-filtering the whole
    // document for every projected field.
    const comment = `(/*/*/*)[${index + 1}]`;
    fields.push(
      ...[
        `count(${comment})`,
        `${comment}/../@path`,
        ...[
          'new-line-start',
          'new-line-end',
          'old-line-start',
          'old-line-end',
          'severity',
          'confidence',
        ].map(attribute => `${comment}/@${attribute}`),
        ...['category', 'body'].map(
          name => `${comment}/*[local-name()='${name}' and namespace-uri()='urn:self-review:v2']`
        ),
      ].map(frameXPath)
    );
  }
  return `concat(${fields.join(', ')})`;
};

/** XPath string-length counts Unicode characters; JS string indices count UTF-16 code units. */
const unframe = (output: string): string[] | null => {
  const fields: string[] = [];
  let offset = 0;
  while (offset < output.length) {
    const colon = output.indexOf(':', offset);
    const length = output.slice(offset, colon);
    if (colon === -1 || !/^\d+$/.test(length)) return null;
    const count = Number(length);
    if (!Number.isSafeInteger(count) || count > output.length) return null;
    let end = colon + 1;
    for (let character = 0; character < count; character++) {
      if (end >= output.length) return null;
      end += output.codePointAt(end)! > 0xffff ? 2 : 1;
    }
    fields.push(output.slice(colon + 1, end));
    offset = end;
  }
  return fields;
};

/**
 * Preserve the JSON findings contract using native XPath strings. Fixed-size batches
 * bound argv/output size; one deadline and a total output limit bound the whole projection.
 */
export const readFindingsWithXmllint = async (
  xmlFile: string,
  count: number,
  timeoutMs: number = XMLLINT_TIMEOUT_MS
): Promise<ReviewFinding[] | null> => {
  if (!Number.isSafeInteger(count) || count < 0) return null;
  const findings: ReviewFinding[] = [];
  const deadline = Date.now() + timeoutMs;
  let totalOutput = 0;
  for (let start = 0; start < count; start += PROJECTION_BATCH_SIZE) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) return null;
    const end = Math.min(start + PROJECTION_BATCH_SIZE, count);
    const run = await runXmllint(
      ['--xpath', projectionXPath(start, end), xmlFile],
      remaining,
      PROJECTION_BATCH_OUTPUT_LIMIT
    );
    if (run.kind !== 'exited' || run.code !== 0) return null;
    totalOutput += run.stdout.length;
    if (totalOutput > PROJECTION_TOTAL_OUTPUT_LIMIT) return null;
    // xmllint appends one transport newline after the XPath string result.
    const fields = unframe(run.stdout.endsWith('\n') ? run.stdout.slice(0, -1) : run.stdout);
    if (fields === null || fields.length !== (end - start) * 10) return null;
    for (let offset = 0; offset < fields.length; offset += 10) {
      const [
        exists,
        file,
        newStart,
        newEnd,
        oldStart,
        oldEnd,
        severity,
        confidence,
        category,
        body,
      ] = fields.slice(offset, offset + 10) as [
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
      ];
      if (exists !== '1') return null;
      findings.push({
        file,
        location: newStart
          ? `new:${newStart}-${newEnd || newStart}`
          : oldStart
            ? `old:${oldStart}-${oldEnd || oldStart}`
            : null,
        severity: (SEVERITIES as readonly string[]).includes(severity)
          ? (severity as Severity)
          : null,
        confidence: ['high', 'medium', 'low'].includes(confidence)
          ? (confidence as Confidence)
          : null,
        category: category.trim() || null,
        summary: body.trim().slice(0, SUMMARY_LIMIT),
      });
    }
  }
  return findings;
};

/**
 * Comments, CDATA, and processing instructions removed, tokenized in document
 * order so an opener inside one construct (`<?p <!-- ?>`) cannot hide what
 * follows it. An unterminated section runs to the end.
 */
const SKIPPED_SECTIONS: ReadonlyArray<readonly [string, string]> = [
  ['<!--', '-->'],
  ['<![CDATA[', ']]>'],
  ['<?', '?>'],
];

const stripCommentsCdataAndPis = (xml: string): string => {
  const kept: string[] = [];
  let index = 0;
  let start = 0;
  while ((index = xml.indexOf('<', index)) !== -1) {
    const section = SKIPPED_SECTIONS.find(([opener]) => xml.startsWith(opener, index));
    if (section === undefined) {
      index += 1;
      continue;
    }
    kept.push(xml.slice(start, index));
    const [opener, closer] = section;
    const end = xml.indexOf(closer, index + opener.length);
    index = end === -1 ? xml.length : end + closer.length;
    start = index;
  }
  kept.push(xml.slice(start));
  return kept.join('');
};

const FORBIDDEN_DECLARATION_RE = /<!(DOCTYPE|ENTITY|ELEMENT|ATTLIST|NOTATION)\b/i;

/**
 * Whether the document carries a DTD or entity declaration outside comments and
 * CDATA. A DTD can change the document's meaning, so it is refused before validation.
 */
export const hasForbiddenDeclarations = (xml: string): boolean =>
  FORBIDDEN_DECLARATION_RE.test(stripCommentsCdataAndPis(xml));
