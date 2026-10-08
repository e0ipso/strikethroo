/**
 * Client data layer for the Strikethroo SPA.
 *
 * A fetch-only layer over the serve API (`/api/plans`, `/api/plans/:id`,
 * `/api/config`). Each resource is exposed as a discriminated `loading |
 * error | data` state so screens render the matching surface. An unreachable
 * server, a network failure, or any non-2xx response resolves to the `error`
 * state — never an unhandled throw, a crash, or a silent blank. There is no
 * mock data and no fixture fallback: the error state IS the designed behavior
 * when the API is down.
 *
 * Live refresh: each resource folds the shared revalidation token (Plan 92,
 * Task 002) into its fetch effect. When a coalesced `/api/events` `changed`
 * event bumps the token, every mounted resource re-reads its endpoint — the
 * token is the only coupling to the SSE pipeline; this layer still owns no
 * cache and no stream.
 *
 * The plan list is the one resource with several simultaneous consumers (the
 * Sidebar count plus the routed screen), so `PlansProvider` holds it once and
 * `usePlans` reads it from context. That is a shared mounted resource, not a
 * cache: nothing outlives the provider.
 */

import {
  createContext,
  createElement,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useRevalidationToken } from './revalidation';
import { descriptionFor } from '../customize/descriptions';

/* ---------------------------------------------------------------------------
 * Response types — mirror the documented serve API contract
 * (src/serve/workspace-model.ts). Defined locally because the SPA build is a
 * separate root from the CLI/server source; only the fields screens consume
 * are required, the rest are a documented superset.
 * ------------------------------------------------------------------------- */

/** Derived lifecycle state of a plan, as the API reports it. */
export type PlanState = 'drafted' | 'ready' | 'doing' | 'done';

/** Compact, list/board-facing view of a plan (`GET /api/plans`). */
export interface PlanSummary {
  id: number;
  name: string;
  summary?: string;
  created?: string;
  state: PlanState;
  done: number;
  total: number;
  phaseCount: number;
  archived: boolean;
}

/** A task within a plan detail. */
export interface Task {
  id: number;
  name: string;
  status: string;
  group?: string;
  dependencies?: number[];
  skills?: string[];
  /** Full task markdown body. Serialized by the server; under-typed defensively. */
  body?: string;
  /** Absolute task file path. Serialized by the server; under-typed defensively. */
  file?: string;
  /** Ordered `##` sections of the body. Serialized by the server (mirrors
   * PlanDetail.sections); under-typed defensively. */
  sections?: MarkdownSection[];
}

/** An inferred execution phase within a plan detail. */
export interface Phase {
  index: number;
  /** Optional descriptive name (from a blueprint document). */
  name?: string;
  taskIds: number[];
  /** True when the phase holds more than one task (runs in parallel). */
  parallel: boolean;
}

/** A named `##` section of the plan markdown. */
export interface MarkdownSection {
  /** Heading text (the `## ` line, trimmed). */
  heading: string;
  /** Section content from after the heading up to the next `## ` or EOF. */
  content: string;
}

/** A mermaid diagram exposed by the model. */
export interface MermaidBlock {
  source: string;
  isArchitecturalApproach: boolean;
}

/** Full, detail-screen view of a plan (`GET /api/plans/:id`). */
export interface PlanDetail extends PlanSummary {
  file: string;
  dir: string;
  rawBody: string;
  sections: MarkdownSection[];
  mermaid: MermaidBlock[];
  tasks: Task[];
  phases: Phase[];
}

/**
 * A customizable config file (hook or template).
 *
 * `id`, `file`, `relPath`, and `content` are guaranteed by the server model
 * (src/serve/workspace-model.ts). `description` is merged client-side once in
 * {@link useConfig} from the build-time registry (Task 1, keyed by `id`); no
 * component re-implements that lookup.
 */
export interface ConfigFile {
  id: string;
  file: string;
  /** Workspace-relative path of the file (e.g. `config/hooks/PRE_PLAN.md`). */
  relPath: string;
  content: string;
  /** Human-authored description merged in {@link useConfig} via the registry. */
  description?: string;
}

/** The customizable config slice (`GET /api/config`). */
export interface Config {
  hooks: ConfigFile[];
  templates: ConfigFile[];
  /** The structured workspace configuration `config/config.yaml`, if present. */
  workspace: ConfigFile | null;
}

/** Identity of the project whose workspace the server is hosting. */
export interface ProjectInfo {
  /** Directory name of the project (the folder containing `.ai/strikethroo`). */
  name: string;
  /** Absolute path to that project directory. */
  path: string;
}

/** Server-side capabilities the SPA gates UI on (`GET /api/capabilities`). */
export interface Capabilities {
  /** True when the `self-review` binary is installed on the server's PATH. */
  selfReview: boolean;
  /** The hosting project's identity, used for the sidebar footer label. */
  project?: ProjectInfo;
}

