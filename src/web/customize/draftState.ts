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
}

export interface DraftFlags {
  dirty: boolean;
  /** The disk differs from the baseline while there are unsaved edits. */
  conflict: boolean;
  /** `conflict`, until the user acknowledges this disk version. */
  conflictVisible: boolean;
}

const diskKey = <D, K>(state: DraftState<D, K>): K | null => state.disk?.key ?? null;

/** A clean editor over `disk`: draft, baseline, and disk all agree. */
export function seedDraft<D, K>(disk: DiskContent<D, K>): DraftState<D, K> {
  return { draft: disk.adopt(), baseline: disk.key, disk, acknowledged: false };
}

export function draftFlags<D, K>(state: DraftState<D, K>, keyOf: (draft: D) => K): DraftFlags {
  const dirty = keyOf(state.draft) !== state.baseline;
  const conflict = dirty && diskKey(state) !== state.baseline;
  return { dirty, conflict, conflictVisible: conflict && !state.acknowledged };
}

/**
 * Folds newly observed disk content in. The same key is a no-op (the same
 * object comes back, so React bails out). A key equal to the baseline only
 * records the disk, which clears a conflict. A clean editor adopts the new
 * content; a dirty one keeps its draft and records the change.
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
  if (!dirty && disk !== null) return seedDraft(disk);
  return { ...state, disk, acknowledged: false };
}

/** Discards the draft for the disk version; a no-op when the disk is unrepresentable. */
export function loadDisk<D, K>(state: DraftState<D, K>): DraftState<D, K> {
  return state.disk ? seedDraft(state.disk) : state;
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
  return { ...state, baseline: submitted.key, disk: submitted, acknowledged: false };
}

/** The user keeps editing over the current disk version; a later change shows again. */
export function acknowledgeDisk<D, K>(state: DraftState<D, K>): DraftState<D, K> {
  return state.acknowledged ? state : { ...state, acknowledged: true };
}
