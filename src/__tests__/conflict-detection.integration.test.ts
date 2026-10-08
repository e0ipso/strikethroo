/**
 * Integration Tests for File Conflict Detection
 *
 * Tests the complete conflict detection workflow including:
 * - First-time initialization
 * - Re-initialization with no changes
 * - Re-initialization with user modifications
 * - Force flag behavior
 * - Metadata handling
 */

import { describe, it, expect, beforeEach, afterEach, vi, type MockInstance } from 'vitest';
import { spawnSync } from 'child_process';
import * as fs from 'fs-extra';
import * as os from 'os';
import * as path from 'path';
import { init } from '../index';
import { update } from '../update';
import { loadMetadata, saveMetadata, calculateFileHash } from '../metadata';
import { promptForConflicts } from '../prompts';
import { metadataGate } from '../validation/metadata-gate';
import { FileSystemError, type ConflictResolution } from '../types';

// Mock chalk before importing modules to avoid ESM issues in tests
vi.mock('chalk', () => {
  // Simple function that returns its input (strips colors in tests)
  const mockFn = (str: string) => str;

  // Create mock that supports chaining: chalk.color.style() or chalk.style.color()
  const mockChalk = {
    cyan: Object.assign(mockFn, { bold: mockFn }),
    green: mockFn,
    blue: mockFn,
    gray: mockFn,
    yellow: mockFn,
    red: mockFn,
    white: mockFn,
    bold: Object.assign(mockFn, {
      cyan: mockFn,
      white: mockFn,
    }),
  };

  return {
    __esModule: true,
    default: mockChalk,
  };
});

// Mock the prompts module since it uses ESM and we can't test interactive prompts
// in automated tests anyway. The key is to test the metadata and detection logic.
vi.mock('../prompts', () => ({
  promptForConflicts: vi.fn().mockResolvedValue(new Map()),
}));

