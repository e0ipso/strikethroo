/**
 * Unit tests for the config editors' draft model (`draftState.ts`): the pure
 * transitions both the Markdown editor and the structured form drive their
 * state through. Focus: a save in flight must not let a disk observation
 * replace the draft, so a revert to the old baseline typed during the save
 * survives the save's own write being observed before its response (plan 2,
 * F06). The browser wiring is covered in `customize-screen.e2e.test.ts`.
 */

import { describe, it, expect } from 'vitest';
import {
  acknowledgeDisk,
  beginSave,
  commitSave,
  draftFlags,
  failSave,
  loadDisk,
  observeDisk,
  seedDraft,
  type DiskContent,
} from '../draftState';

const identity = (content: string): string => content;
const text = (content: string): DiskContent<string, string> => ({
  key: content,
  adopt: () => content,
});

const original = '# hook\n\noriginal\n';
const submitted = '# hook\n\noriginal\nsubmitted\n';
const other = '# hook\n\nsomeone else\n';

describe('draftState: a save in flight', () => {
  it("keeps a draft reverted to the old baseline when the save's own write is observed before its response", () => {
    // Seeded clean; the user types `submitted` and presses Save.
    let state = seedDraft(text(original));
    state = { ...state, draft: submitted };
    state = beginSave(state, submitted);

    // Before the response arrives the user reverts to the original text. The
    // draft now reads clean against the old baseline, which is exactly the
    // state a disk observation used to adopt over.
    state = { ...state, draft: original };
    expect(draftFlags(state, identity).dirty).toBe(false);
    state = observeDisk(state, text(submitted), identity);
    expect(state.draft).toBe(original);
    expect(state.disk?.key).toBe(submitted);

    // The PUT response lands: the baseline advances to the submission, and the
    // revert is an edit made since that submission, so it stays and reads dirty.
    state = commitSave(state, text(submitted));
    expect(state.draft).toBe(original);
    expect(state.baseline).toBe(submitted);
    expect(state.pending).toBeNull();
    expect(draftFlags(state, identity)).toEqual({
      dirty: true,
      conflict: false,
      conflictVisible: false,
    });
  });

  it('records a disk change while pending without surfacing it, then surfaces it when the save fails', () => {
    // Someone else writes the file while the save is in flight and the user
    // keeps typing: the draft stays, the disk is recorded, the banner waits.
    let state = beginSave({ ...seedDraft(text(original)), draft: submitted }, submitted);
    state = { ...state, draft: `${submitted}more\n` };
    state = observeDisk(state, text(other), identity);
    expect(state.draft).toBe(`${submitted}more\n`);
    expect(state.disk?.key).toBe(other);
    expect(draftFlags(state, identity)).toEqual({
      dirty: true,
      conflict: true,
      conflictVisible: false,
    });

    // Nothing was persisted, so the baseline is still the original and the
    // conflict against it is real: it shows now. Failing twice is a no-op.
    const failed = failSave(state);
    expect(failed.pending).toBeNull();
    expect(failed.draft).toBe(state.draft);
    expect(failed.baseline).toBe(original);
    expect(draftFlags(failed, identity).conflictVisible).toBe(true);
    expect(failSave(failed)).toBe(failed);
  });

  it('keeps a newer disk observation when a delayed save response lands', () => {
    // Disk and baseline are the original; the user saves `submitted`.
    let state = beginSave({ ...seedDraft(text(original)), draft: submitted }, submitted);
    // The server writes it and a revalidation observes that write.
    state = observeDisk(state, text(submitted), identity);
    // The user keeps typing, then another writer saves `other`.
    state = { ...state, draft: `${submitted}more\n` };
    state = observeDisk(state, text(other), identity);

    // The success response only now arrives. The disk still holds `other`.
    state = commitSave(state, text(submitted));
    expect(state.baseline).toBe(submitted);
    expect(state.disk?.key).toBe(other);
    expect(draftFlags(state, identity)).toEqual({
      dirty: true,
      conflict: true,
      conflictVisible: true,
    });
    // An identical re-read of `other` is a no-op that leaves the conflict standing.
    expect(observeDisk(state, text(other), identity)).toBe(state);
  });

  it('treats a disk observed before the save as overwritten by it', () => {
    // The user saves over a conflict: the disk already held `other`.
    let state = observeDisk(
      { ...seedDraft(text(original)), draft: submitted },
      text(other),
      identity
    );
    state = beginSave(state, submitted);
    state = commitSave(state, text(submitted));
    expect(state.disk?.key).toBe(submitted);
    expect(draftFlags(state, identity)).toEqual({
      dirty: false,
      conflict: false,
      conflictVisible: false,
    });
  });

  it('leaves the rules for an editor with no save in flight unchanged', () => {
    // A clean editor adopts new disk content.
    const clean = seedDraft(text(original));
    const adopted = observeDisk(clean, text(other), identity);
    expect(adopted.draft).toBe(other);
    expect(adopted.baseline).toBe(other);
    expect(adopted.pending).toBeNull();

    // An identical observation is the same object.
    expect(observeDisk(adopted, text(other), identity)).toBe(adopted);

    // A dirty editor keeps its draft and reports the conflict until acknowledged.
    const conflicted = observeDisk({ ...clean, draft: submitted }, text(other), identity);
    expect(conflicted.draft).toBe(submitted);
    expect(draftFlags(conflicted, identity)).toEqual({
      dirty: true,
      conflict: true,
      conflictVisible: true,
    });
    expect(draftFlags(acknowledgeDisk(conflicted), identity).conflictVisible).toBe(false);

    // Loading the disk version discards the draft; it does not forget a pending save.
    expect(loadDisk(conflicted).draft).toBe(other);
    expect(loadDisk(beginSave(conflicted, submitted)).pending).toBe(submitted);
  });
});
