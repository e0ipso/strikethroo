/**
 * Primitive gallery — a temporary verification harness, NOT a product screen.
 *
 * Renders every primitive in isolation (each StatusPill kind, each Tickbox
 * state, each Button kind, a Chip/BranchChip, and an open Modal) so Playwright
 * can screenshot-compare them against the design's app-kit.jsx usages. It is
 * mounted only when the SPA is loaded with `?gallery=1`, so it never appears in
 * the routed app. It embeds no mock domain data — only primitive props.
 */

import { useState, type ReactNode } from 'react';
import {
  BranchChip,
  Button,
  Chip,
  Icon,
  Modal,
  StatusPill,
  Tickbox,
  type ButtonKind,
  type StatusKind,
  type TickboxState,
} from './primitives';

const PILL_KINDS: StatusKind[] = ['todo', 'doing', 'done', 'drafted', 'ready'];
const TICK_STATES: TickboxState[] = ['todo', 'doing', 'done'];
const BTN_KINDS: ButtonKind[] = ['primary', 'dalia', 'outline', 'ghost'];

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className="mb-7">
      <h3 className="mb-2.5 font-mono text-xs uppercase tracking-wider text-ink-3">{label}</h3>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </section>
  );
}

/** The full primitive gallery. */
export function Gallery() {
  const [modalOpen, setModalOpen] = useState(false);
  return (
    <div
      className="block min-h-screen overflow-auto bg-cream p-8 font-sans text-ink"
      data-testid="gallery"
    >
      <h1 className="mb-6 font-display text-4xl font-bold leading-tight tracking-tight text-ink [font-variation-settings:'opsz'_36]">
        Primitive gallery
      </h1>

      <Row label="StatusPill">
        {PILL_KINDS.map(k => (
          <StatusPill key={k} kind={k} />
        ))}
      </Row>

      <Row label="Tickbox">
        {TICK_STATES.map(s => (
          <Tickbox key={s} state={s} />
        ))}
      </Row>

      <Row label="Button">
        {BTN_KINDS.map(k => (
          <Button key={k} kind={k} icon="plus">
            {k}
          </Button>
        ))}
        <Button kind="outline" size="sm" icon="filter">
          small
        </Button>
      </Row>

      <Row label="Chip">
        <Chip>plan-85</Chip>
        <Chip kind="dalia">st-execute-blueprint</Chip>
        <BranchChip>feature/85--app-shell</BranchChip>
      </Row>

      <Row label="Icon">
        <Icon name="plans" size={20} />
        <Icon name="archive" size={20} />
        <Icon name="settings" size={20} />
        <Icon name="workflow" size={20} />
        <Icon name="branch" size={20} />
      </Row>

      <Row label="Modal">
        <Button kind="primary" onClick={() => setModalOpen(true)}>
          Open modal
        </Button>
      </Row>

      {modalOpen && (
        <Modal
          eyebrow="Eyebrow"
          title="Modal title"
          onClose={() => setModalOpen(false)}
          actions={
            <>
              <Button kind="ghost" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button kind="primary" onClick={() => setModalOpen(false)}>
                Confirm
              </Button>
            </>
          }
        >
          Generic modal body content.
        </Modal>
      )}
    </div>
  );
}
