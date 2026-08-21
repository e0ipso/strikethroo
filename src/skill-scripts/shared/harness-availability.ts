import { createHash, randomUUID } from 'crypto';
import { spawn, spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { SUPPORTED_HARNESSES, type Harness } from '../../types';
import {
  HARNESS_CONFIGURATION_NORMALIZATION_VERSION,
  loadHarnessConfiguration,
  type NormalizedHarnessInvocation,
} from './harness-configuration';
import { EXTERNAL_HARNESS_ADAPTERS, type StructuredCommand } from './external-dispatch';

export const AVAILABILITY_REGISTRY_VERSION = 2;
export const AVAILABLE_TTL_MS = 30 * 60 * 1000;
export const UNAVAILABLE_TTL_MS = 5 * 60 * 1000;
export const PROBE_TIMEOUT_MS = 20_000;
export const PROBE_OUTPUT_LIMIT = 16_384;
export const IMPLEMENTATION_PROBE_FILE_LIMIT = 32;
export const AVAILABILITY_CACHE_RELATIVE_PATH = path.join('runtime', 'harness-availability.json');

const CONFIGURED_INVOCATION_PROMPT = 'Reply with OK.';
const CACHE_VERSION = 2;

export type HarnessReadinessStage =
  | 'executable'
  | 'configuration'
  | 'version'
  | 'authentication'
  | 'configured-invocation'
  | 'implementation-capability';

export interface HarnessAvailabilityDefinition {
  version: number;
  executable: string;
  buildVersionCommand: (cwd: string) => StructuredCommand;
  buildAuthenticationCommand: (cwd: string) => StructuredCommand;
  buildConfiguredCommand: (
    cwd: string,
    cliArgs: readonly string[],
    prompt?: string
  ) => StructuredCommand;
}

const literalCommand = (executable: string, argv: string[], cwd: string): StructuredCommand => ({
  executable,
  argv,
  cwd,
  stdin: '',
});

const availabilityDefinition = (harness: Harness): HarnessAvailabilityDefinition => {
  const adapter = EXTERNAL_HARNESS_ADAPTERS[harness];
  return {
    version: AVAILABILITY_REGISTRY_VERSION,
    executable: adapter.executable,
    buildVersionCommand: cwd => literalCommand(adapter.executable, adapter.versionArgv(), cwd),
    buildAuthenticationCommand: cwd =>
      literalCommand(adapter.executable, adapter.authenticationArgv(), cwd),
    buildConfiguredCommand: (cwd, cliArgs, prompt = CONFIGURED_INVOCATION_PROMPT) =>
      adapter.buildCommand({ cliArgs, workspace: cwd, prompt }),
  };
};

/** Readiness command metadata is derived from the one shared adapter table. */
export const HARNESS_AVAILABILITY_REGISTRY: Readonly<
  Record<Harness, HarnessAvailabilityDefinition>
> = Object.freeze(
  Object.fromEntries(
    SUPPORTED_HARNESSES.map(harness => [harness, availabilityDefinition(harness)])
  ) as Record<Harness, HarnessAvailabilityDefinition>
);

export interface HarnessAvailabilityOutcome {
  harness: Harness;
  available: boolean;
  observedAt: number;
  expiresAt: number;
  reason: string;
  source: 'cache' | 'probe' | 'bypass';
  readinessStage?: HarnessReadinessStage | 'ready';
  executableIdentity?: string;
  executableVersion?: string;
  cliArgsHash?: string;
  normalizationVersion?: number;
  probeRegistryVersion?: number;
}

interface CacheEntry {
  key: string;
  harness: Harness;
  available: boolean;
  observedAt: number;
  expiresAt: number;
  reason: string;
  readinessStage: HarnessReadinessStage | 'ready';
  executableIdentity: string;
  executableVersion: string;
  cliArgsHash: string;
  normalizationVersion: number;
  probeRegistryVersion: number;
}

interface CacheFile {
  version: 2;
  entries: CacheEntry[];
}

export interface ProbeResult {
  exitCode: number;
  timedOut?: boolean;
  stdout?: string;
  detail?: string;
}

export interface HarnessAvailabilityDependencies {
  now: () => number;
  resolveExecutable: (executable: string) => string | undefined;
  runProbe: (
    command: StructuredCommand,
    timeoutMs: number,
    stage: HarnessReadinessStage
  ) => Promise<ProbeResult>;
}

const resolveExecutable = (executable: string): string | undefined => {
  const extensions =
    process.platform === 'win32'
      ? ['', ...(process.env.PATHEXT ?? '.EXE;.CMD;.BAT;.COM').split(';')]
      : [''];
  const directories = /[\\/]/.test(executable)
    ? ['']
    : (process.env.PATH ?? '').split(path.delimiter).filter(Boolean);
  for (const directory of directories) {
    for (const extension of extensions) {
      const candidate = path.resolve(directory, `${executable}${extension}`);
      try {
        fs.accessSync(
          candidate,
          process.platform === 'win32' ? fs.constants.F_OK : fs.constants.X_OK
        );
        if (!fs.statSync(candidate).isFile()) continue;
        return fs.realpathSync(candidate);
      } catch {
        // Try the next PATH entry or executable suffix.
      }
    }
  }
  return undefined;
};

const retainTail = (current: string, chunk: unknown): string => {
  const next = current + String(chunk);
  return next.length <= PROBE_OUTPUT_LIMIT ? next : next.slice(next.length - PROBE_OUTPUT_LIMIT);
};

const runProbe = (
  command: StructuredCommand,
  timeoutMs: number,
  _stage: HarnessReadinessStage
): Promise<ProbeResult> =>
  new Promise(resolve => {
    let settled = false;
    let timedOut = false;
    let stdout = '';
    let detail = '';
    const finish = (result: ProbeResult): void => {
      if (settled) return;
      settled = true;
      resolve(result);
    };
    const child = spawn(command.executable, command.argv, {
      cwd: command.cwd,
      shell: false,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGKILL');
    }, timeoutMs);
    child.stdout?.on('data', chunk => {
      stdout = retainTail(stdout, chunk);
    });
    child.stderr?.on('data', chunk => {
      detail = retainTail(detail, chunk);
    });
    child.once('error', error => {
      clearTimeout(timer);
      finish({ exitCode: 1, timedOut, detail: error.message });
    });
    child.once('close', code => {
      clearTimeout(timer);
      finish({ exitCode: code ?? 1, timedOut, stdout, detail });
    });
    child.stdin?.on('error', () => undefined);
    child.stdin?.end(command.stdin);
  });

const defaultDependencies: HarnessAvailabilityDependencies = {
  now: Date.now,
  resolveExecutable,
  runProbe,
};

const isHarness = (value: unknown): value is Harness =>
  typeof value === 'string' && SUPPORTED_HARNESSES.includes(value as Harness);

const isCacheEntry = (value: unknown): value is CacheEntry => {
  if (!value || typeof value !== 'object') return false;
  const entry = value as Record<string, unknown>;
  return (
    typeof entry.key === 'string' &&
    isHarness(entry.harness) &&
    typeof entry.available === 'boolean' &&
    typeof entry.observedAt === 'number' &&
    Number.isFinite(entry.observedAt) &&
    typeof entry.expiresAt === 'number' &&
    Number.isFinite(entry.expiresAt) &&
    typeof entry.reason === 'string' &&
    typeof entry.readinessStage === 'string' &&
    typeof entry.executableIdentity === 'string' &&
    typeof entry.executableVersion === 'string' &&
    typeof entry.cliArgsHash === 'string' &&
    typeof entry.normalizationVersion === 'number' &&
    typeof entry.probeRegistryVersion === 'number'
  );
};

const emptyCache = (): CacheFile => ({ version: CACHE_VERSION, entries: [] });

const readCache = (cachePath: string): CacheFile => {
  try {
    const parsed: unknown = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
    if (!parsed || typeof parsed !== 'object') return emptyCache();
    const record = parsed as Record<string, unknown>;
    if (record.version !== CACHE_VERSION || !Array.isArray(record.entries)) return emptyCache();
    return { version: CACHE_VERSION, entries: record.entries.filter(isCacheEntry) };
  } catch {
    return emptyCache();
  }
};

const writeCache = (cachePath: string, entry: CacheEntry): void => {
  fs.mkdirSync(path.dirname(cachePath), { recursive: true });
  const cache = readCache(cachePath);
  const existingIndex = cache.entries.findIndex(candidate => candidate.key === entry.key);
  if (existingIndex === -1) cache.entries.push(entry);
  else if (cache.entries[existingIndex]!.observedAt <= entry.observedAt) {
    cache.entries[existingIndex] = entry;
  }
  const temporary = `${cachePath}.${process.pid}.${randomUUID()}.tmp`;
  try {
    fs.writeFileSync(temporary, `${JSON.stringify(cache, null, 2)}\n`, { mode: 0o600 });
    fs.renameSync(temporary, cachePath);
  } finally {
    try {
      fs.unlinkSync(temporary);
    } catch {
      // A successful rename removes the temporary path.
    }
  }
};

const cacheKey = (
  harness: Harness,
  executableIdentity: string,
  executableVersion: string,
  invocation: NormalizedHarnessInvocation
): string =>
  createHash('sha256')
    .update(
      JSON.stringify({
        harness,
        executableIdentity,
        executableVersion,
        cliArgsHash: invocation.cliArgsHash,
        normalizationVersion: HARNESS_CONFIGURATION_NORMALIZATION_VERSION,
        probeRegistryVersion: AVAILABILITY_REGISTRY_VERSION,
      })
    )
    .digest('hex');

const withExecutable = (command: StructuredCommand, executable: string): StructuredCommand => ({
  ...command,
  executable,
});

const normalizedVersion = (probe: ProbeResult): string | undefined => {
  if (probe.exitCode !== 0 || probe.timedOut) return undefined;
  const firstLine = (probe.stdout || probe.detail)
    ?.split(/\r?\n/)
    .map(line => line.trim())
    .find(Boolean);
  return firstLine?.slice(0, 200);
};

interface CapabilityEvidence {
  create: { file: string; content: string };
  modify: { file: string; initialContent: string; finalContent: string };
  command: { file: string; content: string };
}

const capabilityEvidence = (): CapabilityEvidence => {
  const nonce = randomUUID();
  return {
    create: { file: 'created.txt', content: `created:${nonce}\n` },
    modify: {
      file: 'modified.txt',
      initialContent: `initial:${nonce}\n`,
      finalContent: `initial:${nonce}\nmodified:${nonce}\n`,
    },
    command: { file: 'command.txt', content: `command:${nonce}\n` },
  };
};

const capabilityCreatePrompt = (evidence: CapabilityEvidence): string =>
  `Implementation capability check in this disposable Git workspace. ` +
  `Create ${evidence.create.file} and ${evidence.modify.file} with their exact requested contents.\n` +
  `STRIKETHROO_EVIDENCE=${JSON.stringify({ phase: 'create', ...evidence })}\n`;

const capabilityModifyPrompt = (evidence: CapabilityEvidence): string =>
  `Continue the implementation capability check. Modify the existing ${evidence.modify.file} ` +
  `to its exact final content. Run a shell command that writes the exact requested content to ` +
  `${evidence.command.file}. Do not recreate ${evidence.modify.file}.\n` +
  `STRIKETHROO_EVIDENCE=${JSON.stringify({ phase: 'modify', ...evidence })}\n`;

const countWorkspaceFiles = (root: string): number => {
  let count = 0;
  const visit = (directory: string): void => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (directory === root && entry.name === '.git') continue;
      count += 1;
      if (count > IMPLEMENTATION_PROBE_FILE_LIMIT) return;
      if (entry.isDirectory()) visit(path.join(directory, entry.name));
      if (count > IMPLEMENTATION_PROBE_FILE_LIMIT) return;
    }
  };
  visit(root);
  return count;
};

