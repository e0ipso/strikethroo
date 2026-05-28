/**
 * Workspace file watcher for `npx strikethroo serve`.
 *
 * Centralizes change detection behind one small interface so the underlying
 * mechanism can be swapped later without touching call sites. Today it uses a
 * single recursive `fs.watch` over the workspace, feeding a debounce so a burst
 * of rapid writes (editor saves, assistant edits) collapses into one `onChange`
 * call after a short quiet window.
 *
 * Per the plan's portability risk, recursive `fs.watch` may be unreliable on
 * some Linux configurations. If that proves true on a target platform, a tiny
 * watcher dependency can be substituted here as a documented last resort without
 * changing how the server consumes this module. No such dependency is added now.
 *
 * Node built-ins only.
 */

import * as fs from 'fs';

/** A running watcher. Call `close()` to stop watching and clear timers. */
export interface WorkspaceWatcher {
  close(): void;
}

/** Default debounce quiet window, in milliseconds. */
export const DEFAULT_DEBOUNCE_MS = 300;

/**
 * Starts watching `workspaceDir` recursively. `onChange` is invoked once per
 * burst, after `debounceMs` of quiet. Returns a handle whose `close()` stops the
 * watch and clears any pending debounce timer.
 *
 * Watch errors are swallowed (the stream stays usable); they must not crash the
 * server. If `fs.watch` cannot start at all, a no-op watcher is returned.
 */
export const createWorkspaceWatcher = (
  workspaceDir: string,
  onChange: () => void,
  debounceMs: number = DEFAULT_DEBOUNCE_MS
): WorkspaceWatcher => {
  let timer: ReturnType<typeof setTimeout> | null = null;

  const schedule = (): void => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      onChange();
    }, debounceMs);
  };

  let fsWatcher: fs.FSWatcher | null = null;
  try {
    fsWatcher = fs.watch(workspaceDir, { recursive: true }, () => schedule());
    // A watcher error must not crash the process; keep the server alive.
    fsWatcher.on('error', () => {
      /* swallow: watching degrades gracefully */
    });
  } catch {
    fsWatcher = null;
  }

  return {
    close(): void {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      if (fsWatcher) {
        fsWatcher.close();
        fsWatcher = null;
      }
    },
  };
};
