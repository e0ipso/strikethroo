import * as fs from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';
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
 * Adapters pass model identifiers through verbatim and send task content through
 * stdin so it is neither process-visible argv nor constrained by ARG_MAX.
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
  stdin: string;
}

export type ExternalDispatchResult =
  | { kind: 'launched-success'; exitCode: 0 }
  | { kind: 'launched-failure'; exitCode: number }
  | { kind: 'infrastructure-failure'; detail: string }
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
  ) => Promise<{ ok: boolean; detail?: string }>;
  launch: (command: StructuredCommand) => Promise<{ exitCode: number }>;
}

export interface ExternalHarnessAdapter {
  executable: string;
  buildCommand: (request: ExternalDispatchRequest) => StructuredCommand;
  authenticationArgv: () => string[];
}

const taskPrompt = (request: ExternalDispatchRequest): string =>
  `Strikethroo external task dispatch — Plan ${request.planId}, Task ${request.taskId}.\n` +
  `Workspace: ${request.workspace}\nTask file: ${request.taskFile}\n` +
  `Before implementation, read and execute ${path.join(
    request.workspace,
    '.ai/strikethroo/config/hooks/PRE_TASK_EXECUTION.md'
  )}. Halt if that hook fails.\n\n` +
  `Read and implement this task. Preserve dependency validation, status transitions, ` +
  `evidence reporting, and error-hook handling. Report failures clearly.\n\n${request.taskMarkdown}`;

const command = (
  executable: string,
  argv: string[],
  request: ExternalDispatchRequest
): StructuredCommand => ({
  executable,
  argv,
  cwd: request.workspace,
  stdin: taskPrompt(request),
});

export const EXTERNAL_HARNESS_ADAPTERS: Readonly<Record<Harness, ExternalHarnessAdapter>> = {
  claude: {
    executable: 'claude',
    buildCommand: request =>
      command(
        'claude',
        [
          '-p',
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
          '-',
        ],
        request
      ),
    authenticationArgv: () => ['login', 'status'],
  },
  cursor: {
    executable: 'cursor-agent',
    buildCommand: request =>
      command('cursor-agent', ['--print', '--model', request.model], request),
    authenticationArgv: () => ['status'],
  },
  gemini: {
    executable: 'gemini',
    buildCommand: request => command('gemini', ['--prompt', '', '--model', request.model], request),
    authenticationArgv: () => ['auth', 'status'],
  },
  copilot: {
    executable: 'copilot',
    buildCommand: request => command('copilot', ['-p', '', '--model', request.model], request),
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
          '-',
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

const runProcess = (
  executable: string,
  argv: string[],
  cwd: string,
  stdin?: string,
  inheritOutput = false
): Promise<{ exitCode: number }> =>
  new Promise((resolve, reject) => {
    let settled = false;
    const fail = (error: Error): void => {
      if (settled) return;
      settled = true;
      reject(error);
    };
    const child = spawn(executable, argv, {
      cwd,
      shell: false,
      stdio: [
        stdin === undefined ? 'ignore' : 'pipe',
        inheritOutput ? 'inherit' : 'ignore',
        inheritOutput ? 'inherit' : 'ignore',
      ],
    });
    child.once('error', fail);
    child.once('close', code => {
      if (settled) return;
      settled = true;
      resolve({ exitCode: code ?? 1 });
    });
    if (stdin !== undefined) {
      child.stdin!.once('error', fail);
      try {
        child.stdin!.end(stdin);
      } catch (error) {
        fail(error instanceof Error ? error : new Error(String(error)));
      }
    }
  });

const dependencies: ExternalDispatchDependencies = {
  executableExists: executableOnPath,
  authenticate: async (commandSpec, adapter) => {
    try {
      const result = await runProcess(
        commandSpec.executable,
        adapter.authenticationArgv(),
        commandSpec.cwd
      );
      return result.exitCode === 0
        ? { ok: true }
        : { ok: false, detail: `${commandSpec.executable} authentication check failed.` };
    } catch (error) {
      return {
        ok: false,
        detail: `${commandSpec.executable} authentication check failed: ${errorMessage(error)}`,
      };
    }
  },
  launch: commandSpec =>
    runProcess(commandSpec.executable, commandSpec.argv, commandSpec.cwd, commandSpec.stdin, true),
};

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/** Only pre-launch failures return fallback. A launched process is always committed. */
export const dispatchExternalTask = async (
  request: ExternalDispatchRequest,
  overrides: Partial<ExternalDispatchDependencies> = {}
): Promise<ExternalDispatchResult> => {
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
  const authentication = await active.authenticate(commandSpec, adapter);
  if (!authentication.ok) {
    return {
      kind: 'fallback',
      reason: 'authentication-failed',
      detail: authentication.detail ?? `${adapter.executable} authentication check failed.`,
    };
  }
  try {
    const launched = await active.launch(commandSpec);
    return launched.exitCode === 0
      ? { kind: 'launched-success', exitCode: 0 }
      : { kind: 'launched-failure', exitCode: launched.exitCode };
  } catch (error) {
    return {
      kind: 'infrastructure-failure',
      detail: `External task process failed: ${errorMessage(error)}`,
    };
  }
};
