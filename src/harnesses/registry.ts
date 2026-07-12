/**
 * Harness Adapter Registry
 *
 * A minimal, single extension point describing how each supported harness is
 * detected, installed, and updated. `init` iterates the registry instead of
 * branching over harnesses.
 *
 * Deliberately small: no profiles, no delivery-strategy abstraction, and no
 * per-tool config schema — just "one place to register a harness".
 */

import { Harness } from '../types';

/**
 * Describes the lifecycle of a single harness.
 *
 * All paths are resolved against `projectRoot`. `install` and `update` return
 * the absolute paths of the files they wrote.
 */
export interface HarnessAdapter {
  /** The harness this adapter manages. */
  id: Harness;
  /** Resolve to `true` when the harness is already present under `projectRoot`. */
  detect(projectRoot: string): Promise<boolean>;
  /** Create the harness's files under `projectRoot`; resolve to the paths written. */
  install(projectRoot: string): Promise<string[]>;
  /** Re-apply the harness's files (idempotent); resolve to the paths written. */
  update(projectRoot: string): Promise<string[]>;
}

/** The single registry of harness adapters, keyed by harness id. */
export const HarnessRegistry = new Map<Harness, HarnessAdapter>();

/**
 * Register an adapter, keyed by its `id`. Later registrations for the same id
 * replace earlier ones.
 */
export function registerHarnessAdapter(adapter: HarnessAdapter): void {
  HarnessRegistry.set(adapter.id, adapter);
}
