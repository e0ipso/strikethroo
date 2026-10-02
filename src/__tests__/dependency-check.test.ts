/**
 * Decision logic of scripts/dependency-check.cjs (`npm run security:check`).
 *
 * The script's `evaluate` is pure: it takes an already-captured `npm audit
 * --json` payload, an `npm ls --all --json` tree, the dispositions file, and a
 * version reader, so the gate can be exercised here without a registry call.
 */

import { createRequire } from 'module';
import * as path from 'path';

const requireCjs = createRequire(__filename);
const SCRIPT_PATH = path.resolve(__dirname, '..', '..', 'scripts', 'dependency-check.cjs');

type Disposition = {
  advisory: string;
  package: string;
  version: string;
  usage: string;
  reason: string;
  recheck: string;
};

type Evaluation = {
  ok: boolean;
  violations: string[];
  advisories: Array<{
    package: string;
    advisory: string;
    severity: string;
    status: 'allowed' | 'violation' | 'informational';
    installedVersions: string[];
  }>;
  dispositions: Array<{ index: number; status: 'matched' | 'stale' | 'unused' | 'invalid' }>;
  shipped: Array<{ package: string; versions: Array<{ version: string; path: string }> }>;
};

type EvaluateInput = {
  audit: unknown;
  tree: unknown;
  dispositions: { dispositions: Array<Partial<Disposition>>; resolved?: unknown[] };
  readVersion: (nodePath: string) => string | undefined;
  shipped?: string[];
};

const { evaluate } = requireCjs(SCRIPT_PATH) as {
  evaluate: (input: EvaluateInput) => Evaluation;
};

const BRACE = {
  a: 'GHSA-q2hr-2g5m-vwhr',
  b: 'GHSA-qhr7-859c-m2p7',
  c: 'GHSA-6j4f-fj2g-mc7p',
};
const IP = 'GHSA-rpw4-54j3-4h4q';
const MARKED = 'GHSA-aaaa-bbbb-cccc';

const via = (id: string, name: string, severity: string, range: string) => ({
  source: 1,
  name,
  dependency: name,
  title: `${name} advisory ${id}`,
  url: `https://github.com/advisories/${id}`,
  severity,
  range,
});

const audit = {
  auditReportVersion: 2,
  vulnerabilities: {
    'brace-expansion': {
      name: 'brace-expansion',
      severity: 'high',
      isDirect: false,
      via: [
        via(BRACE.a, 'brace-expansion', 'high', '>=4.0.0 <5.0.12'),
        via(BRACE.b, 'brace-expansion', 'high', '>=4.0.0 <5.0.11'),
        via(BRACE.c, 'brace-expansion', 'moderate', '>=4.0.0 <5.0.10'),
      ],
      range: '4.0.0 - 5.0.11',
      nodes: ['node_modules/npm/node_modules/brace-expansion'],
      fixAvailable: false,
    },
    'ip-address': {
      name: 'ip-address',
      severity: 'moderate',
      isDirect: false,
      via: [via(IP, 'ip-address', 'moderate', '<=10.5.0')],
      range: '<=10.7.0',
      nodes: ['node_modules/npm/node_modules/ip-address'],
      fixAvailable: false,
    },
    // Transitive-only entry: `via` names the vulnerable dependency instead of
    // carrying an advisory of its own.
    minimatch: {
      name: 'minimatch',
      severity: 'high',
      isDirect: false,
      via: ['brace-expansion'],
      range: '*',
      nodes: ['node_modules/npm/node_modules/minimatch'],
      fixAvailable: false,
    },
    marked: {
      name: 'marked',
      severity: 'low',
      isDirect: true,
      via: [via(MARKED, 'marked', 'low', '<16.0.0')],
      range: '<16.0.0',
      nodes: ['node_modules/marked'],
      fixAvailable: true,
    },
  },
  metadata: {
    vulnerabilities: { info: 0, low: 1, moderate: 1, high: 2, critical: 0, total: 4 },
    dependencies: { prod: 1, dev: 3, optional: 0, peer: 0, peerOptional: 0, total: 4 },
  },
};

const tree = {
  name: 'fixture',
  version: '0.0.0',
  dependencies: {
    '@semantic-release/npm': {
      version: '13.2.0',
      dependencies: {
        npm: {
          version: '11.21.0',
          dependencies: {
            'brace-expansion': { version: '5.0.9', inBundle: true },
            'ip-address': { version: '10.5.0', inBundle: true },
            minimatch: { version: '10.2.5', inBundle: true },
          },
        },
      },
    },
    marked: { version: '15.0.12' },
    mermaid: {
      version: '11.17.2',
      dependencies: { marked: { version: '16.4.2' }, dompurify: { version: '3.4.16' } },
    },
  },
};

const versions: Record<string, string> = {
  'node_modules/npm/node_modules/brace-expansion': '5.0.9',
  'node_modules/npm/node_modules/ip-address': '10.5.0',
  'node_modules/npm/node_modules/minimatch': '10.2.5',
  'node_modules/marked': '15.0.12',
};
const readVersion = (nodePath: string) => versions[nodePath];

