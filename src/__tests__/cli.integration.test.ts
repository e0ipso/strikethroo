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
import { load } from 'js-yaml';
import {
  STRIKETHROO_WORKFLOW_SKILLS,
  SKILLS_INSTALLER_STDIO,
  SKILLS_INSTALLER_PACKAGE,
  buildSkillsInstallerArgs,
} from '../update';

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
    it('rejects missing --harnesses when no saved selection exists', () => {
      const result = executeCommand(`node "${cliPath}" init`);
      expect(result.exitCode).toBe(1);
      const output = result.stdout + result.stderr;
      expect(output).toContain('--harnesses');
      expect(output).toContain('Missing harness selection');
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

    it('rejects empty --harnesses value even when a saved selection exists', async () => {
      expect(executeCommand(`node "${cliPath}" init --harnesses claude --force`).exitCode).toBe(0);

      const result = executeCommand(`node "${cliPath}" init --harnesses "" --force`);
      expect(result.exitCode).toBe(1);
      const output = result.stdout + result.stderr;
      expect(output).toContain('cannot be empty');
    });

    it('rejects invalid explicit harnesses without falling back to saved selection', async () => {
      expect(executeCommand(`node "${cliPath}" init --harnesses claude --force`).exitCode).toBe(0);

      const result = executeCommand(`node "${cliPath}" init --harnesses invalid --force`);
      expect(result.exitCode).toBe(1);
      const output = result.stdout + result.stderr;
      expect(output).toContain('Invalid harness');
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

  describe('init — workspace gitignore', () => {
    /**
     * `init` ships one workspace-root .gitignore for machine-local config and
     * generated runtime output. Projects may still track plans and workspace
     * policy while the config, review output, and availability cache stay local.
     */
    it('ships a workspace .gitignore covering local config, review output, and the dispatch cache', async () => {
      expect(executeCommand(`node "${cliPath}" init --harnesses claude`).exitCode).toBe(0);

      const ignoreFile = path.join(testDir, '.ai/strikethroo/.gitignore');
      expect(await fs.pathExists(ignoreFile)).toBe(true);
      const contents = await fs.readFile(ignoreFile, 'utf8');
      expect(contents).toContain('config/config.yaml');
      expect(contents).toContain('plans/*/review/');
      expect(contents).toContain('archive/*/review/');
      expect(contents).toContain('runtime/');

      expect(executeCommand('git init').exitCode).toBe(0);
      const ignored = executeCommand(
        'git check-ignore --verbose .ai/strikethroo/config/config.yaml'
      );
      expect(ignored.exitCode).toBe(0);
      expect(ignored.stdout).toContain('config/config.yaml');
    });

    it('ships local autonomous harness arguments', async () => {
      expect(executeCommand(`node "${cliPath}" init --harnesses claude`).exitCode).toBe(0);

      const config = load(
        await fs.readFile(path.join(testDir, '.ai/strikethroo/config/config.yaml'), 'utf8')
      ) as {
        harnesses: Record<string, { cli_args: string[] }>;
      };

      expect(config.harnesses).toEqual({
        claude: { cli_args: ['--dangerously-skip-permissions'] },
        codex: { cli_args: ['--sandbox', 'workspace-write'] },
        cursor: { cli_args: ['--force'] },
        gemini: { cli_args: ['--approval-mode', 'yolo'] },
        copilot: { cli_args: ['--allow-all'] },
        opencode: { cli_args: ['--auto'] },
      });
    });

    /**
     * The template is named `gitignore` because npm mangles `.gitignore` in
     * transit. That neutral name is a delivery detail — it must be renamed on
     * copy, never left in the workspace where git would not read it.
     */
    it('does not leave the neutrally-named template in the workspace', async () => {
      expect(executeCommand(`node "${cliPath}" init --harnesses claude`).exitCode).toBe(0);

      expect(await fs.pathExists(path.join(testDir, '.ai/strikethroo/gitignore'))).toBe(false);
    });

    it('survives a --force re-run', async () => {
      expect(executeCommand(`node "${cliPath}" init --harnesses claude`).exitCode).toBe(0);
      expect(executeCommand(`node "${cliPath}" init --harnesses claude --force`).exitCode).toBe(0);

      const contents = await fs.readFile(path.join(testDir, '.ai/strikethroo/.gitignore'), 'utf8');
      expect(contents).toContain('plans/*/review/');
      expect(contents).toContain('runtime/');
    });

    /**
     * Regression guard for the delivery bug itself. A template named
     * `.gitignore` is consumed by npm-packlist as ignore rules and never enters
     * the tarball; one that survives packing is extracted as `.npmignore`.
     * Either way the workspace ends up without the ignore file, and the failure
     * is invisible from a git checkout — where the same template copies fine.
     * No file shipped under templates/ may carry that name.
     */
    it('ships no file named .gitignore under templates/', async () => {
      const templatesDir = path.join(__dirname, '../../templates');

      const walk = async (dir: string): Promise<string[]> => {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        const found: string[] = [];
        for (const entry of entries) {
          const full = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            found.push(...(await walk(full)));
          } else if (entry.name === '.gitignore') {
            found.push(path.relative(templatesDir, full));
          }
        }
        return found;
      };

      expect(await walk(templatesDir)).toEqual([]);
    });
  });

  describe('init — harness selection persistence', () => {
    const metadataPath = () => path.join(testDir, '.ai/strikethroo/.init-metadata.json');

    it('persists, reuses, overrides, and requires explicit selection when saved field is absent', async () => {
      const first = executeCommand(`node "${cliPath}" init --harnesses claude --force`);
      expect(first.exitCode).toBe(0);

      const afterFirst = await fs.readJson(metadataPath());
      expect(afterFirst.harnesses).toEqual(['claude']);
      expect(await fs.pathExists(path.join(testDir, '.claude/agents/plan-creator.md'))).toBe(true);

      const reused = executeCommand(`node "${cliPath}" init --force`);
      expect(reused.exitCode).toBe(0);
      expect(reused.stdout).toContain('Harnesses: claude');
      expect(await fs.pathExists(path.join(testDir, '.claude/agents/plan-creator.md'))).toBe(true);

      const override = executeCommand(`node "${cliPath}" init --harnesses gemini --force`);
      expect(override.exitCode).toBe(0);
      const afterOverride = await fs.readJson(metadataPath());
      expect(afterOverride.harnesses).toEqual(['gemini']);
      expect(await fs.pathExists(path.join(testDir, '.gemini/agents/plan-creator.md'))).toBe(true);
      expect(await fs.pathExists(path.join(testDir, '.claude/agents/plan-creator.md'))).toBe(true);

      const metadataBeforeLegacy = await fs.readJson(metadataPath());
      const originalTimestamp = metadataBeforeLegacy.timestamp;
      delete metadataBeforeLegacy.harnesses;
      await fs.writeJson(metadataPath(), metadataBeforeLegacy);

      const missingSaved = executeCommand(`node "${cliPath}" init --force`);
      expect(missingSaved.exitCode).toBe(1);
      const output = missingSaved.stdout + missingSaved.stderr;
      expect(output).toContain('Missing harness selection');
      expect(output).toContain('--harnesses');

      const metadataAfterFailed = await fs.readJson(metadataPath());
      expect(metadataAfterFailed.timestamp).toBe(originalTimestamp);

      const explicitStillWorks = executeCommand(
        `node "${cliPath}" init --harnesses cursor --force`
      );
      expect(explicitStillWorks.exitCode).toBe(0);
      const afterExplicit = await fs.readJson(metadataPath());
      expect(afterExplicit.harnesses).toEqual(['cursor']);
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

  describe('validate', () => {
    /**
     * Writes `<testDir>/.ai/strikethroo/.init-metadata.json` verbatim so a
     * workspace of a chosen health can be produced without running `init`.
     */
    const writeWorkspaceMetadata = async (metadata: unknown): Promise<void> => {
      const strikethrooDir = path.join(testDir, '.ai', 'strikethroo');
      await fs.ensureDir(strikethrooDir);
      await fs.writeJson(path.join(strikethrooDir, '.init-metadata.json'), metadata);
    };

    it('exits 0 with a no-findings message on a healthy workspace', async () => {
      await writeWorkspaceMetadata({ version: '0.1.0', workspaceSchemaVersion: 4, files: {} });

      const result = executeCommand(`node "${cliPath}" validate --workspace "${testDir}"`);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('No findings');
    });

    it('exits 1 and names the failing check on an unhealthy workspace', async () => {
      await writeWorkspaceMetadata({ version: '0.0.0', workspaceSchemaVersion: 1 });

      const result = executeCommand(`node "${cliPath}" validate --workspace "${testDir}"`);

      expect(result.exitCode).toBe(1);
      expect(result.stdout).toContain('metadata/schema-version-skew');
      expect(result.stdout).toContain('metadata/files-map-absent');
    });

    // The CI job in issue #31 consumes this stream, so a banner or summary line
    // printed alongside the JSON would break it. Parsing the whole of stdout is
    // the assertion: it fails if anything decorative is emitted with it.
    it('emits parseable JSON on stdout under --json in both health states', async () => {
      await writeWorkspaceMetadata({ version: '0.1.0', workspaceSchemaVersion: 4, files: {} });
      const healthy = executeCommand(`node "${cliPath}" validate --workspace "${testDir}" --json`);
      expect(healthy.exitCode).toBe(0);
      expect(JSON.parse(healthy.stdout)).toEqual({ findings: [] });

      await writeWorkspaceMetadata({ version: '0.0.0', workspaceSchemaVersion: 1 });
      const unhealthy = executeCommand(
        `node "${cliPath}" validate --workspace "${testDir}" --json`
      );
      expect(unhealthy.exitCode).toBe(1);
      const report = JSON.parse(unhealthy.stdout) as { findings: { check: string }[] };
      expect(report.findings.map(f => f.check)).toContain('metadata/schema-version-skew');
    });

    it('exits 1 with the resolver message when the path is not a workspace', () => {
      const result = executeCommand(`node "${cliPath}" validate --workspace "${testDir}"`);

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('not an initialized strikethroo workspace');
    });
  });

  /**
   * Self-validation 6 (disposable-environment smoke with real `npx skills`) is manual only —
   * never run against a developer's global/project skills installation in CI.
   */
  describe('update', () => {
    const metadataPath = () => path.join(testDir, '.ai/strikethroo/.init-metadata.json');

    const initWorkspace = (harnesses = 'claude'): void => {
      const result = executeCommand(`node "${cliPath}" init --harnesses ${harnesses} --force`);
      expect(result.exitCode).toBe(0);
    };

    const writeFakeNpx = async (binDir: string): Promise<void> => {
      await fs.ensureDir(binDir);
      const script = `#!/usr/bin/env node
const fs = require('fs');
const log = {
  argv: process.argv.slice(2),
  cwd: process.cwd(),
  message: process.env.NPX_FAKE_MESSAGE || '',
};
fs.writeFileSync(process.env.NPX_LOG_FILE, JSON.stringify(log, null, 2));
if (process.env.NPX_FAKE_MESSAGE) {
  console.error(process.env.NPX_FAKE_MESSAGE);
}
process.exit(Number(process.env.NPX_EXIT_CODE || '0'));
`;
      const npxPath = path.join(binDir, 'npx');
      await fs.writeFile(npxPath, script);
      await fs.chmod(npxPath, 0o755);
    };

    const runUpdate = (
      args = '',
      opts: { exitCode?: number; message?: string } = {}
    ): { stdout: string; stderr: string; exitCode: number } => {
      const fakeBin = path.join(testDir, 'fake-bin');
      const logFile = path.join(testDir, 'npx-log.json');
      const pathPrefix = `${fakeBin}${path.delimiter}${process.env.PATH || ''}`;
      const exitCode = opts.exitCode ?? 0;
      const message = opts.message ?? '';
      const escapedMessage = message.replace(/"/g, '\\"');
      return executeCommand(
        `PATH="${pathPrefix}" NPX_LOG_FILE="${logFile}" NPX_EXIT_CODE="${exitCode}" NPX_FAKE_MESSAGE="${escapedMessage}" node "${cliPath}" update ${args}`
      );
    };

    it('targets the seven workflow skills with interactive input and streamed output', () => {
      expect(buildSkillsInstallerArgs()).toEqual([
        SKILLS_INSTALLER_PACKAGE,
        'update',
        ...STRIKETHROO_WORKFLOW_SKILLS,
      ]);
      expect(SKILLS_INSTALLER_STDIO).toEqual(['inherit', 'pipe', 'pipe']);
    });

    it('refreshes workspace with explicit harnesses and runs the skills installer', async () => {
      initWorkspace('claude');
      await writeFakeNpx(path.join(testDir, 'fake-bin'));

      const result = runUpdate('--harnesses gemini --force');
      expect(result.exitCode).toBe(0);

      const log = await fs.readJson(path.join(testDir, 'npx-log.json'));
      expect(log.argv).toEqual([
        SKILLS_INSTALLER_PACKAGE,
        'update',
        ...STRIKETHROO_WORKFLOW_SKILLS,
      ]);
      expect(log.cwd).toBe(testDir);

      const output = result.stdout + result.stderr;
      expect(output).toContain('Update summary');
      expect(output).toContain('Workflow skills: updated');
      expect(output).toContain('fresh session');
      expect(output).not.toContain('npx skills add e0ipso/strikethroo');
      expect(await fs.pathExists(path.join(testDir, '.gemini/agents/plan-creator.md'))).toBe(true);

      const metadata = await fs.readJson(metadataPath());
      expect(metadata.harnesses).toEqual(['gemini']);
    });

    it('reuses saved harnesses when --harnesses is omitted', async () => {
      initWorkspace('cursor');
      await writeFakeNpx(path.join(testDir, 'fake-bin'));

      const result = runUpdate('--force');
      expect(result.exitCode).toBe(0);
      const output = result.stdout + result.stderr;
      expect(output).toContain('Harnesses: cursor');

      const metadata = await fs.readJson(metadataPath());
      expect(metadata.harnesses).toEqual(['cursor']);
    });

    it('fails before mutation when the workspace is not initialized and does not spawn the installer', async () => {
      await writeFakeNpx(path.join(testDir, 'fake-bin'));

      const result = runUpdate('--harnesses claude');
      expect(result.exitCode).toBe(1);
      const output = result.stdout + result.stderr;
      expect(output).toContain('not initialized');
      expect(await fs.pathExists(path.join(testDir, 'npx-log.json'))).toBe(false);
    });

    it('requires explicit harnesses when saved selection is absent', async () => {
      initWorkspace('claude');
      const metadata = await fs.readJson(metadataPath());
      delete metadata.harnesses;
      await fs.writeJson(metadataPath(), metadata);

      const result = runUpdate('--force');
      expect(result.exitCode).toBe(1);
      const output = result.stdout + result.stderr;
      expect(output).toContain('Missing harness selection');
      expect(await fs.pathExists(path.join(testDir, 'npx-log.json'))).toBe(false);
    });

    it('does not overwrite customized files without --force', async () => {
      initWorkspace('claude');
      const target = path.join(testDir, '.ai/strikethroo/config/STRIKETHROO.md');
      const customized = '# Custom project context\n';
      await fs.writeFile(target, customized);
      await writeFakeNpx(path.join(testDir, 'fake-bin'));

      const result = runUpdate('--harnesses claude');
      expect(result.exitCode).not.toBe(0);
      expect(await fs.readFile(target, 'utf8')).toBe(customized);
      expect(await fs.pathExists(path.join(testDir, 'npx-log.json'))).toBe(false);
    });

    it('overwrites customized files when --force is explicit', async () => {
      initWorkspace('claude');
      const target = path.join(testDir, '.ai/strikethroo/config/STRIKETHROO.md');
      await fs.writeFile(target, '# Custom project context\n');
      await writeFakeNpx(path.join(testDir, 'fake-bin'));

      const result = runUpdate('--harnesses claude --force');
      expect(result.exitCode).toBe(0);
      const contents = await fs.readFile(target, 'utf8');
      expect(contents).not.toContain('# Custom project context');
      expect(await fs.pathExists(path.join(testDir, 'npx-log.json'))).toBe(true);
    });

    it('keeps a refreshed workspace when the installer fails and reports recovery', async () => {
      initWorkspace('claude');
      const before = await fs.readJson(metadataPath());
      await writeFakeNpx(path.join(testDir, 'fake-bin'));

      const result = runUpdate('--harnesses claude --force', {
        exitCode: 1,
        message: 'skills update failed',
      });
      expect(result.exitCode).toBe(1);
      const output = result.stdout + result.stderr;
      expect(output).toContain('Workspace: refreshed');
      expect(output).toContain('Workflow skills: not updated');
      expect(output).toContain('Re-run `strikethroo update`');
      expect(output).toContain('skills update failed');

      const after = await fs.readJson(metadataPath());
      expect(after.timestamp).not.toBe(before.timestamp);
    });

    it('treats installer cancellation like installer failure', async () => {
      initWorkspace('claude');
      await writeFakeNpx(path.join(testDir, 'fake-bin'));

      const result = runUpdate('--harnesses claude --force', {
        exitCode: 130,
        message: 'cancelled',
      });
      expect(result.exitCode).toBe(1);
      const output = result.stdout + result.stderr;
      expect(output).toContain('Workflow skills: not updated');
      expect(await fs.pathExists(path.join(testDir, 'npx-log.json'))).toBe(true);
    });

    it.each([
      'No installed skills found matching: st-create-plan',
      'Cancelled',
      '1 project skill(s) cannot be updated automatically (installed before skillPath tracking):',
      '1 skill(s) cannot be checked automatically:',
      '✗ Failed to check skills from e0ipso/strikethroo',
    ])('does not report success when the installer exits zero after %s', async message => {
      initWorkspace('claude');
      await writeFakeNpx(path.join(testDir, 'fake-bin'));
      const result = runUpdate('--force', { exitCode: 0, message });
      expect(result.exitCode).toBe(1);
      expect(result.stdout + result.stderr).toContain('Workflow skills: not updated');
    });

    it('reports missing installations from the installer', async () => {
      initWorkspace('claude');
      const missingMessage = 'No installed skills matched the requested names.';
      await writeFakeNpx(path.join(testDir, 'fake-bin'));

      const result = runUpdate('--harnesses claude --force', {
        exitCode: 1,
        message: missingMessage,
      });
      expect(result.exitCode).toBe(1);
      const output = result.stdout + result.stderr;
      expect(output).toContain(missingMessage);
      expect(output).toContain('Workflow skills: not updated');
    });
  });
});
