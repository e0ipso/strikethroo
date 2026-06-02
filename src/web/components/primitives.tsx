/**
 * Shared presentational primitives ported from the hi-fi design's app-kit.jsx.
 *
 * Every primitive is presentation-only: it takes typed props and emits markup
 * styled with Tailwind v4 utilities composed through `cn()` (Plan 102 — the
 * vendored semantic primitive classes `pill`/`tickbox`/`btn`/`chip`/`modal*`
 * are no longer emitted). No data fetching, no router imports, no `window`
 * globals (the reference JSX attached to `window`; these export normally).
 * Screens reuse these for one consistent vocabulary.
 *
 * Dark mode: the `@theme` color tokens (`--color-ink`, `--color-cream`,
 * `--color-doing*`, `--color-done*`, `--color-border-*`, …) are all re-defined
 * under `.dark` in the retained `vendor/styles/tokens.css`, so the token-backed
 * utilities (`text-ink`, `bg-cream`, `bg-doing-bg`, `ring-border-soft`) flip
 * automatically; only the genuine component-shape differences carry explicit
 * `dark:` variants.
 */

import { type CSSProperties, type ReactNode } from 'react';
import { cn } from '../vendor/utils/cn';

/* =========================================================================
 * Icon — app-kit.jsx:4–37
 * ======================================================================= */

/** The fixed named SVG path set carried over from the design. */
export type IconName =
  | 'plans'
  | 'layout'
  | 'workflow'
  | 'activity'
  | 'settings'
  | 'archive'
  | 'plus'
  | 'filter'
  | 'sort'
  | 'chevron'
  | 'close'
  | 'review'
  | 'branch'
  | 'copy'
  | 'book'
  | 'columns'
  | 'folder'
  | 'check'
  | 'arrow'
  | 'parallel'
  | 'search'
  | 'sun'
  | 'moon'
  | 'monitor';

const ICON_PATHS: Record<IconName, ReactNode> = {
  plans: <path d="M3 7h18M3 12h18M3 17h12" />,
  layout: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18M9 21V9" />
    </>
  ),
  workflow: (
    <>
      <rect x="3" y="4" width="6" height="6" rx="1" />
      <rect x="15" y="4" width="6" height="6" rx="1" />
      <rect x="9" y="14" width="6" height="6" rx="1" />
      <path d="M6 10v2a2 2 0 0 0 2 2h1M18 10v2a2 2 0 0 1-2 2h-1" />
    </>
  ),
  activity: <path d="M3 12h4l3-8 4 16 3-8h4" />,
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </>
  ),
  archive: (
    <>
      <rect x="2" y="4" width="20" height="5" rx="1" />
      <path d="M4 9v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9M10 13h4" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  filter: <path d="M22 3H2l8 9.5V19l4 2v-8.5L22 3z" />,
  sort: <path d="M3 6h18M6 12h12M10 18h4" />,
  chevron: <path d="M6 9l6 6 6-6" />,
  close: <path d="M18 6L6 18M6 6l12 12" />,
  review: (
    <>
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </>
  ),
  branch: (
    <>
      <circle cx="6" cy="3" r="2" />
      <circle cx="6" cy="21" r="2" />
      <circle cx="18" cy="6" r="2" />
      <path d="M6 5v14M18 8a6 6 0 0 1-6 6H6" />
    </>
  ),
  copy: (
    <>
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </>
  ),
  book: (
    <>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </>
  ),
  columns: (
    <>
      <rect x="3" y="3" width="7" height="18" rx="1" />
      <rect x="14" y="3" width="7" height="18" rx="1" />
    </>
  ),
  folder: (
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2v11z" />
  ),
  check: <path d="M20 6L9 17l-5-5" />,
  arrow: <path d="M5 12h14M13 5l7 7-7 7" />,
  parallel: <path d="M4 7h16M4 12h16M4 17h16" />,
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </>
  ),
  moon: <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />,
  monitor: (
    <>
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </>
  ),
};

export interface IconProps {
  name: IconName;
  size?: number;
  style?: CSSProperties;
}

