/**
 * Clean-session code review, end to end.
 *
 * These cases run the compiled `code-review.cjs` from the built skill tree as a
 * child process, with no injected `discover` or `dispatch`: real discovery, real
 * readiness probes, and real review dispatch. The harness CLIs are fake Node
 * executables on a `PATH` that holds nothing else but `git`, `node`, and
 * `xmllint`, so no real CLI can ever launch. Each fake appends one JSON line per
 * invocation to a log outside the workspace, which is what the cases assert on.
 *
 * The credential variable is a stand-in name. No real credential is read,
 * printed, or asserted.
 *
 * Build first: `npm run build` writes the bundle under `dist-test/`.
 */

import { execFileSync, spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import type { ReviewResult } from '../skill-scripts/code-review';
import {
  dispatchReview,
  EXTERNAL_HARNESS_ADAPTERS,
} from '../skill-scripts/shared/external-dispatch';
import { resolveExecutablePath } from '../skill-scripts/shared/executable-resolution';
import { SUPPORTED_HARNESSES, type Harness } from '../types';
import { builtSkillDir } from './built-skills';
import {
  buildReviewXml,
  makeReviewGateWorkspace,
  type ReviewGateWorkspace,
} from './fixtures/review-gate';

const CODE_REVIEW_BUNDLE = path.join(builtSkillDir('st-code-review'), 'scripts', 'code-review.cjs');
const CREDENTIAL_VARIABLE = 'STRIKETHROO_TEST_CREDENTIAL';
const CREDENTIAL_VALUE = 'fake-credential-for-tests';
const PARENT_SESSION_ID = 'parent-session';
const TEST_TIMEOUT_MS = 60_000;

/** The one finding a healthy fake reviewer reports; certification needs a schema-valid document. */
const FINDINGS_XML = buildReviewXml([
  { file: 'src/feature.ts', severity: 'minor', confidence: 'low' },
]);

type ReadinessMode = 'ok' | 'no-file' | 'fail';
type ReviewMode = 'ok' | 'exit-1' | 'invalid-xml';
type Stage = 'auth' | 'readiness' | 'review' | 'unknown';

interface FakeBehavior {
  readiness?: ReadinessMode;
  review?: ReviewMode;
}

interface Invocation {
  harness: Harness;
  stage: Stage;
  argv: string[];
  env: Record<string, string | null>;
}

/**
 * The fake CLI. It answers its authentication argv, writes the readiness nonce
 * when the probe prompt asks for it, and prints a findings document between the
 * delivery markers when the review prompt arrives. Everything it receives goes
 * to the log; nothing leaves the test's temporary directories.
 */
const fakeCliSource = (config: Record<string, unknown>): string => String.raw`#!${process.execPath}
const fs = require('fs');
const path = require('path');
const CONFIG = ${JSON.stringify(config)};
const argv = process.argv.slice(2);
const env = {
  CLAUDECODE: process.env.CLAUDECODE ?? null,
  CLAUDE_CODE_SESSION_ID: process.env.CLAUDE_CODE_SESSION_ID ?? null,
  [CONFIG.credentialVariable]: process.env[CONFIG.credentialVariable] ?? null,
};
const record = stage =>
  fs.appendFileSync(
    CONFIG.logFile,
    JSON.stringify({ harness: CONFIG.harness, stage, argv, env }) + '\n'
  );

if (JSON.stringify(argv) === JSON.stringify(CONFIG.authenticationArgv)) {
  record('auth');
  process.exit(0);
}

const review = input => {
  record('review');
  fs.writeFileSync(CONFIG.promptFile, input);
  if (CONFIG.review === 'exit-1') {
    process.stdout.write('the reviewer crashed\n');
    process.exit(1);
  }
  const token = /<<<BEGIN REVIEW XML ([0-9a-f]+)>>>/.exec(input)[1];
  const document =
    CONFIG.review === 'invalid-xml'
      ? '<?xml version="1.0" encoding="UTF-8"?>\n<review xmlns="urn:self-review:v2"'
      : CONFIG.reviewXml;
  process.stdout.write(
    'progress chatter\n<<<BEGIN REVIEW XML ' + token + '>>>\n' + document +
      '\n<<<END REVIEW XML ' + token + '>>>\n'
  );
};

const readiness = evidence => {
  record('readiness');
  if (CONFIG.readiness === 'fail') process.exit(1);
  if (CONFIG.readiness === 'ok') {
    fs.writeFileSync(path.join(process.cwd(), evidence.file), evidence.content);
  }
};

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => {
  input += chunk;
});
process.stdin.on('end', () => {
  const proof = /STRIKETHROO_READINESS=(\{[^\n]+\})/.exec(input);
  if (input.includes('Strikethroo code review gate')) review(input);
  else if (proof) readiness(JSON.parse(proof[1]));
  else {
    record('unknown');
    process.exit(3);
  }
});
`;

interface Sandbox {
  dir: string;
  /** The whole `PATH` of the gate under test. */
  bin: string;
  home: string;
  logFile: string;
}

const hostExecutable = (name: string): string => {
  const resolved = resolveExecutablePath(name);
  if (resolved === null)
    throw new Error(`${name} must be installed on the host to run this suite.`);
  return resolved;
};

const makeSandbox = (installed: Partial<Record<Harness, FakeBehavior>>): Sandbox => {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'strikethroo-clean-session-')));
  const bin = path.join(dir, 'bin');
  const home = path.join(dir, 'home');
  const logFile = path.join(dir, 'invocations.jsonl');
  fs.mkdirSync(bin);
  fs.mkdirSync(home);
  for (const name of ['git', 'node', 'xmllint']) {
    fs.symlinkSync(name === 'node' ? process.execPath : hostExecutable(name), path.join(bin, name));
  }
  for (const harness of SUPPORTED_HARNESSES) {
    const behavior = installed[harness];
    if (behavior === undefined) continue;
    const adapter = EXTERNAL_HARNESS_ADAPTERS[harness];
    fs.writeFileSync(
      path.join(bin, adapter.executable),
      fakeCliSource({
        harness,
        logFile,
        promptFile: path.join(dir, `${harness}.prompt.txt`),
        authenticationArgv: adapter.authenticationArgv(),
        credentialVariable: CREDENTIAL_VARIABLE,
        readiness: behavior.readiness ?? 'ok',
        review: behavior.review ?? 'ok',
        reviewXml: FINDINGS_XML,
      }),
      { mode: 0o755 }
    );
  }
  return { dir, bin, home, logFile };
};

