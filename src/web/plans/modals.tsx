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
import { Button, Chip, Icon, Modal } from '../components/primitives';
import { planMdPath } from './derive';
import { cn } from '../vendor/utils/cn';
import { copyToClipboard } from '../vendor/utils/clipboard';
import { useCapabilities, launchSelfReview, archivePlan } from '../data/api';

/* ---------------------------------------------------------------------------
 * Modal-body utility vocabulary (Plan 102). These are the command-hint block
 * and label/hint treatments the Modal primitive does not own — ported from
 * the vendored `.modal__cmd*` / `.label--dalia` / `.modal__hint` rules. The
 * command block is an always-dark terminal surface (`bg-deep`); its body text
 * re-lights to `--ink` in dark (the `.dark .modal__cmd` fixup).
 * ------------------------------------------------------------------------- */

/** Eyebrow label above a command block (`.label.label--dalia`). */
const MODAL_LABEL = 'font-sans text-base font-semibold uppercase tracking-widest text-dalia-dark';

/** The terminal command block container (`.modal__cmd`). */
const MODAL_CMD =
  'relative mt-2 flex items-center gap-2.5 rounded-lg bg-deep px-4 py-3.5 font-mono text-base text-cream dark:text-ink';

/** The prompt glyph + the highlighted command word (`.modal__cmd-prompt/-cmd`). */
const MODAL_CMD_PROMPT = 'select-none text-dalia';
const MODAL_CMD_CMD = 'font-medium text-dalia';

/** The trailing hint paragraph (`.modal__hint`). */
const MODAL_HINT = 'mt-4 text-base leading-normal text-ink-3';

/** The danger-coloured inline error paragraph. */
const MODAL_ERROR = cn(MODAL_HINT, 'text-danger');

/** A dalia link rendered inside modal prose. */
const MODAL_LINK = 'text-dalia-dark';

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

/** The in-terminal copy affordance utilities (`.modal__cmd-copy`). */
const MODAL_CMD_COPY =
  'ml-auto inline-flex items-center gap-1.5 rounded border-0 bg-white/5 px-2 py-1 font-[inherit] text-sm text-deep-3 cursor-pointer transition-[background,color,transform] duration-100 hover:bg-white/15 hover:text-cream focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dalia active:scale-95 active:bg-white/20';
/** The transient post-copy confirmation state (`.modal__cmd-copy--copied`). */
const MODAL_CMD_COPY_COPIED = 'text-dalia bg-white/10 hover:text-dalia hover:bg-white/10';

/** Inline copy button for a command block; confirms the copy briefly. */
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
      className={cn(MODAL_CMD_COPY, copied && MODAL_CMD_COPY_COPIED)}
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
export type ModalState =
  | { kind: 'create' }
  | { kind: 'review'; path: string }
  | { kind: 'archive'; id: number; title: string }
  | null;

/** The modal-state handles shared across the Plans views and route container. */
export interface UseModalResult {
  modal: ModalState;
  openCreate: () => void;
  openReview: (path: string) => void;
  openArchive: (id: number, title: string) => void;
  close: () => void;
}

