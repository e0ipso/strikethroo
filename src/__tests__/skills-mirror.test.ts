/**
 * Distribution validation for the Git-tree release channel.
 *
 * Two independent concerns live here:
 *
 *   1. The mechanism — scripts/sync-skills-mirror.cjs — exercised against
 *      throwaway fixture trees via STRIKETHROO_MIRROR_SOURCE/TARGET.
 *   2. The committed skills/ mirror and .claude-plugin/plugin.json, checked
 *      for internal completeness and mutual agreement.
 *
 * Deliberately absent: any comparison of the committed skills/ mirror against
 * a freshly built templates/harness/skills/. The mirror records the most
 * recent *released* skill set, so it legitimately lags the source build
 * between releases; live-tree parity is a release-time invariant asserted by
 * the release workflow's sync step, not a per-commit one.
 */

import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const SYNC_SCRIPT = path.join(REPO_ROOT, 'scripts', 'sync-skills-mirror.cjs');
const MIRROR_DIR = path.join(REPO_ROOT, 'skills');
const PLUGIN_MANIFEST = path.join(REPO_ROOT, '.claude-plugin', 'plugin.json');

/** Matches an in-skill script reference; a bare cross-skill filename is not one. */
const SCRIPT_REFERENCE = /scripts\/[A-Za-z0-9_-]+\.cjs/g;

const writeFile = (filePath: string, contents: string): void => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, contents);
};

/** Recursively lists files under `dir` as sorted, relative POSIX paths. */
const listFiles = (dir: string): string[] => {
  const files: string[] = [];
  const walk = (current: string, prefix: string): void => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) walk(path.join(current, entry.name), rel);
      else files.push(rel);
    }
  };
  if (fs.existsSync(dir)) walk(dir, '');
  return files.sort();
};

const listDirectories = (dir: string): string[] =>
  fs
    .readdirSync(dir, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
    .sort();

describe('sync-skills-mirror script', () => {
  let tempDir: string;
  let source: string;
  let target: string;

  const runSync = (
    args: string[] = [],
    overrides: { source?: string; target?: string } = {}
  ): { status: number | null; output: string } => {
    const result = spawnSync('node', [SYNC_SCRIPT, ...args], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      env: {
        ...process.env,
        STRIKETHROO_MIRROR_SOURCE: overrides.source ?? source,
        STRIKETHROO_MIRROR_TARGET: overrides.target ?? target,
      },
    });
    return {
      status: result.status,
      output: `${result.stdout ?? ''}${result.stderr ?? ''}`,
    };
  };

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skills-mirror-'));
    source = path.join(tempDir, 'source');
    target = path.join(tempDir, 'target');

    writeFile(path.join(source, 'st-alpha', 'SKILL.md'), '---\nname: st-alpha\n---\nAlpha body\n');
    writeFile(path.join(source, 'st-alpha', 'scripts', 'alpha.cjs'), 'console.log("alpha");\n');
    writeFile(path.join(source, 'st-beta', 'SKILL.md'), '---\nname: st-beta\n---\nBeta body\n');
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test('replaces the target wholesale, dropping files absent from the source', () => {
    fs.cpSync(source, target, { recursive: true });
    writeFile(path.join(target, 'st-alpha', 'scripts', 'stale.cjs'), 'console.log("stale");\n');
    writeFile(path.join(target, 'st-retired', 'SKILL.md'), 'retired skill\n');

    const result = runSync();

    expect(result.status).toBe(0);
    expect(listFiles(target)).toEqual(listFiles(source));
    expect(fs.existsSync(path.join(target, 'st-alpha', 'scripts', 'stale.cjs'))).toBe(false);
    expect(fs.existsSync(path.join(target, 'st-retired'))).toBe(false);
    expect(fs.readFileSync(path.join(target, 'st-alpha', 'scripts', 'alpha.cjs'), 'utf8')).toBe(
      'console.log("alpha");\n'
    );
  });

  test('--verify exits 0 and writes nothing when the trees are identical', () => {
    fs.cpSync(source, target, { recursive: true });
    const before: Array<[string, Buffer]> = listFiles(target).map(rel => [
      rel,
      fs.readFileSync(path.join(target, rel)),
    ]);

    const result = runSync(['--verify']);

    expect(result.status).toBe(0);
    expect(result.output).toContain('Mirror in sync');
    expect(before.map(([rel]) => rel)).toEqual(listFiles(target));
    for (const [rel, bytes] of before) {
      expect(fs.readFileSync(path.join(target, rel)).equals(bytes)).toBe(true);
    }
  });

  test.each([
    [
      'missing',
      'st-alpha/scripts/alpha.cjs',
      (dir: string) => fs.rmSync(path.join(dir, 'st-alpha', 'scripts', 'alpha.cjs')),
    ],
    [
      'extra',
      'st-alpha/scripts/stale.cjs',
      (dir: string) => writeFile(path.join(dir, 'st-alpha', 'scripts', 'stale.cjs'), 'stale\n'),
    ],
    [
      'different',
      'st-beta/SKILL.md',
      (dir: string) =>
        fs.writeFileSync(path.join(dir, 'st-beta', 'SKILL.md'), '---\nname: st-beta\n---\nDrift\n'),
    ],
  ])('--verify fails on a %s file and names it', (label, relPath, corrupt) => {
    fs.cpSync(source, target, { recursive: true });
    corrupt(target);

    const result = runSync(['--verify']);

    expect(result.status).toBe(1);
    expect(result.output).toContain(`${label.padEnd(10)}${relPath}`);
    expect(result.output).toContain('Mirror parity failed');
  });

  test('--verify exits 1 when the mirror directory does not exist', () => {
    const result = runSync(['--verify']);

    expect(result.status).toBe(1);
    expect(result.output).toContain('Mirror directory not found');
  });

  test('refuses an absent source tree without touching the target', () => {
    fs.cpSync(source, target, { recursive: true });
    const before = listFiles(target);

    const result = runSync([], { source: path.join(tempDir, 'nowhere') });

    expect(result.status).toBe(2);
    expect(result.output).toContain('Source skill tree not found');
    expect(listFiles(target)).toEqual(before);
  });

  test('refuses a source tree holding no built skill directory', () => {
    fs.cpSync(source, target, { recursive: true });
    const before = listFiles(target);

    const empty = path.join(tempDir, 'empty');
    fs.mkdirSync(empty, { recursive: true });
    const emptyResult = runSync([], { source: empty });
    expect(emptyResult.status).toBe(2);
    expect(emptyResult.output).toContain('no built skill directories');

    const unbuilt = path.join(tempDir, 'unbuilt');
    fs.mkdirSync(path.join(unbuilt, 'st-alpha', 'scripts'), { recursive: true });
    fs.writeFileSync(path.join(unbuilt, 'st-alpha', 'scripts', 'alpha.cjs'), 'console.log(1);\n');
    const unbuiltResult = runSync([], { source: unbuilt });
    expect(unbuiltResult.status).toBe(2);
    expect(unbuiltResult.output).toContain('no built skill directories');

    expect(listFiles(target)).toEqual(before);
  });
});

