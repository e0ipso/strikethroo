/**
 * Shared top chrome for the Customize section (Plan 91, Task 002; redesigned
 * Plan 100, Task 04; Config tab added with the workspace config form).
 *
 * Renders the section title, crumbs, and the tab badges driven by the LIVE
 * fetched collection lengths (`hooks` / `templates` / configured routing
 * profiles), never static design constants.
 *
 * Tab clicks drive the section's `'hooks' | 'templates' | 'config'` state via
 * `onSelect`.
 */

import { Chrome } from '../components/Chrome';

/** The three Customize tabs, in display order. */
export type CustomizeTab = 'hooks' | 'templates' | 'config';

const TAB_ORDER: CustomizeTab[] = ['hooks', 'templates', 'config'];

export interface CustomizeChromeProps {
  /** The active tab. */
  active: CustomizeTab;
  /** Live hook count (length of the fetched `hooks` collection). */
  hookCount: number;
  /** Live template count (length of the fetched `templates` collection). */
  templateCount: number;
  /** Live count of configured execution profiles in config.yaml. */
  profileCount: number;
  /** Tab selection handler — switches the section's active view. */
  onSelect: (tab: CustomizeTab) => void;
}

/** The Customize chrome bar: title, crumbs, and live tab badges. */
export function CustomizeChrome({
  active,
  hookCount,
  templateCount,
  profileCount,
  onSelect,
}: CustomizeChromeProps) {
  return (
    <Chrome
      title="Customize"
      crumbs={['workspace', 'config']}
      tabs={[
        ['Hooks', hookCount],
        ['Templates', templateCount],
        ['Config', profileCount],
      ]}
      activeTab={TAB_ORDER.indexOf(active)}
      onTabSelect={i => onSelect(TAB_ORDER[i] ?? 'hooks')}
    />
  );
}