/* ---------------------------------------------------------------------------
 * State machine
 * ------------------------------------------------------------------------- */

/**
 * Discriminated fetch state for a single resource. `error` on the `data`
 * state is a failed revalidation: the last good payload stays, and the next
 * successful read clears it.
 */
export type Resource<T> =
  | { status: 'loading' }
  | { status: 'error'; error: Error }
  | { status: 'data'; data: T; error?: Error };

/**
 * Generic resource hook: fetches `url` (re-fetching if `url` changes, or when
 * the shared revalidation token bumps from a coalesced `changed` event),
 * starting in `loading`, transitioning to `data` on a 2xx JSON response, and
 * to `error` on ANY failure (network/unreachable, non-2xx, or bad JSON).
 * State is never set after unmount.
 *
 * A live re-read keeps the existing data on screen until the new payload
 * resolves, rather than flashing the loading surface: only the initial fetch
 * (`token === 0` for this url) shows `loading`. Subsequent token-driven
 * re-reads swap data in place, so a `changed` event does not blank the view.
 * A re-read that fails keeps the loaded data too and carries the error beside
 * it, so an editor mounted on the data is not unmounted by a transient read
 * failure; only the initial load moves to `error`.
 *
 * A `null` url fetches nothing and leaves the state as it is. It lets a hook
 * that reads a provider-held resource keep a stable hook order when no
 * provider is mounted.
 */
export function useResource<T>(url: string | null): Resource<T> {
  const [state, setState] = useState<Resource<T>>({ status: 'loading' });
  const token = useRevalidationToken();
  const lastUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (url === null) return;
    let active = true;
    const controller = new AbortController();

    // Show the loading surface only when the target URL changes (navigation /
    // first fetch). A token-driven live re-read of the SAME url keeps current
    // data on screen until the fresh payload resolves — no blank flash.
    if (lastUrlRef.current !== url) {
      lastUrlRef.current = url;
      setState({ status: 'loading' });
    }

    (async () => {
      try {
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) {
          throw new Error(`Request to ${url} failed with status ${res.status}`);
        }
        const data = (await res.json()) as T;
        if (active) setState({ status: 'data', data });
      } catch (err) {
        if (controller.signal.aborted) return;
        const error = err instanceof Error ? err : new Error(String(err));
        if (active) {
          setState(prev =>
            prev.status === 'data'
              ? { status: 'data', data: prev.data, error }
              : { status: 'error', error }
          );
        }
      }
    })();

    return () => {
      active = false;
      controller.abort();
    };
    // `token` re-runs the fetch on a coalesced change; `url` on navigation.
  }, [url, token]);

  return state;
}

const PlansContext = createContext<Resource<PlanSummary[]> | null>(null);

/**
 * Owns the single `/api/plans` resource for every `usePlans` beneath it, so the
 * Sidebar and the routed screen cost one request per load and one per
 * revalidation pass. The resource is passed through unchanged, including a
 * failed revalidation's `error` beside the retained data. State lives in this
 * component's `useResource`: unmounting the provider drops it, remounting
 * fetches again, and the revalidation token stays the only refresh trigger.
 */
export function PlansProvider({ children }: { children: ReactNode }) {
  const plans = useResource<PlanSummary[]>('/api/plans');
  return createElement(PlansContext.Provider, { value: plans }, children);
}

/**
 * The plan summary list. Reads the provider's resource when one is mounted;
 * outside a provider (the `?gallery=1` harness) it degrades to its own fetch.
 */
export function usePlans(): Resource<PlanSummary[]> {
  const shared = useContext(PlansContext);
  const own = useResource<PlanSummary[]>(shared ? null : '/api/plans');
  return shared ?? own;
}

/** Fetches a single plan's full detail by id. */
export function usePlanDetail(id: string): Resource<PlanDetail> {
  return useResource<PlanDetail>(`/api/plans/${encodeURIComponent(id)}`);
}

/**
 * Merges the build-time description registry (Task 1) onto each hook and
 * template by `id`. This is the single place descriptions are looked up; no
 * component calls {@link descriptionFor} itself.
 */
function withDescriptions(cfg: Config): Config {
  return {
    hooks: cfg.hooks.map(h => ({ ...h, description: descriptionFor(h.id) })),
    templates: cfg.templates.map(t => ({ ...t, description: descriptionFor(t.id) })),
    workspace: cfg.workspace ?? null,
  };
}

/** Fetches the customizable config slice (hooks + templates). */
export function useConfig(): Resource<Config> {
  const resource = useResource<Config>('/api/config');
  if (resource.status === 'data') {
    return { ...resource, data: withDescriptions(resource.data) };
  }
  return resource;
}

