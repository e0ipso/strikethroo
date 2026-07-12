/**
 * CLI Integration Tests
 *
 * Tests CLI behaviour for the skills-only architecture.
 * The CLI bootstraps `.ai/strikethroo/` and deploys per-harness
 * agent files. Task skills are installed separately via
 * `npx skills add e0ipso/strikethroo`.
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

  const verifyStrikethrooBootstrap = async (baseDir: string): Promise<void> => {
    expect(await fs.pathExists(path.join(baseDir, '.ai/strikethroo'))).toBe(true);
    expect(await fs.pathExists(path.join(baseDir, '.ai/strikethroo/plans'))).toBe(true);
    expect(await fs.pathExists(path.join(baseDir, '.ai/strikethroo/archive'))).toBe(true);
    expect(await fs.pathExists(path.join(baseDir, '.ai/strikethroo/config/STRIKETHROO.md'))).toBe(
      true
    );
    expect(
      await fs.pathExists(path.join(baseDir, '.ai/strikethroo/config/hooks/POST_PHASE.md'))
    ).toBe(true);
    expect(
      await fs.pathExists(
        path.join(baseDir, '.ai/strikethroo/config/hooks/TASK_EXECUTION_ROUTING.md')
      )
    ).toBe(true);
    expect(await fs.pathExists(path.join(baseDir, '.ai/strikethroo/config/config.yaml'))).toBe(
      true
    );
  };

  describe('Basic CLI Functionality', () => {
    it('should handle help, version, and error cases correctly', () => {
      const noArgs = executeCommand(`node "${cliPath}"`);
      expect(noArgs.exitCode).toBe(1);
      const noArgsOutput = noArgs.stdout + noArgs.stderr;
      expect(noArgsOutput).toContain('strikethroo');
      expect(noArgsOutput).toContain('Usage:');

      const helpFlag = executeCommand(`node "${cliPath}" --help`);
      expect(helpFlag.exitCode).toBe(0);
      expect(helpFlag.stdout).toContain('strikethroo');
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

  describe('init — Claude harness', () => {
    it('bootstraps .ai/strikethroo and copies Claude agents', async () => {
      const result = executeCommand(`node "${cliPath}" init --harnesses claude`);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Strikethroo initialized successfully!');

      await verifyStrikethrooBootstrap(testDir);
      expect(await fs.pathExists(path.join(testDir, '.claude/agents'))).toBe(true);
      expect(await fs.pathExists(path.join(testDir, '.claude/agents/plan-creator.md'))).toBe(true);
    });
  });

  describe('init — non-Claude harnesses', () => {
    it('bootstraps .ai/strikethroo and creates per-harness agent files', async () => {
      const result = executeCommand(
        `node "${cliPath}" init --harnesses gemini,codex,cursor,copilot,opencode`
      );
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Strikethroo initialized successfully!');
      expect(result.stdout).toContain('npx skills add');

      await verifyStrikethrooBootstrap(testDir);

      expect(await fs.pathExists(path.join(testDir, '.gemini/agents/plan-creator.md'))).toBe(true);
      expect(await fs.pathExists(path.join(testDir, '.codex/agents/plan-creator.toml'))).toBe(true);
      expect(await fs.pathExists(path.join(testDir, '.cursor/agents/plan-creator.md'))).toBe(true);
      expect(await fs.pathExists(path.join(testDir, '.github/agents/plan-creator.md'))).toBe(true);
      expect(await fs.pathExists(path.join(testDir, '.opencode/agents/plan-creator.md'))).toBe(
        true
      );
    });

    it('emits a skill-install notice', async () => {
      const result = executeCommand(`node "${cliPath}" init --harnesses gemini`);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('npx skills add');
    });
  });

  describe('init — destination directory handling', () => {
    it('honours --destination-directory for a relative path', async () => {
      const customDir = 'custom-project';
      const result = executeCommand(
        `node "${cliPath}" init --harnesses claude --destination-directory ${customDir}`
      );
      expect(result.exitCode).toBe(0);

      await verifyStrikethrooBootstrap(path.join(testDir, customDir));
      expect(await fs.pathExists(path.join(testDir, '.ai'))).toBe(false);
    });

    it('creates intermediate parent directories', async () => {
      const nestedDir = 'level1/level2/nested-project';
      const result = executeCommand(
        `node "${cliPath}" init --harnesses claude --destination-directory ${nestedDir}`
      );
      expect(result.exitCode).toBe(0);
      await verifyStrikethrooBootstrap(path.join(testDir, nestedDir));
    });

    it('handles paths with spaces', async () => {
      const spacedDir = 'project with spaces';
      const result = executeCommand(
        `node "${cliPath}" init --harnesses claude --destination-directory "${spacedDir}"`
      );
      expect(result.exitCode).toBe(0);
      await verifyStrikethrooBootstrap(path.join(testDir, spacedDir));
    });
  });

  describe('init — input validation', () => {
    it('rejects missing --harnesses flag', () => {
      const result = executeCommand(`node "${cliPath}" init`);
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('required option');
      expect(result.stderr).toContain('--harnesses');
    });

    it('rejects invalid harness names', () => {
      const result = executeCommand(`node "${cliPath}" init --harnesses invalid`);
      expect(result.exitCode).toBe(1);
      const output = result.stdout + result.stderr;
      expect(output).toContain('Invalid harness');
    });

    it('rejects empty --harnesses value', () => {
      const result = executeCommand(`node "${cliPath}" init --harnesses ""`);
      expect(result.exitCode).toBe(1);
      const output = result.stdout + result.stderr;
      expect(output).toContain('cannot be empty');
    });

    it('rejects partially-invalid harness lists', () => {
      const result = executeCommand(`node "${cliPath}" init --harnesses claude,invalid,gemini`);
      expect(result.exitCode).toBe(1);
      const output = result.stdout + result.stderr;
      expect(output).toContain('Invalid harness');
      expect(output).toContain('invalid');
    });

    it('normalises whitespace and duplicates', async () => {
      const result = executeCommand(
        `node "${cliPath}" init --harnesses " claude , claude , gemini "`
      );
      expect(result.exitCode).toBe(0);
      await verifyStrikethrooBootstrap(testDir);
      expect(await fs.pathExists(path.join(testDir, '.claude/agents'))).toBe(true);
    });
  });

  describe('init — codex TOML output', () => {
    it('creates valid TOML agent for codex', async () => {
      const result = executeCommand(`node "${cliPath}" init --harnesses codex`);
      expect(result.exitCode).toBe(0);
      const tomlContent = await fs.readFile(
        path.join(testDir, '.codex/agents/plan-creator.toml'),
        'utf-8'
      );
      expect(tomlContent).toContain('name = "plan-creator"');
      expect(tomlContent).toContain('description =');
      expect(tomlContent).toContain('developer_instructions = """');
    });
  });

  describe('init — copilot .md extension', () => {
    it('creates .md file for copilot', async () => {
      const result = executeCommand(`node "${cliPath}" init --harnesses copilot`);
      expect(result.exitCode).toBe(0);
      expect(await fs.pathExists(path.join(testDir, '.github/agents/plan-creator.md'))).toBe(true);
    });

    it('rejects the replaced github identifier', () => {
      const result = executeCommand(`node "${cliPath}" init --harnesses github`);
      expect(result.exitCode).toBe(1);
      expect(result.stdout + result.stderr).toContain('copilot');
    });
  });

  describe('init — multi-harness simultaneous output', () => {
    it('creates agent files for multiple harnesses simultaneously', async () => {
      const result = executeCommand(`node "${cliPath}" init --harnesses claude,codex,copilot`);
      expect(result.exitCode).toBe(0);
      expect(await fs.pathExists(path.join(testDir, '.claude/agents/plan-creator.md'))).toBe(true);
      expect(await fs.pathExists(path.join(testDir, '.codex/agents/plan-creator.toml'))).toBe(true);
      expect(await fs.pathExists(path.join(testDir, '.github/agents/plan-creator.md'))).toBe(true);
    });
  });

  describe('init — re-run handling', () => {
    it('succeeds when run twice in the same directory', async () => {
      const first = executeCommand(`node "${cliPath}" init --harnesses claude`);
      expect(first.exitCode).toBe(0);

      const second = executeCommand(`node "${cliPath}" init --harnesses claude --force`);
      expect(second.exitCode).toBe(0);

      await verifyStrikethrooBootstrap(testDir);
      expect(await fs.pathExists(path.join(testDir, '.claude/agents/plan-creator.md'))).toBe(true);
    });
  });
});
