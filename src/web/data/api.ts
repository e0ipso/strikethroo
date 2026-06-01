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
 */

import { useEffect, useRef, useState } from 'react';
import { useRevalidationToken } from './revalidation';

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
 * `id`, `file`, and `content` are guaranteed by the server model
 * (src/serve/workspace-model.ts). Every other field is OPTIONAL metadata the
 * model MAY surface in the future; the client treats them strictly as
 * pass-through — present when the API sends them, `undefined` (never defaulted
 * to a fabricated value) when it does not. The Customize views read these
 * defensively and degrade gracefully when a field is absent.
 */
export interface ConfigFile {
  id: string;
  file: string;
  content: string;
  /* --- optional hook metadata (absent on the current model) --- */
  /** Hook category used to group the Hooks view; ungrouped when absent. */
  kind?: 'intelligence' | 'control';
  /** When in the workflow the hook fires. */
  when?: string;
  /** What the hook does. */
  purpose?: string;
  /** True when the workspace copy diverges from the shipped default. */
  customized?: boolean;
  /** True when the hook ships intentionally empty. */
  empty?: boolean;
  /* --- optional template metadata (absent on the current model) --- */
  /** Frontmatter field names declared by the template. */
  frontmatter?: string[];
  /** Ordered `##` section names of the template. */
  sections?: string[];
}

/** The customizable config slice (`GET /api/config`). */
export interface Config {
  hooks: ConfigFile[];
  templates: ConfigFile[];
}

/** Server-side capabilities the SPA gates UI on (`GET /api/capabilities`). */
export interface Capabilities {
  /** True when the `self-review` binary is installed on the server's PATH. */
  selfReview: boolean;
}

/* ---------------------------------------------------------------------------
 * State machine
 * ------------------------------------------------------------------------- */

/** Discriminated fetch state for a single resource. */
export type Resource<T> =
  | { status: 'loading' }
  | { status: 'error'; error: Error }
  | { status: 'data'; data: T };

/**
 * Generic resource hook: fetches `url` (re-fetching if `url` changes, or when
 * the shared revalidation token bumps from a coalesced `changed` event),
 * starting in `loading`, transitioning to `data` on a 2xx JSON response, and
 * to `error` on ANY failure (network/unreachable, non-2xx, or bad JSON).
 * State is never set after unmount.
 *
 * A live re-read keeps the existing data on screen until the new payload (or an
 * error) resolves, rather than flashing the loading surface: only the initial
 * fetch (`token === 0` for this url) shows `loading`. Subsequent token-driven
 * re-reads swap data in place, so a `changed` event does not blank the view.
 */
export function useResource<T>(url: string): Resource<T> {
  const [state, setState] = useState<Resource<T>>({ status: 'loading' });
  const token = useRevalidationToken();
  const lastUrlRef = useRef<string | null>(null);

  useEffect(() => {
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
        if (active) setState({ status: 'error', error });
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

/** Fetches the plan summary list. */
export function usePlans(): Resource<PlanSummary[]> {
  return useResource<PlanSummary[]>('/api/plans');
}

/** Fetches a single plan's full detail by id. */
export function usePlanDetail(id: string): Resource<PlanDetail> {
  return useResource<PlanDetail>(`/api/plans/${encodeURIComponent(id)}`);
}

/** Fetches the customizable config slice (hooks + templates). */
export function useConfig(): Resource<Config> {
  return useResource<Config>('/api/config');
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
    const res = await fetch('/api/self-review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path }),
    });
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
 * mutation — which moves its directory from `plans/` to `archive/`. Never
 * throws: a network or non-2xx failure resolves to `{ ok: false, error }`. On
 * success the server's `changed` SSE event drives the plan list to revalidate,
 * so callers typically just close their confirmation UI.
 */
export async function archivePlan(id: number): Promise<ArchiveResult> {
  try {
    const res = await fetch(`/api/plans/${encodeURIComponent(String(id))}/archive`, {
      method: 'POST',
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      return { ok: false, error: data.error ?? `Archive failed with status ${res.status}` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
