/**
 * Runs the real semantic-release commit analysis and release-notes steps with
 * this repository's .releaserc.json, so a dependency upgrade that breaks the
 * changelog preset fails here instead of during a release.
 */

import * as fs from 'fs';
import * as path from 'path';

type PluginEntry = string | [string, Record<string, unknown>];

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const releaseConfig = JSON.parse(
  fs.readFileSync(path.join(REPO_ROOT, '.releaserc.json'), 'utf8')
) as { plugins: PluginEntry[] };

const pluginConfig = (name: string): Record<string, unknown> => {
  const entry = releaseConfig.plugins.find(p => (Array.isArray(p) ? p[0] : p) === name);
  return Array.isArray(entry) ? entry[1] : {};
};

describe('semantic-release notes', () => {
  test('analyzes commits and renders notes with the configured preset', async () => {
    const analyzer = await import('@semantic-release/commit-analyzer');
    const notes = await import('@semantic-release/release-notes-generator');
    const silent = (): void => undefined;
    const context = {
      cwd: REPO_ROOT,
      env: process.env,
      logger: { log: silent, error: silent, success: silent, warn: silent },
      commits: [
        { hash: 'aaaaaaa', message: 'feat(serve): add a flag' },
        { hash: 'bbbbbbb', message: 'fix(security): harden a boundary' },
      ],
      options: { repositoryUrl: 'https://github.com/e0ipso/strikethroo.git' },
      lastRelease: { gitTag: 'v1.0.0', version: '1.0.0' },
      nextRelease: { gitTag: 'v1.1.0', version: '1.1.0', type: 'minor' },
    };

    const type = await analyzer.analyzeCommits(
      pluginConfig('@semantic-release/commit-analyzer'),
      context
    );
    const rendered = await notes.generateNotes(
      pluginConfig('@semantic-release/release-notes-generator'),
      context
    );

    expect(type).toBe('minor');
    expect(rendered).toContain('### Features');
    expect(rendered).toContain('add a flag');
    expect(rendered).toContain('harden a boundary');
  });
});
