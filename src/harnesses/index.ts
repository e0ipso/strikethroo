/**
 * Harness Registry Barrel
 *
 * Importing this module guarantees the registry is populated: it pulls in the
 * agent adapter module for its registration side effect, then re-exports the
 * registry surface. Consumers should import from here, not from the individual
 * modules, so the adapters are always registered before use.
 */

import './agent-adapter';

export { HarnessRegistry, registerHarnessAdapter } from './registry';
export type { HarnessAdapter } from './registry';
export { createAgentAdapter } from './agent-adapter';