/** Holds the Plans section's modal state: create / review(path) / archive / close. */
export function useModal(init: ModalState = null): UseModalResult {
  const [modal, setModal] = useState<ModalState>(init);
  return {
    modal,
    openCreate: () => setModal({ kind: 'create' }),
    openReview: (path: string) => setModal({ kind: 'review', path }),
    openArchive: (id: number, title: string) => setModal({ kind: 'archive', id, title }),
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
      <p className="m-0">
        Plans aren&apos;t created from this app — they&apos;re produced by the{' '}
        <Chip>st-create-plan</Chip> skill running inside your AI assistant. Describe the work order
        and the skill writes a <Chip>plan.md</Chip> to your workspace.
      </p>

      <div className={cn(MODAL_LABEL, 'mt-5 mb-1.5')}>Example — in your assistant</div>
      <div className={MODAL_CMD}>
        <span className={MODAL_CMD_PROMPT}>›</span>
        <span>
          <span className={MODAL_CMD_CMD}>st-create-plan</span> Add a Stripe customer-portal webhook
          with idempotent handling
        </span>
        <CmdCopyButton value={CREATE_COMMAND} />
      </div>

      <p className={MODAL_HINT}>
        The plan lands at <Chip>.ai/strikethroo/plans/NN--slug/plan-NN--slug.md</Chip> and appears
        here. Review and edit it before running <Chip>st-generate-tasks</Chip>.
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
      <p className="m-0">
        Open the plan in{' '}
        <a href={SELF_REVIEW_URL} target="_blank" rel="noreferrer" className={MODAL_LINK}>
          self-review
        </a>{' '}
        — a local desktop reviewer. Read the rendered markdown, leave inline comments on specific
        sections, and it writes structured XML you can hand back to your assistant.
      </p>

      <div className={cn(MODAL_LABEL, 'mt-5 mb-1.5')}>Run in your terminal</div>
      <div className={MODAL_CMD}>
        <span className={MODAL_CMD_PROMPT}>$</span>
        <span className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
          <span className={MODAL_CMD_CMD}>self-review</span> {planPath}
        </span>
        <CmdCopyButton value={command} />
      </div>

      {error != null && (
        <p className={MODAL_ERROR} role="alert">
          {error}
        </p>
      )}

      <p className={MODAL_HINT}>
        When the review window closes, feed the resulting <Chip>review.xml</Chip> back to your
        assistant (e.g. via <Chip>st-refine-plan</Chip>) and then run <Chip>st-generate-tasks</Chip>
        .
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
            className={cn(
              // dalia + sm button surface, rendered on an <a> (mirrors Button)
              'inline-flex items-center gap-2 rounded-md px-2.5 py-1.5 font-sans text-sm font-medium whitespace-nowrap border-0 cursor-pointer transition-[transform,box-shadow] duration-150 ease-out',
              'bg-dalia-dark text-cream shadow-sm'
            )}
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
      <p className="m-0">
        <a href={SELF_REVIEW_URL} target="_blank" rel="noreferrer" className={MODAL_LINK}>
          self-review
        </a>{' '}
        is a local desktop reviewer for your plans. It renders the plan markdown, lets you leave
        inline comments on specific sections, and writes structured <Chip>review.xml</Chip> you can
        hand straight back to your assistant — a tighter feedback loop than reviewing in a terminal
        or editor.
      </p>

      <p className={MODAL_HINT}>
        It isn&apos;t on your <Chip>PATH</Chip> yet. Install it, then re-open this dialog to launch
        a review directly from here. Once you have a <Chip>review.xml</Chip>, feed it back via{' '}
        <Chip>st-refine-plan</Chip> and run <Chip>st-generate-tasks</Chip>.
      </p>
    </Modal>
  );
}

/* ---------------------------------------------------------------------------
 * Archive plan modal
 * ------------------------------------------------------------------------- */

/**
 * Confirmation dialog for the SPA's one sanctioned workspace mutation: moving a
 * `done` plan's directory from `plans/` to `archive/`. Confirming issues
 * `POST /api/plans/:id/archive`; on success the dialog closes and the live SSE
 * revalidation drops the plan from the list and surfaces it under Archive. On
 * failure the server's message is shown and the dialog stays open — the
 * workspace is left untouched. Cancelling sends no request.
 */
export function ArchivePlanModal({
  id,
  title,
  onClose,
}: {
  id: number;
  title: string;
  onClose: () => void;
}) {
  const [archiving, setArchiving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onConfirm = () => {
    setArchiving(true);
    setError(null);
    void archivePlan(id).then(result => {
      if (result.ok) {
        onClose();
        return;
      }
      setArchiving(false);
      setError(result.error ?? 'Failed to archive plan.');
    });
  };

  return (
    <Modal
      eyebrow="Archive plan"
      title="Move this plan to the archive"
      onClose={onClose}
      actions={
        <>
          <Button kind="outline" size="sm" onClick={archiving ? undefined : onClose}>
            Cancel
          </Button>
          <Button
            kind="primary"
            size="sm"
            icon="archive"
            onClick={archiving ? undefined : onConfirm}
          >
            {archiving ? 'Archiving…' : 'Archive plan'}
          </Button>
        </>
      }
    >
      <p className="m-0">
        Move plan <Chip>{id}</Chip> <strong>{title}</strong> to the archive? Its directory moves
        from <Chip>plans/</Chip> to <Chip>archive/</Chip> — no files are deleted or edited, only the
        location changes.
      </p>

      {error != null && (
        <p className={MODAL_ERROR} role="alert">
          {error}
        </p>
      )}

      <p className={MODAL_HINT}>
        Only plans where every task is complete can be archived. This is the one change this viewer
        makes to your workspace; the plan stays available under the Archive tab.
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
  if (modal.kind === 'archive')
    return <ArchivePlanModal id={modal.id} title={modal.title} onClose={onClose} />;
  return <ReviewPlanModal path={modal.path} onClose={onClose} />;
}
