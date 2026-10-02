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

import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  countCommentsWithXmllint,
  countFindings,
  hasForbiddenDeclarations,
  parseReviewFindings,
  validateAgainstSchema,
} from '../skill-scripts/shared/review-findings';
import { _classify, runReview, type ReviewDependencies } from '../skill-scripts/code-review';
import {
  buildReviewXml,
  FAKE_SHA,
  makeReviewGateWorkspace,
  REAL_XSD_PATH,
} from './fixtures/review-gate';

const xmllintAvailable = spawnSync('xmllint', ['--version'], { shell: false }).status === 0;

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

describe('hasForbiddenDeclarations — DTD syntax is refused before the schema sees it', () => {
  const REVIEW = '<review xmlns="urn:self-review:v2" timestamp="2026-01-01T00:00:00Z"/>';

  it('flags every declaration keyword outside comments and CDATA, whatever its case', () => {
    const declarations = [
      '<!DOCTYPE review>',
      "<!DOCTYPE review [ <!-- it's --> ]>",
      '<!doctype review>',
      '<!ENTITY x "y">',
      '<!ELEMENT review ANY>',
      '<!ATTLIST review a CDATA #IMPLIED>',
      '<!NOTATION n SYSTEM "x">',
      // A comment before the declaration must not hide it.
      '<!-- harmless --><!DOCTYPE review>',
    ];
    for (const declaration of declarations) {
      expect(hasForbiddenDeclarations(`<?xml version="1.0"?>\n${declaration}\n${REVIEW}`)).toBe(
        true
      );
    }
  });

  it('accepts the same text when it is quoted inside a comment, CDATA, or escaped', () => {
    const quoted = [
      '<!-- <!DOCTYPE review [ <!ENTITY x "y"> ]> -->',
      '<![CDATA[<!DOCTYPE review><!ENTITY x "y">]]>',
      '&lt;!DOCTYPE review&gt; &lt;!ENTITY x "y"&gt;',
      '<!DOCTYPES is not a keyword, nor is <!ENTITYX>',
    ];
    for (const text of quoted) {
      expect(hasForbiddenDeclarations(`<?xml version="1.0"?>\n${text}\n${REVIEW}`)).toBe(false);
    }
    expect(hasForbiddenDeclarations(buildReviewXml([{ file: 'a.ts', severity: 'minor' }]))).toBe(
      false
    );
  });
});

/**
 * The scanner is only trusted because it agrees with the validator. These run
 * the real `xmllint` and skip only where it is absent — in CI it is installed,
 * so the path is always exercised there.
 */
