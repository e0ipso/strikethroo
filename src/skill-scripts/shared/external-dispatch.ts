import * as fs from 'fs';
import * as path from 'path';
import { spawnSync } from 'child_process';
import { SUPPORTED_HARNESSES, type Harness } from '../../types';

/**
 * CLI contracts were verified against their official CLI documentation:
 * Claude: https://docs.anthropic.com/en/docs/claude-code/cli-reference
 * Codex: https://developers.openai.com/codex/cli/reference/
 * Cursor: https://docs.cursor.com/en/cli/reference/commands
 * Gemini: https://google-gemini.github.io/gemini-cli/docs/cli/commands/
 * Copilot: https://docs.github.com/en/copilot/reference/copilot-cli-reference
 * OpenCode: https://opencode.ai/docs/cli/
 *
 * The adapters intentionally accept the task model verbatim. They do not
 * discover, normalize, default, or inherit model settings.
 */
export interface ExternalDispatchRequest {
  harness: Harness;
  model: string;
  reasoningEffort?: string;
  workspace: string;
  planId: string;
  taskId: string;
  taskFile: string;
  taskMarkdown: string;
}

export interface StructuredCommand {
  executable: string;
  argv: string[];
  cwd: string;
}

export type ExternalDispatchResult =
  | { kind: 'launched-success'; exitCode: 0 }
  | { kind: 'launched-failure'; exitCode: number }
  | {
      kind: 'fallback';
      reason:
        | 'adapter-unavailable'
        | 'executable-unavailable'
        | 'authentication-failed'
        | 'unsupported-reasoning-effort';
      detail: string;
    };

export interface ExternalDispatchDependencies {
  executableExists: (executable: string) => boolean;
  authenticate: (
    command: StructuredCommand,
    adapter: ExternalHarnessAdapter
  ) => { ok: boolean; detail?: string };
  launch: (command: StructuredCommand) => { exitCode: number };
}

export interface ExternalHarnessAdapter {
  executable: string;
  buildCommand: (request: ExternalDispatchRequest) => StructuredCommand;
  authenticationArgv: () => string[];
}

const taskPrompt = (request: ExternalDispatchRequest): string =>
  `Strikethroo external task dispatch — Plan ${request.planId}, Task ${request.taskId}.\n` +
  `Workspace: ${request.workspace}\nTask file: ${request.taskFile}\n\n` +
  `Read and implement this task. Preserve its lifecycle requirements and report failures clearly.\n\n${request.taskMarkdown}`;

const command = (
  executable: string,
  argv: string[],
  request: ExternalDispatchRequest
): StructuredCommand => ({
  executable,
  argv,
  cwd: request.workspace,
});

export const EXTERNAL_HARNESS_ADAPTERS: Readonly<Record<Harness, ExternalHarnessAdapter>> = {
  claude: {
    executable: 'claude',
    buildCommand: request =>
      command(
        'claude',
        [
          '-p',
          taskPrompt(request),
          '--model',
          request.model,
          ...(request.reasoningEffort === undefined ? [] : ['--effort', request.reasoningEffort]),
        ],
        request
      ),
    authenticationArgv: () => ['auth', 'status'],
  },
  codex: {
    executable: 'codex',
    buildCommand: request =>
      command(
        'codex',
        [
          'exec',
          '--model',
          request.model,
          ...(request.reasoningEffort === undefined
            ? []
            : ['--config', `model_reasoning_effort=${request.reasoningEffort}`]),
          taskPrompt(request),
        ],
        request
      ),
    authenticationArgv: () => ['login', 'status'],
  },
  cursor: {
    executable: 'cursor-agent',
    buildCommand: request =>
      command('cursor-agent', ['--print', '--model', request.model, taskPrompt(request)], request),
    authenticationArgv: () => ['status'],
  },
  gemini: {
    executable: 'gemini',
    buildCommand: request =>
      command('gemini', ['--prompt', taskPrompt(request), '--model', request.model], request),
    authenticationArgv: () => ['auth', 'status'],
  },
  copilot: {
    executable: 'copilot',
    buildCommand: request =>
      command('copilot', ['-p', taskPrompt(request), '--model', request.model], request),
    authenticationArgv: () => ['auth', 'status'],
  },
  opencode: {
    executable: 'opencode',
    buildCommand: request =>
      command(
        'opencode',
        [
          'run',
          '--model',
          request.model,
          ...(request.reasoningEffort === undefined ? [] : ['--variant', request.reasoningEffort]),
          taskPrompt(request),
        ],
        request
      ),
    authenticationArgv: () => ['auth', 'list'],
  },
};

