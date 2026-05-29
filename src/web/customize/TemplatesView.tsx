/**
 * Templates view (Plan 91, Task 004) — placeholder body introduced by Task
 * 002's container scaffolding; the full card-grid + read-only-content
 * implementation lands in Task 004.
 */

import type { ConfigFile } from '../data/api';

export interface TemplatesViewProps {
  templates: ConfigFile[];
}

export function TemplatesView({ templates }: TemplatesViewProps) {
  return <div className="cz__scroll">{templates.length} template(s).</div>;
}
