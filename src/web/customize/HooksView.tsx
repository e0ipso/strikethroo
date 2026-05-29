/**
 * Hooks view (Plan 91, Task 003) — placeholder body introduced by Task 002's
 * container scaffolding; the full grouped-card + read-only-content
 * implementation lands in Task 003.
 */

import type { ConfigFile } from '../data/api';

export interface HooksViewProps {
  hooks: ConfigFile[];
}

export function HooksView({ hooks }: HooksViewProps) {
  return <div className="cz__scroll">{hooks.length} hook(s).</div>;
}
