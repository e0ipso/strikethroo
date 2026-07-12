/**
 * Customize section container (Plan 91, Task 002; redesigned Plan 100, Task 04;
 * Config tab added with the workspace config form).
 *
 * The `/customize` route's single feature module. It calls `useConfig()` once
 * at the container level, drives the shared {@link CustomizeChrome} (live tab
 * count badges), owns the `'hooks' | 'templates' | 'config'` tab state, and
 * surfaces the data layer's loading / error states through the shared
 * {@link LoadingSurface} / {@link ErrorSurface} rather than rendering an empty
 * shell.
 *
 * The Hooks and Templates tabs render the same {@link ConfigCardGrid}: a
 * uniform, responsive card grid whose cards link to the editor detail route.
 * The Config tab renders {@link WorkspaceConfigTab}: the structured form over
 * the workspace's generic `config/config.yaml` — the one place the SPA writes
 * that file. All visible workspace paths use `.ai/strikethroo/` naming.
 */

import { useState } from 'react';
import { useConfig, type Config } from '../data/api';
import { ErrorSurface, LoadingSurface } from '../components/StateSurface';
import { CustomizeChrome, type CustomizeTab } from './CustomizeChrome';
import { ConfigCardGrid } from './ConfigCardGrid';
import { WorkspaceConfigTab } from './WorkspaceConfigTab';
import { parseWorkspaceConfig } from './configYaml';

/** Live count of configured execution profiles, for the Config tab badge. */
function profileCount(config: Config): number {
  if (!config.workspace) return 0;
  const parsed = parseWorkspaceConfig(config.workspace.content);
  return parsed.kind === 'parsed' ? parsed.routing.profiles.length : 0;
}

/** The Customize screen body once config has loaded. */
function CustomizeScreen({ config }: { config: Config }) {
  const [tab, setTab] = useState<CustomizeTab>('hooks');
  return (
    <>
      <CustomizeChrome
        active={tab}
        hookCount={config.hooks.length}
        templateCount={config.templates.length}
        profileCount={profileCount(config)}
        onSelect={setTab}
      />
      {tab === 'hooks' && <ConfigCardGrid files={config.hooks} kind="hooks" />}
      {tab === 'templates' && <ConfigCardGrid files={config.templates} kind="templates" />}
      {tab === 'config' && <WorkspaceConfigTab workspace={config.workspace} />}
    </>
  );
}

/** The composed Customize route: chrome + active view, driven by live config. */
export function CustomizeRoute() {
  const config = useConfig();

  if (config.status === 'loading') {
    return (
      <>
        <CustomizeChrome
          active="hooks"
          hookCount={0}
          templateCount={0}
          profileCount={0}
          onSelect={() => {}}
        />
        <LoadingSurface label="Loading config…" />
      </>
    );
  }
  if (config.status === 'error') {
    return (
      <>
        <CustomizeChrome
          active="hooks"
          hookCount={0}
          templateCount={0}
          profileCount={0}
          onSelect={() => {}}
        />
        <ErrorSurface error={config.error} />
      </>
    );
  }
  return <CustomizeScreen config={config.data} />;
}
