/**
 * Integration tests for the review round mechanism (`code-review.ts`): the
 * fail-safe skip reasons, the diff scoping, and the round-budget bounding.
 *
 * Every dependency the round would otherwise use to reach a real harness
 * (`discover`, `dispatch`) or a real diff (`readDiff`) is injected here — a
 * test that depends on a harness CLI being installed, or on a real git
 * repository, is not a test of this module's own logic. The workspace shape
 * (hook / XSD / base-commit presence) is real filesystem state, built by the
 * shared `makeReviewGateWorkspace` factory, because that shape is exactly
 * what `resolveReviewContext` reads.
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import {
  _exitCodeFor,
  _readCumulativeDiff,
  runReview,
  type FindingsGate,
  type ReviewDependencies,
} from '../skill-scripts/code-review';
import { buildReviewXml, FAKE_SHA, makeReviewGateWorkspace } from './fixtures/review-gate';

const stubDeps = (overrides: Partial<ReviewDependencies> = {}): ReviewDependencies => ({
  discover: async () => ({ outcomes: [], reviewerCandidates: ['codex'] }),
  dispatch: async () => ({ kind: 'launched-success', exitCode: 0 }),
  readDiff: () => 'diff --git a/x.ts b/x.ts\n+something changed\n',
  validatorAvailable: () => true,
  ...overrides,
});

const oneFinding: FindingsGate = async () => ({
  kind: 'evaluated',
  counts: { total: 1, critical: 0, major: 1, minor: 0, info: 0, unlabelled: 0 },
  findingsFile: '/dev/null',
});

describe('code review gate — fail-safe skips', () => {
  it.each([
    ['hook-absent', { hook: 'absent' as const }],
    ['hook-empty', { hook: '' }],
    ['xsd-absent', { xsd: 'absent' as const }],
    ['base-commit-absent', {}],
  ] as const)(
    'skips on %s: exit 0, the correct reason, and empty stderr',
    async (reason, options) => {
      const ws = makeReviewGateWorkspace(options);
      const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
      try {
        const result = await runReview(
          { plan: '1', currentHarness: 'claude', startPath: ws.root },
          stubDeps()
        );
        expect(result).toMatchObject({ kind: 'skipped', reason });
        expect(_exitCodeFor(result)).toBe(0);
        expect(stderrSpy).not.toHaveBeenCalled();
      } finally {
        stderrSpy.mockRestore();
        ws.cleanup();
      }
    }
  );

  it('skips on no-reviewer-candidate: exit 0, the correct reason, and empty stderr', async () => {
    const ws = makeReviewGateWorkspace({ baseCommit: FAKE_SHA });
    const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    try {
      const result = await runReview(
        { plan: '1', currentHarness: 'claude', startPath: ws.root },
        stubDeps({ discover: async () => ({ outcomes: [], reviewerCandidates: [] }) })
      );
      expect(result).toMatchObject({ kind: 'skipped', reason: 'no-reviewer-candidate' });
      expect(_exitCodeFor(result)).toBe(0);
      expect(stderrSpy).not.toHaveBeenCalled();
    } finally {
      stderrSpy.mockRestore();
      ws.cleanup();
    }
  });

  /**
   * A round dispatched with an empty diff returns no findings, which reads
   * exactly like a clean review — so an empty scope would surface as a pass. It
   * has to be reported instead, and no reviewer spent on it.
   */
  it('skips on empty-diff without dispatching a reviewer', async () => {
    const ws = makeReviewGateWorkspace({ baseCommit: FAKE_SHA });
    const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    let dispatched = false;
    try {
      const result = await runReview(
        { plan: '1', currentHarness: 'claude', startPath: ws.root },
        stubDeps({
          readDiff: () => '   \n',
          dispatch: async () => {
            dispatched = true;
            return { kind: 'launched-success', exitCode: 0 };
          },
        })
      );
      expect(result).toMatchObject({ kind: 'skipped', reason: 'empty-diff' });
      expect(_exitCodeFor(result)).toBe(0);
      expect(dispatched).toBe(false);
      expect(stderrSpy).not.toHaveBeenCalled();
    } finally {
      stderrSpy.mockRestore();
      ws.cleanup();
    }
  });

  it('reaches evaluation (no skip) once every input is present, proving the skip ladder is order-sensitive not vacuous', async () => {
    const ws = makeReviewGateWorkspace({ baseCommit: FAKE_SHA });
    try {
      const result = await runReview(
        { plan: '1', currentHarness: 'claude', startPath: ws.root },
        stubDeps({ evaluateFindings: oneFinding })
      );
      expect(result.kind).toBe('reviewed');
    } finally {
      ws.cleanup();
    }
  });
});

