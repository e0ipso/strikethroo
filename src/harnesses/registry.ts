/**
 * Harness Adapter Registry
 *
 * A minimal, single extension point describing how each supported harness is
 * detected, installed, and updated. `init` iterates the registry instead of
 * branching over harnesses.
 *
 * Deliberately small: no delivery-strategy abstraction and no per-tool config
 * schema — just "one place to register a harness". Strikethroo profiles
 * (`src/profiles.ts`) operate on the workspace template tree and never touch
 * this registry; it stays profile-agnostic.
 */

import { Harness } from '../types';

/**
 * The outcome of installing the packaged Agent Skills for one harness.
 */
export interface SkillInstallResult {
  /** Absolute paths written. */
  files: string[];
  /** Absolute path of the harness's skills directory. */
  skillsDir: string;
  /** True when at least one written path already existed before this call. */
  replacedExisting: boolean;
}

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
  /**
   * Copy the packaged Agent Skills into the harness's skills directory under
   * `projectRoot`, overwriting unconditionally.
   *
   * Required rather than optional: every supported harness has a skills
   * directory, so an optional member would only add a branch nothing takes.
   */
  installSkills(projectRoot: string): Promise<SkillInstallResult>;
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
