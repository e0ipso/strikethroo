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
 * SSE / live-refresh is intentionally out of scope here (a later plan owns the
 * `/api/events` stream); this layer only does request + state.
 */

import { useEffect, useState } from 'react';

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

/** A customizable config file (hook or template). */
export interface ConfigFile {
  id: string;
  file: string;
  content: string;
}

/** The customizable config slice (`GET /api/config`). */
export interface Config {
  hooks: ConfigFile[];
  templates: ConfigFile[];
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
 * Generic resource hook: fetches `url` once (re-fetching if `url` changes),
 * starting in `loading`, transitioning to `data` on a 2xx JSON response, and
 * to `error` on ANY failure (network/unreachable, non-2xx, or bad JSON).
 * State is never set after unmount.
 */
export function useResource<T>(url: string): Resource<T> {
  const [state, setState] = useState<Resource<T>>({ status: 'loading' });

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    setState({ status: 'loading' });

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
  }, [url]);

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
