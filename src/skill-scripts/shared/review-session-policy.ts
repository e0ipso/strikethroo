import { SUPPORTED_HARNESSES, type Harness } from '../../types';

/**
 * The compiled clean-session contract for review commands.
 *
 * A review must start a new conversation. A new process alone does not prove
 * that: a configured argument can resume an old conversation, and an inherited
 * environment variable can carry the implementer's session identity. This
 * module therefore defines, per harness CLI:
 *
 * - the argv that starts a fresh session (empty where the documented default of
 *   the adapter's print/exec/run mode is already a new session),
 * - the configured `cli_args` forms that reuse, select, fork, or attach to an
 *   existing session, which review refuses (never removes silently),
 * - the session variables that a parent harness exports to its children, which
 *   the reviewer environment drops.
 *
 * Task dispatch does not use this policy. Readiness probes and review dispatch
 * do, so both launch the same contract.
 *
 * Sources, checked 2026-11-14. Official documentation first, then the installed
 * CLI where one was available on the checking machine:
 *
 * - claude: https://code.claude.com/docs/en/cli-reference (flags) and
 *   https://code.claude.com/docs/en/env-vars (CLAUDECODE,
 *   CLAUDE_CODE_CHILD_SESSION, CLAUDE_CODE_SESSION_ID,
 *   CLAUDE_CODE_BRIDGE_SESSION_ID, CLAUDE_CODE_REMOTE_SESSION_ID,
 *   CLAUDE_CODE_MESSAGING_SOCKET, CLAUDE_CODE_MESSAGING_TOKEN, CLAUDE_PID).
 *   `claude --help` of Claude Code 2.1.325 confirms the flags and shows no
 *   subcommands in `-p` mode. That binary sets CLAUDE_CODE_SESSION_ATTENDED in
 *   every child next to CLAUDE_CODE_SESSION_ID, and reads it and
 *   CLAUDE_CODE_ENTRYPOINT back at startup. Both were present in a live child
 *   environment. CLAUDE_CODE_SSE_PORT is an IDE connection port that IDE
 *   terminals set, not session state, so it stays.
 * - codex: https://learn.chatgpt.com/docs/developer-commands?surface=cli
 *   (`codex exec resume`, `codex exec fork`) and
 *   https://learn.chatgpt.com/docs/non-interactive-mode (a previous run
 *   continues only through `resume`). `codex exec --help` of codex-cli 0.169.0
 *   lists `resume` and `fork` and no exec-level session flag. CODEX_THREAD_ID:
 *   https://github.com/openai/codex/pull/10096 (merged 2026-02-03), present in
 *   the 0.169.0 binary.
 * - cursor: https://cursor.com/docs/cli/reference/parameters (`--resume
 *   [chatId]`, `--continue` as `--resume=-1`, `resume`, `ls`). `cursor-agent
 *   --help` of 2026.10.22-27dcf5f adds `persist` (`persist attach <session>`),
 *   and `cursor-agent --print resume --help` shows that a subcommand after
 *   `--print` still runs. The variables come from that release's bundle: shell
 *   commands get CURSOR_CONVERSATION_ID and CURSOR_REQUEST_ID, the agent reads
 *   CURSOR_CONVERSATION_ID back to find conversation artifacts, and the bundle
 *   marks those two plus CURSOR_AGENT_STORE_FILES_DIR and
 *   CURSOR_AGENT_STORE_SHARED_PATHS as per-conversation. Its shell integration
 *   exports CURSOR_AGENT_CHAT_ID and passes it to `--resume`.
 * - gemini: https://geminicli.com/docs/cli/cli-reference and
 *   https://geminicli.com/docs/cli/session-management (`--resume`/`-r`,
 *   `--list-sessions`, `--delete-session`). Not installed locally. Source
 *   google-gemini/gemini-cli main: packages/core/src/services/
 *   shellExecutionService.ts sets GEMINI_CLI_IN_SHELL in shell commands, and
 *   packages/cli/src/config/config.ts treats it or GEMINI_CLI_NESTED_SESSION
 *   as a nested session that refuses an empty `--prompt ''`. GEMINI_CLI=1 is
 *   only an identification marker (https://geminicli.com/docs/tools/shell).
 * - copilot: https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-command-reference
 *   (`--resume[=VALUE]`/`-r`, `--continue`, `--session-id`,
 *   `--connect[=SESSION-ID]`). `-p` prints a `--resume=SESSION-ID` hint for
 *   the new session it created. Not installed locally. The documentation names
 *   no session variable that Copilot exports to its children, so none is
 *   removed.
 * - opencode: https://opencode.ai/docs/cli/commands (v2 `run --continue`,
 *   `--session`) and https://opencode.ai/v1/docs/cli/ (v1 `run --continue`/
 *   `-c`, `--session`/`-s`, `--fork`, `--attach`). Not installed locally.
 *   OPENCODE_SESSION_ID: anomalyco/opencode dev at 5bf661138b15,
 *   packages/core/src/tool/plugin/shell.ts.
 *
 * Change this table only against current documentation, and bump
 * {@link REVIEW_SESSION_POLICY_VERSION} with any change so cached review
 * readiness from the old contract stops counting.
 */