/* ---------------------------------------------------------------------------
 * Mutation capability
 *
 * The server mints a random capability per start and requires it, in the
 * header below, on every mutation (config write, archive, self-review). The
 * SPA fetches it lazily from `GET /api/session` and keeps it only in this
 * module-level variable: never storage, never a URL, never logged. Every
 * mutation goes through {@link mutate}, which shares one in-flight bootstrap
 * between concurrent callers and, when the server answers `403` (it restarted
 * and minted a new capability), drops the stale token, bootstraps again, and
 * retries exactly once. No other status is retried: `409`/`429` mean the
 * server is busy, and repeating the request would not change that.
 * ------------------------------------------------------------------------- */

const CAPABILITY_HEADER = 'X-Strikethroo-Capability';

let capability: string | null = null;
let bootstrap: Promise<string> | null = null;

/** Fetches a fresh capability from the session bootstrap endpoint and caches it. */
async function bootstrapCapability(): Promise<string> {
  const res = await fetch('/api/session', { cache: 'no-store' });
  if (!res.ok) throw new Error(`Session bootstrap failed with status ${res.status}`);
  const { token } = (await res.json()) as { token?: unknown };
  if (typeof token !== 'string' || token === '') {
    throw new Error('Session bootstrap returned no capability');
  }
  capability = token;
  return token;
}

/** The cached capability, or the one in-flight bootstrap every caller shares. */
function getCapability(): Promise<string> {
  if (capability) return Promise.resolve(capability);
  // `.finally` always runs after this assignment, so a failed bootstrap is
  // never left cached and the next mutation tries again.
  bootstrap ??= bootstrapCapability().finally(() => {
    bootstrap = null;
  });
  return bootstrap;
}

/**
 * Sends one mutation with the JSON media type and the capability. On `403` it
 * forgets `stale` — unless a concurrent retry already replaced it — and sends
 * once more with a freshly bootstrapped token. The second response is returned
 * as-is, so callers keep their own error semantics. Throws only when the
 * bootstrap or the network fails.
 */
async function mutate(
  url: string,
  init: { method: 'POST' | 'PUT'; body?: unknown }
): Promise<Response> {
  const body = JSON.stringify(init.body ?? {});
  const send = (token: string): Promise<Response> =>
    fetch(url, {
      method: init.method,
      headers: { 'Content-Type': 'application/json', [CAPABILITY_HEADER]: token },
      body,
    });
  const stale = await getCapability();
  const res = await send(stale);
  if (res.status !== 403) return res;
  if (capability === stale) capability = null;
  return send(await getCapability());
}

/**
 * Overwrites an existing config file via `PUT /api/config/:kind/:id` with a
 * JSON `{ content }` body — the SPA's single config write path. `hooks` and
 * `templates` address Markdown files by id; the `workspace` kind (id
 * `config`) addresses the structured `config/config.yaml` behind the Config
 * form. Resolves on a 2xx response; throws an Error carrying the server's
 * `error` message (or a status-derived fallback) on any non-OK response or
 * network failure.
 */
export async function saveConfigFile(
  kind: 'hooks' | 'templates' | 'workspace',
  id: string,
  content: string
): Promise<void> {
  const res = await mutate(`/api/config/${kind}/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: { content },
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error ?? `Save failed with status ${res.status}`);
  }
}

/** Fetches the server-side capability flags (e.g. self-review availability). */
export function useCapabilities(): Resource<Capabilities> {
  return useResource<Capabilities>('/api/capabilities');
}

/** Result of a {@link launchSelfReview} request. */
export interface LaunchResult {
  ok: boolean;
  error?: string;
}

/**
 * Asks the server to launch the external self-review binary for `path`. The
 * server validates the path stays inside the workspace before spawning. Never
 * throws: a network or non-2xx failure resolves to `{ ok: false, error }`.
 */
export async function launchSelfReview(path: string): Promise<LaunchResult> {
  try {
    const res = await mutate('/api/self-review', { method: 'POST', body: { path } });
    const data = (await res.json().catch(() => ({}))) as LaunchResult;
    if (!res.ok) {
      return { ok: false, error: data.error ?? `Launch failed with status ${res.status}` };
    }
    return { ok: data.ok !== false, error: data.error };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/** Result of an {@link archivePlan} request. */
export interface ArchiveResult {
  ok: boolean;
  error?: string;
}

/**
 * Asks the server to archive a done plan — the SPA's single permitted workspace
 * mutation — which moves its directory from `plans/` to `archive/`. Addressed by
 * the plan's composite `name` (`{id}--{slug}`), the canonical workspace key.
 * Never throws: a network or non-2xx failure resolves to `{ ok: false, error }`.
 * On success the server's `changed` SSE event drives the plan list to
 * revalidate, so callers typically just close their confirmation UI.
 */
export async function archivePlan(name: string): Promise<ArchiveResult> {
  try {
    // The server requires a JSON media type on every mutation; the body is `{}`.
    const res = await mutate(`/api/plans/${encodeURIComponent(name)}/archive`, { method: 'POST' });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      return { ok: false, error: data.error ?? `Archive failed with status ${res.status}` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
