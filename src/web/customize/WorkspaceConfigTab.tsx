/**
 * Customize → Config tab: the structured form over the workspace's generic
 * `config/config.yaml`.
 *
 * config.yaml is the single structured configuration file of a workspace —
 * every configurable feature claims one top-level section in it instead of
 * shipping its own YAML file. This tab is the web app's UI for setting that
 * file up: it frames the whole file, and renders one form section per feature
 * section it understands (today: `execution_routing`). Populating the form is
 * a manual process; the form serializes back through the single
 * {@link parseWorkspaceConfig}/{@link serializeWorkspaceConfig} boundary,
 * which preserves foreign top-level sections structurally (comments are not
 * preserved — the file header and this UI both say so).
 *
 * Safety: when the routing section exists but has a shape the form cannot
 * represent, the tab shows why and refuses a form save instead of silently
 * rewriting content it would destroy.
 */

import { useCallback, useMemo, useState } from 'react';
import { Button, Chip } from '../components/primitives';
import { saveConfigFile, type ConfigFile } from '../data/api';
import { cn } from '../vendor/utils/cn';
import { SUPPORTED_HARNESSES } from '../../types';
import {
  parseWorkspaceConfig,
  serializeWorkspaceConfig,
  validateRoutingForm,
  type RoutingForm,
  type RoutingProfileForm,
  type RoutingTargetForm,
} from './configYaml';

// Shared field styling WITHOUT a width — width is context-dependent, so each
// usage supplies its own (`w-full`, a fixed `w-*`, or `flex-1`). Baking a width
// into this constant collides with the per-field width classes (clsx merely
// concatenates; it does not resolve Tailwind conflicts), letting the wrong one
// win in the generated CSS.
const FIELD =
  'rounded-md bg-cream-mid px-2.5 py-1.5 font-sans text-sm text-ink ring-1 ring-inset ring-border-soft outline-none focus:bg-cream focus:ring-2 focus:ring-ink placeholder:text-ink-3';

const EMPTY_TARGET: RoutingTargetForm = { model: '', harness: '', reasoningEffort: '' };

const EMPTY_PROFILE: RoutingProfileForm = {
  name: '',
  description: '',
  targets: [{ ...EMPTY_TARGET }],
};

/** Inline save feedback states (mirrors the detail editor's vocabulary). */
type SaveState =
  | { phase: 'idle' }
  | { phase: 'saving' }
  | { phase: 'saved' }
  | { phase: 'error'; message: string };

/** Moves `array[index]` by `delta`, returning a new array (no-op when out of range). */
function move<T>(array: T[], index: number, delta: number): T[] {
  const target = index + delta;
  if (target < 0 || target >= array.length) return array;
  const next = [...array];
  const [item] = next.splice(index, 1);
  next.splice(target, 0, item as T);
  return next;
}

/** One editable target row: harness, exact model, optional reasoning effort. */
function TargetRow({
  target,
  index,
  count,
  onChange,
  onMove,
  onRemove,
}: {
  target: RoutingTargetForm;
  index: number;
  count: number;
  onChange: (next: RoutingTargetForm) => void;
  onMove: (delta: number) => void;
  onRemove: () => void;
}) {
  return (
    <div data-testid="routing-target-row" className="flex items-center gap-2">
      <span className="w-5 shrink-0 text-right font-mono text-xs text-ink-3">{index + 1}.</span>
      <select
        data-testid="routing-target-harness"
        aria-label="Harness"
        className={cn(FIELD, 'w-40 shrink-0 cursor-pointer')}
        value={target.harness}
        onChange={e => onChange({ ...target, harness: e.target.value })}
      >
        <option value="">current harness</option>
        {SUPPORTED_HARNESSES.map(harness => (
          <option key={harness} value={harness}>
            {harness}
          </option>
        ))}
      </select>
      <input
        data-testid="routing-target-model"
        aria-label="Exact model identifier"
        className={cn(FIELD, 'min-w-0 flex-1 font-mono')}
        type="text"
        placeholder="exact-model-id (copied verbatim)"
        value={target.model}
        onChange={e => onChange({ ...target, model: e.target.value })}
      />
      <input
        data-testid="routing-target-effort"
        aria-label="Reasoning effort (optional)"
        className={cn(FIELD, 'w-36 shrink-0 font-mono')}
        type="text"
        placeholder="effort (opt.)"
        value={target.reasoningEffort}
        onChange={e => onChange({ ...target, reasoningEffort: e.target.value })}
      />
      <div className="flex shrink-0 items-center gap-1 font-mono text-xs">
        <button
          type="button"
          aria-label="Move target up"
          className="rounded px-1.5 py-1 text-ink-3 ring-1 ring-border-soft hover:text-ink disabled:opacity-30"
          disabled={index === 0}
          onClick={() => onMove(-1)}
        >
          ↑
        </button>
        <button
          type="button"
          aria-label="Move target down"
          className="rounded px-1.5 py-1 text-ink-3 ring-1 ring-border-soft hover:text-ink disabled:opacity-30"
          disabled={index === count - 1}
          onClick={() => onMove(1)}
        >
          ↓
        </button>
        <button
          type="button"
          aria-label="Remove target"
          className="rounded px-1.5 py-1 text-ink-3 ring-1 ring-border-soft hover:text-ink"
          onClick={onRemove}
        >
          ✕
        </button>
      </div>
    </div>
  );
}

