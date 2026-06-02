/**
 * Shared Customize card grid (Plan 100, Task 04).
 *
 * One uniform, responsive card grid rendered for BOTH the Hooks and Templates
 * tabs, driven by the fetched `ConfigFile[]` collection — it replaces the
 * divergent legacy `HooksView` / `TemplatesView` designs (no inline content
 * reveal, no intelligence/control grouping, no frontmatter/section breakdown,
 * no inert action buttons).
 *
 * Each card is a single keyboard-accessible `<button>` whose whole surface is
 * the click target. It navigates to the read-only detail route
 * `/customize/<kind>/<id>` (built by Task 5; the URL contract is fixed, so this
 * grid works independently). The card shows:
 *   - eyebrow: the path relative to `.ai/strikethroo/`. The model gives
 *     `relPath` like `config/hooks/POST_PLAN.md`, rendered as
 *     `.ai/strikethroo/<relPath>`.
 *   - title: the file `id`, with underscores shown literally (`POST_PLAN`,
 *     `PLAN_TEMPLATE`).
 *   - description: the registry `description` when present, omitted cleanly
 *     when absent.
 *
 * The grid is a responsive CSS Grid (3 → 2 → 1 columns by viewport) expressed
 * with Tailwind utilities (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`); the
 * cards carry their light/dark surface inline (Plan 102 — the vendored
 * `cz__grid` / `cz__card` semantic classes are no longer emitted).
 */

import type { ConfigFile } from '../data/api';
import { cn } from '../vendor/utils/cn';
import { useNavigate } from '../router';

/** The two Customize kinds, matching the `/customize/:kind/:id` URL contract. */
export type ConfigKind = 'hooks' | 'templates';

/** Workspace-relative prefix every Customize file path is shown under. */
const WORKSPACE_PREFIX = '.ai/strikethroo/';

export interface ConfigCardGridProps {
  /** The fetched collection for the active tab. */
  files: ConfigFile[];
  /** Which tab this grid renders — drives the navigation target. */
  kind: ConfigKind;
}

/** A single config card: the whole surface navigates to the detail route. */
function ConfigCard({ file, kind }: { file: ConfigFile; kind: ConfigKind }) {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      data-testid="config-card"
      className={cn(
        'flex flex-col gap-2 text-left',
        'rounded-card border border-border-soft bg-cream px-5 py-4',
        'cursor-pointer shadow-sm transition-colors',
        'hover:border-ink-4 hover:bg-cream-mid hover:shadow',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dalia'
      )}
      onClick={() => navigate(`/customize/${kind}/${file.id}`)}
    >
      <span data-testid="config-card-eyebrow" className="break-all font-mono text-xs text-ink-3">
        {WORKSPACE_PREFIX}
        {file.relPath}
      </span>
      <span data-testid="config-card-title" className="font-display text-2xl font-bold text-ink">
        {file.id}
      </span>
      {file.description && (
        <p data-testid="config-card-desc" className="m-0 text-base text-ink-2">
          {file.description}
        </p>
      )}
    </button>
  );
}

/** The responsive card grid shared by the Hooks and Templates tabs. */
export function ConfigCardGrid({ files, kind }: ConfigCardGridProps) {
  return (
    <div
      data-testid="config-grid"
      className="grid flex-1 content-start grid-cols-1 gap-4 overflow-auto px-8 py-6 sm:grid-cols-2 lg:grid-cols-3"
    >
      {files.map(file => (
        <ConfigCard key={file.id} file={file} kind={kind} />
      ))}
    </div>
  );
}