const exactRegularFile = (workspace: string, file: string, content: string): boolean => {
  const target = path.join(workspace, file);
  try {
    return fs.lstatSync(target).isFile() && fs.readFileSync(target, 'utf8') === content;
  } catch {
    return false;
  }
};

const verifyCreatedEvidence = (workspace: string, evidence: CapabilityEvidence): boolean =>
  exactRegularFile(workspace, evidence.create.file, evidence.create.content) &&
  exactRegularFile(workspace, evidence.modify.file, evidence.modify.initialContent) &&
  !fs.existsSync(path.join(workspace, evidence.command.file));

const verifyModifiedEvidence = (workspace: string, evidence: CapabilityEvidence): boolean =>
  exactRegularFile(workspace, evidence.create.file, evidence.create.content) &&
  exactRegularFile(workspace, evidence.modify.file, evidence.modify.finalContent) &&
  exactRegularFile(workspace, evidence.command.file, evidence.command.content);

const initializeProbeWorkspace = (): string | undefined => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'strikethroo-harness-probe-'));
  const initialized = spawnSync('git', ['init', '--quiet'], {
    cwd: workspace,
    shell: false,
    stdio: 'ignore',
    timeout: 5_000,
  });
  if (initialized.status === 0 && !initialized.error) return workspace;
  fs.rmSync(workspace, { recursive: true, force: true });
  return undefined;
};

