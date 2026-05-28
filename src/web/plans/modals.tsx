/**
 * Plans command-hint modals (Plan 86, Task 005).
 *
 * The product is read-only: these modals never create or review a plan. They
 * are presentational command-hint dialogs that show the correct current skill
 * invocations and `.ai/strikethroo/` paths with a copy-to-clipboard affordance,
 * built on the Plan 85 `Modal` primitive (the modal shell is NOT reimplemented
 * here). Every command/path string is a named constant so the Task 006 naming-
 * hygiene grep finds zero legacy `task-manager` / `task-create-plan` strings,
 * and so the copied clipboard text is byte-identical to what is displayed.
 *
 * Source structure: `CreatePlanModal` / `ReviewPlanModal` / `PlanModals` /
 * `useModal` in `scratch/ui/designs/screens-plans.jsx`, with all stale copy
 * (`task-create-plan`, `task-generate-tasks`, `task-refine-plan`, the
 * `.ai/task-manager/` root and em-dash paths) corrected to the current names.
 */

import { useState, type ReactNode } from 'react';
import { Button, Icon, Modal } from '../components/primitives';
import { planMdPath } from './derive';

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

/** Writes `text` to the clipboard, ignoring environments without the API. */
const copyToClipboard = (text: string): void => {
  void navigator.clipboard?.writeText(text);
};

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
          <Button kind="outline" size="sm" icon="copy" onClick={() => copyToClipboard(CREATE_COMMAND)}>
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
        <span className="modal__cmd-copy" onClick={() => copyToClipboard(CREATE_COMMAND)}>
          <Icon name="copy" size={11} />
          copy
        </span>
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

/** Presentational hint dialog pointing at the external self-review tool. */
export function ReviewPlanModal({ path, onClose }: { path?: string; onClose: () => void }) {
  const planPath = path || PLACEHOLDER_PLAN_PATH;
  const command = reviewCommand(planPath);
  return (
    <Modal
      eyebrow="Review plan"
      title="Review this plan before tasks are generated"
      onClose={onClose}
      actions={
        <>
          <Button kind="outline" size="sm" icon="copy" onClick={() => copyToClipboard(command)}>
            Copy command
          </Button>
          <Button kind="dalia" size="sm" icon="review" onClick={onClose}>
            Launch self-review
          </Button>
        </>
      }
    >
      <p style={{ margin: 0 }}>
        Open the plan in{' '}
        <a
          href="https://github.com/e0ipso/self-review"
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
        <span className="modal__cmd-copy" onClick={() => copyToClipboard(command)}>
          <Icon name="copy" size={11} />
          copy
        </span>
      </div>

      <p className="modal__hint">
        When the review window closes, feed the resulting <span className="chip">review.xml</span>{' '}
        back to your assistant (e.g. via <span className="chip">st-refine-plan</span>) and then run{' '}
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
