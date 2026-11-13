/** Integration tests for schema certification and advisory counts from real xmllint. */

import { spawnSync } from 'child_process';
import { performance } from 'perf_hooks';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  countFindingsWithXmllint,
  hasForbiddenDeclarations,
  readFindingsWithXmllint,
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

  it('certifies a near-limit PI-heavy document without quadratic preflight work', async () => {
    const xml = buildReviewXml([]).replace('?>', '?>' + '<?p?>'.repeat(50_000));
    const file = writeXml(xml);
    const started = performance.now();
    expect(hasForbiddenDeclarations(xml)).toBe(false);
    expect(performance.now() - started).toBeLessThan(2000);
    await expect(validateAgainstSchema(REAL_XSD_PATH, file)).resolves.toEqual({ kind: 'valid' });
    expect(await countFindingsWithXmllint(file)).toEqual({
      total: 0,
      critical: 0,
      major: 0,
      minor: 0,
      info: 0,
      unlabelled: 0,
    });
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
      // Nor a comment opener inside a processing instruction, which ends at `?>`.
      '<?p <!-- ?><!DOCTYPE review [<!ENTITY x "y">]><!-- c -->',
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
 * Counts come from the same XML implementation as schema validation. Prefixes,
 * comments and quoted markup must not change the semantic count.
 */
describe.skipIf(!xmllintAvailable)(
  'certification integrity — native counts follow the validated document',
  () => {
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
    // DTD preflight cares about, a CDATA body quoting a <comment>, and escaped markup.
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
        const counts = await countFindingsWithXmllint(file);
        expect(counts?.total).toBe(expected);
      }
    });

    it('counts every advisory label and unlabelled finding without filtering low confidence', async () => {
      const xml = buildReviewXml([
        { file: 'a.ts', severity: 'critical', confidence: 'high' },
        { file: 'a.ts', severity: 'major', confidence: 'low' },
        { file: 'b.ts', severity: 'minor', confidence: 'medium' },
        { file: 'b.ts', severity: 'info' },
        { file: 'c.ts', confidence: 'high' },
      ]);
      const file = writeXml('labels.xml', xml);
      await expect(validateAgainstSchema(REAL_XSD_PATH, file)).resolves.toEqual({ kind: 'valid' });
      await expect(countFindingsWithXmllint(file)).resolves.toEqual({
        total: 5,
        critical: 1,
        major: 1,
        minor: 1,
        info: 1,
        unlabelled: 1,
      });
    });

    it('refuses an unrecognized severity through schema certification', async () => {
      const file = writeXml(
        'bad-label.xml',
        buildReviewXml([{ file: 'a.ts', severity: 'catastrophic' }])
      );
      await expect(validateAgainstSchema(REAL_XSD_PATH, file)).resolves.toMatchObject({
        kind: 'invalid',
      });
    });

    it('returns null, never partial counts, when xmllint cannot produce counts', async () => {
      await expect(countFindingsWithXmllint(writeXml('bad.xml', '<review><file>'))).resolves.toBe(
        null
      );
      await expect(countFindingsWithXmllint(path.join(dir, 'missing.xml'))).resolves.toBe(null);
    });

    it('rejects a structural tally that includes elements outside the findings namespace', async () => {
      const file = writeXml(
        'extra-element.xml',
        buildReviewXml([{ file: 'a.ts', severity: 'minor' }]).replace(
          '</file>',
          '<other xmlns="urn:other"/></file>'
        )
      );
      await expect(countFindingsWithXmllint(file)).resolves.toBe(null);
    });

    it('projects a large valid review within a bounded extraction deadline', async () => {
      const file = writeXml(
        'many-findings.xml',
        buildReviewXml(Array.from({ length: 1000 }, () => ({ file: 'a.ts', severity: 'minor' })))
      );
      await expect(validateAgainstSchema(REAL_XSD_PATH, file)).resolves.toEqual({ kind: 'valid' });
      await expect(countFindingsWithXmllint(file)).resolves.toMatchObject({ total: 1000 });
      const findings = await readFindingsWithXmllint(file, 1000, 8000);
      expect(findings).toHaveLength(1000);
      expect(findings?.[999]).toMatchObject({ file: 'a.ts', severity: 'minor' });
    }, 15_000);

    it('never certifies the audit payload (a DOCTYPE whose comment carries an apostrophe) as a clean review', async () => {
      // Schema-valid DTD syntax is still refused before validation; declarations
      // must never alter the meaning of a certified document.
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
        expect(record).toMatchObject({ status: 'schema-invalid' });
        expect(record).not.toHaveProperty('counts');
        expect(record).toHaveProperty('findings', []);
      } finally {
        ws.cleanup();
      }
    });
  }
);
