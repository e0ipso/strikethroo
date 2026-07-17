import * as fs from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';
import { SUPPORTED_HARNESSES, type Harness } from '../../types';
import { EXTERNAL_HARNESS_ADAPTERS, type StructuredCommand } from './external-dispatch';

export const AVAILABILITY_REGISTRY_VERSION = 1;
export const AVAILABLE_TTL_MS = 30 * 60 * 1000;
export const UNAVAILABLE_TTL_MS = 5 * 60 * 1000;
export const PROBE_TIMEOUT_MS = 20_000;
export const AVAILABILITY_CACHE_RELATIVE_PATH = path.join('runtime', 'harness-availability.json');

const PROBE_PROMPT = 'Reply with OK.';

export interface HarnessAvailabilityDefinition {
  version: number;
  executable: string;
  buildCommand: (cwd: string) => StructuredCommand;
}

const probeCommand = (
  executable: string,
  argv: string[],
  cwd: string,
  stdin = PROBE_PROMPT
): StructuredCommand => ({ executable, argv, cwd, stdin });

/**
 * Maintained release data. A probe proves harness access, not selected-model
 * access, so each probe invokes the harness non-interactively with no explicit
 * model override and lets the CLI use its own configured/default model.
 */
export const HARNESS_AVAILABILITY_REGISTRY: Readonly<
  Record<Harness, HarnessAvailabilityDefinition>
> = {
  claude: {
    version: AVAILABILITY_REGISTRY_VERSION,
    executable: 'claude',
    buildCommand: cwd => probeCommand('claude', ['-p'], cwd),
  },
  codex: {
    version: AVAILABILITY_REGISTRY_VERSION,
    executable: 'codex',
    buildCommand: cwd => probeCommand('codex', ['exec', '-'], cwd),
  },
  cursor: {
    version: AVAILABILITY_REGISTRY_VERSION,
    executable: 'cursor-agent',
    buildCommand: cwd => probeCommand('cursor-agent', ['--print'], cwd),
  },
  gemini: {
    version: AVAILABILITY_REGISTRY_VERSION,
    executable: 'gemini',
    buildCommand: cwd => probeCommand('gemini', ['--prompt', PROBE_PROMPT], cwd, ''),
  },
  copilot: {
    version: AVAILABILITY_REGISTRY_VERSION,
    executable: 'copilot',
    buildCommand: cwd => probeCommand('copilot', ['-p', PROBE_PROMPT], cwd, ''),
  },
  opencode: {
    version: AVAILABILITY_REGISTRY_VERSION,
    executable: 'opencode',
    buildCommand: cwd => probeCommand('opencode', ['run', '-'], cwd),
  },
};

const registryKeys = Object.keys(HARNESS_AVAILABILITY_REGISTRY).sort();
const harnessKeys = [...SUPPORTED_HARNESSES].sort();
if (registryKeys.join('\0') !== harnessKeys.join('\0')) {
  throw new Error('Harness availability registry does not cover SUPPORTED_HARNESSES exactly.');
}
for (const harness of SUPPORTED_HARNESSES) {
  const availability = HARNESS_AVAILABILITY_REGISTRY[harness];
  if (availability.executable !== EXTERNAL_HARNESS_ADAPTERS[harness].executable) {
    throw new Error(`Harness availability executable disagrees with the ${harness} adapter.`);
  }
}

export interface HarnessAvailabilityOutcome {
  harness: Harness;
  available: boolean;
  observedAt: number;
  expiresAt: number;
  reason: string;
  source: 'cache' | 'probe' | 'bypass';
}

interface CacheFile {
  version: 1;
  harnesses: Partial<Record<Harness, Omit<HarnessAvailabilityOutcome, 'harness' | 'source'>>>;
}

export interface ProbeResult {
  exitCode: number;
  timedOut?: boolean;
  detail?: string;
}

export interface HarnessAvailabilityDependencies {
  now: () => number;
  runProbe: (command: StructuredCommand, timeoutMs: number) => Promise<ProbeResult>;
}

const safeReason = (value: unknown, fallback: string): string => {
  if (typeof value !== 'string') return fallback;
  const firstLine = value
    .replace(/[\r\n]+/g, ' ')
    .trim()
    .slice(0, 200);
  return firstLine || fallback;
};

