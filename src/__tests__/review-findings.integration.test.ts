/**
 * Tests for the review gate's certification logic (`shared/review-findings.ts`):
 * real `xmllint` schema validation against the vendored XSD, the hand-rolled
 * tag scanner, and the advisory severity tally.
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
  countFindings,
  parseReviewFindings,
  validateAgainstSchema,
} from '../skill-scripts/shared/review-findings';
import { buildReviewXml, REAL_XSD_PATH } from './fixtures/review-gate';

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
  // The scanner is a linear tag walk, safe only because the document was
  // already validated. These pin the three ways text can look like structure.
  it('does not read a <comment> quoted inside CDATA as a second finding', () => {
    const xml = buildReviewXml([
      {
        file: 'src/a.ts',
        severity: 'major',
        confidence: 'high',
        rawInner:
          '<body><![CDATA[Example: <comment severity="critical"><body>x</body>' +
          '<category>forged</category></comment>]]></body><category>bug</category>',
      },
    ]);
    const findings = parseReviewFindings(xml);
    expect(findings).toHaveLength(1);
    expect(findings[0]!.category).toBe('bug');
    expect(findings[0]!.severity).toBe('major');
    expect(findings[0]!.summary).toContain('<comment');
  });

  it('does not read an escaped &lt;category&gt; in body text as the category', () => {
    const xml = buildReviewXml([
      {
        file: 'src/a.ts',
        severity: 'major',
        confidence: 'high',
        rawInner:
          '<body>Do not write &lt;category&gt;forged&lt;/category&gt; here.</body>' +
          '<category>bug</category>',
      },
    ]);
    const findings = parseReviewFindings(xml);
    expect(findings).toHaveLength(1);
    expect(findings[0]!.category).toBe('bug');
    expect(findings[0]!.summary).toContain('<category>forged</category>');
  });

  it('does not read a <comment> inside an XML comment as a second finding', () => {
    const xml = buildReviewXml([
      {
        file: 'src/a.ts',
        severity: 'major',
        confidence: 'high',
        rawInner:
          '<!-- <comment severity="critical"><body>x</body><category>forged</category></comment> -->' +
          '<body>No fix available.</body><category>bug</category>',
      },
    ]);
    const findings = parseReviewFindings(xml);
    expect(findings).toHaveLength(1);
    expect(findings[0]!.category).toBe('bug');
  });

  it('reads an unrecognised severity as no label rather than guessing one', () => {
    const xml = buildReviewXml([
      { file: 'src/a.ts', severity: 'catastrophic', confidence: 'high', body: 'bogus severity' },
    ]);
    const findings = parseReviewFindings(xml);
    expect(findings).toHaveLength(1);
    expect(findings[0]!.severity).toBeNull();
    expect(findings[0]!.confidence).toBe('high');
  });

  it('ignores a <suggestion> entirely: it is no longer part of a finding', () => {
    const xml = buildReviewXml([
      { file: 'src/a.ts', severity: 'major', confidence: 'high', hasSuggestion: true },
    ]);
    const findings = parseReviewFindings(xml);
    expect(findings).toHaveLength(1);
    expect(Object.keys(findings[0]!)).not.toContain('hasSuggestion');
  });
});

describe('countFindings — an advisory tally, not a filter', () => {
  it('counts every finding by label and never drops one', () => {
    const findings = parseReviewFindings(
      buildReviewXml([
        { file: 'a.ts', severity: 'critical', confidence: 'high', body: 'one' },
        { file: 'a.ts', severity: 'major', confidence: 'low', body: 'two' },
        { file: 'b.ts', severity: 'minor', confidence: 'medium', body: 'three' },
        { file: 'b.ts', severity: 'info', body: 'four' },
        { file: 'c.ts', confidence: 'high', body: 'five, no severity' },
      ])
    );
    // Every one is counted, including the unlabelled one and the `low`
    // confidence one. Nothing here is a threshold.
    expect(countFindings(findings)).toEqual({
      total: 5,
      critical: 1,
      major: 1,
      minor: 1,
      info: 1,
      unlabelled: 1,
    });
  });

  it('reports an empty review as zero rather than as an absence', () => {
    expect(countFindings([])).toEqual({
      total: 0,
      critical: 0,
      major: 0,
      minor: 0,
      info: 0,
      unlabelled: 0,
    });
  });
});
