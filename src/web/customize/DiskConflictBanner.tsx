/**
 * The two recoverable-state banners both config editors render under their
 * header: a disk-change conflict with its confirmed discard, and a failed
 * background re-read. Presentational; the editors own the state transitions.
 */

import { useState } from 'react';
import { Button, Modal } from '../components/primitives';

/** Shared banner geometry/type; the conflict variant adds the accent surface. */
const BANNER =
  'flex flex-wrap items-center gap-3 border-b border-border px-7 py-3 font-sans text-sm';

export function DiskConflictBanner({
  fileLabel,
  canLoad,
  onLoad,
  onKeep,
}: {
  fileLabel: string;
  /** False when the disk version cannot be shown in this editor. */
  canLoad: boolean;
  onLoad: () => void;
  onKeep: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  return (
    <>
      <div
        data-testid="config-disk-conflict"
        role="alert"
        className={`${BANNER} bg-dalia-bg text-ink-2`}
      >
        <span className="min-w-48 flex-1">
          <strong className="text-ink">{fileLabel}</strong> changed on disk while you have unsaved
          edits. Saving overwrites the disk version.
          {!canLoad && ' The disk version cannot be shown in this form.'}
        </span>
        {canLoad && (
          <Button size="sm" onClick={() => setConfirming(true)}>
            Load disk version
          </Button>
        )}
        <Button size="sm" kind="ghost" onClick={onKeep}>
          Keep editing
        </Button>
      </div>
      {confirming && (
        <Modal
          eyebrow="Changed on disk"
          title="Discard your edits?"
          onClose={() => setConfirming(false)}
          actions={
            <>
              <Button onClick={() => setConfirming(false)}>Cancel</Button>
              <Button
                kind="primary"
                onClick={() => {
                  setConfirming(false);
                  onLoad();
                }}
              >
                Discard and load
              </Button>
            </>
          }
        >
          <p>
            Your unsaved changes to <strong>{fileLabel}</strong> will be replaced with the version
            on disk.
          </p>
        </Modal>
      )}
    </>
  );
}

/** A background re-read failed; the draft is kept and the next good read clears this. */
export function RefreshErrorBanner({ error }: { error: Error }) {
  return (
    <div data-testid="config-read-error" role="alert" className={`${BANNER} text-ink-2`}>
      <span className="min-w-48 flex-1">
        Live refresh failed. Your edits are kept; the next successful refresh clears this.
        <span className="ml-2 font-mono text-xs text-ink-4">{error.message}</span>
      </span>
    </div>
  );
}