const readLog = (sandbox: Sandbox): Invocation[] =>
  fs.existsSync(sandbox.logFile)
    ? fs
        .readFileSync(sandbox.logFile, 'utf8')
        .split('\n')
        .filter(line => line !== '')
        .map(line => JSON.parse(line) as Invocation)
    : [];

const harnessesConfig = (cliArgs: Partial<Record<Harness, string[]>>): string =>
  Object.keys(cliArgs).length === 0
    ? ''
    : 'harnesses:\n' +
      Object.entries(cliArgs)
        .map(([harness, args]) => `  ${harness}:\n    cli_args: ${JSON.stringify(args)}\n`)
        .join('');

const git = (cwd: string, ...args: string[]): string =>
  execFileSync(
    'git',
    [
      '-c',
      'user.name=Test',
      '-c',
      'user.email=test@example.com',
      '-c',
      'commit.gpgsign=false',
      ...args,
    ],
    { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }
  ).trim();

interface Scenario {
  workspace: ReviewGateWorkspace;
  sandbox: Sandbox;
  baseCommit: string;
  /** Run the compiled gate as the parent harness `currentHarness` would. */
  run: (currentHarness?: Harness) => { result: ReviewResult; exitCode: number };
}

const cleanups: Array<() => void> = [];
let environmentSnapshot: typeof process.env;

beforeEach(() => {
  environmentSnapshot = { ...process.env };
});

afterEach(() => {
  for (const name of Object.keys(process.env)) delete process.env[name];
  Object.assign(process.env, environmentSnapshot);
  while (cleanups.length > 0) cleanups.pop()!();
});

/**
 * A disposable Git workspace with an opted-in (or not) review configuration, a
 * recorded base commit, and one uncommitted change, so the cumulative diff is
 * small and non-empty. The log, fakes, and home directory live outside it.
 */