describe('code review gate — the verdict reports, it does not judge', () => {
  it('dispatches the reviewer with the exact invocation proven during discovery', async () => {
    const ws = makeReviewGateWorkspace({ baseCommit: FAKE_SHA });
    const dispatch = vi.fn(async () => ({ kind: 'launched-success', exitCode: 0 }) as const);
    try {
      await runReview(
        { plan: '1', currentHarness: 'claude', startPath: ws.root },
        stubDeps({
          discover: async () => ({
            outcomes: [],
            reviewerCandidates: ['codex'],
            reviewerInvocations: {
              codex: {
                cliArgs: ['--sandbox', 'workspace-write'],
                cliArgsHash: 'a'.repeat(64),
                executableIdentity: '/opt/codex/bin/codex',
                executableVersion: 'codex 1.0',
                normalizationVersion: 1,
                probeRegistryVersion: 2,
              },
            },
          }),
          dispatch,
          evaluateFindings: oneFinding,
        })
      );

      expect(dispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          harness: 'codex',
          cliArgs: ['--sandbox', 'workspace-write'],
          executableIdentity: '/opt/codex/bin/codex',
        })
      );
    } finally {
      ws.cleanup();
    }
  });

  it('records a clean review as recorded, not as an absence', async () => {
    const ws = makeReviewGateWorkspace({ baseCommit: FAKE_SHA });
    try {
      const noFindings: FindingsGate = async () => ({
        kind: 'evaluated',
        counts: { total: 0, critical: 0, major: 0, minor: 0, info: 0, unlabelled: 0 },
        findingsFile: '/dev/null',
      });
      const result = await runReview(
        { plan: '1', currentHarness: 'claude', startPath: ws.root },
        stubDeps({ evaluateFindings: noFindings })
      );
      expect(result).toMatchObject({
        kind: 'reviewed',
        verdict: { kind: 'review-recorded', detail: expect.stringContaining('no findings') },
      });
      expect(_exitCodeFor(result)).toBe(0);
    } finally {
      ws.cleanup();
    }
  });

  it('reports findings without acting on them, whatever their labels', async () => {
    const ws = makeReviewGateWorkspace({ baseCommit: FAKE_SHA });
    try {
      // Two `critical` findings would once have forced a fix round. Now they
      // are counted, named, and handed to the implementer to judge.
      const loud: FindingsGate = async () => ({
        kind: 'evaluated',
        counts: { total: 3, critical: 2, major: 0, minor: 0, info: 0, unlabelled: 1 },
        findingsFile: '/tmp/findings.json',
      });
      const result = await runReview(
        { plan: '1', currentHarness: 'claude', startPath: ws.root },
        stubDeps({ evaluateFindings: loud })
      );
      expect(result).toMatchObject({
        kind: 'reviewed',
        verdict: {
          kind: 'review-recorded',
          detail: expect.stringContaining('2 critical, 1 unlabelled'),
        },
      });
      // Findings never change the exit code: the gate does not judge them.
      expect(_exitCodeFor(result)).toBe(0);
    } finally {
      ws.cleanup();
    }
  });

  it('exits 1 when the findings were never certified', async () => {
    const ws = makeReviewGateWorkspace({ baseCommit: FAKE_SHA });
    try {
      const uncertified: FindingsGate = async () => ({
        kind: 'schema-invalid',
        detail: 'review.xml does not validate.',
      });
      const result = await runReview(
        { plan: '1', currentHarness: 'claude', startPath: ws.root },
        stubDeps({ evaluateFindings: uncertified })
      );
      expect(result).toMatchObject({
        kind: 'reviewed',
        verdict: { kind: 'review-failed' },
      });
      expect(_exitCodeFor(result)).toBe(1);
    } finally {
      ws.cleanup();
    }
  });
});

