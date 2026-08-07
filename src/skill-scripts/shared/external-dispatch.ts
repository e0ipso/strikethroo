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
  /**
   * An exact model identifier, or absent to let the harness CLI use its own
   * configured default. Absence exists for discovery-driven dispatch, which
   * knows a harness is reachable and knows nothing about which model ids that
   * harness still accepts — the same reasoning `harness-availability.ts`
   * applies to its probes. `execution_routing` never omits it; see
   * {@link RoutedDispatchRequest}.
   */
  model?: string;
  reasoningEffort?: string;
  workspace: string;
  planId: string;
  taskId: string;
  taskFile: string;
  taskMarkdown: string;
}

/**
 * The `execution_routing` dispatch contract. Routing validates an exact `model`
 * per configured target, so its call site annotates this narrowed type and the
 * compiler keeps rejecting a missing model there. Model optionality serves the
 * discovery-driven review path only and must not leak into routing.
 */
export type RoutedDispatchRequest = ExternalDispatchRequest & { model: string };

/**
 * A reviewer dispatch. Discovery yields a harness and nothing else: no model
 * (the CLI uses its own default) and no reasoning effort (there is no basis to
 * infer one). The prompt is supplied whole by the caller — a review is not a
 * task-file dispatch, so it never goes through `taskPrompt`.
 */
export interface ReviewDispatchRequest {
  harness: Harness;
  workspace: string;
  prompt: string;
}

/**
 * The minimal shape an adapter needs to emit a launchable command: which model
 * and reasoning effort to request (if any), where to run, and what to send on
 * stdin. Both the task and the review path reduce to this, so the adapter table
 * is written once.
 */
export interface DispatchCommandRequest {
  model?: string;
  reasoningEffort?: string;
  workspace: string;
  prompt: string;
}

export interface StructuredCommand {
  executable: string;
  argv: string[];
  cwd: string;
  stdin: string;
}

export type ExternalDispatchResult =
  | { kind: 'launched-success'; exitCode: 0; stdout?: string }
  | { kind: 'launched-failure'; exitCode: number; stdout?: string }
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
  /**
   * Both the option parameter and the `stdout` result field are optional so a
   * caller that neither requests nor reads captured output keeps its existing
   * shape. Do not make either required.
   */
  launch: (
    command: StructuredCommand,
    options?: { captureStdout?: boolean }
  ) => Promise<{ exitCode: number; stdout?: string }>;
}

export interface ExternalHarnessAdapter {
  executable: string;
  buildCommand: (request: DispatchCommandRequest) => StructuredCommand;
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
  request: DispatchCommandRequest
): StructuredCommand => ({
  executable,
  argv,
  cwd: request.workspace,
  stdin: request.prompt,
});

/**
 * The model flag and its value, or nothing at all. Omission drops both tokens —
 * `--model ''` is rejected by most of these CLIs. Splicing this in at the exact
 * position `--model` already occupied keeps every with-model argv identical.
 */
const modelArgv = (model: string | undefined): string[] =>
  model === undefined ? [] : ['--model', model];

