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
 * The grid itself is plain CSS Grid (3 → 2 → 1 columns by viewport) defined in
 * the vendored `customize-grid.css`; this component is a thin wrapper emitting
 * the canonical `cz__grid` / `cz__card` class names.
 */

import type { ConfigFile } from '../data/api';
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
      className="cz__card"
      onClick={() => navigate(`/customize/${kind}/${file.id}`)}
    >
      <span className="cz__card-eyebrow mono">
        {WORKSPACE_PREFIX}
        {file.relPath}
      </span>
      <span className="cz__card-title">{file.id}</span>
      {file.description && <p className="cz__card-desc">{file.description}</p>}
    </button>
  );
}

/** The responsive card grid shared by the Hooks and Templates tabs. */
export function ConfigCardGrid({ files, kind }: ConfigCardGridProps) {
  return (
    <div className="cz__grid">
      {files.map(file => (
        <ConfigCard key={file.id} file={file} kind={kind} />
      ))}
    </div>
  );
}
