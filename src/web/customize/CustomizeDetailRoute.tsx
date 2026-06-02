/**
 * Customize detail route (`/customize/:kind/:id`) — Plan 100, Task 5.
 *
 * A deep-linkable editor screen for a single hook or template. It reads the
 * already-shared `useConfig()` resource (no new per-file GET), locates the file
 * by `kind` + `id`, and mounts a theme-aware CodeMirror 6 markdown editor seeded
 * with the file content. A Save button persists edits through `saveConfigFile`.
 *
 * The editor is the one place in the SPA that shows raw, EDITABLE markdown
 * source: it is a distinct rendering boundary from the shared `renderMarkdown` /
 * DOMPurify path and deliberately does not route content through it. No rendered
 * preview is included (out of scope).
 *
 * Loading, error, and not-found (unknown `kind`, or no file matching `id`)
 * states each render a designed surface consistent with the Plan/Task detail
 * routes — never a blank screen or a crash. The header carries a
 * `workspace / config / <kind> / <id>` breadcrumb (last crumb inert), the file's
 * workspace-relative path, and a way back to the listing.
 */

import { useCallback, useEffect, useState } from 'react';
import { Chrome } from '../components/Chrome';
import { Button, StatusPill } from '../components/primitives';
import { ErrorSurface, LoadingSurface } from '../components/StateSurface';
import { useConfig, saveConfigFile, type ConfigFile } from '../data/api';
import { cn } from '../vendor/utils/cn';
import { MarkdownEditor } from './MarkdownEditor';
import { useTheme } from '../theme/ThemeProvider';

/** The two valid config kinds the route accepts. */
type ConfigKind = 'hooks' | 'templates';

const isConfigKind = (k: string): k is ConfigKind => k === 'hooks' || k === 'templates';

/** Shared state-surface layout/type (mirrors `StateSurface`'s `SURFACE`). */
const SURFACE = 'flex items-center gap-3 p-7 font-sans text-sm text-ink-3';

/**
 * The not-found surface, shown when the route's `kind` is not a known config
 * kind or no file matches `id`. Reuses the shared shell vocabulary so it reads
 * as a designed state rather than a crash.
 */
function ConfigNotFound({ kind, id }: { kind: string; id: string }) {
  return (
    <>
      <Chrome
        title="File not found"
        crumbs={['workspace', 'config', { label: 'all', href: '/customize' }, kind, id]}
      />
      <div className={SURFACE} role="alert">
        <StatusPill kind="todo" label="not found" />
        <span>
          No <strong className="text-ink-2">{kind}</strong> file{' '}
          <strong className="text-ink-2">{id}</strong> exists in this workspace.
        </span>
      </div>
    </>
  );
}

/** Inline save feedback states. */
type SaveState =
  | { phase: 'idle' }
  | { phase: 'saving' }
  | { phase: 'saved' }
  | { phase: 'error'; message: string };

/** The loaded editor screen for a resolved hook/template file. */
function LoadedEditor({ kind, file }: { kind: ConfigKind; file: ConfigFile }) {
  const { resolved } = useTheme();

  // The editor's working copy, plus the saved baseline it is diffed against.
  // `dirty` gates the Save button. When the underlying file content changes
  // (a live revalidation re-read, or after a successful save the caller folds
  // in), the baseline is re-seeded so the dirty check stays correct.
  const [value, setValue] = useState(file.content);
  const [baseline, setBaseline] = useState(file.content);
  const [save, setSave] = useState<SaveState>({ phase: 'idle' });

  useEffect(() => {
    setValue(file.content);
    setBaseline(file.content);
    setSave({ phase: 'idle' });
  }, [file.content, file.id]);

  const dirty = value !== baseline;
  const saving = save.phase === 'saving';

  const onSave = useCallback(async () => {
    setSave({ phase: 'saving' });
    try {
      await saveConfigFile(kind, file.id, value);
      // Reset the baseline to the just-saved content so the editor reads clean.
      setBaseline(value);
      setSave({ phase: 'saved' });
    } catch (err) {
      setSave({ phase: 'error', message: err instanceof Error ? err.message : String(err) });
    }
  }, [kind, file.id, value]);

  // Editing after a saved/error message clears the transient feedback.
  const onChange = useCallback((next: string) => {
    setValue(next);
    setSave(prev => (prev.phase === 'idle' || prev.phase === 'saving' ? prev : { phase: 'idle' }));
  }, []);

  const kindLabel = kind === 'hooks' ? 'hook' : 'template';

  return (
    <>
      <Chrome
        titleStyle={{ paddingTop: 18 }}
        title={`${file.id} ${kindLabel}`}
        crumbs={['workspace', 'config', { label: kind, href: '/customize' }, file.id]}
        right={
          <>
            <span
              className={cn(
                'font-sans text-sm',
                // Bold the message when there are unsaved changes so it stands out.
                save.phase === 'idle' && dirty ? 'font-bold' : 'font-normal',
                save.phase === 'error' ? 'text-dalia-deep' : 'text-ink-3'
              )}
            >
              {save.phase === 'saving' && 'saving…'}
              {save.phase === 'saved' && 'saved'}
              {save.phase === 'error' && `save failed: ${save.message}`}
              {save.phase === 'idle' && (dirty ? 'unsaved changes' : 'no changes')}
            </span>
            <Button
              kind="primary"
              size="sm"
              icon="check"
              onClick={dirty && !saving ? onSave : undefined}
            >
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </>
        }
      />
      {file.description && (
        <p className="m-0 px-7 py-3 font-sans text-sm text-ink-3">{file.description}</p>
      )}
      <div className="flex-1 min-h-0 overflow-auto">
        <MarkdownEditor
          value={value}
          onChange={onChange}
          theme={resolved}
          fallback={<LoadingSurface label="Loading editor…" />}
        />
      </div>
    </>
  );
}

/**
 * The route container: reads the shared config resource and renders the
 * loading / error / not-found / editor surfaces (never a blank or a throw).
 */
export function CustomizeDetailRoute({ kind, id }: { kind: string; id: string }) {
  const config = useConfig();

  if (config.status === 'loading') return <LoadingSurface label="Loading config…" />;
  if (config.status === 'error') return <ErrorSurface error={config.error} />;

  if (!isConfigKind(kind)) {
    return <ConfigNotFound kind={kind} id={id} />;
  }
  const list = kind === 'hooks' ? config.data.hooks : config.data.templates;
  const file = list.find(f => f.id === id);
  if (!file) {
    return <ConfigNotFound kind={kind} id={id} />;
  }

  return <LoadedEditor kind={kind} file={file} />;
}