describe('cumulative diff scope: generated and vendored files', () => {
  let repo: string;

  const git = (args: string) =>
    execSync(`git ${args}`, { cwd: repo, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });

  beforeEach(() => {
    repo = fs.mkdtempSync(path.join(os.tmpdir(), 'st-diff-scope-'));
    git('init -q');
    git('config user.email test@example.com');
    git('config user.name Test');
    fs.writeFileSync(path.join(repo, 'seed.txt'), 'seed\n');
    git('add -A');
    git('commit -q -m seed');
  });

  afterEach(() => fs.rmSync(repo, { recursive: true, force: true }));

  const baseSha = () => git('rev-parse HEAD').trim();

  it('drops generated and vendored paths while keeping real source', () => {
    const base = baseSha();
    fs.writeFileSync(
      path.join(repo, '.gitattributes'),
      'out/*.cjs linguist-generated=true\nvendor/*.xsd linguist-vendored=true\n'
    );
    fs.mkdirSync(path.join(repo, 'out'));
    fs.mkdirSync(path.join(repo, 'vendor'));
    fs.writeFileSync(path.join(repo, 'src.ts'), 'export const real = 1;\n');
    fs.writeFileSync(path.join(repo, 'out/bundle.cjs'), 'GENERATED_BUNDLE_CONTENT\n');
    fs.writeFileSync(path.join(repo, 'vendor/schema.xsd'), 'VENDORED_SCHEMA_CONTENT\n');
    git('add -A');
    git('commit -q -m change');

    const diff = _readCumulativeDiff(repo, base);

    expect(diff).toContain('src.ts');
    expect(diff).toContain('export const real = 1;');
    expect(diff).not.toContain('GENERATED_BUNDLE_CONTENT');
    expect(diff).not.toContain('VENDORED_SCHEMA_CONTENT');
    expect(diff).not.toContain('out/bundle.cjs');
    expect(diff).not.toContain('vendor/schema.xsd');
  });

  it('excludes an uncommitted edit to a generated file, which never reaches the index', () => {
    fs.writeFileSync(path.join(repo, '.gitattributes'), 'out/*.cjs linguist-generated=true\n');
    fs.mkdirSync(path.join(repo, 'out'));
    fs.writeFileSync(path.join(repo, 'out/bundle.cjs'), 'first\n');
    git('add -A');
    git('commit -q -m add-bundle');
    const base = baseSha();

    // The steady state of a local rebuild: tracked build output dirtied, never committed.
    fs.writeFileSync(path.join(repo, 'out/bundle.cjs'), 'REBUILT_OUTPUT\n');
    fs.writeFileSync(path.join(repo, 'src.ts'), 'export const real = 2;\n');
    git('add src.ts');

    const diff = _readCumulativeDiff(repo, base);

    expect(diff).toContain('export const real = 2;');
    expect(diff).not.toContain('REBUILT_OUTPUT');
  });

  /**
   * The scope must not depend on anything having committed. `POST_PHASE.md` is a
   * user-editable hook the gate does not own, and a repository whose pre-commit
   * hook runs the test suite cannot commit between phases at all — so a scope
   * that only sees tracked files would silently shrink to nothing on exactly the
   * plans that add the most new code.
   */
  it('includes an untracked file the plan added but nothing committed', () => {
    const base = baseSha();
    fs.writeFileSync(path.join(repo, 'brand-new.ts'), 'export const NEW_MODULE = 1;\n');

    const diff = _readCumulativeDiff(repo, base);

    expect(diff).toContain('brand-new.ts');
    expect(diff).toContain('export const NEW_MODULE = 1;');
    // Rendered as a conventional add-diff, not with `--no-index`'s 1/ 2/ prefixes.
    expect(diff).toContain('diff --git a/brand-new.ts b/brand-new.ts');
    expect(diff).toContain('new file mode');
    expect(diff).not.toContain('1/brand-new.ts');
  });

  it('reports tracked and untracked changes in one diff', () => {
    fs.writeFileSync(path.join(repo, 'existing.ts'), 'export const existing = 1;\n');
    git('add -A');
    git('commit -q -m existing');
    const base = baseSha();

    fs.writeFileSync(path.join(repo, 'existing.ts'), 'export const existing = 2;\n');
    fs.writeFileSync(path.join(repo, 'added.ts'), 'export const ADDED = 3;\n');

    const diff = _readCumulativeDiff(repo, base);

    expect(diff).toContain('export const existing = 2;');
    expect(diff).toContain('export const ADDED = 3;');
  });

  it('leaves ignored files out, so the gate never reviews its own output', () => {
    fs.writeFileSync(path.join(repo, '.gitignore'), 'review/\n');
    git('add -A');
    git('commit -q -m ignore');
    const base = baseSha();
    fs.mkdirSync(path.join(repo, 'review'));
    fs.writeFileSync(path.join(repo, 'review/round-1.xml'), 'PRIOR_ROUND_FINDINGS\n');
    fs.writeFileSync(path.join(repo, 'real.ts'), 'export const real = 1;\n');

    const diff = _readCumulativeDiff(repo, base);

    expect(diff).toContain('export const real = 1;');
    expect(diff).not.toContain('PRIOR_ROUND_FINDINGS');
  });

  it('drops untracked paths marked generated, as it does tracked ones', () => {
    fs.writeFileSync(path.join(repo, '.gitattributes'), 'out/*.cjs linguist-generated=true\n');
    git('add -A');
    git('commit -q -m attrs');
    const base = baseSha();
    fs.mkdirSync(path.join(repo, 'out'));
    fs.writeFileSync(path.join(repo, 'out/bundle.cjs'), 'GENERATED_BUNDLE_CONTENT\n');
    fs.writeFileSync(path.join(repo, 'src.ts'), 'export const real = 1;\n');

    const diff = _readCumulativeDiff(repo, base);

    expect(diff).toContain('export const real = 1;');
    expect(diff).not.toContain('GENERATED_BUNDLE_CONTENT');
  });

  it('summarizes an untracked binary instead of inlining it', () => {
    const base = baseSha();
    fs.writeFileSync(path.join(repo, 'blob.bin'), Buffer.from([0, 1, 2, 0, 3]));

    const diff = _readCumulativeDiff(repo, base);

    expect(diff).toContain('blob.bin');
    expect(diff).toContain('Binary files');
  });

  it('returns an empty diff when nothing changed at all', () => {
    expect(_readCumulativeDiff(repo, baseSha())?.trim()).toBe('');
  });

  it('keeps everything when the repository marks nothing generated', () => {
    const base = baseSha();
    fs.writeFileSync(path.join(repo, 'a.ts'), 'export const a = 1;\n');
    fs.writeFileSync(path.join(repo, 'b.cjs'), 'export const b = 2;\n');
    git('add -A');
    git('commit -q -m plain');

    const diff = _readCumulativeDiff(repo, base);

    expect(diff).toContain('export const a = 1;');
    expect(diff).toContain('export const b = 2;');
  });
});

