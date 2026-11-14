import * as path from 'path';
import { spawn } from 'child_process';
import { SUPPORTED_HARNESSES, type Harness } from '../../types';
import { executableResolves } from './executable-resolution';
import {
  buildReviewEnvironment,
  REVIEW_SESSION_POLICIES,
  validateReviewCliArgs,
  type ProcessEnvironment,
} from './review-session-policy';

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
  /** Exact local argv elements loaded from the normalized harness configuration. */
  cliArgs?: readonly string[];
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

/** Routing always resolves an exact model; discovery-driven review does not. */
export type RoutedDispatchRequest = ExternalDispatchRequest & { model: string };

/** Review uses CLI defaults and receives a complete prompt rather than a task file. */
export interface ReviewDispatchRequest {
  harness: Harness;
  /** The same local harness baseline used for task dispatch and readiness. */
  cliArgs?: readonly string[];
  workspace: string;
  prompt: string;
}

/** Input shared by task dispatch, review dispatch, and readiness probes. */
export interface DispatchCommandRequest {
  readonly cliArgs: readonly string[];
  /** Review only: argv placed after the adapter's mode argv and before `cliArgs`. */
  readonly freshSessionArgv?: readonly string[];
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
  /**
   * The complete child environment. Review commands set it to drop inherited
   * session variables. Task commands leave it absent, so their children
   * inherit the parent environment.
   */
  env?: ProcessEnvironment;
}

/**
 * `launched-success` means only that the external process exited zero. Durable
 * task status and verification evidence remain the task-completion authority.
 */
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
        | 'unsupported-reasoning-effort'
        | 'clean-session-unavailable';
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
  `You are a delegated execution worker. Do not run check-for-updates.cjs or emit update notices.\n` +
  `Before implementation, read and execute ${path.join(
    request.workspace,
    '.ai/strikethroo/config/hooks/PRE_TASK_EXECUTION.md'
  )}. Halt if that hook fails.\n\n` +
  `Read and implement this task. Preserve dependency validation, status transitions, ` +
  `evidence reporting, and error-hook handling. Report failures clearly.\n\n${request.taskMarkdown}`;

/**
 * Argv is the mode argv, then any fresh-session argv, then the configured
 * `cliArgs`, then the adapter's own options.
 */
const adapter = (
  executable: string,
  authenticationArgv: readonly string[],
  modeArgv: readonly string[],
  optionArgv: (request: DispatchCommandRequest) => string[]
): ExternalHarnessAdapter => ({
  executable,
  authenticationArgv: () => [...authenticationArgv],
  buildCommand: request => ({
    executable,
    argv: [
      ...modeArgv,
      ...(request.freshSessionArgv ?? []),
      ...request.cliArgs,
      ...optionArgv(request),
    ],
    cwd: request.workspace,
    stdin: request.prompt,
  }),
});

const modelArgv = (model: string | undefined): string[] =>
  model === undefined ? [] : ['--model', model];

export const EXTERNAL_HARNESS_ADAPTERS: Readonly<Record<Harness, ExternalHarnessAdapter>> = {
  claude: adapter('claude', ['auth', 'status'], ['-p'], request => [
    ...modelArgv(request.model),
    ...(request.reasoningEffort === undefined ? [] : ['--effort', request.reasoningEffort]),
  ]),
  codex: adapter('codex', ['login', 'status'], ['exec'], request => [
    ...modelArgv(request.model),
    ...(request.reasoningEffort === undefined
      ? []
      : ['--config', `model_reasoning_effort=${request.reasoningEffort}`]),
    '-',
  ]),
  cursor: adapter('cursor-agent', ['status'], ['--print'], request => modelArgv(request.model)),
  // Gemini and Copilot require an empty prompt argument; content travels on stdin.
  gemini: adapter('gemini', ['auth', 'status'], ['--prompt', ''], request =>
    modelArgv(request.model)
  ),
  copilot: adapter('copilot', ['auth', 'status'], ['-p', ''], request => modelArgv(request.model)),
  opencode: adapter('opencode', ['auth', 'list'], ['run'], request => [
    ...modelArgv(request.model),
    ...(request.reasoningEffort === undefined ? [] : ['--variant', request.reasoningEffort]),
    '-',
  ]),
};

