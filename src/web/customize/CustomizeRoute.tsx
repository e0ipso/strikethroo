/**
 * Customize section container (Plan 91, Task 002; redesigned Plan 100, Task 04).
 *
 * The `/customize` route's single feature module. It calls `useConfig()` once
 * at the container level, drives the shared {@link CustomizeChrome} (live tab
 * count badges), owns the `'hooks' | 'templates'` tab state, and surfaces the
 * data layer's loading / error states through the shared {@link LoadingSurface}
 * / {@link ErrorSurface} rather than rendering an empty shell.
 *
 * Both tabs render the same {@link ConfigCardGrid}: a uniform, responsive card
 * grid driven by the active tab's fetched collection. Nothing here mutates
 * config: the section is read-only (PRD Decision #3); each card links to the
 * read-only detail route. All visible workspace paths use `.ai/strikethroo/`
 * naming.
 */

import { useState } from 'react';
import { useConfig, type ConfigFile } from '../data/api';
import { ErrorSurface, LoadingSurface } from '../components/StateSurface';
import { CustomizeChrome, type CustomizeTab } from './CustomizeChrome';
import { ConfigCardGrid } from './ConfigCardGrid';

/** The Customize screen body once config has loaded. */
function CustomizeScreen({ hooks, templates }: { hooks: ConfigFile[]; templates: ConfigFile[] }) {
  const [tab, setTab] = useState<CustomizeTab>('hooks');
  return (
    <>
      <CustomizeChrome
        active={tab}
        hookCount={hooks.length}
        templateCount={templates.length}
        onSelect={setTab}
      />
      {tab === 'hooks' ? (
        <ConfigCardGrid files={hooks} kind="hooks" />
      ) : (
        <ConfigCardGrid files={templates} kind="templates" />
      )}
    </>
  );
}

/** The composed Customize route: chrome + active view, driven by live config. */
export function CustomizeRoute() {
  const config = useConfig();

  if (config.status === 'loading') {
    return (
      <>
        <CustomizeChrome active="hooks" hookCount={0} templateCount={0} onSelect={() => {}} />
        <LoadingSurface label="Loading config…" />
      </>
    );
  }
  if (config.status === 'error') {
    return (
      <>
        <CustomizeChrome active="hooks" hookCount={0} templateCount={0} onSelect={() => {}} />
        <ErrorSurface error={config.error} />
      </>
    );
  }
  return <CustomizeScreen hooks={config.data.hooks} templates={config.data.templates} />;
}
