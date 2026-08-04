/**
 * Integration Tests for Strikethroo Profiles
 *
 * Covers the profiles feature end to end against real temp-dir filesystems:
 * - Local-folder import (overlay, hash tracking, provenance)
 * - Clone-path import via a local bare git repository (no network) + temp hygiene
 * - Representative negatives (one per failure class), destination untouched
 * - Re-init conflict protection of profile-supplied files
 * - Export round-trip through `init --profile <exported>`
 * - Plain-init backwards compatibility (no provenance, unchanged file set)
 */

import { describe, it, expect, beforeEach, afterEach, vi, type MockInstance } from 'vitest';
import { execSync } from 'child_process';
import * as fs from 'fs-extra';
import * as os from 'os';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { init } from '../index';
import { exportProfile } from '../export-profile';
import { loadMetadata, calculateFileHash } from '../metadata';
import { promptForConflicts } from '../prompts';
import { ProfileError } from '../types';

// Mock chalk before importing modules to avoid ESM issues in tests
vi.mock('chalk', () => {
  const passthrough = (value: string): string => value;
  const styled = Object.assign(passthrough, { bold: passthrough, white: passthrough });
  const mockChalk = {
    cyan: styled,
    green: styled,
    blue: styled,
    gray: styled,
    yellow: styled,
    red: styled,
    white: styled,
    bold: Object.assign(passthrough, { white: passthrough, cyan: passthrough }),
  };
  return { __esModule: true, default: mockChalk };
});

// The interactive prompt modules use ESM and cannot run in automated tests;
// pre-answered paths never reach them, and the conflict test asserts the call.
vi.mock('../prompts', () => ({
  promptForConflicts: vi.fn().mockResolvedValue(new Map()),
}));
vi.mock('inquirer', () => ({ __esModule: true, default: { prompt: vi.fn() } }));

const SHIPPED_TEMPLATE_DIR = path.resolve(__dirname, '../../templates/strikethroo');
const PROFILE_TEMP_PREFIX = 'strikethroo-profile-';

const PRE_PLAN_SENTINEL = '# Profile PRE_PLAN\n\nSentinel hook content from test-profile.\n';
const CONFIG_YAML_SENTINEL =
  '# Sentinel config from test-profile\nexecution_routing:\n  profiles: {}\n';

/**
 * Write a valid fixture profile package into `dir`: a manifest plus a config/
 * surface overriding exactly hooks/PRE_PLAN.md and config.yaml.
 */
async function makeFixtureProfile(dir: string): Promise<void> {
  const manifest = {
    schema_version: 1,
    name: 'test-profile',
    description: 'Fixture profile for integration tests',
    purpose: 'Exercise the import pipeline end to end',
    tags: ['test'],
    requires: [{ kind: 'tool', name: 'kenkeep', install: 'npx kenkeep init' }],
    recommends: [{ kind: 'skill', name: 'humanizer' }],
  };
  await fs.ensureDir(path.join(dir, 'config', 'hooks'));
  await fs.writeFile(path.join(dir, 'profile.yaml'), yaml.dump(manifest), 'utf-8');
  await fs.writeFile(path.join(dir, 'config', 'hooks', 'PRE_PLAN.md'), PRE_PLAN_SENTINEL, 'utf-8');
  await fs.writeFile(path.join(dir, 'config', 'config.yaml'), CONFIG_YAML_SENTINEL, 'utf-8');
}

/**
 * Recursively collect file paths under `dir`, relative to `relativeTo`, sorted
 */
async function collectRelativeFiles(dir: string, relativeTo: string): Promise<string[]> {
  const files: string[] = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectRelativeFiles(fullPath, relativeTo)));
    } else if (entry.isFile()) {
      files.push(path.relative(relativeTo, fullPath));
    }
  }
  return files.sort();
}

/**
 * List current profile temp directories under the OS temp root
 */
async function listProfileTempDirs(): Promise<string[]> {
  const entries = await fs.readdir(os.tmpdir());
  return entries.filter(name => name.startsWith(PROFILE_TEMP_PREFIX)).sort();
}

