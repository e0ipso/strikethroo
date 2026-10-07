/**
 * Draft, baseline, and disk as three separate values for the config editors.
 *
 * `draft` is what the user edits; only a keystroke, an explicit load of the
 * disk version, or a different file may replace it. `baseline` is the key of
 * the content this editor last knew to be persisted: seeded from the first
 * load and advanced only to the exact snapshot a successful save submitted.
 * `disk` is the content most recently observed from the resource. Content is
 * compared through a key `K`: the raw text for the Markdown editor, the
 * serialized YAML for the structured form, so a reparse that serializes
 * identically is not a change.
 *
 * `pending` is the key of the snapshot a save is persisting right now. While
 * it is set, a disk observation is only recorded, never adopted: the save's
 * own write can be observed before its response lands, and adopting it would
 * replace whatever the user typed in between, including a revert to the old
 * baseline, which reads clean against that baseline and is otherwise
 * indistinguishable from an editor with nothing to lose. The pending key is
 * set by `beginSave` and cleared only by `commitSave` or `failSave`.
 *
 * Derived: `dirty = key(draft) !== baseline`; `conflict = dirty && disk !==
 * baseline`. Both editors drive their state through these pure transitions,
 * so a live revalidation cannot reset typing, a slow save cannot swallow edits
 * made while it was in flight, and an identical re-read is a no-op.
 */

/** One observed version of the file: its key, and how to turn it into a draft. */
export interface DiskContent<D, K> {
  key: K;
  adopt: () => D;
}

export interface DraftState<D, K> {
  draft: D;
  baseline: K;
  /** The latest disk content; `null` when this editor cannot represent it. */
  disk: DiskContent<D, K> | null;
  /** True once the user chose to keep editing over the current `disk`. */
  acknowledged: boolean;
  /** The key of the snapshot a save is persisting; `null` between saves. */
  pending: K | null;
}

export interface DraftFlags {
  dirty: boolean;
  /** The disk differs from the baseline while there are unsaved edits. */
  conflict: boolean;
  /**
   * `conflict`, until the user acknowledges this disk version. Never true
   * while a save is pending: the disk may hold that save's own write.
   */
  conflictVisible: boolean;
}

const diskKey = <D, K>(state: DraftState<D, K>): K | null => state.disk?.key ?? null;

/** A clean editor over `disk`: draft, baseline, and disk all agree, and no save is in flight. */
export function seedDraft<D, K>(disk: DiskContent<D, K>): DraftState<D, K> {
  return { draft: disk.adopt(), baseline: disk.key, disk, acknowledged: false, pending: null };
}

export function draftFlags<D, K>(state: DraftState<D, K>, keyOf: (draft: D) => K): DraftFlags {
  const dirty = keyOf(state.draft) !== state.baseline;
  const conflict = dirty && diskKey(state) !== state.baseline;
  return {
    dirty,
    conflict,
    conflictVisible: conflict && !state.acknowledged && state.pending === null,
  };
}

/**
 * Folds newly observed disk content in. The same key is a no-op (the same
 * object comes back, so React bails out). A key equal to the baseline only
 * records the disk, which clears a conflict. A clean editor with no save in
 * flight adopts the new content; a dirty editor, or one whose save is still
 * pending, keeps its draft and records the change.
 */
export function observeDisk<D, K>(
  state: DraftState<D, K>,
  disk: DiskContent<D, K> | null,
  keyOf: (draft: D) => K
): DraftState<D, K> {
  const key = disk?.key ?? null;
  if (key === diskKey(state)) return state;
  if (key === state.baseline) return { ...state, disk, acknowledged: false };
  const dirty = keyOf(state.draft) !== state.baseline;
  if (!dirty && disk !== null && state.pending === null) return seedDraft(disk);
  return { ...state, disk, acknowledged: false };
}

/**
 * Discards the draft for the disk version; a no-op when the disk is
 * unrepresentable. A save still in flight stays pending: only its outcome
 * may clear it.
 */
export function loadDisk<D, K>(state: DraftState<D, K>): DraftState<D, K> {
  return state.disk ? { ...seedDraft(state.disk), pending: state.pending } : state;
}

/** A save of the snapshot keyed `submitted` has been dispatched; its outcome is not yet known. */
export function beginSave<D, K>(state: DraftState<D, K>, submitted: K): DraftState<D, K> {
  return { ...state, pending: submitted };
}

/**
 * Records a successful save of `submitted`. The baseline advances to that
 * exact snapshot, and the disk is known to hold it too, so edits typed while
 * the request was in flight stay in the draft and read as dirty.
 */
export function commitSave<D, K>(
  state: DraftState<D, K>,
  submitted: DiskContent<D, K>
): DraftState<D, K> {
  return {
    ...state,
    baseline: submitted.key,
    disk: submitted,
    acknowledged: false,
    pending: null,
  };
}

/** The save did not persist anything: draft, baseline, and disk are all unchanged. */
export function failSave<D, K>(state: DraftState<D, K>): DraftState<D, K> {
  return state.pending === null ? state : { ...state, pending: null };
}

/** The user keeps editing over the current disk version; a later change shows again. */
export function acknowledgeDisk<D, K>(state: DraftState<D, K>): DraftState<D, K> {
  return state.acknowledged ? state : { ...state, acknowledged: true };
}
