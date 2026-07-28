/**
 * Tests for the review gate's enforcement logic (`shared/review-findings.ts`):
 * the round-budget clamp, real `xmllint` schema validation against the
 * vendored XSD, and the severity/confidence/suggestion partition.
 *
 * Per the project's test philosophy this does not test that `xmllint`
 * validates XML — that is libxml's job — it tests that this module reaches
 * the right verdict from xmllint's exit code (never "no findings" for an
 * invalid document, never a silent pass for a missing validator), and that
 * the hand-rolled tag scanner used only on already-validated documents never
 * mistakes escaped or commented-out markup for real structure.
 *
 * Named `.integration` because `validateAgainstSchema` spawns a real
 * `xmllint` process against the real vendored schema file.
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  DEFAULT_CONFIDENCE_FLOOR,
  DEFAULT_SEVERITY_FLOOR,
  MAX_REVIEW_ROUNDS,
  parseReviewFindings,
  parseReviewMandate,
  partitionFindings,
  validateAgainstSchema,
} from '../skill-scripts/shared/review-findings';
import { buildReviewXml, REAL_XSD_PATH } from './fixtures/review-gate';

describe('parseReviewMandate — round budget bounding', () => {
  const hookWith = (budgetLine: string | null): string =>
    ['# CODE_REVIEW Hook', '', budgetLine ?? '(no budget line at all)', ''].join('\n');

  it('falls back to the compiled ceiling when the hook states no round budget', () => {
    const mandate = parseReviewMandate(hookWith(null));
    expect(mandate.roundBudget).toBe(MAX_REVIEW_ROUNDS);
    expect(mandate.notes.some(note => note.includes('no round budget'))).toBe(true);
  });

  it.each([9999, 50])('clamps a loosened round budget of %d to the compiled ceiling', stated => {
    const mandate = parseReviewMandate(hookWith(`## Round Budget: ${stated}`));
    expect(mandate.roundBudget).toBe(MAX_REVIEW_ROUNDS);
    expect(mandate.notes.some(note => note.includes(String(stated)))).toBe(true);
  });

  it.each([1, 2])('honours a tightened round budget of %d', stated => {
    const mandate = parseReviewMandate(hookWith(`## Round Budget: ${stated}`));
    expect(mandate.roundBudget).toBe(stated);
    // No note about the round budget specifically — it was honoured, not clamped.
    // (The fixture hook states no severity/confidence floor, so those two
    // compiled-default notes are still expected here.)
    expect(mandate.notes.some(note => note.toLowerCase().includes('round budget'))).toBe(false);
  });

  it.each(['0', '-1', 'not-a-number', ''])(
    'falls back to the compiled ceiling for a nonsense round budget %j',
    stated => {
      const mandate = parseReviewMandate(hookWith(`## Round Budget: ${stated}`));
      expect(mandate.roundBudget).toBe(MAX_REVIEW_ROUNDS);
    }
  );

  it('falls back to the compiled ceiling when the budget line is deleted entirely', () => {
    const mandate = parseReviewMandate(
      '# CODE_REVIEW Hook\n\nNo round budget mentioned anywhere.\n'
    );
    expect(mandate.roundBudget).toBe(MAX_REVIEW_ROUNDS);
  });

  it('falls back to the compiled default floors when the hook states none', () => {
    const mandate = parseReviewMandate('# CODE_REVIEW Hook\n');
    expect(mandate.severityFloor).toBe(DEFAULT_SEVERITY_FLOOR);
    expect(mandate.confidenceFloor).toBe(DEFAULT_CONFIDENCE_FLOOR);
  });
});

describe('validateAgainstSchema — real xmllint against the vendored XSD', () => {
  let dir: string;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'strikethroo-xsd-'));
  });

  afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

  const writeXml = (content: string): string => {
    const file = path.join(dir, 'review.xml');
    fs.writeFileSync(file, content);
    return file;
  };

  it('reports valid for a document conforming to the schema', async () => {
    const file = writeXml(
      buildReviewXml([
        { file: 'src/a.ts', severity: 'major', confidence: 'high', hasSuggestion: true },
      ])
    );
    await expect(validateAgainstSchema(REAL_XSD_PATH, file)).resolves.toEqual({ kind: 'valid' });
  });

  it('reports invalid, with diagnostic detail, for a document that violates the schema', async () => {
    // change-type is a required enumeration; "sideways" is not a member.
    const file = writeXml(
      '<?xml version="1.0" encoding="UTF-8"?>\n' +
        '<review xmlns="urn:self-review:v2" timestamp="2026-01-01T00:00:00Z">' +
        '<file path="a.ts" change-type="sideways" viewed="true"/>' +
        '</review>\n'
    );
    const result = await validateAgainstSchema(REAL_XSD_PATH, file);
    expect(result.kind).toBe('invalid');
    expect(result.kind === 'invalid' && result.detail.length).toBeGreaterThan(0);
  });

  it('reports invalid for a document that is not well-formed XML at all', async () => {
    const file = writeXml('<review><file path="a.ts"></review>');
    const result = await validateAgainstSchema(REAL_XSD_PATH, file);
    expect(result.kind).toBe('invalid');
  });

  it('reports validator-unavailable, not a silent pass, when xmllint is not on PATH', async () => {
    const file = writeXml(
      buildReviewXml([{ file: 'src/a.ts', severity: 'major', confidence: 'high' }])
    );
    const previousPath = process.env.PATH;
    // An empty PATH cannot resolve `xmllint`, so spawn fails with ENOENT —
    // this is the "validator could not be run" branch, distinct from "invalid".
    process.env.PATH = '';
    try {
      const result = await validateAgainstSchema(REAL_XSD_PATH, file);
      expect(result.kind).toBe('validator-unavailable');
    } finally {
      process.env.PATH = previousPath;
    }
  });
});

describe('parseReviewFindings — never forges structure from text', () => {
  it('does not read a <suggestion> quoted inside CDATA as a real suggestion', () => {
    const xml = buildReviewXml([
      {
        file: 'src/a.ts',
        severity: 'major',
        confidence: 'high',
        rawInner:
          '<body><![CDATA[Example: <suggestion><original-code>x</original-code><proposed-code>y</proposed-code></suggestion>]]></body><category>bug</category>',
      },
    ]);
    const findings = parseReviewFindings(xml);
    expect(findings).toHaveLength(1);
    expect(findings[0]!.hasSuggestion).toBe(false);
    expect(findings[0]!.summary).toContain('<suggestion>');
  });

  it('does not read an escaped &lt;suggestion&gt; in body text as a real suggestion', () => {
    const xml = buildReviewXml([
      {
        file: 'src/a.ts',
        severity: 'major',
        confidence: 'high',
        rawInner:
          '<body>Do not write &lt;suggestion&gt;&lt;original-code&gt;x&lt;/original-code&gt;&lt;/suggestion&gt; here.</body><category>bug</category>',
      },
    ]);
    const findings = parseReviewFindings(xml);
    expect(findings).toHaveLength(1);
    expect(findings[0]!.hasSuggestion).toBe(false);
    expect(findings[0]!.summary).toContain(
      '<suggestion><original-code>x</original-code></suggestion>'
    );
  });

  it('does not read a <suggestion> inside an XML comment as a real suggestion', () => {
    const xml = buildReviewXml([
      {
        file: 'src/a.ts',
        severity: 'major',
        confidence: 'high',
        rawInner:
          '<!-- <suggestion><original-code>x</original-code><proposed-code>y</proposed-code></suggestion> -->' +
          '<body>No fix available.</body><category>bug</category>',
      },
    ]);
    const findings = parseReviewFindings(xml);
    expect(findings).toHaveLength(1);
    expect(findings[0]!.hasSuggestion).toBe(false);
  });
});

describe('partitionFindings — the actionable/recorded threshold', () => {
  it('actions only above-floor findings that carry a suggestion; every other reason lands in recorded', () => {
    const xml = buildReviewXml([
      {
        file: 'a.ts',
        severity: 'major',
        confidence: 'high',
        hasSuggestion: true,
        body: 'actionable',
      },
      {
        file: 'b.ts',
        severity: 'minor',
        confidence: 'high',
        hasSuggestion: true,
        body: 'below-severity',
      },
      {
        file: 'c.ts',
        severity: 'major',
        confidence: 'low',
        hasSuggestion: true,
        body: 'below-confidence',
      },
      { file: 'd.ts', confidence: 'high', hasSuggestion: true, body: 'severity-absent' },
      { file: 'e.ts', severity: 'major', hasSuggestion: true, body: 'confidence-absent' },
      {
        file: 'f.ts',
        severity: 'major',
        confidence: 'high',
        hasSuggestion: false,
        body: 'no-suggestion',
      },
    ]);
    const findings = parseReviewFindings(xml);
    expect(findings).toHaveLength(6);

    const partition = partitionFindings(findings, 'major', 'high');

    expect(partition.actionable).toHaveLength(1);
    expect(partition.actionable[0]!.summary).toBe('actionable');
    expect(partition.recorded).toHaveLength(5);
    expect(partition.recorded.map(f => f.summary).sort()).toEqual(
      [
        'below-confidence',
        'below-severity',
        'confidence-absent',
        'no-suggestion',
        'severity-absent',
      ].sort()
    );

    expect(partition.recorded.find(f => f.summary === 'below-severity')?.reasons).toEqual([
      'severity-below-floor',
    ]);
    expect(partition.recorded.find(f => f.summary === 'below-confidence')?.reasons).toEqual([
      'confidence-below-floor',
    ]);
    expect(partition.recorded.find(f => f.summary === 'severity-absent')?.reasons).toEqual([
      'severity-absent',
    ]);
    expect(partition.recorded.find(f => f.summary === 'confidence-absent')?.reasons).toEqual([
      'confidence-absent',
    ]);
    expect(partition.recorded.find(f => f.summary === 'no-suggestion')?.reasons).toEqual([
      'no-suggestion',
    ]);

    expect(partition.counts).toEqual({
      total: 6,
      aboveFloor: 2, // actionable + no-suggestion both clear both floors
      belowFloor: 4,
      actionable: 1,
      recorded: 5,
      aboveFloorWithoutSuggestion: 1,
    });
  });
});