const makeScenario = (options: {
  installed: Partial<Record<Harness, FakeBehavior>>;
  enabled?: boolean;
  cliArgs?: Partial<Record<Harness, string[]>>;
}): Scenario => {
  const sandbox = makeSandbox(options.installed);
  const workspace = makeReviewGateWorkspace({
    config: `code_review:\n  enabled: ${options.enabled ?? true}\n${harnessesConfig(options.cliArgs ?? {})}`,
  });
  cleanups.push(() => fs.rmSync(sandbox.dir, { recursive: true, force: true }), workspace.cleanup);

  git(workspace.root, 'init', '--quiet');
  fs.mkdirSync(path.join(workspace.root, 'src'));
  fs.writeFileSync(path.join(workspace.root, 'src', 'feature.ts'), 'export const value = 1;\n');
  git(workspace.root, 'add', '-A');
  git(workspace.root, 'commit', '--quiet', '-m', 'base');
  const baseCommit = git(workspace.root, 'rev-parse', 'HEAD');
  fs.mkdirSync(path.dirname(workspace.baseCommitFile), { recursive: true });
  fs.writeFileSync(
    workspace.baseCommitFile,
    `${JSON.stringify({ version: 1, baseCommit, capturedAt: new Date().toISOString() })}\n`
  );
  fs.writeFileSync(path.join(workspace.root, 'src', 'feature.ts'), 'export const value = 2;\n');

  const run = (currentHarness: Harness = 'claude') => {
    const child = spawnSync(process.execPath, [CODE_REVIEW_BUNDLE, '1', currentHarness], {
      cwd: workspace.root,
      encoding: 'utf8',
      // Explicit and complete: the child sees this environment and nothing ambient.
      env: {
        PATH: sandbox.bin,
        HOME: sandbox.home,
        CLAUDECODE: '1',
        CLAUDE_CODE_SESSION_ID: PARENT_SESSION_ID,
        [CREDENTIAL_VARIABLE]: CREDENTIAL_VALUE,
      },
    });
    return {
      result: JSON.parse(child.stdout.trim()) as ReviewResult,
      exitCode: child.status ?? -1,
    };
  };
  return { workspace, sandbox, baseCommit, run };
};

const forHarness = (log: Invocation[], harness: Harness): Invocation[] =>
  log.filter(entry => entry.harness === harness);

const stagesOf = (log: Invocation[]): Stage[] => log.map(entry => entry.stage);

/** No inherited session variable survives; the credential stand-in does. */
const expectCleanEnvironment = (entries: Invocation[]): void => {
  expect(entries.length).toBeGreaterThan(0);
  for (const entry of entries) {
    expect(entry.env).toEqual({
      CLAUDECODE: null,
      CLAUDE_CODE_SESSION_ID: null,
      [CREDENTIAL_VARIABLE]: CREDENTIAL_VALUE,
    });
  }
};