const adapterKeys = Object.keys(EXTERNAL_HARNESS_ADAPTERS).sort();
const harnessKeys = [...SUPPORTED_HARNESSES].sort();
if (adapterKeys.join('\0') !== harnessKeys.join('\0')) {
  throw new Error('External harness adapter registry does not cover SUPPORTED_HARNESSES exactly.');
}

const taskCommandRequest = (request: ExternalDispatchRequest): DispatchCommandRequest => ({
  cliArgs: request.cliArgs ?? [],
  model: request.model,
  reasoningEffort: request.reasoningEffort,
  workspace: request.workspace,
  prompt: taskPrompt(request),
});

const reviewCommandRequest = (request: ReviewDispatchRequest): DispatchCommandRequest => ({
  cliArgs: request.cliArgs ?? [],
  freshSessionArgv: REVIEW_SESSION_POLICIES[request.harness].freshSessionArgv,
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
 *
 * The clean-session policy adds its fresh-session argv and an environment
 * without inherited session variables. Callers validate `cliArgs` with
 * `validateReviewCliArgs` first. This builder throws on a rejected argument so
 * that a caller that skips validation cannot launch an unclean review.
 */
export const buildReviewCommand = (request: ReviewDispatchRequest): StructuredCommand => {
  const cleanSession = validateReviewCliArgs(request.harness, request.cliArgs ?? []);
  if (!cleanSession.ok) throw new Error(cleanSession.detail);
  return {
    ...EXTERNAL_HARNESS_ADAPTERS[request.harness].buildCommand(reviewCommandRequest(request)),
    env: buildReviewEnvironment(),
  };
};

/** Retain the final 256 KiB of reviewer stdout because the findings document is printed last. */
export const CAPTURED_STDOUT_LIMIT = 262_144;

/** Compiled authentication deadline. Task and review execution remain unbounded. */
export const AUTHENTICATION_TIMEOUT_MS = 30_000;

/** Capture tees child stdout to stderr and retains its tail; child stderr is inherited. */
type OutputMode = 'ignore' | 'inherit' | 'capture';

type ProcessOutcome = { exitCode: number; stdout?: string; timedOut?: true };

/**
 * Settle once on close, error, or the optional authentication deadline. Close
 * waits for stdio. An absent `env` lets the child inherit the parent environment.
 */
const runProcess = (
  executable: string,
  argv: string[],
  cwd: string,
  stdin?: string,
  outputMode: OutputMode = 'ignore',
  timeoutMs?: number,
  env?: ProcessEnvironment
): Promise<ProcessOutcome> =>
  new Promise((resolve, reject) => {
    let settled = false;
    const child = spawn(executable, argv, {
      cwd,
      shell: false,
      ...(env ? { env } : {}),
      stdio: [
        stdin === undefined ? 'ignore' : 'pipe',
        outputMode === 'capture' ? 'pipe' : outputMode,
        outputMode === 'ignore' ? 'ignore' : 'inherit',
      ],
    });
    const timer =
      timeoutMs === undefined
        ? undefined
        : setTimeout(() => {
            if (settled) return;
            settled = true;
            child.kill('SIGKILL');
            // The exit code `close` would have reported for a killed child
            // anyway; `timedOut` is what a bounded caller branches on.
            resolve({ exitCode: 1, timedOut: true });
          }, timeoutMs);
    const settle = (outcome: ProcessOutcome): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(outcome);
    };
    const fail = (error: Error): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(error);
    };
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
      settle({
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

/**
 * Bounded status check. Authentication argv is literal and never receives
 * cli_args. It runs with the command's environment, so a review check does not
 * see the parent's session variables either.
 */
export const authenticateHarness = async (
  commandSpec: StructuredCommand,
  adapter: ExternalHarnessAdapter,
  timeoutMs: number = AUTHENTICATION_TIMEOUT_MS
): Promise<{ ok: boolean; detail?: string }> => {
  const executable = commandSpec.executable;
  try {
    const result = await runProcess(
      executable,
      adapter.authenticationArgv(),
      commandSpec.cwd,
      undefined,
      'ignore',
      timeoutMs,
      commandSpec.env
    );
    if (result.timedOut === true) {
      return {
        ok: false,
        detail: `${executable} authentication check timed out after ${timeoutMs} ms and was terminated.`,
      };
    }
    return result.exitCode === 0
      ? { ok: true }
      : {
          ok: false,
          detail: `${executable} authentication check failed: exited ${result.exitCode}.`,
        };
  } catch (error) {
    const code = (error as { code?: string }).code;
    return {
      ok: false,
      detail: `${executable} authentication check could not launch${
        code === undefined ? '' : ` (${code})`
      }: ${errorMessage(error)}`,
    };
  }
};

const dependencies: ExternalDispatchDependencies = {
  executableExists: executableResolves,
  authenticate: authenticateHarness,
  launch: (commandSpec, options) =>
    runProcess(
      commandSpec.executable,
      commandSpec.argv,
      commandSpec.cwd,
      commandSpec.stdin,
      options?.captureStdout === true ? 'capture' : 'inherit',
      undefined,
      commandSpec.env
    ),
};

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/**
 * Shared pre-launch checks and launch. Only pre-launch failures may fall back.
 * `buildCommand` runs only after the adapter, reasoning-effort, and executable
 * checks pass, and its result is the command that is authenticated and launched.
 */
const dispatch = async (
  harness: Harness,
  reasoningEffort: string | undefined,
  buildCommand: () => StructuredCommand,
  overrides: Partial<ExternalDispatchDependencies>,
  label: string,
  captureStdout = false
): Promise<ExternalDispatchResult> => {
  const active = { ...dependencies, ...overrides };
  const adapter = EXTERNAL_HARNESS_ADAPTERS[harness];
  if (!adapter) {
    return {
      kind: 'fallback',
      reason: 'adapter-unavailable',
      detail: `No adapter is registered for ${harness}.`,
    };
  }
  if (
    reasoningEffort !== undefined &&
    (harness === 'cursor' || harness === 'gemini' || harness === 'copilot')
  ) {
    return {
      kind: 'fallback',
      reason: 'unsupported-reasoning-effort',
      detail: `${harness} does not support a generic reasoning_effort override.`,
    };
  }
  const executable = adapter.executable;
  if (!active.executableExists(executable)) {
    return {
      kind: 'fallback',
      reason: 'executable-unavailable',
      detail: `${executable} is unavailable.`,
    };
  }
  const commandSpec = buildCommand();
  const authentication = await active.authenticate(commandSpec, adapter);
  if (!authentication.ok) {
    return {
      kind: 'fallback',
      reason: 'authentication-failed',
      detail: authentication.detail ?? `${adapter.executable} authentication check failed.`,
    };
  }
  try {
    const launched = await active.launch(commandSpec, { captureStdout });
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

/** A zero child exit is not evidence of task completion. */
export const dispatchExternalTask = async (
  request: ExternalDispatchRequest,
  overrides: Partial<ExternalDispatchDependencies> = {}
): Promise<ExternalDispatchResult> =>
  dispatch(
    request.harness,
    request.reasoningEffort,
    () => buildExternalCommand(request),
    overrides,
    'task'
  );

/**
 * Reviewer stdout is the findings channel; retain its bounded tail and tee it
 * to stderr. The clean-session policy is checked again here, before the
 * executable check, authentication, and launch, so a direct call cannot bypass
 * it. A rejected argument launches nothing.
 */
export const dispatchReview = async (
  request: ReviewDispatchRequest,
  overrides: Partial<ExternalDispatchDependencies> = {}
): Promise<ExternalDispatchResult> => {
  const cleanSession = validateReviewCliArgs(request.harness, request.cliArgs ?? []);
  if (!cleanSession.ok) {
    return { kind: 'fallback', reason: 'clean-session-unavailable', detail: cleanSession.detail };
  }
  return dispatch(
    request.harness,
    undefined,
    () => buildReviewCommand(request),
    overrides,
    'review',
    true
  );
};