/** One editable profile card: name, LLM-facing description, ordered targets. */
function ProfileCard({
  profile,
  onChange,
  onRemove,
}: {
  profile: RoutingProfileForm;
  onChange: (next: RoutingProfileForm) => void;
  onRemove: () => void;
}) {
  return (
    <div
      data-testid="routing-profile-card"
      className="flex flex-col gap-3 rounded-card bg-cream p-4 ring-1 ring-border-soft"
    >
      <div className="flex items-center gap-2">
        <input
          data-testid="routing-profile-name"
          aria-label="Profile name"
          className={cn(FIELD, 'w-full max-w-60 font-mono font-medium')}
          type="text"
          placeholder="profile-name"
          value={profile.name}
          onChange={e => onChange({ ...profile, name: e.target.value })}
        />
        <span className="flex-1" />
        <button
          type="button"
          data-testid="routing-remove-profile"
          className="rounded px-2 py-1 font-sans text-xs text-ink-3 ring-1 ring-border-soft hover:text-ink"
          onClick={onRemove}
        >
          Remove profile
        </button>
      </div>
      <textarea
        data-testid="routing-profile-description"
        aria-label="Profile description"
        className={cn(FIELD, 'w-full min-h-16 resize-y leading-relaxed')}
        placeholder="When does this profile apply? Describe the kind of work, its risk, and its complexity — the task-generation LLM classifies tasks against this text."
        value={profile.description}
        onChange={e => onChange({ ...profile, description: e.target.value })}
      />
      <div className="flex flex-col gap-2">
        <div className="font-sans text-xs font-medium text-ink-3">
          Dispatch targets — ordered by priority; the first non-avoided target is the default
        </div>
        {profile.targets.map((target, index) => (
          <TargetRow
            key={index}
            target={target}
            index={index}
            count={profile.targets.length}
            onChange={next =>
              onChange({
                ...profile,
                targets: profile.targets.map((t, i) => (i === index ? next : t)),
              })
            }
            onMove={delta => onChange({ ...profile, targets: move(profile.targets, index, delta) })}
            onRemove={() =>
              onChange({ ...profile, targets: profile.targets.filter((_, i) => i !== index) })
            }
          />
        ))}
        <div>
          <Button
            size="sm"
            icon="plus"
            onClick={() =>
              onChange({ ...profile, targets: [...profile.targets, { ...EMPTY_TARGET }] })
            }
          >
            Add target
          </Button>
        </div>
      </div>
    </div>
  );
}