describe.skipIf(!xmllintAvailable)('certification integrity — scanner and validator agree', () => {
  let dir: string;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'strikethroo-count-'));
  });

  afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

  const writeXml = (name: string, content: string): string => {
    const file = path.join(dir, name);
    fs.writeFileSync(file, content);
    return file;
  };

  // Default namespace, mixed quoting, a comment carrying every delimiter the
  // scanner cares about, a CDATA body quoting a <comment>, and escaped markup.
  const DEFAULT_NAMESPACE =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<!-- it\'s a "review" <with> angle > brackets -->\n' +
    '<review xmlns="urn:self-review:v2" timestamp=\'2026-01-01T00:00:00Z\'>' +
    '<file path="src/a.ts" change-type=\'modified\' viewed="true">' +
    '<comment severity=\'critical\' confidence="high"><body><![CDATA[Quoted: ' +
    '<comment severity="info"><body>x</body><category>y</category></comment>]]></body>' +
    '<category>security</category></comment>' +
    '<!-- <comment><body>in a comment \'"<></body><category>c</category></comment> -->' +
    '<comment severity="major"><body>Escaped &lt;comment&gt; &amp; &quot;q&quot; &apos;a&apos;' +
    '</body><category>bug</category></comment>' +
    '</file>' +
    "<file path='src/b.ts' change-type=\"added\" viewed='false'/>" +
    '</review>\n';

  // The same shape under a prefix: local names, never prefixes, are what count.
  const PREFIXED_NAMESPACE =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<sr:review xmlns:sr="urn:self-review:v2" timestamp="2026-01-01T00:00:00Z">' +
    '<sr:file path="src/a.ts" change-type="modified" viewed="true">' +
    "<sr:comment severity='minor' confidence='low'><sr:body>one</sr:body>" +
    '<sr:category>style</sr:category></sr:comment>' +
    '<sr:comment><sr:body><![CDATA[two <sr:comment/>]]></sr:body><sr:category>q</sr:category>' +
    '</sr:comment>' +
    '<sr:comment severity="info"><sr:body>three &lt;sr:comment/&gt;</sr:body>' +
    '<sr:category>nit</sr:category></sr:comment>' +
    '</sr:file></sr:review>\n';

  it('counts exactly what xmllint counts, across namespaces, comments, CDATA, escaping and quoting', async () => {
    const cases: Array<[string, string, number]> = [
      ['default.xml', DEFAULT_NAMESPACE, 2],
      ['prefixed.xml', PREFIXED_NAMESPACE, 3],
    ];
    for (const [name, xml, expected] of cases) {
      const file = writeXml(name, xml);
      // Each document is one the gate would accept, so the comparison is on
      // certifiable input, not on arbitrary XML.
      expect(hasForbiddenDeclarations(xml)).toBe(false);
      await expect(validateAgainstSchema(REAL_XSD_PATH, file)).resolves.toEqual({
        kind: 'valid',
      });
      const independent = await countCommentsWithXmllint(file);
      expect(independent).toBe(expected);
      expect(parseReviewFindings(xml)).toHaveLength(expected);
    }
  });

  it('returns null, never a number, when xmllint cannot produce a count', async () => {
    await expect(countCommentsWithXmllint(writeXml('bad.xml', '<review><file>'))).resolves.toBe(
      null
    );
    await expect(countCommentsWithXmllint(path.join(dir, 'missing.xml'))).resolves.toBe(null);
  });

  it('never certifies the audit payload (a DOCTYPE whose comment carries an apostrophe) as a clean review', async () => {
    // Schema-valid, and xmllint counts one critical finding — but the raw
    // scanner's quote tracking is derailed by the apostrophe and reads none.
    // Without an upstream rejection this is a certified "Pass" with a finding
    // sitting in review.xml.
    const payload =
      '<?xml version="1.0" encoding="UTF-8"?>\n' +
      "<!DOCTYPE review [ <!-- it's --> ]>\n" +
      '<review xmlns="urn:self-review:v2" timestamp="2026-01-01T00:00:00Z">' +
      "<file path='src/x.ts' change-type='modified' viewed='true'>" +
      "<comment severity='critical' confidence='high'><body>Boom</body>" +
      '<category>security</category></comment></file></review>\n';
    await expect(
      validateAgainstSchema(REAL_XSD_PATH, writeXml('a7.xml', payload))
    ).resolves.toEqual({ kind: 'valid' });
    expect(hasForbiddenDeclarations(payload)).toBe(true);

    const ws = makeReviewGateWorkspace({ baseCommit: FAKE_SHA });
    const dispatch: ReviewDependencies['dispatch'] = async request => {
      const token = /<<<BEGIN REVIEW XML ([0-9a-f]+)>>>/.exec(request.prompt)?.[1] ?? '';
      return {
        kind: 'launched-success',
        exitCode: 0,
        stdout: `<<<BEGIN REVIEW XML ${token}>>>\n${payload}\n<<<END REVIEW XML ${token}>>>\n`,
      };
    };
    try {
      const result = await runReview(
        { plan: '1', currentHarness: 'claude', startPath: ws.root },
        {
          discover: async () => ({ outcomes: [], reviewerCandidates: ['codex'] }),
          dispatch,
          readDiff: () => 'diff --git a/x.ts b/x.ts\n+changed\n',
          validatorAvailable: () => true,
        }
      );
      expect(result).toMatchObject({
        kind: 'reviewed',
        verdict: { kind: 'review-failed' },
        detail: expect.stringContaining('DOCTYPE'),
      });
      expect(result).not.toHaveProperty('counts');
      expect(_classify(result).exitCode).toBe(1);
      const record: unknown = JSON.parse(
        fs.readFileSync(path.join(ws.planDir, 'review', 'findings.json'), 'utf8')
      );
      expect(record).toMatchObject({ status: 'schema-invalid', findings: [] });
    } finally {
      ws.cleanup();
    }
  });
});
