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
import { resolveExecutablePath } from './executable-resolution';
import {
  buildReviewCommand,
  EXTERNAL_HARNESS_ADAPTERS,
  type StructuredCommand,
} from './external-dispatch';
import { REVIEW_SESSION_POLICY_VERSION, validateReviewCliArgs } from './review-session-policy';
import {
  isModelMap,
  mergeModelRequests,
  MODEL_MAP_FILE,
  modelMappingPrompt,
  modelRequestsHash,
  readModelMapping,
  type ModelMap,
  type ModelRequest,
} from './model-aliases';
import { cliArgsModelRequests, withoutModelOptions } from './cli-args-models';

export const AVAILABILITY_REGISTRY_VERSION = 7;
export const AVAILABLE_TTL_MS = 30 * 60 * 1000;
export const UNAVAILABLE_TTL_MS = 5 * 60 * 1000;
export const PROBE_TIMEOUT_MS = 20_000;
/** A probe that also lists models and maps aliases runs two commands, so it gets longer. */
export const MODEL_MAPPING_PROBE_TIMEOUT_MS = 90_000;
export const AVAILABILITY_CACHE_RELATIVE_PATH = path.join('runtime', 'harness-availability.json');

const CACHE_VERSION = 2;

export interface HarnessAvailabilityDefinition {
  executable: string;
  buildCommand: (cwd: string, cliArgs: readonly string[], prompt: string) => StructuredCommand;
}

const availabilityDefinition = (harness: Harness): HarnessAvailabilityDefinition => {
  const adapter = EXTERNAL_HARNESS_ADAPTERS[harness];
  return {
    executable: adapter.executable,
    buildCommand: (cwd, cliArgs, prompt) =>
      adapter.buildCommand({ cliArgs, workspace: cwd, prompt }),
  };
};

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
  /** Validated alias mapping, present when the probe was asked for one. */
  models?: ModelMap;
}

type CacheEntry = Omit<HarnessAvailabilityOutcome, 'source'> & { key: string };

interface CacheFile {
  version: 2;
  entries: CacheEntry[];
}

export interface ProbeResult {
  exitCode: number;
  timedOut?: boolean;
  stdout?: string;
  stderr?: string;
  error?: string;
}

export interface HarnessAvailabilityDependencies {
  now: () => number;
  resolveExecutable: (executable: string) => string | null;
  runProbe: (command: StructuredCommand, timeoutMs: number) => Promise<ProbeResult>;
}

const runProbe = (command: StructuredCommand, timeoutMs: number): Promise<ProbeResult> =>
  new Promise(resolve => {
    let stdout = '';
    let stderr = '';
    let settled = false;
    let timedOut = false;
    const finish = (result: ProbeResult): void => {
      if (settled) return;
      settled = true;
      resolve(result);
    };
    const child = spawn(command.executable, command.argv, {
      cwd: command.cwd,
      shell: false,
      ...(command.env ? { env: command.env } : {}),
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    child.stdout?.setEncoding('utf8');
    child.stderr?.setEncoding('utf8');
    child.stdout?.on('data', (chunk: string) => {
      stdout = (stdout + chunk).slice(-4096);
    });
    child.stderr?.on('data', (chunk: string) => {
      stderr = (stderr + chunk).slice(-4096);
    });
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGKILL');
      child.stdout?.destroy();
      child.stderr?.destroy();
      finish({ exitCode: 1, timedOut, stdout, stderr });
    }, timeoutMs);
    child.once('error', error => {
      clearTimeout(timer);
      finish({ exitCode: 1, timedOut, stdout, stderr, error: error.message });
    });
    child.once('close', code => {
      clearTimeout(timer);
      finish({ exitCode: code ?? 1, timedOut, stdout, stderr });
    });
    child.stdin?.on('error', () => undefined);
    child.stdin?.end(command.stdin);
  });

const probeFailureReason = (probe: ProbeResult, timeoutMs: number): string => {
  const reason = probe.timedOut
    ? `Harness readiness check timed out after ${timeoutMs} ms.`
    : probe.error
      ? `Harness readiness check could not launch: ${probe.error}`
      : probe.exitCode !== 0
        ? `Harness readiness check exited ${probe.exitCode}.`
        : 'Harness exited 0 but did not create the required readiness file with the expected content.';
  const diagnostics = [
    probe.stderr?.trim() ? `stderr: ${probe.stderr.trim().slice(-4096)}` : '',
    probe.stdout?.trim() ? `stdout: ${probe.stdout.trim().slice(-4096)}` : '',
  ].filter(Boolean);
  return [reason, ...diagnostics].join(' ');
};