/** The loaded form over a parsed config.yaml. Re-mount (via key) re-seeds it. */
function ConfigForm({
  file,
  document,
  initial,
}: {
  file: ConfigFile;
  document: Record<string, unknown>;
  initial: RoutingForm;
}) {
  const [routing, setRouting] = useState<RoutingForm>(initial);
  const [save, setSave] = useState<SaveState>({ phase: 'idle' });
  const [baseline, setBaseline] = useState(initial);

  const dirty = JSON.stringify(routing) !== JSON.stringify(baseline);
  const errors = useMemo(() => validateRoutingForm(routing), [routing]);
  const saving = save.phase === 'saving';

  const update = useCallback((next: RoutingForm) => {
    setRouting(next);
    setSave(prev => (prev.phase === 'idle' || prev.phase === 'saving' ? prev : { phase: 'idle' }));
  }, []);

  const onSave = useCallback(async () => {
    if (errors.length > 0 || saving || !dirty) return;
    setSave({ phase: 'saving' });
    try {
      await saveConfigFile('workspace', file.id, serializeWorkspaceConfig(document, routing));
      setBaseline(routing);
      setSave({ phase: 'saved' });
    } catch (err) {
      setSave({ phase: 'error', message: err instanceof Error ? err.message : String(err) });
    }
  }, [errors.length, saving, dirty, file.id, document, routing]);

  return (
    <div data-testid="workspace-config-form" className="flex flex-col gap-5 p-7">
      <div className="max-w-3xl font-sans text-sm leading-relaxed text-ink-2">
        <p>
          <Chip>{file.relPath}</Chip> is the workspace&apos;s single structured configuration file:
          every configurable feature claims one top-level section in it. This form edits the
          sections it understands and preserves the rest; saving rewrites the file, so hand-written
          comments are not kept.
        </p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-lg font-semibold text-ink">Execution routing</h2>
        <p className="max-w-3xl font-sans text-sm leading-relaxed text-ink-2">
          During task generation every task is classified into one of these profiles by its
          description. The profile is saved with the task; immediately before each delegation, one
          complete target is selected from that profile. Rejected targets join the task&apos;s avoid
          set before another selection attempt. With no profiles, routing is off.
        </p>

        {routing.profiles.map((profile, index) => (
          <ProfileCard
            key={index}
            profile={profile}
            onChange={next =>
              update({
                ...routing,
                profiles: routing.profiles.map((p, i) => (i === index ? next : p)),
              })
            }
            onRemove={() =>
              update({ ...routing, profiles: routing.profiles.filter((_, i) => i !== index) })
            }
          />
        ))}
        <div>
          <Button
            icon="plus"
            onClick={() =>
              update({
                ...routing,
                profiles: [
                  ...routing.profiles,
                  { ...EMPTY_PROFILE, targets: [{ ...EMPTY_TARGET }] },
                ],
              })
            }
          >
            Add profile
          </Button>
        </div>

        <label className="mt-2 flex max-w-3xl flex-col gap-1.5 font-sans text-sm text-ink-2">
          <span className="font-medium text-ink">Custom dispatch selector script (optional)</span>
          <input
            data-testid="routing-resolver"
            className={cn(FIELD, 'w-full font-mono')}
            type="text"
            placeholder="./scripts/select-execution-target.cjs"
            value={routing.resolverScript}
            onChange={e => update({ ...routing, resolverScript: e.target.value })}
          />
          <span className="text-xs text-ink-3">
            One repository-relative script for the whole configuration. At each selection attempt it
            receives one task, all complete targets for its profile, and the accumulated avoid set,
            then returns one non-avoided target identifier. It never reclassifies tasks. Leave empty
            to use the first non-avoided target in configured order.
          </span>
        </label>
      </section>

      {dirty && errors.length > 0 && (
        <ul
          data-testid="workspace-config-errors"
          role="alert"
          className="max-w-3xl list-disc rounded-card bg-cream-mid p-4 pl-8 font-sans text-sm text-ink-2 ring-1 ring-border-soft"
        >
          {errors.map((error, i) => (
            <li key={i}>{error}</li>
          ))}
        </ul>
      )}

      <div className="flex items-center gap-3">
        <Button kind="primary" onClick={onSave}>
          Save configuration
        </Button>
        <span
          data-testid="workspace-config-status"
          className={cn(
            'font-sans text-sm text-ink-3',
            dirty && save.phase === 'idle' && 'font-semibold text-ink-2'
          )}
          role={save.phase === 'error' ? 'alert' : undefined}
        >
          {save.phase === 'saving' && 'Saving…'}
          {save.phase === 'saved' && !dirty && 'Saved.'}
          {save.phase === 'error' && `Save failed: ${save.message}`}
          {save.phase === 'idle' &&
            dirty &&
            (errors.length > 0 ? 'Fix the issues above to save.' : 'Unsaved changes.')}
        </span>
      </div>
    </div>
  );
}

/** The Config tab body: resolves the file into the form or a designed state. */
export function WorkspaceConfigTab({ workspace }: { workspace: ConfigFile | null }) {
  if (!workspace) {
    return (
      <div className="p-7 font-sans text-sm text-ink-3" role="alert">
        No <Chip>config/config.yaml</Chip> exists in this workspace. Re-run{' '}
        <Chip>npx strikethroo init</Chip> to create it.
      </div>
    );
  }

  const parsed = parseWorkspaceConfig(workspace.content);
  if (parsed.kind === 'unsupported') {
    return (
      <div className="flex max-w-3xl flex-col gap-2 p-7 font-sans text-sm text-ink-2" role="alert">
        <p>
          This form cannot safely edit the current <Chip>{workspace.relPath}</Chip>:{' '}
          {parsed.message}
        </p>
        <p className="text-ink-3">
          Edit the file directly on the filesystem; the form refuses to rewrite content it cannot
          represent.
        </p>
      </div>
    );
  }

  // Keyed on content so a live revalidation (or external edit) re-seeds the form.
  return (
    <ConfigForm
      key={workspace.content}
      file={workspace}
      document={parsed.document}
      initial={parsed.routing}
    />
  );
}
