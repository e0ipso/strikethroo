/**
 * Shared top chrome for the Customize section (Plan 91, Task 002; redesigned
 * Plan 100, Task 04).
 *
 * Renders the section title, crumbs, and the two tab badges driven by the LIVE
 * fetched collection lengths (`hooks` / `templates`), never static design
 * constants. The former right-side "Open in editor" / "Customization guide"
 * inert actions are removed — this is a read-only product (PRD Decision #3)
 * and they mutated nothing.
 *
 * Tab clicks drive the section's `'hooks' | 'templates'` state via `onSelect`.
 */

import { Chrome } from '../components/Chrome';

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

/** The Customize chrome bar: title, crumbs, and live tab badges. */
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
    />
  );
}