const defaultDependencies: HarnessAvailabilityDependencies = {
  now: Date.now,
  resolveExecutable: resolveExecutablePath,
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
    (entry.models === undefined || isModelMap(entry.models))
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
  invocation: NormalizedHarnessInvocation,
  purpose: AvailabilityPurpose,
  modelRequests: readonly ModelRequest[]
): string =>
  createHash('sha256')
    .update(
      JSON.stringify({
        harness,
        executableIdentity,
        cliArgsHash: invocation.cliArgsHash,
        normalizationVersion: HARNESS_CONFIGURATION_NORMALIZATION_VERSION,
        probeRegistryVersion: AVAILABILITY_REGISTRY_VERSION,
        purpose,
        ...(purpose === 'review'
          ? { reviewSessionPolicyVersion: REVIEW_SESSION_POLICY_VERSION }
          : {}),
        ...(modelRequests.length > 0 ? { modelRequests: modelRequestsHash(modelRequests) } : {}),
      })
    )
    .digest('hex');

interface ReadinessEvidence {
  file: string;
  content: string;
}

const readinessEvidence = (): ReadinessEvidence => {
  const nonce = randomUUID();
  return {
    file: 'strikethroo-readiness.txt',
    content: `strikethroo-readiness:${nonce}\n`,
  };
};

const readinessPrompt = (evidence: ReadinessEvidence): string =>
  `Run a shell command that creates ${evidence.file} in the current workspace with the exact ` +
  `UTF-8 content ${JSON.stringify(evidence.content)}. Do not use a file editing tool.\n` +
  `STRIKETHROO_READINESS=${JSON.stringify(evidence)}\n`;

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

const hasReadinessEvidence = (workspace: string, evidence: ReadinessEvidence): boolean => {
  const target = path.join(workspace, evidence.file);
  try {
    return fs.lstatSync(target).isFile() && fs.readFileSync(target, 'utf8') === evidence.content;
  } catch {
    return false;
  }
};

/**
 * `task` is native-or-external task routing readiness: the current harness
 * needs no probe. `review` is separate-process reviewer readiness: every
 * harness, the current one included, runs the clean-session review command.
 */
export type AvailabilityPurpose = 'task' | 'review';

export interface CheckHarnessAvailabilityRequest {
  strikethrooRoot: string;
  workspace: string;
  harness?: Harness;
  currentHarness: Harness;
  invocation?: NormalizedHarnessInvocation;
  /** Defaults to `task`. */
  purpose?: AvailabilityPurpose;
  /**
   * Routing model names to map to the harness's listed ids during the probe.
   * Used only for `task` probes. The model names in the harness's `cli_args`
   * are always added. Part of the cache key, so a changed set re-probes.
   */
  modelRequests?: readonly ModelRequest[];
}