/**
 * Part of the review readiness cache identity. Bump it whenever a policy
 * entry, the matching rules, or the environment handling changes.
 */
export const REVIEW_SESSION_POLICY_VERSION = 1;

export interface ReviewSessionPolicy {
  /**
   * Argv that the review command puts right after the adapter's mode argv and
   * before `cli_args`. Empty when the documented default is a new session.
   */
  readonly freshSessionArgv: readonly string[];
  /**
   * A long flag (`--resume`) matches an equal element or `--resume=<value>`.
   * A short alias (`-r`) matches any single-dash element that contains its
   * letter before an `=`: an attached value (`-rID`) or a short-option group
   * (`-pc`, `-prID`). These CLIs can read such a token as that option. This
   * fails closed: a value-taking option whose attached value contains the
   * letter is refused too. A different long flag that shares a prefix
   * (`--continue-on-error`) never matches.
   */
  readonly rejectedFlags: readonly string[];
  /** Exact `cli_args` elements that run a session subcommand instead of a new run. */
  readonly rejectedSubcommands: readonly string[];
  /** Exact names of session variables that a parent harness exports to its children. */
  readonly sessionEnvironment: readonly string[];
}

export const REVIEW_SESSION_POLICIES: Readonly<Record<Harness, ReviewSessionPolicy>> =
  Object.freeze({
    // `claude -p` starts a new session. `-c -p` and `-r <id>` continue one.
    claude: {
      freshSessionArgv: [],
      rejectedFlags: [
        '--continue',
        '-c',
        '--resume',
        '-r',
        '--session-id',
        '--fork-session',
        '--from-pr',
        '--teleport',
        // With a session ID or URL, `--cloud` queues into an existing session.
        // `--remote` is its deprecated alias, including that form.
        '--cloud',
        '--remote',
      ],
      rejectedSubcommands: [],
      sessionEnvironment: [
        'CLAUDECODE',
        'CLAUDE_CODE_CHILD_SESSION',
        'CLAUDE_CODE_SESSION_ID',
        'CLAUDE_CODE_BRIDGE_SESSION_ID',
        'CLAUDE_CODE_REMOTE_SESSION_ID',
        'CLAUDE_CODE_MESSAGING_SOCKET',
        'CLAUDE_CODE_MESSAGING_TOKEN',
        'CLAUDE_CODE_SESSION_ATTENDED',
        'CLAUDE_CODE_ENTRYPOINT',
        'CLAUDE_PID',
      ],
    },
    // `codex exec` starts a new session. `exec resume` and `exec fork` reuse one.
    codex: {
      freshSessionArgv: [],
      rejectedFlags: [],
      rejectedSubcommands: ['resume', 'fork'],
      sessionEnvironment: ['CODEX_THREAD_ID'],
    },
    // `cursor-agent --print` starts a new chat. `--continue` is `--resume=-1`.
    cursor: {
      freshSessionArgv: [],
      rejectedFlags: ['--resume', '--continue'],
      rejectedSubcommands: ['resume', 'ls', 'persist'],
      sessionEnvironment: [
        'CURSOR_CONVERSATION_ID',
        'CURSOR_REQUEST_ID',
        'CURSOR_AGENT_STORE_FILES_DIR',
        'CURSOR_AGENT_STORE_SHARED_PATHS',
        'CURSOR_AGENT_CHAT_ID',
      ],
    },
    // `gemini --prompt` starts a new session. The list and delete flags act on
    // stored sessions and exit, so no review runs.
    gemini: {
      freshSessionArgv: [],
      rejectedFlags: ['--resume', '-r', '--list-sessions', '--delete-session'],
      rejectedSubcommands: [],
      sessionEnvironment: ['GEMINI_CLI_IN_SHELL', 'GEMINI_CLI_NESTED_SESSION'],
    },
    // `copilot -p` starts a new session. `--session-id` resumes a matching one.
    copilot: {
      freshSessionArgv: [],
      rejectedFlags: ['--resume', '-r', '--continue', '--session-id', '--connect'],
      rejectedSubcommands: [],
      sessionEnvironment: [],
    },
    // `opencode run` starts a new session. `--attach` (v1) connects the run to
    // a running server that can hold the implementer's session.
    opencode: {
      freshSessionArgv: [],
      rejectedFlags: ['--continue', '-c', '--session', '-s', '--fork', '--attach'],
      rejectedSubcommands: [],
      sessionEnvironment: ['OPENCODE_SESSION_ID'],
    },
  });