const isOutcome = (value: unknown): value is CacheFile['harnesses'][Harness] => {
  if (!value || typeof value !== 'object') return false;
  const entry = value as Record<string, unknown>;
  return (
    typeof entry.available === 'boolean' &&
    typeof entry.observedAt === 'number' &&
    Number.isFinite(entry.observedAt) &&
    typeof entry.expiresAt === 'number' &&
    Number.isFinite(entry.expiresAt) &&
    typeof entry.reason === 'string'
  );
};

const readCache = (cachePath: string): CacheFile => {
  try {
    const parsed: unknown = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
    if (!parsed || typeof parsed !== 'object') throw new Error('invalid cache');
    const record = parsed as Record<string, unknown>;
    if (record.version !== 1 || !record.harnesses || typeof record.harnesses !== 'object') {
      throw new Error('invalid cache');
    }
    const harnesses: CacheFile['harnesses'] = {};
    for (const harness of SUPPORTED_HARNESSES) {
      const candidate = (record.harnesses as Record<string, unknown>)[harness];
      if (isOutcome(candidate)) harnesses[harness] = candidate;
    }
    return { version: 1, harnesses };
  } catch {
    return { version: 1, harnesses: {} };
  }
};

const writeCache = (
  cachePath: string,
  harness: Harness,
  outcome: HarnessAvailabilityOutcome
): void => {
  fs.mkdirSync(path.dirname(cachePath), { recursive: true });
  const cache = readCache(cachePath);
  const existing = cache.harnesses[harness];
  if (!existing || existing.observedAt <= outcome.observedAt) {
    cache.harnesses[harness] = {
      available: outcome.available,
      observedAt: outcome.observedAt,
      expiresAt: outcome.expiresAt,
      reason: outcome.reason,
    };
  }
  const temporary = `${cachePath}.${process.pid}.${Math.random().toString(16).slice(2)}.tmp`;
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

const runProbe = (command: StructuredCommand, timeoutMs: number): Promise<ProbeResult> =>
  new Promise(resolve => {
    let settled = false;
    let diagnostics = '';
    const finish = (result: ProbeResult): void => {
      if (settled) return;
      settled = true;
      resolve(result);
    };
    const child = spawn(command.executable, command.argv, {
      cwd: command.cwd,
      shell: false,
      stdio: ['pipe', 'ignore', 'pipe'],
    });
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      finish({ exitCode: 1, timedOut: true, detail: 'Probe timed out.' });
    }, timeoutMs);
    child.stderr?.on('data', chunk => {
      if (diagnostics.length < 400) diagnostics += String(chunk).slice(0, 400 - diagnostics.length);
    });
    child.once('error', error => {
      clearTimeout(timer);
      finish({ exitCode: 1, detail: error.message });
    });
    child.once('close', code => {
      clearTimeout(timer);
      finish({ exitCode: code ?? 1, detail: diagnostics });
    });
    child.stdin?.on('error', () => undefined);
    child.stdin?.end(command.stdin);
  });

const defaultDependencies: HarnessAvailabilityDependencies = {
  now: Date.now,
  runProbe,
};

export interface CheckHarnessAvailabilityRequest {
  strikethrooRoot: string;
  workspace: string;
  harness?: Harness;
  currentHarness: Harness;
}

/** Resolve cached/fresh harness-level availability; native targets are trusted. */
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
  const cachePath = path.join(request.strikethrooRoot, AVAILABILITY_CACHE_RELATIVE_PATH);
  const cached = readCache(cachePath).harnesses[harness];
  if (cached && cached.expiresAt > now) return { harness, ...cached, source: 'cache' };

  const definition = HARNESS_AVAILABILITY_REGISTRY[harness];
  let probe: ProbeResult;
  try {
    probe = await active.runProbe(definition.buildCommand(request.workspace), PROBE_TIMEOUT_MS);
  } catch (error) {
    probe = { exitCode: 1, detail: error instanceof Error ? error.message : String(error) };
  }
  const available = probe.exitCode === 0 && !probe.timedOut;
  const reason = available
    ? 'Harness probe succeeded.'
    : safeReason(
        probe.detail,
        probe.timedOut ? 'Harness probe timed out.' : 'Harness probe failed.'
      );
  const outcome: HarnessAvailabilityOutcome = {
    harness,
    available,
    observedAt: now,
    expiresAt: now + (available ? AVAILABLE_TTL_MS : UNAVAILABLE_TTL_MS),
    reason,
    source: 'probe',
  };
  try {
    writeCache(cachePath, harness, outcome);
  } catch {
    // Cache persistence is an optimization; a valid live result still stands.
  }
  return outcome;
};
