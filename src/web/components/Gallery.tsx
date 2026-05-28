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
    <section style={{ marginBottom: 28 }}>
      <h3
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 12,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: 'var(--ink-3)',
          marginBottom: 10,
        }}
      >
        {label}
      </h3>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        {children}
      </div>
    </section>
  );
}

/** The full primitive gallery. */
export function Gallery() {
  const [modalOpen, setModalOpen] = useState(false);
  return (
    <div
      className="app"
      style={{ display: 'block', padding: 32, minHeight: '100vh', overflow: 'auto' }}
      data-testid="gallery"
    >
      <h1 className="chrome__title" style={{ marginBottom: 24 }}>
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
