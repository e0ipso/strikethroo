/**
 * Shared top chrome for the Customize section (Plan 91, Task 002).
 *
 * Ported from the design's `CustomizeChrome` in
 * `scratch/ui/designs/screens-customize.jsx`, with the plan's corrections:
 *   - the tab count badges are driven by the LIVE fetched collection lengths
 *     (`hooks` / `templates`), never the design's static `HOOKS.length` /
 *     `TEMPLATES.length` constants;
 *   - the right-side "Open in editor" / "Customization guide" actions are
 *     purely presentational (inert `Button`s with no handler) — this is a
 *     read-only product (PRD Decision #3), so they mutate nothing.
 *
 * Tab clicks drive the section's `'hooks' | 'templates'` state via `onSelect`.
 */

import { Chrome } from '../components/Chrome';
import { Button } from '../components/primitives';

/** The two Customize tabs, in display order. */
export type CustomizeTab = 'hooks' | 'templates';

export interface CustomizeChromeProps {
  /** The active tab. */
  active: CustomizeTab;
  /** Live hook count (length of the fetched `hooks` collection). */
  hookCount: number;
  /** Live template count (length of the fetched `templates` collection). */
  templateCount: number;
  /** Tab selection handler — switches the section's active view. */
  onSelect: (tab: CustomizeTab) => void;
}

/** The Customize chrome bar: title, crumbs, live tab badges, inert actions. */
export function CustomizeChrome({
  active,
  hookCount,
  templateCount,
  onSelect,
}: CustomizeChromeProps) {
  return (
    <Chrome
      title="Customize"
      crumbs={['workspace', 'config']}
      tabs={[
        ['Hooks', hookCount],
        ['Templates', templateCount],
      ]}
      activeTab={active === 'hooks' ? 0 : 1}
      onTabSelect={i => onSelect(i === 0 ? 'hooks' : 'templates')}
      right={
        <>
          {/* Presentational only — read-only product, no editing here. */}
          <Button kind="ghost" size="sm" icon="folder">
            Open in editor
          </Button>
          <Button kind="outline" size="sm" icon="book">
            Customization guide
          </Button>
        </>
      }
    />
  );
}
