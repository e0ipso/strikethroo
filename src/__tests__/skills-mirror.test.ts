/**
 * Shape checks for the Git-tree release channel: the committed root skills/
 * directory and .claude-plugin/plugin.json must be complete and agree.
 *
 * Deliberately absent: any comparison of skills/ against a fresh dist-test/
 * build. skills/ records the most recent *released* skill set and lags the
 * source between releases. CI asserts instead that it equals the last release
 * tag, and the release rebuilds it with `npm run build:release-skills`.
 */

import * as fs from 'fs';
import * as path from 'path';

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const MIRROR_DIR = path.join(REPO_ROOT, 'skills');
const PLUGIN_MANIFEST = path.join(REPO_ROOT, '.claude-plugin', 'plugin.json');

/** Matches an in-skill script reference; a bare cross-skill filename is not one. */
const SCRIPT_REFERENCE = /scripts\/[A-Za-z0-9_-]+\.cjs/g;

const listDirectories = (dir: string): string[] =>
  fs
    .readdirSync(dir, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
    .sort();

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