const outcome = (
  harness: Harness,
  available: boolean,
  now: number,
  reason: string
): HarnessAvailabilityOutcome => ({
  harness,
  available,
  observedAt: now,
  expiresAt: now + (available ? AVAILABLE_TTL_MS : UNAVAILABLE_TTL_MS),
  reason,
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

/** Prove that one configured harness request can run a command that creates a file. */
export const checkHarnessAvailability = async (
  request: CheckHarnessAvailabilityRequest,
  overrides: Partial<HarnessAvailabilityDependencies> = {}
): Promise<HarnessAvailabilityOutcome> => {
  const active = { ...defaultDependencies, ...overrides };
  const now = active.now();
  const purpose = request.purpose ?? 'task';
  const bypass = (target: Harness): HarnessAvailabilityOutcome => ({
    harness: target,
    available: true,
    observedAt: now,
    expiresAt: now,
    reason: 'Native/current harness targets do not require a probe.',
    source: 'bypass',
  });
  const harness = request.harness;
  if (harness === undefined) {
    return purpose === 'review'
      ? outcome(
          request.currentHarness,
          false,
          now,
          'Review readiness requires an explicit harness.'
        )
      : bypass(request.currentHarness);
  }
  if (purpose === 'task' && harness === request.currentHarness) return bypass(harness);

  const invocation = invocationFor(request, harness);
  if (!invocation) return outcome(harness, false, now, 'Harness configuration is invalid.');
  if (purpose === 'review') {
    // Depends only on configuration, so it is recomputed instead of cached.
    const cleanSession = validateReviewCliArgs(harness, invocation.cliArgs);
    if (!cleanSession.ok) return outcome(harness, false, now, cleanSession.detail);
  }

  const definition = HARNESS_AVAILABILITY_REGISTRY[harness];
  const executableIdentity = active.resolveExecutable(definition.executable);
  if (!executableIdentity)
    return outcome(
      harness,
      false,
      now,
      `Harness executable '${definition.executable}' was not found on PATH.`
    );

  const modelRequests = mergeModelRequests(
    purpose === 'task' ? [...(request.modelRequests ?? [])] : [],
    cliArgsModelRequests(harness, invocation.cliArgs)
  );
  const key = cacheKey(harness, executableIdentity, invocation, purpose, modelRequests);
  const cachePath = path.join(request.strikethrooRoot, AVAILABILITY_CACHE_RELATIVE_PATH);
  const cached = readCache(cachePath).entries.find(
    entry => entry.key === key && entry.expiresAt > now
  );
  if (cached) {
    const { key: _key, ...cachedOutcome } = cached;
    return { ...cachedOutcome, source: 'cache' };
  }

  const complete = (result: HarnessAvailabilityOutcome): HarnessAvailabilityOutcome => {
    const { source: _source, ...cacheEntry } = result;
    try {
      writeCache(cachePath, { key, ...cacheEntry });
    } catch {
      // Cache persistence is an optimization; the fresh result remains valid.
    }
    return result;
  };

  const probeWorkspace = initializeProbeWorkspace();
  if (!probeWorkspace) {
    return complete(
      outcome(
        harness,
        false,
        now,
        'Could not initialize the disposable Git workspace for the readiness check.'
      )
    );
  }

  try {
    const evidence = readinessEvidence();
    const prompt =
      readinessPrompt(evidence) +
      (modelRequests.length > 0 ? modelMappingPrompt(harness, modelRequests) : '');
    const timeoutMs = modelRequests.length > 0 ? MODEL_MAPPING_PROBE_TIMEOUT_MS : PROBE_TIMEOUT_MS;
    const runWith = (cliArgs: readonly string[]): Promise<ProbeResult> => {
      const command =
        purpose === 'review'
          ? buildReviewCommand({ harness, cliArgs, workspace: probeWorkspace, prompt })
          : definition.buildCommand(probeWorkspace, cliArgs, prompt);
      return active.runProbe({ ...command, executable: executableIdentity }, timeoutMs);
    };
    let probe = await runWith(invocation.cliArgs);
    // A CLI that rejects a family name in cli_args exits at once. Retry with
    // the CLI's default model, so the probe can still map the name.
    const withoutModels = withoutModelOptions(harness, invocation.cliArgs);
    if (
      probe.exitCode !== 0 &&
      !probe.timedOut &&
      !probe.error &&
      withoutModels.length !== invocation.cliArgs.length
    ) {
      fs.rmSync(path.join(probeWorkspace, MODEL_MAP_FILE), { force: true });
      probe = await runWith(withoutModels);
    }
    const available =
      probe.exitCode === 0 && !probe.timedOut && hasReadinessEvidence(probeWorkspace, evidence);
    const result = outcome(
      harness,
      available,
      now,
      available ? 'Harness readiness verified.' : probeFailureReason(probe, timeoutMs)
    );
    if (!available || modelRequests.length === 0) return complete(result);
    const models = readModelMapping(probeWorkspace, modelRequests);
    // A ready harness whose model list could not be read is retried sooner:
    // until then its names use unverified mappings or pass through.
    return complete({
      ...result,
      models,
      ...(models.source === 'list' ? {} : { expiresAt: now + UNAVAILABLE_TTL_MS }),
    });
  } finally {
    fs.rmSync(probeWorkspace, { recursive: true, force: true });
  }
};