describe('committed skills/ mirror completeness', () => {
  const EXPECTED_SKILLS = [
    'st-code-review',
    'st-create-plan',
    'st-execute-blueprint',
    'st-execute-task',
    'st-full-workflow',
    'st-generate-tasks',
    'st-refine-plan',
  ];

  test('holds exactly the seven shipping skill directories and nothing else', () => {
    expect(listDirectories(MIRROR_DIR)).toEqual(EXPECTED_SKILLS);
  });

  test('every skill directory carries a non-empty SKILL.md', () => {
    for (const skill of listDirectories(MIRROR_DIR)) {
      const skillFile = path.join(MIRROR_DIR, skill, 'SKILL.md');
      expect(fs.existsSync(skillFile)).toBe(true);
      expect(fs.readFileSync(skillFile, 'utf8').trim().length).toBeGreaterThan(0);
    }
  });

  test('every scripts/*.cjs referenced by a SKILL.md ships in that skill', () => {
    const references: string[] = [];
    const dangling: string[] = [];

    for (const skill of listDirectories(MIRROR_DIR)) {
      const body = fs.readFileSync(path.join(MIRROR_DIR, skill, 'SKILL.md'), 'utf8');
      for (const rel of new Set(body.match(SCRIPT_REFERENCE) ?? [])) {
        references.push(`${skill}/${rel}`);
        if (!fs.existsSync(path.join(MIRROR_DIR, skill, ...rel.split('/')))) {
          dangling.push(`${skill}/${rel}`);
        }
      }
    }

    // Guards the scan itself: a reference regex that matched nothing would
    // make the assertion below vacuously true.
    expect(references.length).toBeGreaterThan(0);
    expect(dangling).toEqual([]);
  });
});

describe('.claude-plugin/plugin.json alignment with the mirror', () => {
  const entries: string[] = JSON.parse(fs.readFileSync(PLUGIN_MANIFEST, 'utf8')).skills;

  test('every entry is a ./skills/ path resolving to an existing mirror directory', () => {
    expect(entries.length).toBeGreaterThan(0);
    for (const entry of entries) {
      // The upstream scanner drops relative forms other than "./"-prefixed.
      expect(entry.startsWith('./skills/')).toBe(true);
      const resolved = path.join(REPO_ROOT, entry);
      expect(fs.existsSync(resolved)).toBe(true);
      expect(fs.statSync(resolved).isDirectory()).toBe(true);
    }
  });

  test('the entry set matches the mirror directory set exactly', () => {
    expect(entries.map(entry => path.basename(entry)).sort()).toEqual(listDirectories(MIRROR_DIR));
  });
});
