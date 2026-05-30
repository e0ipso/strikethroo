/**
 * Plans command-hint modals (Plan 86, Task 005).
 *
 * The Create modal is a presentational command-hint dialog (it shows the
 * correct current skill invocation with a copy-to-clipboard affordance). The
 * Review modal additionally drives the one non-read action the SPA supports:
 * when the server reports `self-review` installed, its Launch button asks the
 * server to spawn the binary for the plan path; otherwise it degrades to a
 * promo with a download link and no launch button. All are built on the Plan 85
 * `Modal` primitive (the shell is NOT reimplemented here). Every command/path
 * string is a named constant so the Task 006 naming-hygiene grep finds zero
 * legacy `task-manager` / `task-create-plan` strings, and so the copied
 * clipboard text is byte-identical to what is displayed.
 *
 * Source structure: `CreatePlanModal` / `ReviewPlanModal` / `PlanModals` /
 * `useModal` in `scratch/ui/designs/screens-plans.jsx`, with all stale copy
 * (`task-create-plan`, `task-generate-tasks`, `task-refine-plan`, the
 * `.ai/task-manager/` root and em-dash paths) corrected to the current names.
 */

import { useRef, useState, type ReactNode } from 'react';
import { Button, Icon, Modal } from '../components/primitives';
import { planMdPath } from './derive';
import { copyToClipboard } from '../vendor/utils/clipboard';
import { useCapabilities, launchSelfReview } from '../data/api';

/* ---------------------------------------------------------------------------
 * Command / path copy — centralized so the displayed text equals the copied
 * text and the legacy-string grep finds nothing.
 * ------------------------------------------------------------------------- */

/** Default placeholder plan path when no concrete plan path is supplied. */
const PLACEHOLDER_PLAN_PATH = planMdPath({ id: 0, slug: 'slug' }).replace('0--slug', 'NN--slug');

/** The Create-plan example command shown (and copied) in the Create modal. */
const CREATE_COMMAND =
  'st-create-plan Add a Stripe customer-portal webhook with idempotent handling';

/** Builds the self-review command for a given plan path (shown and copied). */
const reviewCommand = (path: string): string => `self-review ${path}`;

/** Where to obtain self-review, linked from the not-installed modal variant. */
const SELF_REVIEW_URL = 'https://github.com/e0ipso/self-review';

/* ---------------------------------------------------------------------------
 * CmdCopyButton — the in-terminal copy affordance. A real <button> so it has
 * native hover/active/focus feedback and keyboard support, with a transient
 * "Copied!" confirmation after a successful write.
 * ------------------------------------------------------------------------- */