describe('code review gate: clean-session review through the compiled entry point', () => {
  it(
    'reviews with the current harness alone, in a clean child environment with the safe arguments',
    () => {
      const safeArgs = ['--max-turns', '3', '--output-format', 'text'];
      const scenario = makeScenario({ installed: { claude: {} }, cliArgs: { claude: safeArgs } });

      const { result, exitCode } = scenario.run('claude');

      expect(exitCode).toBe(0);
      expect(result).toMatchObject({
        kind: 'reviewed',
        harness: 'claude',
        baseCommit: scenario.baseCommit,
        verdict: { kind: 'review-recorded' },
        counts: { total: 1, minor: 1 },
        action: 'continue',
      });
      expect(result.codeReview).toMatch(/^Address; Harness: claude;/);
      const log = readLog(scenario.sandbox);
      expect(stagesOf(log)).toEqual(['readiness', 'auth', 'review']);
      expectCleanEnvironment(log);
      for (const entry of log.filter(item => item.stage !== 'auth')) {
        expect(entry.argv).toEqual(['-p', ...safeArgs]);
      }
      // Scope and certification are unchanged: the anchored diff reaches the
      // reviewer, and the certified findings land beside the plan.
      const prompt = fs.readFileSync(path.join(scenario.sandbox.dir, 'claude.prompt.txt'), 'utf8');
      expect(prompt).toContain(scenario.baseCommit);
      expect(prompt).toContain('+export const value = 2;');
      const findings = JSON.parse(
        fs.readFileSync(path.join(scenario.workspace.planDir, 'review', 'findings.json'), 'utf8')
      );
      expect(findings).toMatchObject({ status: 'evaluated', counts: { total: 1 } });
    },
    TEST_TIMEOUT_MS
  );

  it(
    'prefers a ready alternative harness over the current one',
    () => {
      const scenario = makeScenario({ installed: { claude: {}, codex: {} } });

      const { result, exitCode } = scenario.run('claude');

      expect(exitCode).toBe(0);
      expect(result).toMatchObject({
        kind: 'reviewed',
        harness: 'codex',
        verdict: { kind: 'review-recorded' },
      });
      const log = readLog(scenario.sandbox);
      expect(stagesOf(forHarness(log, 'codex'))).toEqual(['readiness', 'auth', 'review']);
      // The current harness was probed as a separate process, then not selected.
      expect(stagesOf(forHarness(log, 'claude'))).toEqual(['readiness']);
      expectCleanEnvironment(log);
    },
    TEST_TIMEOUT_MS
  );

  it.each<[string, Partial<Record<Harness, FakeBehavior>>, string, Stage[]]>([
    [
      'its CLI does not write the readiness nonce',
      { claude: { readiness: 'no-file' } },
      'did not create the required readiness file',
      ['readiness'],
    ],
    ['its CLI is not installed', {}, "Harness executable 'claude' was not found on PATH", []],
  ])(
    'skips with the current harness diagnosis when %s, with no native bypass',
    (_label, installed, probeReason, expectedClaudeStages) => {
      const scenario = makeScenario({ installed });

      const { result, exitCode } = scenario.run('claude');

      expect(exitCode).toBe(0);
      expect(result).toMatchObject({
        kind: 'skipped',
        reason: 'no-reviewer-candidate',
        action: 'continue',
      });
      expect(result.detail).toContain('claude (current harness):');
      expect(result.detail).toContain(probeReason);
      const log = readLog(scenario.sandbox);
      expect(stagesOf(forHarness(log, 'claude'))).toEqual(expectedClaudeStages);
      expect(stagesOf(log)).not.toContain('review');
    },
    TEST_TIMEOUT_MS
  );

  it(
    'refuses session-reuse arguments at readiness and at direct dispatch, and launches nothing with them',
    async () => {
      const unsafe = { claude: ['--session-id=x'], codex: ['resume'] };
      const scenario = makeScenario({
        installed: { claude: {}, codex: {} },
        cliArgs: unsafe,
      });

      // Both ready CLIs carry a session-reuse argument, so neither is a candidate.
      const refused = scenario.run('claude');
      expect(refused.result).toMatchObject({ kind: 'skipped', reason: 'no-reviewer-candidate' });
      expect(refused.result.detail).toContain('harnesses.claude.cli_args[0] is "--session-id=x"');
      expect(refused.result.detail).toContain('harnesses.codex.cli_args[0] is "resume"');
      expect(readLog(scenario.sandbox)).toEqual([]);

      // A direct call cannot bypass the policy either, with the fakes on PATH.
      process.env.PATH = scenario.sandbox.bin;
      for (const [harness, cliArgs] of [
        ['claude', ['--resume', 'abc']],
        ['claude', ['--continue']],
        ['claude', ['--session-id=x']],
        ['codex', ['resume']],
      ] as const) {
        const dispatched = await dispatchReview({
          harness,
          cliArgs,
          workspace: scenario.workspace.root,
          prompt: 'review prompt',
        });
        expect(dispatched).toMatchObject({
          kind: 'fallback',
          reason: 'clean-session-unavailable',
        });
      }
      expect(readLog(scenario.sandbox)).toEqual([]);

      // With a clean alternative installed, only it runs, and no argument that
      // reuses a session reaches any fake.
      const withGemini = makeScenario({
        installed: { claude: {}, codex: {}, gemini: {} },
        cliArgs: unsafe,
      });
      const { result } = withGemini.run('claude');
      expect(result).toMatchObject({ kind: 'reviewed', harness: 'gemini' });
      const log = readLog(withGemini.sandbox);
      expect(log.map(entry => entry.harness)).toEqual(['gemini', 'gemini', 'gemini']);
      const argv = log.flatMap(entry => entry.argv);
      for (const reuse of ['--session-id=x', 'resume', '--resume', '--continue']) {
        expect(argv).not.toContain(reuse);
      }
    },
    TEST_TIMEOUT_MS
  );

  it(
    'starts no probe and no reviewer when code review is not enabled',
    () => {
      const scenario = makeScenario({ installed: { claude: {}, codex: {} }, enabled: false });

      const { result, exitCode } = scenario.run('claude');

      expect(exitCode).toBe(0);
      expect(result).toMatchObject({
        kind: 'skipped',
        reason: 'review-disabled',
        action: 'continue',
      });
      expect(readLog(scenario.sandbox)).toEqual([]);
      expect(
        fs.existsSync(
          path.join(scenario.workspace.strikethrooRoot, 'runtime', 'harness-availability.json')
        )
      ).toBe(false);
      expect(fs.existsSync(path.join(scenario.workspace.planDir, 'review', 'findings.json'))).toBe(
        false
      );
    },
    TEST_TIMEOUT_MS
  );

  it.each([
    ['exits non-zero', 'exit-1' as const, 'launched-failure'],
    ['prints invalid XML', 'invalid-xml' as const, 'reviewed'],
  ])(
    'never reports a clean review when the reviewer %s',
    (_label, review, expectedKind) => {
      const scenario = makeScenario({ installed: { claude: { review } } });

      const { result, exitCode } = scenario.run('claude');

      expect(exitCode).toBe(1);
      expect(result).toMatchObject({ kind: expectedKind, harness: 'claude', action: 'halt' });
      expect(result).not.toMatchObject({ verdict: { kind: 'review-recorded' } });
      expect(result.codeReview).not.toMatch(/^Pass/);
      expect(result.codeReview).toMatch(/^Failed;/);
      expect(stagesOf(readLog(scenario.sandbox))).toContain('review');
    },
    TEST_TIMEOUT_MS
  );
});