describe('Conflict Detection Integration Tests', () => {
  const testDir = path.join(__dirname, '../../test-temp-conflict-detection');

  // Suppress console output during tests
  let consoleLogSpy: MockInstance;
  let consoleErrorSpy: MockInstance;

  beforeEach(async () => {
    // Clean up test directory before each test
    await fs.remove(testDir);
    await fs.ensureDir(testDir);

    // Suppress console output
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(async () => {
    // Clean up test directory after each test
    await fs.remove(testDir);

    // Restore console
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('First-time initialization', () => {
    it('should create metadata file on first init', async () => {
      const result = await init({
        harnesses: 'claude',
        destinationDirectory: testDir,
      });

      expect(result.success).toBe(true);

      // Check metadata file exists
      const metadataPath = path.join(testDir, '.ai/strikethroo/.init-metadata.json');
      const metadata = await loadMetadata(metadataPath);

      expect(metadata).not.toBeNull();
      expect(metadata?.version).toBeDefined();
      expect(metadata?.workspaceSchemaVersion).toBe(4);
      expect(metadata?.timestamp).toBeDefined();
      expect(metadata?.files).toBeDefined();
      expect(Object.keys(metadata?.files || {}).length).toBeGreaterThan(0);
    });

    it('should track config files in metadata', async () => {
      const result = await init({
        harnesses: 'claude',
        destinationDirectory: testDir,
      });

      expect(result.success).toBe(true);

      const metadataPath = path.join(testDir, '.ai/strikethroo/.init-metadata.json');
      const metadata = await loadMetadata(metadataPath);

      // Check that config files are tracked
      expect(metadata?.files['config/STRIKETHROO.md']).toBeDefined();
      expect(metadata?.files['config/hooks/POST_PHASE.md']).toBeDefined();
      expect(metadata?.files['config/hooks/TASK_EXECUTION_ROUTING.md']).toBeDefined();
      expect(metadata?.files['config/config.yaml']).toBeDefined();
    });
  });

  describe('Re-initialization with no changes', () => {
    it('should update metadata without prompting when no files changed', async () => {
      // First init
      await init({
        harnesses: 'claude',
        destinationDirectory: testDir,
      });

      const metadataPath = path.join(testDir, '.ai/strikethroo/.init-metadata.json');
      const oldMetadata = await loadMetadata(metadataPath);
      const oldTimestamp = oldMetadata?.timestamp;

      // Wait a moment to ensure timestamp changes
      await new Promise(resolve => setTimeout(resolve, 100));

      // Second init without changes
      const result = await init({
        harnesses: 'claude',
        destinationDirectory: testDir,
      });

      expect(result.success).toBe(true);

      // Check metadata was updated
      const newMetadata = await loadMetadata(metadataPath);
      expect(newMetadata?.timestamp).not.toBe(oldTimestamp);
      expect(newMetadata?.version).toBe(oldMetadata?.version);
    });
  });

  describe('Re-initialization with user modifications', () => {
    it('should detect modified files', async () => {
      // First init
      await init({
        harnesses: 'claude',
        destinationDirectory: testDir,
      });

      // Modify a config file
      const configFile = path.join(testDir, '.ai/strikethroo/config/STRIKETHROO.md');
      const originalContent = await fs.readFile(configFile, 'utf-8');
      await fs.writeFile(configFile, originalContent + '\n# User modification\n', 'utf-8');

      // Get metadata to verify hash changed
      const metadataPath = path.join(testDir, '.ai/strikethroo/.init-metadata.json');
      const metadata = await loadMetadata(metadataPath);
      const originalHash = metadata?.files['config/STRIKETHROO.md'];
      const currentHash = await calculateFileHash(configFile);

      expect(currentHash).not.toBe(originalHash);
    });

    it('should detect user edits to the workspace config.yaml', async () => {
      await init({
        harnesses: 'claude',
        destinationDirectory: testDir,
      });

      const routingFile = path.join(testDir, '.ai/strikethroo/config/config.yaml');
      const originalContent = await fs.readFile(routingFile, 'utf-8');
      await fs.writeFile(routingFile, `${originalContent}\n# Local-only edit\n`, 'utf-8');

      const metadataPath = path.join(testDir, '.ai/strikethroo/.init-metadata.json');
      const metadata = await loadMetadata(metadataPath);
      const originalHash = metadata?.files['config/config.yaml'];
      const currentHash = await calculateFileHash(routingFile);

      expect(originalHash).toBeDefined();
      expect(currentHash).not.toBe(originalHash);
    });
  });

  describe('Force flag behavior', () => {
    it('should overwrite all files when force flag is used', async () => {
      // First init
      await init({
        harnesses: 'claude',
        destinationDirectory: testDir,
      });

      // Modify a config file
      const configFile = path.join(testDir, '.ai/strikethroo/config/STRIKETHROO.md');
      const originalContent = await fs.readFile(configFile, 'utf-8');
      await fs.writeFile(configFile, originalContent + '\n# User modification\n', 'utf-8');

      // Second init with force flag
      const result = await init({
        harnesses: 'claude',
        destinationDirectory: testDir,
        force: true,
      });

      expect(result.success).toBe(true);

      // Check file was overwritten (no user modification)
      const newContent = await fs.readFile(configFile, 'utf-8');
      expect(newContent).not.toContain('# User modification');
    });

    it('should update metadata after force overwrite', async () => {
      // First init
      await init({
        harnesses: 'claude',
        destinationDirectory: testDir,
      });

      // Modify a config file
      const configFile = path.join(testDir, '.ai/strikethroo/config/STRIKETHROO.md');
      const originalContent = await fs.readFile(configFile, 'utf-8');
      await fs.writeFile(configFile, originalContent + '\n# User modification\n', 'utf-8');

      // Second init with force flag
      await init({
        harnesses: 'claude',
        destinationDirectory: testDir,
        force: true,
      });

      // Check metadata reflects the overwritten file
      const metadataPath = path.join(testDir, '.ai/strikethroo/.init-metadata.json');
      const metadata = await loadMetadata(metadataPath);
      const currentHash = await calculateFileHash(configFile);

      expect(metadata?.files['config/STRIKETHROO.md']).toBe(currentHash);
    });
  });

  describe('Multiple harnesses', () => {
    it('should create metadata regardless of harness selection', async () => {
      const result = await init({
        harnesses: 'claude,gemini,opencode',
        destinationDirectory: testDir,
      });

      expect(result.success).toBe(true);

      // Check metadata file exists
      const metadataPath = path.join(testDir, '.ai/strikethroo/.init-metadata.json');
      const metadata = await loadMetadata(metadataPath);

      expect(metadata).not.toBeNull();
      expect(metadata?.files).toBeDefined();
    });
  });

  describe('Edge cases', () => {
    it('should handle empty config directory', async () => {
      const result = await init({
        harnesses: 'claude',
        destinationDirectory: testDir,
      });

      expect(result.success).toBe(true);

      // Even if config is empty, metadata should be created
      const metadataPath = path.join(testDir, '.ai/strikethroo/.init-metadata.json');
      const metadata = await loadMetadata(metadataPath);
      expect(metadata).not.toBeNull();
    });

    it('should handle very long file paths', async () => {
      const result = await init({
        harnesses: 'claude',
        destinationDirectory: testDir,
      });

      expect(result.success).toBe(true);

      // Create a deeply nested file in config
      const deepPath = path.join(testDir, '.ai/strikethroo/config/deeply/nested/path/to/file.md');
      await fs.ensureDir(path.dirname(deepPath));
      await fs.writeFile(deepPath, '# Test file', 'utf-8');

      // Re-init should handle it
      const result2 = await init({
        harnesses: 'claude',
        destinationDirectory: testDir,
        force: true,
      });

      expect(result2.success).toBe(true);
    });
  });

  describe.skipIf(process.platform === 'win32')('Link-backed metadata', () => {
    let project: string;
    let outside: string;
    let sentinel: string;
    let metadataPath: string;

    beforeEach(async () => {
      project = path.join(testDir, 'project');
      outside = path.join(testDir, 'outside');
      sentinel = path.join(outside, 'metadata.json');
      metadataPath = path.join(project, '.ai/strikethroo/.init-metadata.json');
      await fs.ensureDir(outside);
      await fs.writeFile(sentinel, 'untouched', 'utf-8');
    });

    it('fails first-time init when the metadata file is a link and keeps the target intact', async () => {
      await fs.ensureDir(path.dirname(metadataPath));
      await fs.symlink(sentinel, metadataPath);

      await expect(loadMetadata(metadataPath)).rejects.toBeInstanceOf(FileSystemError);

      const result = await init({ harnesses: 'claude', destinationDirectory: project });
      expect(result.success).toBe(false);
      expect(result.message).toMatch(/symbolic link/);
      expect(result.message).toContain('.init-metadata.json');
      expect(await fs.readFile(sentinel, 'utf-8')).toBe('untouched');
      expect((await fs.lstat(metadataPath)).isSymbolicLink()).toBe(true);
    });

    it('fails re-init and update when metadata was swapped for a link, keeping the target intact', async () => {
      const first = await init({ harnesses: 'claude', destinationDirectory: project });
      expect(first.success).toBe(true);
      await fs.remove(metadataPath);
      await fs.symlink(sentinel, metadataPath);

      const reinit = await init({
        harnesses: 'claude',
        destinationDirectory: project,
        force: true,
      });
      expect(reinit.success).toBe(false);
      expect(reinit.message).toMatch(/symbolic link/);

      const updated = await update({ destinationDirectory: project, force: true });
      expect(updated.success).toBe(false);
      expect(updated.workspaceSuccess).toBe(false);
      expect(updated.message).toMatch(/symbolic link/);

      expect(await fs.readFile(sentinel, 'utf-8')).toBe('untouched');
      expect((await fs.lstat(metadataPath)).isSymbolicLink()).toBe(true);
    });

    it('fails when a workspace parent directory is a link and copies nothing through it', async () => {
      const linkedTarget = path.join(outside, 'elsewhere');
      await fs.ensureDir(linkedTarget);
      await fs.ensureDir(path.join(project, '.ai'));
      await fs.symlink(linkedTarget, path.join(project, '.ai/strikethroo'), 'dir');

      const result = await init({ harnesses: 'claude', destinationDirectory: project });
      expect(result.success).toBe(false);
      expect(result.message).toMatch(/symbolic link/);
      expect(result.message).toContain('strikethroo');
      expect(await fs.readdir(linkedTarget)).toEqual([]);
    });
  });
});

describe('Workspace refresh outcomes', () => {
  const SHIPPED_TEMPLATE_DIR = path.resolve(__dirname, '../../templates/strikethroo');
  const PROFILE_MANIFEST =
    'schema_version: 1\nname: refresh-fixture\ndescription: Stages a changed and a new incoming hook\n';
  const promptMock = vi.mocked(promptForConflicts);

  let sandbox: string;
  let project: string;
  let workspace: string;
  let metadataPath: string;
  let consoleLogSpy: MockInstance;
  let consoleErrorSpy: MockInstance;

  /** Answer every prompted conflict the same way. */
  function answerEveryConflict(resolution: ConflictResolution): void {
    promptMock.mockImplementation(
      async conflicts =>
        new Map<string, ConflictResolution>(
          conflicts.map(conflict => [conflict.relativePath, resolution])
        )
    );
  }

  /** Relative paths the prompt was asked about on its n-th call. */
  function promptedPaths(call: number): string[] {
    const conflicts = promptMock.mock.calls[call]?.[0] ?? [];
    return conflicts.map(conflict => conflict.relativePath);
  }

  async function shippedContent(relativePath: string): Promise<string> {
    return fs.readFile(path.join(SHIPPED_TEMPLATE_DIR, relativePath), 'utf-8');
  }

  beforeEach(async () => {
    sandbox = await fs.mkdtemp(path.join(os.tmpdir(), 'strikethroo-refresh-'));
    project = path.join(sandbox, 'project');
    workspace = path.join(project, '.ai/strikethroo');
    metadataPath = path.join(workspace, '.init-metadata.json');
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    promptMock.mockReset();
    expect((await init({ harnesses: 'claude', destinationDirectory: project })).success).toBe(true);
  });

  afterEach(async () => {
    await fs.remove(sandbox);
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    promptMock.mockReset();
    promptMock.mockResolvedValue(new Map());
  });

  it('keeps a customization across repeated refreshes and prompts for it every time', async () => {
    const hookPath = path.join(workspace, 'config/hooks/PRE_PLAN.md');
    const first = (await loadMetadata(metadataPath))!;
    const shippedHash = first.files['config/hooks/PRE_PLAN.md'];
    expect(shippedHash).toBeDefined();

    // Seed provenance so the refresh has something to carry besides harnesses.
    first.profile = { name: 'seeded', source: '/seeded', importedAt: '2026-01-01T00:00:00.000Z' };
    await saveMetadata(metadataPath, first);

    const customized = `${await fs.readFile(hookPath, 'utf-8')}\n# Local customization\n`;
    await fs.writeFile(hookPath, customized, 'utf-8');
    answerEveryConflict('keep');

    for (const run of [1, 2]) {
      const result = await init({ harnesses: 'claude', destinationDirectory: project });
      expect(result.success).toBe(true);
      expect(promptMock).toHaveBeenCalledTimes(run);
      expect(promptedPaths(run - 1)).toEqual(['config/hooks/PRE_PLAN.md']);
      expect(await fs.readFile(hookPath, 'utf-8')).toBe(customized);

      const metadata = (await loadMetadata(metadataPath))!;
      // The baseline keeps describing shipped content, never the user's edit.
      expect(metadata.files['config/hooks/PRE_PLAN.md']).toBe(shippedHash);
      expect(metadata.files['config/hooks/PRE_PLAN.md']).not.toBe(
        await calculateFileHash(hookPath)
      );
      expect(metadata.harnesses).toEqual(['claude']);
      expect(metadata.profile?.name).toBe('seeded');
    }
  });

  it('refreshes every unrelated incoming path around a kept conflict and records what happened', async () => {
    const before = (await loadMetadata(metadataPath))!;

    // One customization the user will keep.
    const keptPath = path.join(workspace, 'config/hooks/PRE_PLAN.md');
    const keptContent = '# Mine, hands off\n';
    await fs.writeFile(keptPath, keptContent, 'utf-8');

    // One shipped file the user deleted; the refresh restores it.
    const restoredPath = path.join(workspace, 'config/hooks/POST_PLAN.md');
    await fs.remove(restoredPath);

    // One tracked path that is gone from disk and absent from the incoming tree.
    const retiredHash = 'f'.repeat(64);
    before.files['config/hooks/RETIRED.md'] = retiredHash;
    await saveMetadata(metadataPath, before);

    // The incoming tree: shipped templates with a changed hook and a new hook overlaid.
    const profileDir = path.join(sandbox, 'profile');
    const changedContent = '# PRE_PHASE as the profile ships it\n';
    const addedContent = '# A hook the shipped tree does not have\n';
    await fs.ensureDir(path.join(profileDir, 'config/hooks'));
    await fs.writeFile(path.join(profileDir, 'profile.yaml'), PROFILE_MANIFEST, 'utf-8');
    await fs.writeFile(path.join(profileDir, 'config/hooks/PRE_PHASE.md'), changedContent, 'utf-8');
    await fs.writeFile(path.join(profileDir, 'config/hooks/ADDED.md'), addedContent, 'utf-8');

    answerEveryConflict('keep');
    const result = await init({
      harnesses: 'claude',
      destinationDirectory: project,
      profile: profileDir,
    });
    expect(result.success).toBe(true);
    expect(promptMock).toHaveBeenCalledTimes(1);
    expect(promptedPaths(0)).toEqual(['config/hooks/PRE_PLAN.md']);

    // Disk: kept, refreshed, installed, restored.
    const changedPath = path.join(workspace, 'config/hooks/PRE_PHASE.md');
    const addedPath = path.join(workspace, 'config/hooks/ADDED.md');
    expect(await fs.readFile(keptPath, 'utf-8')).toBe(keptContent);
    expect(await fs.readFile(changedPath, 'utf-8')).toBe(changedContent);
    expect(await fs.readFile(addedPath, 'utf-8')).toBe(addedContent);
    expect(await fs.readFile(restoredPath, 'utf-8')).toBe(
      await shippedContent('config/hooks/POST_PLAN.md')
    );

    // Metadata: the trusted baseline for the kept path, on-disk hashes for the rest,
    // and the retired path carried forward so validate still reports it.
    const after = (await loadMetadata(metadataPath))!;
    expect(after.files['config/hooks/PRE_PLAN.md']).toBe(before.files['config/hooks/PRE_PLAN.md']);
    expect(after.files['config/hooks/PRE_PLAN.md']).not.toBe(await calculateFileHash(keptPath));
    expect(after.files['config/hooks/PRE_PHASE.md']).toBe(await calculateFileHash(changedPath));
    expect(after.files['config/hooks/ADDED.md']).toBe(await calculateFileHash(addedPath));
    expect(after.files['config/hooks/POST_PLAN.md']).toBe(await calculateFileHash(restoredPath));
    expect(after.files['config/hooks/RETIRED.md']).toBe(retiredHash);
    expect(after.harnesses).toEqual(['claude']);
    expect(after.profile?.name).toBe('refresh-fixture');
    expect(after.workspaceSchemaVersion).toBe(4);

    const deleted = metadataGate(workspace).filter(
      finding => finding.check === 'metadata/file-deleted'
    );
    expect(deleted.map(finding => finding.path)).toEqual(['config/hooks/RETIRED.md']);
  });

  it('prompts an untracked differing collision as untracked: keep leaves it untracked, overwrite tracks it', async () => {
    const hookRel = 'config/hooks/PRE_PLAN.md';
    const hookPath = path.join(workspace, hookRel);
    const customized = '# Mine, hands off\n';
    const before = (await loadMetadata(metadataPath))!;
    delete before.files[hookRel];
    await saveMetadata(metadataPath, before);
    await fs.writeFile(hookPath, customized, 'utf-8');

    answerEveryConflict('keep');
    expect((await init({ harnesses: 'claude', destinationDirectory: project })).success).toBe(true);
    expect(promptMock).toHaveBeenCalledTimes(1);
    const [prompted] = promptMock.mock.calls[0]![0];
    expect(prompted?.relativePath).toBe(hookRel);
    // No recorded baseline: the prompt must not claim one.
    expect(prompted?.originalHash).toBe('');
    expect(await fs.readFile(hookPath, 'utf-8')).toBe(customized);
    // Kept and never tracked stays untracked, so the next run asks again rather
    // than adopting the user's bytes as a shipped baseline.
    expect((await loadMetadata(metadataPath))!.files[hookRel]).toBeUndefined();

    answerEveryConflict('overwrite');
    expect((await init({ harnesses: 'claude', destinationDirectory: project })).success).toBe(true);
    expect(promptMock).toHaveBeenCalledTimes(2);
    expect(promptedPaths(1)).toEqual([hookRel]);
    expect(await fs.readFile(hookPath, 'utf-8')).toBe(await shippedContent(hookRel));
    expect((await loadMetadata(metadataPath))!.files[hookRel]).toBe(
      await calculateFileHash(hookPath)
    );
  });

  it('does not report success or restamp metadata when a write fails after a kept conflict', async () => {
    const hookPath = path.join(workspace, 'config/hooks/PRE_PLAN.md');
    await fs.writeFile(hookPath, '# Mine\n', 'utf-8');
    const restoredPath = path.join(workspace, 'config/hooks/POST_PLAN.md');
    await fs.remove(restoredPath);

    // A regular file where config/shared/ should be makes restoring its tracked
    // files fail with ENOTDIR, after the hooks above were already processed.
    const sharedDir = path.join(workspace, 'config/shared');
    await fs.remove(sharedDir);
    await fs.writeFile(sharedDir, 'not a directory\n', 'utf-8');
    const metadataBefore = await fs.readFile(metadataPath, 'utf-8');

    answerEveryConflict('keep');
    await new Promise(resolve => setTimeout(resolve, 20));
    const result = await init({ harnesses: 'claude', destinationDirectory: project });

    expect(result.success).toBe(false);
    expect(result.message).toMatch(/ENOTDIR|not a directory/);
    expect(await fs.readFile(metadataPath, 'utf-8')).toBe(metadataBefore);
    expect(await fs.readFile(hookPath, 'utf-8')).toBe('# Mine\n');
    // Work done before the failure stays on disk; only the success stamp is withheld.
    expect(await fs.pathExists(restoredPath)).toBe(true);
  });
});

/**
 * The gate through the real CLI with piped (non-TTY) stdin. The prompt cannot
 * run, so every decision outcome is observable as an exit code plus the bytes
 * and metadata left on disk.
 */
describe('Untrusted baseline gate (CLI, non-interactive stdin)', () => {
  const cliPath = path.resolve(__dirname, '../../dist/cli.js');
  const SHIPPED_TEMPLATE_DIR = path.resolve(__dirname, '../../templates/strikethroo');
  const HOOK = 'config/hooks/PRE_PLAN.md';
  const OTHER_HOOK = 'config/hooks/POST_PLAN.md';
  const CUSTOM = '# Mine, hands off\n';

  let sandbox: string;
  let project: string;
  let workspace: string;
  let metadataPath: string;

  function runInit(...args: string[]): { status: number | null; output: string } {
    const result = spawnSync(
      process.execPath,
      [cliPath, 'init', '--destination-directory', project, ...args],
      { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], input: '' }
    );
    return { status: result.status, output: `${result.stdout}${result.stderr}` };
  }

  const hookPath = (): string => path.join(workspace, HOOK);
  const otherHookPath = (): string => path.join(workspace, OTHER_HOOK);

  async function shippedContent(relativePath: string): Promise<string> {
    return fs.readFile(path.join(SHIPPED_TEMPLATE_DIR, relativePath), 'utf-8');
  }

  /** Byte-for-byte snapshot of the metadata file, or null when absent. */
  async function metadataBytes(): Promise<string | null> {
    return (await fs.pathExists(metadataPath)) ? fs.readFile(metadataPath, 'utf-8') : null;
  }

  function expectRefusal(result: { status: number | null; output: string }): void {
    expect(result.status).toBe(1);
    expect(result.output).toContain('--force');
    expect(result.output).toContain(HOOK);
    expect(result.output).toMatch(/not tracked|no recorded baseline|cannot be trusted/i);
  }

  function expectNoDecisionAsked(result: { status: number | null; output: string }): void {
    expect(result.status).toBe(0);
    expect(result.output).not.toMatch(/conflict|--force|not tracked|baseline/i);
  }

  beforeEach(async () => {
    sandbox = await fs.mkdtemp(path.join(os.tmpdir(), 'strikethroo-gate-'));
    project = path.join(sandbox, 'project');
    workspace = path.join(project, '.ai/strikethroo');
    metadataPath = path.join(workspace, '.init-metadata.json');
  });

  afterEach(async () => {
    await fs.remove(sandbox);
  });

  it('installs into an empty destination without asking anything', async () => {
    expectNoDecisionAsked(runInit('--harnesses', 'claude'));
    const metadata = await loadMetadata(metadataPath);
    expect(metadata?.files[HOOK]).toBe(await calculateFileHash(hookPath()));
    expect(await fs.readFile(hookPath(), 'utf-8')).toBe(await shippedContent(HOOK));
  });

  describe.each<[string, (metadataFile: string) => Promise<void>]>([
    ['absent', async file => fs.remove(file)],
    [
      'truncated JSON',
      async file => fs.writeFile(file, '{"version":"4.1.0","timestamp":"2026-01-01T00', 'utf-8'),
    ],
    [
      'missing its files map',
      async file => {
        const metadata = (await fs.readJson(file)) as Record<string, unknown>;
        delete metadata.files;
        await fs.writeJson(file, metadata);
      },
    ],
  ])('when metadata is %s and config/ holds a differing file', (_label, breakMetadata) => {
    it('refuses without --force even with --harnesses, then overwrites with --force', async () => {
      expect(runInit('--harnesses', 'claude').status).toBe(0);
      await fs.writeFile(hookPath(), CUSTOM, 'utf-8');
      await breakMetadata(metadataPath);
      const hookBefore = await calculateFileHash(hookPath());
      const metadataBefore = await metadataBytes();

      expectRefusal(runInit('--harnesses', 'claude'));
      expect(await calculateFileHash(hookPath())).toBe(hookBefore);
      expect(await metadataBytes()).toBe(metadataBefore);

      expect(runInit('--harnesses', 'claude', '--force').status).toBe(0);
      expect(await fs.readFile(hookPath(), 'utf-8')).toBe(await shippedContent(HOOK));
      const metadata = await loadMetadata(metadataPath);
      expect(metadata?.files[HOOK]).toBe(await calculateFileHash(hookPath()));
      expect(metadata?.harnesses).toEqual(['claude']);
    });
  });

  it.each([
    ['absent', async (file: string) => fs.remove(file)],
    ['truncated JSON', async (file: string) => fs.writeFile(file, '{ invalid json ', 'utf-8')],
  ])(
    'recovers without asking when metadata is %s but every file matches the incoming tree',
    async (_label, breakMetadata) => {
      expect(runInit('--harnesses', 'claude').status).toBe(0);
      await breakMetadata(metadataPath);

      expectNoDecisionAsked(runInit('--harnesses', 'claude'));
      const metadata = await loadMetadata(metadataPath);
      expect(metadata).not.toBeNull();
      expect(metadata?.files[HOOK]).toBe(await calculateFileHash(hookPath()));
      expect(metadata?.files[OTHER_HOOK]).toBe(await calculateFileHash(otherHookPath()));
    }
  );

  it('protects an untracked differing collision until --force and re-tracks a matching one silently', async () => {
    expect(runInit('--harnesses', 'claude').status).toBe(0);
    const tracked = (await loadMetadata(metadataPath))!;
    delete tracked.files[HOOK];
    delete tracked.files[OTHER_HOOK];
    await saveMetadata(metadataPath, tracked);
    await fs.writeFile(hookPath(), CUSTOM, 'utf-8');
    const metadataBefore = await metadataBytes();

    // Differing and untracked: refused, and nothing on disk moves.
    const declined = runInit();
    expectRefusal(declined);
    // The matching untracked sibling is not a decision.
    expect(declined.output).not.toContain(OTHER_HOOK);
    expect(await fs.readFile(hookPath(), 'utf-8')).toBe(CUSTOM);
    expect(await metadataBytes()).toBe(metadataBefore);

    // --force is the overwrite route.
    expect(runInit('--force').status).toBe(0);
    expect(await fs.readFile(hookPath(), 'utf-8')).toBe(await shippedContent(HOOK));
    const forced = (await loadMetadata(metadataPath))!;
    expect(forced.files[HOOK]).toBe(await calculateFileHash(hookPath()));
    expect(forced.files[OTHER_HOOK]).toBe(await calculateFileHash(otherHookPath()));

    // Untracked but byte-identical: refreshed silently and tracked again.
    delete forced.files[OTHER_HOOK];
    await saveMetadata(metadataPath, forced);
    expectNoDecisionAsked(runInit());
    expect((await loadMetadata(metadataPath))!.files[OTHER_HOOK]).toBe(
      await calculateFileHash(otherHookPath())
    );
  });
});