/** Inline copy button for a `.modal__cmd` block; confirms the copy briefly. */
function CmdCopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  const onClick = () => {
    void copyToClipboard(value).then((ok: boolean) => {
      if (!ok) return;
      setCopied(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <button
      type="button"
      className={`modal__cmd-copy${copied ? ' modal__cmd-copy--copied' : ''}`}
      onClick={onClick}
      aria-label={copied ? 'Copied to clipboard' : 'Copy command to clipboard'}
    >
      <Icon name={copied ? 'check' : 'copy'} size={11} />
      {copied ? 'copied' : 'copy'}
    </button>
  );
}

/* ---------------------------------------------------------------------------
 * useModal — mirrors the design's hook contract.
 * ------------------------------------------------------------------------- */

/** The open modal descriptor, or `null` when no modal is open. */
export type ModalState = { kind: 'create' } | { kind: 'review'; path: string } | null;

/** The modal-state handles shared across the Plans views and route container. */
export interface UseModalResult {
  modal: ModalState;
  openCreate: () => void;
  openReview: (path: string) => void;
  close: () => void;
}

/** Holds the Plans section's modal state: create / review(path) / close. */
export function useModal(init: ModalState = null): UseModalResult {
  const [modal, setModal] = useState<ModalState>(init);
  return {
    modal,
    openCreate: () => setModal({ kind: 'create' }),
    openReview: (path: string) => setModal({ kind: 'review', path }),
    close: () => setModal(null),
  };
}

/* ---------------------------------------------------------------------------
 * Create plan modal
 * ------------------------------------------------------------------------- */

/** Presentational hint dialog explaining how to create a plan from the assistant. */
export function CreatePlanModal({ onClose }: { onClose: () => void }) {
  return (
    <Modal
      eyebrow="New plan"
      title="Start a plan in your assistant"
      onClose={onClose}
      actions={
        <>
          <Button
            kind="outline"
            size="sm"
            icon="copy"
            onClick={() => copyToClipboard(CREATE_COMMAND)}
          >
            Copy command
          </Button>
          <Button kind="primary" size="sm" onClick={onClose}>
            Got it
          </Button>
        </>
      }
    >
      <p style={{ margin: 0 }}>
        Plans aren&apos;t created from this app — they&apos;re produced by the{' '}
        <span className="chip">st-create-plan</span> skill running inside your AI assistant.
        Describe the work order and the skill writes a <span className="chip">plan.md</span> to your
        workspace.
      </p>

      <div className="label label--dalia" style={{ marginTop: 18, marginBottom: 6 }}>
        Example — in your assistant
      </div>
      <div className="modal__cmd">
        <span className="modal__cmd-prompt">›</span>
        <span>
          <span className="modal__cmd-cmd">st-create-plan</span> Add a Stripe customer-portal
          webhook with idempotent handling
        </span>
        <CmdCopyButton value={CREATE_COMMAND} />
      </div>

      <p className="modal__hint">
        The plan lands at{' '}
        <span className="chip">.ai/strikethroo/plans/NN--slug/plan-NN--slug.md</span> and appears
        here. Review and edit it before running <span className="chip">st-generate-tasks</span>.
      </p>
    </Modal>
  );
}

/* ---------------------------------------------------------------------------
 * Review plan modal
 * ------------------------------------------------------------------------- */

/**
 * Plan-review dialog. Its shape depends on whether the server reports the
 * `self-review` binary as installed:
 *
 *  - installed → a launcher: the "Launch self-review" button asks the server to
 *    spawn `self-review <planPath>` and closes on success; the terminal command
 *    stays as a copyable fallback.
 *  - not installed → a promo: what self-review is good for plus a download link,
 *    with no launch button (it could not succeed) and no terminal command.
 *
 * While availability is still loading — or if the probe itself errors — the
 * launcher variant renders without the button, so the button only ever appears
 * once availability is confirmed.
 */
export function ReviewPlanModal({ path, onClose }: { path?: string; onClose: () => void }) {
  const planPath = path || PLACEHOLDER_PLAN_PATH;
  const caps = useCapabilities();

  if (caps.status === 'data' && !caps.data.selfReview) {
    return <ReviewPlanUnavailable onClose={onClose} />;
  }

  const available = caps.status === 'data' && caps.data.selfReview;
  return <ReviewPlanLauncher planPath={planPath} available={available} onClose={onClose} />;
}

/** The launcher variant: terminal command plus a functional Launch button. */
function ReviewPlanLauncher({
  planPath,
  available,
  onClose,
}: {
  planPath: string;
  available: boolean;
  onClose: () => void;
}) {
  const command = reviewCommand(planPath);
  const [launching, setLaunching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onLaunch = () => {
    setLaunching(true);
    setError(null);
    void launchSelfReview(planPath).then(result => {
      if (result.ok) {
        onClose();
        return;
      }
      setLaunching(false);
      setError(result.error ?? 'Failed to launch self-review.');
    });
  };

  return (
    <Modal
      eyebrow="Review plan"
      title="Review this plan before tasks are generated"
      onClose={onClose}
      actions={
        available ? (
          <Button kind="dalia" size="sm" icon="review" onClick={launching ? undefined : onLaunch}>
            {launching ? 'Launching…' : 'Launch self-review'}
          </Button>
        ) : undefined
      }
    >
      <p style={{ margin: 0 }}>
        Open the plan in{' '}
        <a
          href={SELF_REVIEW_URL}
          target="_blank"
          rel="noreferrer"
          style={{ color: 'var(--dalia-dark)' }}
        >
          self-review
        </a>{' '}
        — a local desktop reviewer. Read the rendered markdown, leave inline comments on specific
        sections, and it writes structured XML you can hand back to your assistant.
      </p>

      <div className="label label--dalia" style={{ marginTop: 18, marginBottom: 6 }}>
        Run in your terminal
      </div>
      <div className="modal__cmd">
        <span className="modal__cmd-prompt">$</span>
        <span
          style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            minWidth: 0,
            flex: 1,
          }}
        >
          <span className="modal__cmd-cmd">self-review</span> {planPath}
        </span>
        <CmdCopyButton value={command} />
      </div>

      {error != null && (
        <p className="modal__hint" role="alert" style={{ color: 'var(--danger, #c0392b)' }}>
          {error}
        </p>
      )}

      <p className="modal__hint">
        When the review window closes, feed the resulting <span className="chip">review.xml</span>{' '}
        back to your assistant (e.g. via <span className="chip">st-refine-plan</span>) and then run{' '}
        <span className="chip">st-generate-tasks</span>.
      </p>
    </Modal>
  );
}

/** The not-installed variant: what self-review offers plus a download link. */
function ReviewPlanUnavailable({ onClose }: { onClose: () => void }) {
  return (
    <Modal
      eyebrow="Review plan"
      title="Review plans locally with self-review"
      onClose={onClose}
      actions={
        <>
          <Button kind="outline" size="sm" onClick={onClose}>
            Close
          </Button>
          <a
            className="btn btn--dalia btn--sm"
            href={SELF_REVIEW_URL}
            target="_blank"
            rel="noreferrer"
          >
            <Icon name="arrow" size={13} style={{ marginLeft: -2 }} />
            Get self-review
          </a>
        </>
      }
    >
      <p style={{ margin: 0 }}>
        <a
          href={SELF_REVIEW_URL}
          target="_blank"
          rel="noreferrer"
          style={{ color: 'var(--dalia-dark)' }}
        >
          self-review
        </a>{' '}
        is a local desktop reviewer for your plans. It renders the plan markdown, lets you leave
        inline comments on specific sections, and writes structured{' '}
        <span className="chip">review.xml</span> you can hand straight back to your assistant — a
        tighter feedback loop than reviewing in a terminal or editor.
      </p>

      <p className="modal__hint">
        It isn&apos;t on your <span className="chip">PATH</span> yet. Install it, then re-open this
        dialog to launch a review directly from here. Once you have a{' '}
        <span className="chip">review.xml</span>, feed it back via{' '}
        <span className="chip">st-refine-plan</span> and run{' '}
        <span className="chip">st-generate-tasks</span>.
      </p>
    </Modal>
  );
}

/* ---------------------------------------------------------------------------
 * Dispatcher
 * ------------------------------------------------------------------------- */

/** Renders the modal matching `modal.kind`, or nothing when closed. */
export function PlanModals({
  modal,
  onClose,
}: {
  modal: ModalState;
  onClose: () => void;
}): ReactNode {
  if (!modal) return null;
  if (modal.kind === 'create') return <CreatePlanModal onClose={onClose} />;
  return <ReviewPlanModal path={modal.path} onClose={onClose} />;
}