/** A stroke-based, currentColor SVG icon from the fixed named set. */
export function Icon({ name, size = 16, style }: IconProps) {
  return (
    <span
      className="inline-block align-middle [&>svg]:block"
      style={{ width: size, height: size, ...style }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {ICON_PATHS[name] ?? null}
      </svg>
    </span>
  );
}

/* =========================================================================
 * StatusPill — app-kit.jsx:39–54
 * ======================================================================= */

export type StatusKind = 'todo' | 'doing' | 'done' | 'drafted' | 'ready';

/** Shared pill geometry/type (app-shell.css `.pill`). */
const PILL_BASE =
  'inline-flex items-center gap-1.5 rounded-full py-0.5 pl-2 pr-2.5 font-sans text-xs font-semibold tracking-wide lowercase whitespace-nowrap leading-snug';

/** The colour treatment per status — bg/text + (for the outline kinds) a 1px ring. */
const STATUS_PILL_UTILITIES: Record<StatusKind, string> = {
  todo: 'text-ink-3 bg-transparent ring-1 ring-inset ring-border-strong',
  doing: 'text-doing-ink bg-doing-bg',
  done: 'text-done-ink bg-done-bg',
  drafted: 'text-ink-2 bg-transparent ring-1 ring-inset ring-ink-3',
  ready: 'text-dalia-deep bg-dalia-bg',
};

/** The dot fill per status (only doing/done/ready render a dot). */
const STATUS_DOT_UTILITIES: Partial<Record<StatusKind, string>> = {
  doing: 'bg-doing',
  done: 'bg-done',
  ready: 'bg-dalia-dark',
};

const STATUS_TEXT: Record<StatusKind, string> = {
  todo: 'todo',
  doing: 'doing',
  done: 'done',
  drafted: 'drafted',
  ready: 'tasks ready',
};

export interface StatusPillProps {
  kind: StatusKind;
  label?: string;
}

/** A status pill; renders a dot for every kind except `drafted` and `todo`. */
export function StatusPill({ kind, label }: StatusPillProps) {
  const utilities = STATUS_PILL_UTILITIES[kind] ?? STATUS_PILL_UTILITIES.todo;
  const text = STATUS_TEXT[kind] ?? STATUS_TEXT.todo;
  return (
    <span data-testid="status-pill" data-kind={kind} className={cn(PILL_BASE, utilities)}>
      {kind !== 'drafted' && kind !== 'todo' && (
        <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', STATUS_DOT_UTILITIES[kind])} />
      )}
      {label ?? text}
    </span>
  );
}

/* =========================================================================
 * Tickbox — app-kit.jsx:56–68
 * ======================================================================= */

export type TickboxState = 'todo' | 'doing' | 'done';

export interface TickboxProps {
  state?: TickboxState;
}

/**
 * Shared tickbox geometry (app-shell.css `.tickbox`). The default surface is
 * `bg-cream` in light, `bg-cream-mid` in dark (a genuine `.dark` fixup); the
 * `done`/`doing` states override the background with their status colour.
 */
const TICKBOX_BASE =
  'inline-flex items-center justify-center h-4 w-4 shrink-0 rounded bg-cream dark:bg-cream-mid text-xs leading-none';

/**
 * A task-state indicator box; `done` renders the check glyph. This is the
 * genuinely interactive / stateful indicator — read-only & blueprint task rows
 * deliberately do NOT render a Tickbox; they show a strikethrough instead
 * (recorded project practice), so this primitive keeps its checkbox affordance.
 */
export function Tickbox({ state = 'todo' }: TickboxProps) {
  if (state === 'done') {
    return (
      <span
        data-testid="tickbox"
        className={cn(
          TICKBOX_BASE,
          // Done: filled in the done colour; the glyph stays light on the medium
          // light-mode fill and flips to a near-black ink on the lighter dark-mode fill.
          'bg-done text-cream dark:text-deep'
        )}
      >
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M20 6L9 17l-5-5" />
        </svg>
      </span>
    );
  }
  if (state === 'doing') {
    return (
      <span
        data-testid="tickbox"
        className={cn(TICKBOX_BASE, 'bg-doing-bg ring-1 ring-inset ring-doing')}
      >
        {/* the .tickbox--doing::after dot, rendered as a real element */}
        <span className="h-2 w-2 rounded-full bg-doing" />
      </span>
    );
  }
  return (
    <span
      data-testid="tickbox"
      className={cn(TICKBOX_BASE, 'text-transparent ring-1 ring-inset ring-ink-3')}
    />
  );
}

/* =========================================================================
 * Button — app-kit.jsx:70–75
 * ======================================================================= */

export type ButtonKind = 'primary' | 'dalia' | 'outline' | 'ghost';

/** Shared button geometry/type (app-shell.css `.btn`). */
const BUTTON_BASE =
  'inline-flex items-center gap-2 rounded-md px-3 py-2 font-sans text-base font-medium whitespace-nowrap cursor-pointer border-0 transition-[transform,box-shadow] duration-150 ease-out';

/** The per-kind surface (background/text + shadow). */
const BUTTON_KIND_UTILITIES: Record<ButtonKind, string> = {
  primary: 'bg-ink text-cream shadow-sm',
  dalia: 'bg-dalia-dark text-cream shadow-sm',
  outline: 'bg-cream text-ink ring-1 ring-inset ring-border-strong',
  ghost: 'bg-transparent text-ink-2 hover:bg-black/5 hover:text-ink dark:hover:bg-white/5',
};

/** The `sm` size override (tighter padding + smaller type). */
const BUTTON_SM_UTILITIES = 'px-2.5 py-1.5 text-sm';

export interface ButtonProps {
  children: ReactNode;
  kind?: ButtonKind;
  size?: 'sm';
  icon?: IconName;
  onClick?: () => void;
}

/** A button with kind/size variants and an optional leading icon. */
export function Button({ children, kind = 'outline', size, icon, onClick }: ButtonProps) {
  return (
    <button
      data-testid="button"
      className={cn(BUTTON_BASE, BUTTON_KIND_UTILITIES[kind], size === 'sm' && BUTTON_SM_UTILITIES)}
      onClick={onClick}
    >
      {icon && <Icon name={icon} size={size === 'sm' ? 13 : 14} style={{ marginLeft: -2 }} />}
      {children}
    </button>
  );
}

/* =========================================================================
 * Chip / BranchChip — app-kit.jsx:77–83
 * ======================================================================= */

/** Shared monospace code-chip surface (app-shell.css `.chip`). */
const CHIP_BASE =
  'inline-flex items-center rounded px-1.5 py-px font-mono text-sm bg-cream-mid text-ink ring-1 ring-inset ring-border-soft';

/**
 * Known `kind` → extra utilities. The vendored CSS only ever defined a
 * `branch` variant (rendered by `BranchChip`); other kinds had no matching
 * rule and rendered as the base chip, so they map to no extra utilities.
 */
const CHIP_KIND_UTILITIES: Record<string, string> = {};

export interface ChipProps {
  children: ReactNode;
  kind?: string;
}

/** A monospace code chip with an optional `kind` variant. */
export function Chip({ children, kind }: ChipProps) {
  return (
    <span data-testid="chip" className={cn(CHIP_BASE, kind && CHIP_KIND_UTILITIES[kind])}>
      {children}
    </span>
  );
}

export interface BranchChipProps {
  children: ReactNode;
}

/** The branch-prefixed chip variant (the `⎇` glyph leads in the accent colour). */
export function BranchChip({ children }: BranchChipProps) {
  return (
    <span data-testid="chip" data-variant="branch" className={CHIP_BASE}>
      <span aria-hidden className="mr-1.5 text-xs text-dalia-dark">
        ⎇
      </span>
      {children}
    </span>
  );
}

/* =========================================================================
 * Modal — app-kit.jsx:150–161
 * ======================================================================= */

export interface ModalProps {
  eyebrow?: ReactNode;
  title: ReactNode;
  children: ReactNode;
  onClose: () => void;
  actions?: ReactNode;
}

/**
 * A generic modal: veil + dialog with eyebrow, title, body, close, and
 * optional actions. Clicking the veil closes; clicking the dialog does not.
 * Carries NO command-hint copy — per-screen tickets supply that.
 *
 * Rendered IN-TREE (NOT via a portal) so the `.dark` class on `<html>`
 * cascades to it and the token-backed utilities flip with the theme. The
 * fixed-tint veil intentionally has no `dark:` variant (it matches the
 * original `.modal-veil`, which had no dark override); the dialog surface
 * (`bg-cream`, `--shadow-modal`) flips automatically with the theme tokens.
 */
export function Modal({ eyebrow, title, children, onClose, actions }: ModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-8 bg-black/40 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-xl rounded-card bg-cream px-7 pt-7 pb-6 shadow-modal"
        onClick={e => e.stopPropagation()}
      >
        <div
          className="absolute top-3.5 right-3.5 flex h-7 w-7 items-center justify-center rounded-md text-ink-3 cursor-pointer hover:bg-cream-mid hover:text-ink"
          onClick={onClose}
        >
          <Icon name="close" size={16} />
        </div>
        {eyebrow != null && (
          <div className="font-sans text-xs font-semibold uppercase tracking-widest text-dalia-dark">
            {eyebrow}
          </div>
        )}
        <h2 className="mt-1 mb-3 font-display text-4xl font-bold leading-tight tracking-tight text-ink [font-variation-settings:'opsz'_36]">
          {title}
        </h2>
        <div className="text-base leading-relaxed text-ink-2 [&_strong]:font-semibold [&_strong]:text-ink">
          {children}
        </div>
        {actions && <div className="mt-6 flex justify-end gap-2">{actions}</div>}
      </div>
    </div>
  );
}