export interface CheckHarnessAvailabilityRequest {
  strikethrooRoot: string;
  workspace: string;
  harness?: Harness;
  currentHarness: Harness;
  invocation?: NormalizedHarnessInvocation;
}

const baseOutcome = (
  harness: Harness,
  available: boolean,
  now: number,
  reason: string,
  readinessStage: HarnessReadinessStage | 'ready'
): HarnessAvailabilityOutcome => ({
  harness,
  available,
  observedAt: now,
  expiresAt: now + (available ? AVAILABLE_TTL_MS : UNAVAILABLE_TTL_MS),
  reason,
  readinessStage,
  source: 'probe',
});

const invocationFor = (
  request: CheckHarnessAvailabilityRequest,
  harness: Harness
): NormalizedHarnessInvocation | undefined => {
  if (request.invocation) return request.invocation;
  const loaded = loadHarnessConfiguration(request.strikethrooRoot);
  return loaded.kind === 'config' ? loaded.config[harness] : undefined;
};

/**
 * Proves that an external harness can authenticate, accept its exact local
 * arguments, edit files, and run a command before routing implementation work
 * to it. Native/current targets remain a zero-cost bypass.
 */
export const checkHarnessAvailability = async (
  request: CheckHarnessAvailabilityRequest,
  overrides: Partial<HarnessAvailabilityDependencies> = {}
): Promise<HarnessAvailabilityOutcome> => {
  const active = { ...defaultDependencies, ...overrides };
  const now = active.now();
  if (request.harness === undefined || request.harness === request.currentHarness) {
    return {
      harness: request.harness ?? request.currentHarness,
      available: true,
      observedAt: now,
      expiresAt: now,
      reason: 'Native/current harness targets do not require a probe.',
      source: 'bypass',
    };
  }

  const harness = request.harness;
  const invocation = invocationFor(request, harness);
  if (!invocation) {
    return baseOutcome(harness, false, now, 'Harness configuration is invalid.', 'configuration');
  }
  const definition = HARNESS_AVAILABILITY_REGISTRY[harness];
  const executableIdentity = active.resolveExecutable(definition.executable);
  if (!executableIdentity) {
    return baseOutcome(harness, false, now, 'Executable check failed.', 'executable');
  }

  const probeStage = async (
    command: StructuredCommand,
    stage: HarnessReadinessStage
  ): Promise<ProbeResult> => {
    try {
      return await active.runProbe(
        withExecutable(command, executableIdentity),
        PROBE_TIMEOUT_MS,
        stage
      );
    } catch {
      return { exitCode: 1 };
    }
  };

  const versionProbe = await probeStage(
    definition.buildVersionCommand(request.workspace),
    'version'
  );
  const executableVersion = normalizedVersion(versionProbe);
  if (!executableVersion) {
    return baseOutcome(harness, false, now, 'Executable version check failed.', 'version');
  }

  const identity = cacheKey(harness, executableIdentity, executableVersion, invocation);
  const cachePath = path.join(request.strikethrooRoot, AVAILABILITY_CACHE_RELATIVE_PATH);
  const cached = readCache(cachePath).entries.find(
    entry => entry.key === identity && entry.expiresAt > now
  );
  if (cached) {
    const { key: _key, ...outcome } = cached;
    return { ...outcome, source: 'cache' };
  }

  const complete = (outcome: HarnessAvailabilityOutcome): HarnessAvailabilityOutcome => {
    const bound = {
      ...outcome,
      executableIdentity,
      executableVersion,
      cliArgsHash: invocation.cliArgsHash,
      normalizationVersion: HARNESS_CONFIGURATION_NORMALIZATION_VERSION,
      probeRegistryVersion: AVAILABILITY_REGISTRY_VERSION,
    };
    try {
      writeCache(cachePath, { key: identity, ...bound } as CacheEntry);
    } catch {
      // Cache persistence is an optimization; the fresh result remains valid.
    }
    return bound;
  };

  const authentication = await probeStage(
    definition.buildAuthenticationCommand(request.workspace),
    'authentication'
  );
  if (authentication.exitCode !== 0 || authentication.timedOut) {
    return complete(
      baseOutcome(harness, false, now, 'Authentication check failed.', 'authentication')
    );
  }

  const probeWorkspace = initializeProbeWorkspace();
  if (!probeWorkspace) {
    return complete(
      baseOutcome(
        harness,
        false,
        now,
        'Implementation capability check failed.',
        'implementation-capability'
      )
    );
  }

  try {
    const configured = await probeStage(
      definition.buildConfiguredCommand(probeWorkspace, invocation.cliArgs),
      'configured-invocation'
    );
    if (configured.exitCode !== 0 || configured.timedOut) {
      return complete(
        baseOutcome(
          harness,
          false,
          now,
          'Configured invocation check failed.',
          'configured-invocation'
        )
      );
    }

    const evidence = capabilityEvidence();
    const createCapability = await probeStage(
      definition.buildConfiguredCommand(
        probeWorkspace,
        invocation.cliArgs,
        capabilityCreatePrompt(evidence)
      ),
      'implementation-capability'
    );
    if (countWorkspaceFiles(probeWorkspace) > IMPLEMENTATION_PROBE_FILE_LIMIT) {
      return complete(
        baseOutcome(
          harness,
          false,
          now,
          'Implementation capability check failed: disposable workspace file limit exceeded.',
          'implementation-capability'
        )
      );
    }
    if (
      createCapability.exitCode !== 0 ||
      createCapability.timedOut ||
      !verifyCreatedEvidence(probeWorkspace, evidence)
    ) {
      return complete(
        baseOutcome(
          harness,
          false,
          now,
          'Implementation capability check failed.',
          'implementation-capability'
        )
      );
    }
    const modifyCapability = await probeStage(
      definition.buildConfiguredCommand(
        probeWorkspace,
        invocation.cliArgs,
        capabilityModifyPrompt(evidence)
      ),
      'implementation-capability'
    );
    if (modifyCapability.exitCode !== 0 || modifyCapability.timedOut) {
      return complete(
        baseOutcome(
          harness,
          false,
          now,
          'Implementation capability check failed.',
          'implementation-capability'
        )
      );
    }
    if (countWorkspaceFiles(probeWorkspace) > IMPLEMENTATION_PROBE_FILE_LIMIT) {
      return complete(
        baseOutcome(
          harness,
          false,
          now,
          'Implementation capability check failed: disposable workspace file limit exceeded.',
          'implementation-capability'
        )
      );
    }
    if (!verifyModifiedEvidence(probeWorkspace, evidence)) {
      return complete(
        baseOutcome(
          harness,
          false,
          now,
          'Implementation capability check failed: required evidence was not verified.',
          'implementation-capability'
        )
      );
    }
    return complete(baseOutcome(harness, true, now, 'Harness readiness verified.', 'ready'));
  } finally {
    fs.rmSync(probeWorkspace, { recursive: true, force: true });
  }
};
