/**
 * CLI Integration Tests
 *
 * Tests CLI behaviour for the skills-only architecture.
 * The CLI bootstraps `.ai/task-manager/` and copies Claude agents into
 * `.claude/agents/`. Task skills are installed separately via
 * `npx skills add e0ipso/ai-task-manager`.
 */

import { execSync } from 'child_process';
import * as fs from 'fs-extra';
import * as os from 'os';
import * as path from 'path';

describe('CLI Integration', () => {
  let testDir: string;
  let originalCwd: string;
  const cliPath = path.resolve(__dirname, '../../dist/cli.js');

  beforeEach(async () => {
    originalCwd = process.cwd();
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ai-task-test-'));
    process.chdir(testDir);
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await fs.remove(testDir);
  });

  const executeCommand = (
    command: string
  ): { stdout: string; stderr: string; exitCode: number } => {
    try {
      const stdout = execSync(command, {
        encoding: 'utf8',
        cwd: testDir,
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      return { stdout, stderr: '', exitCode: 0 };
    } catch (error: unknown) {
      const e = error as { stdout?: Buffer | string; stderr?: Buffer | string; status?: number };
      return {
        stdout: e.stdout?.toString() || '',
        stderr: e.stderr?.toString() || '',
        exitCode: e.status || 1,
      };
    }
  };

  const verifyAiTaskManagerBootstrap = async (baseDir: string): Promise<void> => {
    expect(await fs.pathExists(path.join(baseDir, '.ai/task-manager'))).toBe(true);
    expect(await fs.pathExists(path.join(baseDir, '.ai/task-manager/plans'))).toBe(true);
    expect(await fs.pathExists(path.join(baseDir, '.ai/task-manager/archive'))).toBe(true);
    expect(await fs.pathExists(path.join(baseDir, '.ai/task-manager/config/TASK_MANAGER.md'))).toBe(
      true
    );
    expect(
      await fs.pathExists(path.join(baseDir, '.ai/task-manager/config/hooks/POST_PHASE.md'))
    ).toBe(true);
  };

  describe('Basic CLI Functionality', () => {
    it('should handle help, version, and error cases correctly', () => {
      const noArgs = executeCommand(`node "${cliPath}"`);
      expect(noArgs.exitCode).toBe(1);
      const noArgsOutput = noArgs.stdout + noArgs.stderr;
      expect(noArgsOutput).toContain('ai-task-manager');
      expect(noArgsOutput).toContain('Usage:');

      const helpFlag = executeCommand(`node "${cliPath}" --help`);
      expect(helpFlag.exitCode).toBe(0);
      expect(helpFlag.stdout).toContain('ai-task-manager');
      expect(helpFlag.stdout).toContain('init');

      const versionFlag = executeCommand(`node "${cliPath}" --version`);
      expect(versionFlag.exitCode).toBe(0);
      expect(versionFlag.stdout.trim()).toBe('0.1.0');
    });

    it('should reject unknown subcommands', () => {
      const result = executeCommand(`node "${cliPath}" claude-exec 1`);
      expect(result.exitCode).toBe(1);
      const output = result.stdout + result.stderr;
      expect(output).toContain('Unknown command');
      expect(output).toContain('claude-exec');
    });
  });

  describe('init — Claude assistant', () => {
    it('bootstraps .ai/task-manager and copies Claude agents', async () => {
      const result = executeCommand(`node "${cliPath}" init --assistants claude`);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('AI Task Manager initialized successfully!');

      await verifyAiTaskManagerBootstrap(testDir);
      expect(await fs.pathExists(path.join(testDir, '.claude/agents'))).toBe(true);
      expect(await fs.pathExists(path.join(testDir, '.claude/agents/plan-creator.md'))).toBe(true);
    });

    it('does not emit a .claude/commands directory', async () => {
      executeCommand(`node "${cliPath}" init --assistants claude`);
      expect(await fs.pathExists(path.join(testDir, '.claude/commands'))).toBe(false);
    });
  });

  describe('init — non-Claude assistants', () => {
    it('bootstraps .ai/task-manager but emits no per-assistant files', async () => {
      const result = executeCommand(
        `node "${cliPath}" init --assistants gemini,codex,cursor,github,opencode`
      );
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('AI Task Manager initialized successfully!');
      expect(result.stdout).toContain('npx skills add');

      await verifyAiTaskManagerBootstrap(testDir);

      expect(await fs.pathExists(path.join(testDir, '.gemini'))).toBe(false);
      expect(await fs.pathExists(path.join(testDir, '.codex'))).toBe(false);
      expect(await fs.pathExists(path.join(testDir, '.cursor'))).toBe(false);
      expect(await fs.pathExists(path.join(testDir, '.github/prompts'))).toBe(false);
      expect(await fs.pathExists(path.join(testDir, '.opencode'))).toBe(false);
    });

    it('emits a skill-install notice for each non-Claude assistant', async () => {
      const result = executeCommand(`node "${cliPath}" init --assistants gemini`);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toMatch(/gemini.*npx skills add/s);
    });
  });

  describe('init — destination directory handling', () => {
    it('honours --destination-directory for a relative path', async () => {
      const customDir = 'custom-project';
      const result = executeCommand(
        `node "${cliPath}" init --assistants claude --destination-directory ${customDir}`
      );
      expect(result.exitCode).toBe(0);

      await verifyAiTaskManagerBootstrap(path.join(testDir, customDir));
      expect(await fs.pathExists(path.join(testDir, '.ai'))).toBe(false);
    });

    it('creates intermediate parent directories', async () => {
      const nestedDir = 'level1/level2/nested-project';
      const result = executeCommand(
        `node "${cliPath}" init --assistants claude --destination-directory ${nestedDir}`
      );
      expect(result.exitCode).toBe(0);
      await verifyAiTaskManagerBootstrap(path.join(testDir, nestedDir));
    });

    it('handles paths with spaces', async () => {
      const spacedDir = 'project with spaces';
      const result = executeCommand(
        `node "${cliPath}" init --assistants claude --destination-directory "${spacedDir}"`
      );
      expect(result.exitCode).toBe(0);
      await verifyAiTaskManagerBootstrap(path.join(testDir, spacedDir));
    });
  });

  describe('init — input validation', () => {
    it('rejects missing --assistants flag', () => {
      const result = executeCommand(`node "${cliPath}" init`);
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('required option');
      expect(result.stderr).toContain('--assistants');
    });

    it('rejects invalid assistant names', () => {
      const result = executeCommand(`node "${cliPath}" init --assistants invalid`);
      expect(result.exitCode).toBe(1);
      const output = result.stdout + result.stderr;
      expect(output).toContain('Invalid assistant');
    });

    it('rejects empty --assistants value', () => {
      const result = executeCommand(`node "${cliPath}" init --assistants ""`);
      expect(result.exitCode).toBe(1);
      const output = result.stdout + result.stderr;
      expect(output).toContain('cannot be empty');
    });

    it('rejects partially-invalid assistant lists', () => {
      const result = executeCommand(
        `node "${cliPath}" init --assistants claude,invalid,gemini`
      );
      expect(result.exitCode).toBe(1);
      const output = result.stdout + result.stderr;
      expect(output).toContain('Invalid assistant');
      expect(output).toContain('invalid');
    });

    it('normalises whitespace and duplicates', async () => {
      const result = executeCommand(
        `node "${cliPath}" init --assistants " claude , claude , gemini "`
      );
      expect(result.exitCode).toBe(0);
      await verifyAiTaskManagerBootstrap(testDir);
      expect(await fs.pathExists(path.join(testDir, '.claude/agents'))).toBe(true);
    });
  });

  describe('init — re-run handling', () => {
    it('succeeds when run twice in the same directory', async () => {
      const first = executeCommand(`node "${cliPath}" init --assistants claude`);
      expect(first.exitCode).toBe(0);

      const second = executeCommand(`node "${cliPath}" init --assistants claude --force`);
      expect(second.exitCode).toBe(0);

      await verifyAiTaskManagerBootstrap(testDir);
      expect(await fs.pathExists(path.join(testDir, '.claude/agents/plan-creator.md'))).toBe(true);
    });
  });
});