/**
 * `xmllint` is a soft dependency. Without it no round can be certified, but a
 * missing system package must never turn an otherwise successful plan into a
 * failure — so absence skips cleanly, before any reviewer is dispatched, and is
 * never reported as a review that passed.
 */
describe('code review gate — xmllint is a soft dependency', () => {
  it('skips with validator-absent: exit 0, empty stderr, no reviewer dispatched', async () => {
    const ws = makeReviewGateWorkspace({ baseCommit: FAKE_SHA });
    const dispatch = vi.fn(async () => ({ kind: 'launched-success', exitCode: 0 }) as const);
    const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    try {
      const result = await runReview(
        { plan: '1', currentHarness: 'claude', startPath: ws.root },
        stubDeps({ dispatch, validatorAvailable: () => false })
      );
      expect(result).toMatchObject({ kind: 'skipped', reason: 'validator-absent' });
      expect(_exitCodeFor(result)).toBe(0);
      expect(stderrSpy).not.toHaveBeenCalled();
      // The point of checking before dispatch: no external harness is spent on
      // a round that could not have been certified.
      expect(dispatch).not.toHaveBeenCalled();
    } finally {
      stderrSpy.mockRestore();
    }
  });

  it('names an actionable fix rather than failing opaquely', async () => {
    const ws = makeReviewGateWorkspace({ baseCommit: FAKE_SHA });
    const result = await runReview(
      { plan: '1', currentHarness: 'claude', startPath: ws.root },
      stubDeps({ validatorAvailable: () => false })
    );
    expect(result).toMatchObject({ kind: 'skipped' });
    const detail = (result as { detail: string }).detail;
    expect(detail).toContain('xmllint');
    expect(detail).toContain('libxml2');
  });

  it('runs the review normally when the validator is available', async () => {
    const ws = makeReviewGateWorkspace({ baseCommit: FAKE_SHA });
    const dispatch = vi.fn(async () => ({ kind: 'launched-success', exitCode: 0 }) as const);
    const result = await runReview(
      { plan: '1', currentHarness: 'claude', startPath: ws.root },
      stubDeps({ dispatch, validatorAvailable: () => true })
    );
    expect(result).not.toMatchObject({ reason: 'validator-absent' });
    expect(dispatch).toHaveBeenCalled();
  });
});

