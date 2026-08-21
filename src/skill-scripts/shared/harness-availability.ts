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

export const AVAILABILITY_REGISTRY_VERSION = 3;
export const AVAILABLE_TTL_MS = 30 * 60 * 1000;
export const UNAVAILABLE_TTL_MS = 5 * 60 * 1000;
export const PROBE_TIMEOUT_MS = 20_000;
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
}

type CacheEntry = Omit<HarnessAvailabilityOutcome, 'source'> & { key: string };

interface CacheFile {
  version: 2;
  entries: CacheEntry[];
}

export interface ProbeResult {
  exitCode: number;
  timedOut?: boolean;
}

export interface HarnessAvailabilityDependencies {
  now: () => number;
  resolveExecutable: (executable: string) => string | undefined;
  runProbe: (command: StructuredCommand, timeoutMs: number) => Promise<ProbeResult>;
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
        if (fs.statSync(candidate).isFile()) return fs.realpathSync(candidate);
      } catch {
        // Try the next PATH entry or executable suffix.
      }
    }
  }
  return undefined;
};

const runProbe = (command: StructuredCommand, timeoutMs: number): Promise<ProbeResult> =>
  new Promise(resolve => {
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
      stdio: ['pipe', 'ignore', 'ignore'],
    });
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGKILL');
    }, timeoutMs);
    child.once('error', () => {
      clearTimeout(timer);
      finish({ exitCode: 1, timedOut });
    });
    child.once('close', code => {
      clearTimeout(timer);
      finish({ exitCode: code ?? 1, timedOut });
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
    typeof entry.reason === 'string'
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
  invocation: NormalizedHarnessInvocation
): string =>
  createHash('sha256')
    .update(
      JSON.stringify({
        harness,
        executableIdentity,
        cliArgsHash: invocation.cliArgsHash,
        normalizationVersion: HARNESS_CONFIGURATION_NORMALIZATION_VERSION,
        probeRegistryVersion: AVAILABILITY_REGISTRY_VERSION,
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

export interface CheckHarnessAvailabilityRequest {
  strikethrooRoot: string;
  workspace: string;
  harness?: Harness;
  currentHarness: Harness;
  invocation?: NormalizedHarnessInvocation;
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
  if (!invocation) return outcome(harness, false, now, 'Harness configuration is invalid.');

  const definition = HARNESS_AVAILABILITY_REGISTRY[harness];
  const executableIdentity = active.resolveExecutable(definition.executable);
  if (!executableIdentity)
    return outcome(harness, false, now, 'Harness executable is unavailable.');

  const key = cacheKey(harness, executableIdentity, invocation);
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
    return complete(outcome(harness, false, now, 'Harness readiness check failed.'));
  }

  try {
    const evidence = readinessEvidence();
    const command = definition.buildCommand(
      probeWorkspace,
      invocation.cliArgs,
      readinessPrompt(evidence)
    );
    const probe = await active.runProbe(
      { ...command, executable: executableIdentity },
      PROBE_TIMEOUT_MS
    );
    const available =
      probe.exitCode === 0 && !probe.timedOut && hasReadinessEvidence(probeWorkspace, evidence);
    return complete(
      outcome(
        harness,
        available,
        now,
        available ? 'Harness readiness verified.' : 'Harness readiness check failed.'
      )
    );
  } finally {
    fs.rmSync(probeWorkspace, { recursive: true, force: true });
  }
};