const policyKeys = Object.keys(REVIEW_SESSION_POLICIES).sort();
const harnessKeys = [...SUPPORTED_HARNESSES].sort();
if (policyKeys.join('\0') !== harnessKeys.join('\0')) {
  throw new Error('Review session policy registry does not cover SUPPORTED_HARNESSES exactly.');
}

/**
 * The union of every policy's session variables. A reviewer drops all of them,
 * not only its own harness's, because an implementer on one harness can
 * launch a reviewer on another.
 */
const REVIEW_SESSION_ENVIRONMENT: ReadonlySet<string> = new Set(
  SUPPORTED_HARNESSES.flatMap(harness => REVIEW_SESSION_POLICIES[harness].sessionEnvironment)
);

export type ReviewCliArgsValidation = { ok: true } | { ok: false; detail: string };

/** A child process environment, the type `spawn` accepts for its `env` option. */
export type ProcessEnvironment = typeof process.env;

/** Letters of a single-dash short-option group, before any `=`; empty otherwise. */
const shortOptionGroup = (element: string): string =>
  element.startsWith('-') && !element.startsWith('--') ? element.slice(1).split('=')[0]! : '';

const matchesFlag = (element: string, flag: string): boolean =>
  element === flag ||
  (flag.startsWith('--')
    ? element.startsWith(`${flag}=`)
    : shortOptionGroup(element).includes(flag.slice(1)));

const reusesSession = (policy: ReviewSessionPolicy, element: string): boolean =>
  policy.rejectedSubcommands.includes(element) ||
  policy.rejectedFlags.some(flag => matchesFlag(element, flag));

/**
 * Refuse configured arguments that would make a reviewer use an existing
 * session. The caller reports the detail. Nothing is removed.
 */
export const validateReviewCliArgs = (
  harness: Harness,
  cliArgs: readonly string[]
): ReviewCliArgsValidation => {
  if (!Object.prototype.hasOwnProperty.call(REVIEW_SESSION_POLICIES, harness)) {
    return {
      ok: false,
      detail: `No clean review session policy is registered for ${harness}.`,
    };
  }
  const policy = REVIEW_SESSION_POLICIES[harness];
  const index = cliArgs.findIndex(element => reusesSession(policy, element));
  if (index === -1) return { ok: true };
  return {
    ok: false,
    detail:
      `${harness} cannot start a clean review session. ` +
      `config.yaml harnesses.${harness}.cli_args[${index}] is "${cliArgs[index]}". ` +
      `This argument can make ${harness} use an existing session instead of a new one. ` +
      'Strikethroo does not remove configured arguments silently. ' +
      'Remove it to get a clean review session.',
  };
};

/**
 * A shallow copy of the parent environment without any policy session
 * variable. Credentials, PATH, HOME, XDG_*, and CLI configuration and home
 * directories stay, because a clean conversation does not need a different
 * user setup.
 */
export const buildReviewEnvironment = (
  parent: ProcessEnvironment = process.env
): ProcessEnvironment => {
  const environment: ProcessEnvironment = {};
  for (const [name, value] of Object.entries(parent)) {
    if (!REVIEW_SESSION_ENVIRONMENT.has(name)) environment[name] = value;
  }
  return environment;
};