const adapterKeys = Object.keys(EXTERNAL_HARNESS_ADAPTERS).sort();
const harnessKeys = [...SUPPORTED_HARNESSES].sort();
if (adapterKeys.join('\0') !== harnessKeys.join('\0')) {
  throw new Error('External harness adapter registry does not cover SUPPORTED_HARNESSES exactly.');
}

export const buildExternalCommand = (request: ExternalDispatchRequest): StructuredCommand =>
  EXTERNAL_HARNESS_ADAPTERS[request.harness].buildCommand(request);

const executableOnPath = (executable: string): boolean =>
  (process.env.PATH ?? '').split(path.delimiter).some(directory => {
    if (!directory) return false;
    const candidate = path.join(directory, executable);
    try {
      return fs.statSync(candidate).isFile();
    } catch {
      return false;
    }
  });

const dependencies: ExternalDispatchDependencies = {
  executableExists: executableOnPath,
  authenticate: (commandSpec, adapter) => {
    const result = spawnSync(commandSpec.executable, adapter.authenticationArgv(), {
      cwd: commandSpec.cwd,
      encoding: 'utf8',
      shell: false,
      stdio: 'pipe',
    });
    return result.status === 0
      ? { ok: true }
      : { ok: false, detail: `${commandSpec.executable} authentication check failed.` };
  },
  launch: commandSpec => {
    const result = spawnSync(commandSpec.executable, commandSpec.argv, {
      cwd: commandSpec.cwd,
      encoding: 'utf8',
      shell: false,
      stdio: 'inherit',
    });
    return { exitCode: result.status ?? 1 };
  },
};

/** Only pre-launch failures return fallback. A launched process is always committed. */
export const dispatchExternalTask = (
  request: ExternalDispatchRequest,
  overrides: Partial<ExternalDispatchDependencies> = {}
): ExternalDispatchResult => {
  const adapter = EXTERNAL_HARNESS_ADAPTERS[request.harness];
  if (!adapter) {
    return {
      kind: 'fallback',
      reason: 'adapter-unavailable',
      detail: `No adapter is registered for ${request.harness}.`,
    };
  }
  const active = { ...dependencies, ...overrides };
  if (
    request.reasoningEffort !== undefined &&
    (request.harness === 'cursor' || request.harness === 'gemini' || request.harness === 'copilot')
  ) {
    return {
      kind: 'fallback',
      reason: 'unsupported-reasoning-effort',
      detail: `${request.harness} does not support a generic reasoning_effort override.`,
    };
  }
  if (!active.executableExists(adapter.executable)) {
    return {
      kind: 'fallback',
      reason: 'executable-unavailable',
      detail: `${adapter.executable} is unavailable.`,
    };
  }
  const commandSpec = adapter.buildCommand(request);
  const authentication = active.authenticate(commandSpec, adapter);
  if (!authentication.ok) {
    return {
      kind: 'fallback',
      reason: 'authentication-failed',
      detail: authentication.detail ?? `${adapter.executable} authentication check failed.`,
    };
  }
  const launched = active.launch(commandSpec);
  return launched.exitCode === 0
    ? { kind: 'launched-success', exitCode: 0 }
    : { kind: 'launched-failure', exitCode: launched.exitCode };
};