export const EXTERNAL_HARNESS_ADAPTERS: Readonly<Record<Harness, ExternalHarnessAdapter>> = {
  claude: {
    executable: 'claude',
    buildCommand: request =>
      command(
        'claude',
        [
          '-p',
          ...modelArgv(request.model),
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
          ...modelArgv(request.model),
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
      command('cursor-agent', ['--print', ...modelArgv(request.model)], request),
    authenticationArgv: () => ['status'],
  },
  gemini: {
    executable: 'gemini',
    // The empty positional prompt is the existing contract — content travels on
    // stdin. It stays even when the model pair is dropped.
    buildCommand: request =>
      command('gemini', ['--prompt', '', ...modelArgv(request.model)], request),
    authenticationArgv: () => ['auth', 'status'],
  },
  copilot: {
    executable: 'copilot',
    buildCommand: request => command('copilot', ['-p', '', ...modelArgv(request.model)], request),
    authenticationArgv: () => ['auth', 'status'],
  },
  opencode: {
    executable: 'opencode',
    buildCommand: request =>
      command(
        'opencode',
        [
          'run',
          ...modelArgv(request.model),
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

const taskCommandRequest = (request: ExternalDispatchRequest): DispatchCommandRequest => ({
  model: request.model,
  reasoningEffort: request.reasoningEffort,
  workspace: request.workspace,
  prompt: taskPrompt(request),
});

const reviewCommandRequest = (request: ReviewDispatchRequest): DispatchCommandRequest => ({
  workspace: request.workspace,
  prompt: request.prompt,
});

export const buildExternalCommand = (request: ExternalDispatchRequest): StructuredCommand =>
  EXTERNAL_HARNESS_ADAPTERS[request.harness].buildCommand(taskCommandRequest(request));

/**
 * A reviewer command for a discovered harness: the caller's prompt verbatim on
 * stdin, no model, no reasoning effort. Deliberately does not reach
 * `taskPrompt`, which hard-codes a task file and a `PRE_TASK_EXECUTION.md`
 * instruction that a review must not inherit.
 */
export const buildReviewCommand = (request: ReviewDispatchRequest): StructuredCommand =>
  EXTERNAL_HARNESS_ADAPTERS[request.harness].buildCommand(reviewCommandRequest(request));

/** Whether a bare executable name resolves on `PATH`. Shared so callers do not
 * each reimplement PATH scanning. */
export const executableOnPath = (executable: string): boolean =>
  (process.env.PATH ?? '').split(path.delimiter).some(directory => {
    if (!directory) return false;
    const candidate = path.join(directory, executable);
    try {
      return fs.statSync(candidate).isFile();
    } catch {
      return false;
    }
  });

/**
 * Whether the CLI for a harness is installed on this machine, keyed by the
 * canonical adapter executable (e.g. `cursor` resolves to `cursor-agent`). An
 * unknown harness is treated as unavailable. Shared so execution-routing's
 * default resolver can filter unavailable external targets without duplicating
 * the executable-name knowledge held here.
 */
export const harnessExecutableAvailable = (harness: string): boolean => {
  const adapter = EXTERNAL_HARNESS_ADAPTERS[harness as Harness];
  return adapter ? executableOnPath(adapter.executable) : false;
};

/**
 * Upper bound on retained reviewer stdout. The delivered document is the
 * reviewer's *final* output, so the tail is the load-bearing part: truncation
 * drops from the front. Sized well above `review-findings.ts`'s 2000-char
 * xmllint diagnostic bound because a findings document is a whole XML file.
 */
export const CAPTURED_STDOUT_LIMIT = 262_144;

/**
 * How the child's stdout is wired. `capture` pipes it, tees every chunk to this
 * process's stderr so operator-visible progress survives, and retains a bounded
 * tail. Child stderr stays inherited in `capture` exactly as in `inherit`.
 */
type OutputMode = 'ignore' | 'inherit' | 'capture';

const STDIO_SLOTS: Readonly<Record<OutputMode, { stdout: 'ignore' | 'inherit' | 'pipe' }>> = {
  ignore: { stdout: 'ignore' },
  inherit: { stdout: 'inherit' },
  capture: { stdout: 'pipe' },
};

const runProcess = (
  executable: string,
  argv: string[],
  cwd: string,
  stdin?: string,
  outputMode: OutputMode = 'ignore'
): Promise<{ exitCode: number; stdout?: string }> =>
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
        STDIO_SLOTS[outputMode].stdout,
        outputMode === 'ignore' ? 'ignore' : 'inherit',
      ],
    });
    let captured = '';
    if (outputMode === 'capture') {
      // `setEncoding` makes Node decode multibyte sequences across chunk
      // boundaries, so no hand-rolled Buffer joining is needed here.
      child.stdout!.setEncoding('utf8');
      child.stdout!.once('error', fail);
      child.stdout!.on('data', (chunk: string) => {
        process.stderr.write(chunk);
        captured += chunk;
        if (captured.length > CAPTURED_STDOUT_LIMIT) {
          captured = captured.slice(captured.length - CAPTURED_STDOUT_LIMIT);
        }
      });
    }
    child.once('error', fail);
    // `close` (unlike `exit`) fires only after every stdio stream has closed, so
    // the captured text is complete by the time this resolves.
    child.once('close', code => {
      if (settled) return;
      settled = true;
      resolve({
        exitCode: code ?? 1,
        ...(outputMode === 'capture' ? { stdout: captured } : {}),
      });
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
  launch: (commandSpec, options) =>
    runProcess(
      commandSpec.executable,
      commandSpec.argv,
      commandSpec.cwd,
      commandSpec.stdin,
      options?.captureStdout === true ? 'capture' : 'inherit'
    ),
};

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

type DispatchFallback = Extract<ExternalDispatchResult, { kind: 'fallback' }>;

type PreparedLaunch = { kind: 'ready'; command: StructuredCommand } | DispatchFallback;

/**
 * The pre-launch gate shared by every dispatch path: adapter lookup, an optional
 * path-specific guard, executable presence, command construction, and
 * authentication. Kept in one place so the authentication gate cannot drift
 * between the task and the review path.
 */
const prepareLaunch = async (
  harness: Harness,
  input: DispatchCommandRequest,
  active: ExternalDispatchDependencies,
  guard?: () => DispatchFallback | undefined
): Promise<PreparedLaunch> => {
  const adapter = EXTERNAL_HARNESS_ADAPTERS[harness];
  if (!adapter) {
    return {
      kind: 'fallback',
      reason: 'adapter-unavailable',
      detail: `No adapter is registered for ${harness}.`,
    };
  }
  const blocked = guard?.();
  if (blocked) return blocked;
  if (!active.executableExists(adapter.executable)) {
    return {
      kind: 'fallback',
      reason: 'executable-unavailable',
      detail: `${adapter.executable} is unavailable.`,
    };
  }
  const commandSpec = adapter.buildCommand(input);
  const authentication = await active.authenticate(commandSpec, adapter);
  if (!authentication.ok) {
    return {
      kind: 'fallback',
      reason: 'authentication-failed',
      detail: authentication.detail ?? `${adapter.executable} authentication check failed.`,
    };
  }
  return { kind: 'ready', command: commandSpec };
};

const launchPrepared = async (
  prepared: PreparedLaunch,
  active: ExternalDispatchDependencies,
  label: string,
  captureStdout = false
): Promise<ExternalDispatchResult> => {
  if (prepared.kind === 'fallback') return prepared;
  try {
    const launched = await active.launch(prepared.command, { captureStdout });
    const stdout = launched.stdout === undefined ? {} : { stdout: launched.stdout };
    return launched.exitCode === 0
      ? { kind: 'launched-success', exitCode: 0, ...stdout }
      : { kind: 'launched-failure', exitCode: launched.exitCode, ...stdout };
  } catch (error) {
    return {
      kind: 'infrastructure-failure',
      detail: `External ${label} process failed: ${errorMessage(error)}`,
    };
  }
};

const unsupportedReasoningEffort = (
  request: ExternalDispatchRequest
): DispatchFallback | undefined =>
  request.reasoningEffort !== undefined &&
  (request.harness === 'cursor' || request.harness === 'gemini' || request.harness === 'copilot')
    ? {
        kind: 'fallback',
        reason: 'unsupported-reasoning-effort',
        detail: `${request.harness} does not support a generic reasoning_effort override.`,
      }
    : undefined;

/** Only pre-launch failures return fallback. A launched process is always committed. */
export const dispatchExternalTask = async (
  request: ExternalDispatchRequest,
  overrides: Partial<ExternalDispatchDependencies> = {}
): Promise<ExternalDispatchResult> => {
  const active = { ...dependencies, ...overrides };
  const prepared = await prepareLaunch(request.harness, taskCommandRequest(request), active, () =>
    unsupportedReasoningEffort(request)
  );
  return launchPrepared(prepared, active, 'task');
};

/**
 * Dispatch a reviewer to a discovered harness. Same pre-launch gate and same
 * result union as task dispatch; no model, no reasoning effort, and therefore no
 * `unsupported-reasoning-effort` guard — that branch is unreachable here.
 *
 * This is the only path that requests stdout capture: stdout is the reviewer's
 * sole findings-delivery channel, so the captured text is the only place the
 * findings document can be found. Task dispatch deliberately keeps its child's
 * output inherited and uncaptured.
 */
export const dispatchReview = async (
  request: ReviewDispatchRequest,
  overrides: Partial<ExternalDispatchDependencies> = {}
): Promise<ExternalDispatchResult> => {
  const active = { ...dependencies, ...overrides };
  const prepared = await prepareLaunch(request.harness, reviewCommandRequest(request), active);
  return launchPrepared(prepared, active, 'review', true);
};