/**
 * Stdout is the only delivery channel: the reviewer prints its findings document
 * between this dispatch's delimiters, and the mechanism — never the reviewer —
 * writes it to the canonical path. There is no on-disk channel to prefer, so a
 * round certifies from a transcript or not at all.
 *
 * These cases deliberately do **not** inject `evaluateFindings`. Extraction lives
 * inside `createFindingsGate`, so the override every suite above uses is
 * precisely what would leave it untested. The real gate runs here, against the
 * real vendored XSD through the real `xmllint` — which is what proves a delivered
 * document is held to the schema, and that an undelivered one degrades to a
 * failed round rather than a clean one.
 */
describe('code review gate — single-channel stdout delivery', () => {
  const reviewDirOf = (ws: ReturnType<typeof makeReviewGateWorkspace>) =>
    path.join(ws.planDir, 'review');

  const TOKEN_PATTERN = /<<<BEGIN REVIEW XML ([0-9a-f]+)>>>/;

  const delimited = (token: string, xml: string) =>
    `<<<BEGIN REVIEW XML ${token}>>>\n${xml}\n<<<END REVIEW XML ${token}>>>\n`;

  /**
   * `runReviewRound` mints the collision token internally, so a stub cannot know
   * it in advance — it is read back out of the prompt the stub receives. The
   * regex doubles as an assertion that the prompt carries the delimiters at all:
   * a drift between the prompt and the extractor would silently disable
   * delivery, and every case here would stop finding a token.
   */
  const emitting = (xml: string) => {
    let seen = '';
    const dispatch: ReviewDependencies['dispatch'] = async request => {
      seen = request.prompt;
      const token = TOKEN_PATTERN.exec(request.prompt)?.[1];
      if (token === undefined) return { kind: 'launched-success', exitCode: 0 };
      return {
        kind: 'launched-success',
        exitCode: 0,
        stdout: `some progress chatter\n${delimited(token, xml)}`,
      };
    };
    return { dispatch, prompt: () => seen };
  };

  const runRound = (ws: ReturnType<typeof makeReviewGateWorkspace>, dispatch: unknown) =>
    runReview(
      { plan: '1', currentHarness: 'claude', startPath: ws.root },
      stubDeps({ dispatch: dispatch as ReviewDependencies['dispatch'] })
    );

  it('certifies a review from a document the reviewer only printed, and writes it to the canonical path', async () => {
    const ws = makeReviewGateWorkspace({ baseCommit: FAKE_SHA });
    const xml = buildReviewXml([{ file: 'src/x.ts', severity: 'minor', confidence: 'low' }]);
    const { dispatch, prompt } = emitting(xml);
    // `vi.spyOn` calls through, so the reporter's own writes are unaffected; the
    // assertion below is only that no reviewer text is among them.
    const stdoutSpy = vi.spyOn(process.stdout, 'write');
    try {
      const result = await runRound(ws, dispatch);

      expect(result).toMatchObject({
        kind: 'reviewed',
        reviewFilePresent: true,
        findingsGate: { kind: 'evaluated' },
        verdict: { kind: 'review-recorded' },
      });
      expect(_exitCodeFor(result)).toBe(0);
      const { reviewFile } = result as { reviewFile: string };
      expect(fs.readFileSync(reviewFile, 'utf8').trim()).toBe(xml.trim());
      expect(prompt()).toMatch(TOKEN_PATTERN);
      // The partition is the round's own record that it was evaluated, not just
      // that a document arrived.
      const partition: unknown = JSON.parse(
        fs.readFileSync(path.join(reviewDirOf(ws), 'findings.json'), 'utf8')
      );
      expect(partition).toMatchObject({ status: 'evaluated' });

      // Capture is a channel back into this mechanism, not a passthrough. The
      // launcher tees the child's output to stderr; nothing reviewer-shaped may
      // reach this process's stdout, which carries only `emit`'s single JSON
      // line — and `emit` is not reached from `runReview`.
      for (const [chunk] of stdoutSpy.mock.calls) {
        expect(String(chunk)).not.toContain('src/x.ts');
        expect(String(chunk)).not.toContain('REVIEW XML');
      }
    } finally {
      stdoutSpy.mockRestore();
      ws.cleanup();
    }
  });

  it('extracts the answer from a noisy harness transcript: ANSI escapes, chatter, an echoed instruction block and a trailing summary', async () => {
    const ws = makeReviewGateWorkspace({ baseCommit: FAKE_SHA });
    // `<![CDATA[` is in the payload on purpose. The ANSI pattern requires a
    // leading ESC precisely so it cannot eat the `[C` of that sequence; a payload
    // without one would never exercise that constraint.
    const xml = buildReviewXml([
      {
        file: 'src/parse.ts',
        severity: 'minor',
        confidence: 'low',
        rawInner:
          '<body><![CDATA[Index math on buf[Cursor] is off by one in the escape branch.]]></body>' +
          '<category>bug</category>',
      },
    ]);
    expect(xml).toContain('<![CDATA[');

    const dim = '\u001b[2m';
    const reset = '\u001b[0m';
    // The prompt's own placeholder, verbatim: the reviewer restating its delivery
    // instructions is the realistic false positive, and it is a token-bearing
    // region that must never be certified.
    const placeholder =
      '... the complete findings document, beginning with its XML declaration ...';
    const decorated = xml
      .replace('<review', `${dim}<review`)
      .replace('</review>', `</review>${reset}`);

    const dispatch: ReviewDependencies['dispatch'] = async request => {
      const token = TOKEN_PATTERN.exec(request.prompt)?.[1];
      if (token === undefined) return { kind: 'launched-success', exitCode: 0 };
      const block = (body: string) =>
        `<<<BEGIN REVIEW XML ${token}>>>\n${body}\n<<<END REVIEW XML ${token}>>>`;
      return {
        kind: 'launched-success',
        exitCode: 0,
        stdout: [
          `${dim}Reading src/parse.ts${reset}`,
          `${dim}thinking…${reset} weighing the severity of the escape branch`,
          'tool: shell(git diff --stat) -> 4 files changed, 118 insertions(+)',
          // Echo before the answer: defeats a naive first-region scan.
          block(placeholder),
          'restating the delivery format above; now emitting the real document',
          // The answer, carrying escapes inside the delimited region itself.
          block(decorated),
          // Echo after the answer: the LAST token-bearing region in the transcript
          // is the placeholder, so certifying this document requires the anti-echo
          // guard to reject this region *and* the backwards scan to keep walking
          // past it. Delete either one and the round stops certifying.
          block(placeholder),
          `${dim}tokens used: 41,233 · duration 92s${reset}`,
          '',
        ].join('\n'),
      };
    };

    try {
      const result = await runRound(ws, dispatch);

      expect(result).toMatchObject({
        kind: 'reviewed',
        findingsGate: { kind: 'evaluated' },
        verdict: { kind: 'review-recorded' },
      });
      expect(_exitCodeFor(result)).toBe(0);
      // Byte equality with the payload is the whole assertion: the chatter, the
      // escapes — including the ones inside the region — and both echoed blocks
      // were excluded from what was written and validated.
      const written = fs.readFileSync((result as { reviewFile: string }).reviewFile, 'utf8');
      expect(written.trim()).toBe(xml.trim());
      expect(written).toContain('<![CDATA[');
      expect(written).not.toContain('\u001b');
      expect(written).not.toContain('tokens used');
      expect(written).not.toContain('beginning with its XML declaration');
    } finally {
      ws.cleanup();
    }
  });

  it('holds a delivered document to the same XSD as any other: schema-invalid, never evaluated', async () => {
    const ws = makeReviewGateWorkspace({ baseCommit: FAKE_SHA });
    const { dispatch } = emitting(
      '<?xml version="1.0"?><review xmlns="urn:self-review:v2"><nonsense/></review>'
    );
    try {
      const result = await runRound(ws, dispatch);

      expect(result).toMatchObject({
        kind: 'reviewed',
        findingsGate: { kind: 'schema-invalid' },
        verdict: { kind: 'review-failed' },
      });
      expect(_exitCodeFor(result)).toBe(1);
    } finally {
      ws.cleanup();
    }
  });

  it('never reads an undelivered document as a clean review, whether nothing was printed or the prompt was echoed back', async () => {
    const silent: ReviewDependencies['dispatch'] = async () => ({
      kind: 'launched-success',
      exitCode: 0,
    });
    // The prompt itself carries the delimiters around a prose placeholder, so
    // echoing it back is the realistic false-positive: the region matches but
    // does not open an XML document, and must be rejected.
    const echoing: ReviewDependencies['dispatch'] = async request => ({
      kind: 'launched-success',
      exitCode: 0,
      stdout: request.prompt,
    });

    for (const dispatch of [silent, echoing]) {
      const ws = makeReviewGateWorkspace({ baseCommit: FAKE_SHA });
      try {
        const result = await runRound(ws, dispatch);

        expect(result).toMatchObject({
          kind: 'reviewed',
          findingsGate: { kind: 'findings-absent' },
          verdict: { kind: 'review-failed' },
        });
        const { findingsGate } = result as { findingsGate: { kind: string } };
        expect(findingsGate.kind).not.toBe('evaluated');
        expect(_exitCodeFor(result)).toBe(1);
      } finally {
        ws.cleanup();
      }
    }
  });

  it('removes only the canonical review.xml before dispatch, leaving unrelated review artifacts intact', async () => {
    const ws = makeReviewGateWorkspace({ baseCommit: FAKE_SHA });
    const reviewDir = reviewDirOf(ws);
    fs.mkdirSync(reviewDir, { recursive: true });
    // The stale document names a different file from the fresh one, so if it
    // survived, the recorded findings would describe the wrong file entirely.
    const stale = buildReviewXml([{ file: 'stale.ts', severity: 'critical', confidence: 'high' }]);
    const custom = buildReviewXml([{ file: 'custom.ts', severity: 'minor', confidence: 'low' }]);
    const fresh = buildReviewXml([{ file: 'fresh.ts', severity: 'minor', confidence: 'low' }]);
    fs.writeFileSync(path.join(reviewDir, 'review.xml'), stale, 'utf8');
    fs.writeFileSync(path.join(reviewDir, 'custom-review.xml'), custom, 'utf8');
    fs.writeFileSync(path.join(reviewDir, 'findings.json'), '{"seeded":true}\n', 'utf8');

    const { dispatch } = emitting(fresh);
    try {
      const result = await runRound(ws, dispatch);

      expect(result).toMatchObject({
        kind: 'reviewed',
        findingsGate: { kind: 'evaluated' },
        verdict: { kind: 'review-recorded' },
      });
      expect(fs.readFileSync(path.join(reviewDir, 'review.xml'), 'utf8').trim()).toBe(fresh.trim());
      // `custom-review.xml` is the unrelated artifact this asserts non-deletion
      // on, byte for byte: the removal must target the exact canonical path and
      // never glob for XML or follow a custom output name. `findings.json` is
      // only asserted to still exist, because the gate rewrites it for the
      // current round by design — its seeded content is *expected* to be gone,
      // so it cannot witness non-deletion.
      expect(fs.readFileSync(path.join(reviewDir, 'custom-review.xml'), 'utf8')).toBe(custom);
      expect(fs.existsSync(path.join(reviewDir, 'findings.json'))).toBe(true);
      const partition = fs.readFileSync(path.join(reviewDir, 'findings.json'), 'utf8');
      expect(partition).toContain('fresh.ts');
      expect(partition).not.toContain('stale.ts');
    } finally {
      ws.cleanup();
    }
  });

  /**
   * With one channel, a round that does not certify leaves no document at all —
   * so without the transcript there is nothing to debug it from. It is written on
   * every non-certifying outcome, including the non-zero exit that returns before
   * the gate runs, and deliberately not on a round that certified: there the
   * `review.xml` is the artifact, and the transcript would only be noise.
   */
  it('keeps the reviewer transcript on a review that did not certify, and only then', async () => {
    const transcriptOf = (ws: ReturnType<typeof makeReviewGateWorkspace>) =>
      path.join(reviewDirOf(ws), 'reviewer-output.txt');
    // No token-bearing region anywhere, so the round cannot certify from it.
    const noise = 'reviewing…\ntool: shell(git status)\nI could not read the repository.\n';

    const undelivered = makeReviewGateWorkspace({ baseCommit: FAKE_SHA });
    try {
      const result = await runRound(undelivered, async () => ({
        kind: 'launched-success',
        exitCode: 0,
        stdout: noise,
      }));
      expect(result).toMatchObject({
        kind: 'reviewed',
        findingsGate: { kind: 'findings-absent' },
      });
      expect(fs.readFileSync(transcriptOf(undelivered), 'utf8')).toBe(noise);
    } finally {
      undelivered.cleanup();
    }

    // The darkest case: this branch returns before the gate runs, so without the
    // write here a non-zero reviewer would leave the round directory empty.
    const crashed = makeReviewGateWorkspace({ baseCommit: FAKE_SHA });
    try {
      const result = await runRound(crashed, async () => ({
        kind: 'launched-failure',
        exitCode: 3,
        stdout: noise,
      }));
      expect(result).toMatchObject({ kind: 'launched-failure', exitCode: 3 });
      expect(fs.readFileSync(transcriptOf(crashed), 'utf8')).toBe(noise);
    } finally {
      crashed.cleanup();
    }

    const certified = makeReviewGateWorkspace({ baseCommit: FAKE_SHA });
    try {
      const xml = buildReviewXml([{ file: 'src/x.ts', severity: 'minor', confidence: 'low' }]);
      const { dispatch } = emitting(xml);
      const result = await runRound(certified, dispatch);
      expect(result).toMatchObject({
        kind: 'reviewed',
        findingsGate: { kind: 'evaluated' },
        verdict: { kind: 'review-recorded' },
      });
      expect(fs.existsSync(transcriptOf(certified))).toBe(false);
    } finally {
      certified.cleanup();
    }
  });

  /**
   * The transcript is written only when a round fails to certify, so unlike the
   * partition — which `record` rewrites on every outcome — it can go stale. Re-run
   * a round number that failed and then certified, and a transcript from the
   * earlier attempt would sit beside a freshly certified `review.xml`, reading
   * exactly like a round that had failed. The pre-dispatch removal is what stops
   * the round directory from describing an attempt that is no longer the one it
   * holds.
   */
  it("drops a previous attempt's transcript when the review is re-run and certifies", async () => {
    const ws = makeReviewGateWorkspace({ baseCommit: FAKE_SHA });
    const transcript = path.join(reviewDirOf(ws), 'reviewer-output.txt');
    try {
      const failed = await runRound(ws, async () => ({
        kind: 'launched-success',
        exitCode: 0,
        stdout: 'I could not read the repository.\n',
      }));
      expect(failed).toMatchObject({ findingsGate: { kind: 'findings-absent' } });
      expect(fs.existsSync(transcript)).toBe(true);

      const xml = buildReviewXml([{ file: 'src/x.ts', severity: 'minor', confidence: 'low' }]);
      const { dispatch } = emitting(xml);
      const rerun = await runRound(ws, dispatch);

      expect(rerun).toMatchObject({
        kind: 'reviewed',
        findingsGate: { kind: 'evaluated' },
        verdict: { kind: 'review-recorded' },
      });
      expect(fs.existsSync(transcript)).toBe(false);
    } finally {
      ws.cleanup();
    }
  });
});