const disposition = (advisory: string, pkg: string, version: string): Disposition => ({
  advisory,
  package: pkg,
  version,
  usage: `${pkg} bundled inside npm 11.21.0 under @semantic-release/npm`,
  reason: 'inBundle: npm ships its own copy; overrides cannot replace it',
  recheck: 'when npm 11.x ships a patched copy',
});

const braceDispositions = [
  disposition(BRACE.a, 'brace-expansion', '5.0.9'),
  // A full advisory URL must match the same way a bare GHSA id does.
  disposition(`https://github.com/advisories/${BRACE.b}`, 'brace-expansion', '5.0.9'),
  disposition(BRACE.c, 'brace-expansion', '5.0.9'),
];
const markedDisposition = disposition(MARKED, 'marked', '15.0.12');

const run = (dispositions: Array<Partial<Disposition>>, shipped?: string[]) =>
  evaluate({ audit, tree, dispositions: { dispositions }, readVersion, shipped });

const statusOf = (result: Evaluation, advisory: string) =>
  result.advisories.find(entry => entry.advisory === advisory)?.status;

describe('dependency check gate', () => {
  test('a high advisory without a disposition is a violation; moderate is informational', () => {
    const result = run([markedDisposition]);
    expect(result.ok).toBe(false);
    expect(statusOf(result, BRACE.a)).toBe('violation');
    expect(statusOf(result, BRACE.b)).toBe('violation');
    expect(statusOf(result, IP)).toBe('informational');
    expect(result.violations.join('\n')).toContain(BRACE.a);
    expect(result.violations.join('\n')).not.toContain(IP);
  });

  test('a disposition matching advisory (id or URL), package, and installed version allows it', () => {
    const result = run([...braceDispositions, markedDisposition]);
    expect(result.ok).toBe(true);
    expect(result.violations).toEqual([]);
    for (const id of Object.values(BRACE)) {
      expect(statusOf(result, id)).toBe('allowed');
    }
    expect(result.dispositions.map(entry => entry.status)).toEqual([
      'matched',
      'matched',
      'matched',
      'matched',
    ]);
    expect(result.advisories.find(entry => entry.advisory === BRACE.a)?.installedVersions).toEqual([
      '5.0.9',
    ]);
  });

  test('a disposition is narrow: it covers one advisory id, not the whole package', () => {
    const result = run([braceDispositions[0], markedDisposition]);
    expect(result.ok).toBe(false);
    expect(statusOf(result, BRACE.a)).toBe('allowed');
    expect(statusOf(result, BRACE.b)).toBe('violation');
  });

  test('a disposition whose version no longer matches the installed copy is stale and fails', () => {
    const stale = [
      disposition(BRACE.a, 'brace-expansion', '5.0.8'),
      braceDispositions[1],
      braceDispositions[2],
      markedDisposition,
    ];
    const result = run(stale);
    expect(result.ok).toBe(false);
    expect(result.dispositions[0].status).toBe('stale');
    // A stale entry does not suppress the advisory it used to cover.
    expect(statusOf(result, BRACE.a)).toBe('violation');
  });

  test('a disposition the audit no longer needs is reported unused without failing', () => {
    const result = run([
      ...braceDispositions,
      markedDisposition,
      disposition('GHSA-zzzz-zzzz-zzzz', 'ip-address', '10.5.0'),
    ]);
    expect(result.ok).toBe(true);
    expect(result.dispositions[4].status).toBe('unused');
  });

  test('a disposition missing a required field is invalid and fails', () => {
    const broken: Partial<Disposition> = { ...markedDisposition };
    delete broken.recheck;
    const result = run([...braceDispositions, broken]);
    expect(result.ok).toBe(false);
    expect(result.dispositions[3].status).toBe('invalid');
  });

  test('shipped packages gate at every severity and report each installed copy', () => {
    const result = run(braceDispositions);
    expect(result.ok).toBe(false);
    expect(statusOf(result, MARKED)).toBe('violation');

    const marked = result.shipped.find(entry => entry.package === 'marked');
    expect(marked?.versions).toEqual([
      { version: '15.0.12', path: 'node_modules/marked' },
      { version: '16.4.2', path: 'node_modules/mermaid/node_modules/marked' },
    ]);
    expect(result.shipped.map(entry => entry.package)).toEqual(
      expect.arrayContaining([
        'mermaid',
        'dompurify',
        'marked',
        'js-yaml',
        'diff',
        'react',
        'react-dom',
      ])
    );
  });

  test('the same low advisory on a package that is not shipped stays informational', () => {
    const result = run(braceDispositions, ['mermaid']);
    expect(statusOf(result, MARKED)).toBe('informational');
    expect(result.ok).toBe(true);
  });

  test('transitive-only entries do not become advisories of their own', () => {
    const result = run([...braceDispositions, markedDisposition]);
    expect(result.advisories.some(entry => entry.package === 'minimatch')).toBe(false);
  });

  test('an audit payload carrying an error is refused instead of read as clean', () => {
    expect(() =>
      evaluate({
        audit: { error: { code: 'ENOAUDIT', summary: 'registry unavailable' } },
        tree,
        dispositions: { dispositions: [] },
        readVersion,
      })
    ).toThrow(/ENOAUDIT/);
  });
});