describe('Profiles Integration', () => {
  let sandbox: string;
  let consoleLogSpy: MockInstance;
  let consoleErrorSpy: MockInstance;

  beforeEach(async () => {
    sandbox = await fs.mkdtemp(path.join(os.tmpdir(), 'strikethroo-profiles-test-'));
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(promptForConflicts).mockClear();
  });

  afterEach(async () => {
    await fs.remove(sandbox);
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('local import', () => {
    it('overlays profile files, hash-tracks all config files, and records provenance', async () => {
      const profileDir = path.join(sandbox, 'profile');
      const destDir = path.join(sandbox, 'project');
      await makeFixtureProfile(profileDir);

      const result = await init({
        harnesses: 'claude',
        destinationDirectory: destDir,
        profile: profileDir,
      });
      expect(result.success).toBe(true);

      const workspace = path.join(destDir, '.ai/strikethroo');

      // Overridden files match the fixture
      expect(await fs.readFile(path.join(workspace, 'config/hooks/PRE_PLAN.md'), 'utf-8')).toBe(
        PRE_PLAN_SENTINEL
      );
      expect(await fs.readFile(path.join(workspace, 'config/config.yaml'), 'utf-8')).toBe(
        CONFIG_YAML_SENTINEL
      );

      // An untouched hook matches shipped defaults
      const shippedPostPlan = await fs.readFile(
        path.join(SHIPPED_TEMPLATE_DIR, 'config/hooks/POST_PLAN.md'),
        'utf-8'
      );
      expect(await fs.readFile(path.join(workspace, 'config/hooks/POST_PLAN.md'), 'utf-8')).toBe(
        shippedPostPlan
      );

      // Metadata: schema version, hashes for the full config surface, provenance
      const metadata = await loadMetadata(path.join(workspace, '.init-metadata.json'));
      expect(metadata).not.toBeNull();
      expect(metadata!.workspaceSchemaVersion).toBe(4);

      const shippedConfigFiles = await collectRelativeFiles(
        path.join(SHIPPED_TEMPLATE_DIR, 'config'),
        SHIPPED_TEMPLATE_DIR
      );
      expect(Object.keys(metadata!.files).sort()).toEqual(shippedConfigFiles);
      expect(metadata!.files['config/hooks/PRE_PLAN.md']).toBe(
        await calculateFileHash(path.join(workspace, 'config/hooks/PRE_PLAN.md'))
      );

      expect(metadata!.profile).toBeDefined();
      expect(metadata!.profile!.name).toBe('test-profile');
      expect(metadata!.profile!.source).toBe(profileDir);
      expect(metadata!.profile!.importedAt).toBeTruthy();
    });
  });

  describe('clone path (local bare repository)', () => {
    it('imports via git clone with identical results and leaves no temp dirs behind', async () => {
      const workDir = path.join(sandbox, 'profile-src');
      const bareDir = path.join(sandbox, 'fixture.git');
      const destDir = path.join(sandbox, 'project');
      await makeFixtureProfile(workDir);

      execSync('git init', { cwd: workDir, stdio: 'pipe' });
      execSync('git add .', { cwd: workDir, stdio: 'pipe' });
      execSync('git -c user.name=test -c user.email=test@example.com commit -m "fixture profile"', {
        cwd: workDir,
        stdio: 'pipe',
      });
      execSync(`git clone --bare "${workDir}" "${bareDir}"`, { cwd: sandbox, stdio: 'pipe' });

      const tempDirsBefore = await listProfileTempDirs();

      const result = await init({
        harnesses: 'claude',
        destinationDirectory: destDir,
        profile: bareDir,
      });
      expect(result.success).toBe(true);

      const workspace = path.join(destDir, '.ai/strikethroo');
      expect(await fs.readFile(path.join(workspace, 'config/hooks/PRE_PLAN.md'), 'utf-8')).toBe(
        PRE_PLAN_SENTINEL
      );
      expect(await fs.readFile(path.join(workspace, 'config/config.yaml'), 'utf-8')).toBe(
        CONFIG_YAML_SENTINEL
      );

      const metadata = await loadMetadata(path.join(workspace, '.init-metadata.json'));
      expect(metadata!.profile!.name).toBe('test-profile');
      expect(metadata!.profile!.source).toBe(bareDir);

      // Temp hygiene: no strikethroo-profile-* leftovers under the OS temp root
      const tempDirsAfter = await listProfileTempDirs();
      const leftovers = tempDirsAfter.filter(name => !tempDirsBefore.includes(name));
      expect(leftovers).toEqual([]);
    });
  });

  describe('negative cases', () => {
    const expectAbortedInit = async (profileDir: string, destDir: string): Promise<void> => {
      const result = await init({
        harnesses: 'claude',
        destinationDirectory: destDir,
        profile: profileDir,
      });
      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(ProfileError);
      expect(await fs.pathExists(path.join(destDir, '.ai/strikethroo'))).toBe(false);
    };

    it('aborts on a manifest missing name and leaves the destination untouched', async () => {
      const profileDir = path.join(sandbox, 'profile');
      await makeFixtureProfile(profileDir);
      await fs.writeFile(
        path.join(profileDir, 'profile.yaml'),
        yaml.dump({ schema_version: 1, description: 'Missing the name field' }),
        'utf-8'
      );
      await expectAbortedInit(profileDir, path.join(sandbox, 'project'));
    });

    it('aborts on a package carrying config/schemas and leaves the destination untouched', async () => {
      const profileDir = path.join(sandbox, 'profile');
      await makeFixtureProfile(profileDir);
      await fs.ensureDir(path.join(profileDir, 'config', 'schemas'));
      await fs.writeFile(
        path.join(profileDir, 'config', 'schemas', 'self-review-v2.xsd'),
        '<xs:schema/>',
        'utf-8'
      );
      await expectAbortedInit(profileDir, path.join(sandbox, 'project'));
    });

    it('aborts on an unknown schema_version and leaves the destination untouched', async () => {
      const profileDir = path.join(sandbox, 'profile');
      await makeFixtureProfile(profileDir);
      await fs.writeFile(
        path.join(profileDir, 'profile.yaml'),
        yaml.dump({ schema_version: 99, name: 'test-profile', description: 'Future schema' }),
        'utf-8'
      );
      await expectAbortedInit(profileDir, path.join(sandbox, 'project'));
    });
  });

  describe('re-init conflict protection', () => {
    it('flags exactly the modified profile-supplied file on re-init', async () => {
      const profileDir = path.join(sandbox, 'profile');
      const destDir = path.join(sandbox, 'project');
      await makeFixtureProfile(profileDir);

      const first = await init({
        harnesses: 'claude',
        destinationDirectory: destDir,
        profile: profileDir,
      });
      expect(first.success).toBe(true);

      // User modifies one profile-supplied file
      const modifiedPath = path.join(destDir, '.ai/strikethroo/config/hooks/PRE_PLAN.md');
      const modifiedContent = `${PRE_PLAN_SENTINEL}\nLocal user customization.\n`;
      await fs.writeFile(modifiedPath, modifiedContent, 'utf-8');

      // Mocked prompt answers "keep" (empty resolution map applies no overwrite)
      const second = await init({
        harnesses: 'claude',
        destinationDirectory: destDir,
        profile: profileDir,
      });
      expect(second.success).toBe(true);

      const promptMock = vi.mocked(promptForConflicts);
      expect(promptMock).toHaveBeenCalledTimes(1);
      const conflicts = promptMock.mock.calls[0][0];
      expect(conflicts.map(conflict => conflict.relativePath)).toEqual([
        'config/hooks/PRE_PLAN.md',
      ]);

      // The kept modification survives the re-init
      expect(await fs.readFile(modifiedPath, 'utf-8')).toBe(modifiedContent);
    });
  });

  describe('export round-trip', () => {
    it('exports a tuned workspace and re-imports it via init --profile', async () => {
      const workspaceProject = path.join(sandbox, 'tuned-project');
      const exportDir = path.join(sandbox, 'exported-profile');
      const freshProject = path.join(sandbox, 'fresh-project');

      const setup = await init({ harnesses: 'claude', destinationDirectory: workspaceProject });
      expect(setup.success).toBe(true);

      const tunedContent = '# Tuned PRE_PLAN\n\nHand-tuned hook for the export round-trip.\n';
      await fs.writeFile(
        path.join(workspaceProject, '.ai/strikethroo/config/hooks/PRE_PLAN.md'),
        tunedContent,
        'utf-8'
      );

      const exported = await exportProfile({
        destinationDirectory: exportDir,
        manifest: {
          name: 'tuned-profile',
          description: 'Exported tuned workspace configuration',
          requires: [{ kind: 'tool', name: 'kenkeep', install: 'npx kenkeep init' }],
        },
        cwd: workspaceProject,
      });
      expect(exported.success).toBe(true);

      // The package carries the manifest and excludes the CLI-owned schemas/
      const manifest = yaml.load(
        await fs.readFile(path.join(exportDir, 'profile.yaml'), 'utf-8')
      ) as Record<string, unknown>;
      expect(manifest.schema_version).toBe(1);
      expect(manifest.name).toBe('tuned-profile');
      expect(await fs.pathExists(path.join(exportDir, 'config/schemas'))).toBe(false);
      expect(await fs.readFile(path.join(exportDir, 'config/hooks/PRE_PLAN.md'), 'utf-8')).toBe(
        tunedContent
      );

      // Round-trip: init --profile <exported> renders the tuned files
      const roundTrip = await init({
        harnesses: 'claude',
        destinationDirectory: freshProject,
        profile: exportDir,
      });
      expect(roundTrip.success).toBe(true);

      const freshWorkspace = path.join(freshProject, '.ai/strikethroo');
      expect(
        await fs.readFile(path.join(freshWorkspace, 'config/hooks/PRE_PLAN.md'), 'utf-8')
      ).toBe(tunedContent);
      const metadata = await loadMetadata(path.join(freshWorkspace, '.init-metadata.json'));
      expect(metadata!.profile!.name).toBe('tuned-profile');
      expect(metadata!.profile!.source).toBe(exportDir);
    });
  });

  describe('plain init backwards compatibility', () => {
    it('produces the shipped file set with no provenance field', async () => {
      const destDir = path.join(sandbox, 'project');

      const result = await init({ harnesses: 'claude', destinationDirectory: destDir });
      expect(result.success).toBe(true);

      const workspace = path.join(destDir, '.ai/strikethroo');

      // Every shipped template file lands in the workspace unchanged in shape
      const shippedFiles = await collectRelativeFiles(SHIPPED_TEMPLATE_DIR, SHIPPED_TEMPLATE_DIR);
      expect(shippedFiles.length).toBeGreaterThan(0);
      for (const relativePath of shippedFiles) {
        expect(await fs.pathExists(path.join(workspace, relativePath))).toBe(true);
      }

      // Metadata shape is unchanged: schema 4, config hashes only, no profile key
      const metadata = await loadMetadata(path.join(workspace, '.init-metadata.json'));
      expect(metadata).not.toBeNull();
      expect(metadata!.workspaceSchemaVersion).toBe(4);
      expect('profile' in metadata!).toBe(false);

      const shippedConfigFiles = shippedFiles
        .filter(relativePath => relativePath.startsWith(`config${path.sep}`))
        .sort();
      expect(Object.keys(metadata!.files).sort()).toEqual(shippedConfigFiles);

      // An untouched hook is byte-identical to the shipped default
      const shippedPrePlan = await fs.readFile(
        path.join(SHIPPED_TEMPLATE_DIR, 'config/hooks/PRE_PLAN.md'),
        'utf-8'
      );
      expect(await fs.readFile(path.join(workspace, 'config/hooks/PRE_PLAN.md'), 'utf-8')).toBe(
        shippedPrePlan
      );
    });
  });
});
