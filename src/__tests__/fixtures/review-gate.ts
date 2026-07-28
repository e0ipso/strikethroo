/**
 * Shared fixture factories for the review-gate test suites
 * (`harness-discovery.test.ts`, `capture-base-commit.integration.test.ts`,
 * `code-review.integration.test.ts`, `review-findings.integration.test.ts`).
 *
 * Two factories: a minimal v4 workspace whose hook/XSD/base-commit presence is
 * independently switchable (so each fail-safe skip reason is one toggle away),
 * and a `<review>` XML builder so partition/validation tests describe findings
 * as data instead of hand-written XML.
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { CURRENT_WORKSPACE_SCHEMA_VERSION } from '../../metadata';

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const REAL_XSD_SOURCE = path.join(
  REPO_ROOT,
  'templates',
  'strikethroo',
  'config',
  'schemas',
  'self-review-v2.xsd'
);
const REAL_HOOK_SOURCE = path.join(
  REPO_ROOT,
  'templates',
  'strikethroo',
  'config',
  'hooks',
  'CODE_REVIEW.md'
);

export const REAL_HOOK_CONTENT = fs.readFileSync(REAL_HOOK_SOURCE, 'utf8');
export const REAL_XSD_PATH = REAL_XSD_SOURCE;

/** A syntactically valid placeholder sha — never a real commit, just 40 hex chars. */
export const FAKE_SHA = 'a'.repeat(40);

export interface ReviewGateWorkspaceOptions {
  /** `'default'` copies the real shipped hook; `'absent'` skips the file; a string is literal content. */
  hook?: 'default' | 'absent' | string;
  /** `'default'` copies the real vendored XSD; `'absent'` skips the file. */
  xsd?: 'default' | 'absent';
  /** A 40-hex sha to record, or `'absent'` to skip writing base-commit.json. */
  baseCommit?: string | 'absent';
  planId?: number;
  planSlug?: string;
}

export interface ReviewGateWorkspace {
  /** The temporary project root — the directory a real `git init` would run in. */
  root: string;
  strikethrooRoot: string;
  planDir: string;
  planFile: string;
  hookFile: string;
  xsdFile: string;
  baseCommitFile: string;
  cleanup: () => void;
}

/**
 * Builds `<root>/.ai/strikethroo/...` with a v4 `.init-metadata.json`, one plan
 * directory with a valid frontmatter, and switchable hook/XSD/base-commit
 * presence — every input the review gate's fail-safe skip ladder depends on.
 */
export const makeReviewGateWorkspace = (
  options: ReviewGateWorkspaceOptions = {}
): ReviewGateWorkspace => {
  const planId = options.planId ?? 1;
  const planSlug = options.planSlug ?? 'demo';
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'strikethroo-review-gate-'));
  const strikethrooRoot = path.join(root, '.ai', 'strikethroo');
  const planDir = path.join(strikethrooRoot, 'plans', `${planId}--${planSlug}`);
  fs.mkdirSync(planDir, { recursive: true });
  fs.mkdirSync(path.join(strikethrooRoot, 'config', 'hooks'), { recursive: true });
  fs.mkdirSync(path.join(strikethrooRoot, 'config', 'schemas'), { recursive: true });

  fs.writeFileSync(
    path.join(strikethrooRoot, '.init-metadata.json'),
    JSON.stringify({
      version: 'test',
      workspaceSchemaVersion: CURRENT_WORKSPACE_SCHEMA_VERSION,
      timestamp: new Date().toISOString(),
      files: {},
    })
  );

  const planFile = path.join(planDir, `plan-${planId}--${planSlug}.md`);
  fs.writeFileSync(
    planFile,
    `---\nid: ${planId}\nsummary: "fixture"\ncreated: 2026-01-01\n---\nbody\n`
  );

  const hookFile = path.join(strikethrooRoot, 'config', 'hooks', 'CODE_REVIEW.md');
  const hook = options.hook ?? 'default';
  if (hook !== 'absent') {
    fs.writeFileSync(hookFile, hook === 'default' ? REAL_HOOK_CONTENT : hook);
  }

  const xsdFile = path.join(strikethrooRoot, 'config', 'schemas', 'self-review-v2.xsd');
  if ((options.xsd ?? 'default') !== 'absent') {
    fs.copyFileSync(REAL_XSD_SOURCE, xsdFile);
  }

  const baseCommitFile = path.join(planDir, 'review', 'base-commit.json');
  if (options.baseCommit !== undefined && options.baseCommit !== 'absent') {
    fs.mkdirSync(path.dirname(baseCommitFile), { recursive: true });
    fs.writeFileSync(
      baseCommitFile,
      `${JSON.stringify({
        version: 1,
        baseCommit: options.baseCommit,
        capturedAt: new Date().toISOString(),
      })}\n`
    );
  }

  return {
    root,
    strikethrooRoot,
    planDir,
    planFile,
    hookFile,
    xsdFile,
    baseCommitFile,
    cleanup: () => fs.rmSync(root, { recursive: true, force: true }),
  };
};

export interface FindingSpec {
  file: string;
  severity?: string;
  confidence?: string;
  hasSuggestion?: boolean;
  category?: string;
  body?: string;
  /** Verbatim XML to splice in place of the generated <body>/<category>/<suggestion> — for malformed-content cases (CDATA, escaped markup). */
  rawInner?: string;
}

/**
 * Renders a schema-shaped `<review>` document from finding descriptions, one
 * `<file>` per distinct `file` value (in first-seen order). Kept intentionally
 * simple string concatenation — the documents under test are small and the
 * point is to describe findings as data, not to build a general XML writer.
 */
export const buildReviewXml = (
  findings: readonly FindingSpec[],
  timestamp = '2026-01-01T00:00:00Z'
): string => {
  const order: string[] = [];
  const byFile = new Map<string, FindingSpec[]>();
  for (const finding of findings) {
    if (!byFile.has(finding.file)) {
      byFile.set(finding.file, []);
      order.push(finding.file);
    }
    byFile.get(finding.file)!.push(finding);
  }

  const filesXml = order
    .map(file => {
      const comments = byFile
        .get(file)!
        .map(finding => {
          const attrs =
            (finding.severity ? ` severity="${finding.severity}"` : '') +
            (finding.confidence ? ` confidence="${finding.confidence}"` : '');
          if (finding.rawInner !== undefined) {
            return `<comment${attrs}>${finding.rawInner}</comment>`;
          }
          const suggestion = finding.hasSuggestion
            ? '<suggestion><original-code>old</original-code><proposed-code>new</proposed-code></suggestion>'
            : '';
          return (
            `<comment${attrs}><body>${finding.body ?? 'A finding.'}</body>` +
            `<category>${finding.category ?? 'bug'}</category>${suggestion}</comment>`
          );
        })
        .join('');
      return `<file path="${file}" change-type="modified" viewed="true">${comments}</file>`;
    })
    .join('');

  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    `<review xmlns="urn:self-review:v2" timestamp="${timestamp}">${filesXml}</review>\n`
  );
};
