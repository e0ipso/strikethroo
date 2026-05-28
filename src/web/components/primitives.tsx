/**
 * Shared presentational primitives ported from the hi-fi design's app-kit.jsx.
 *
 * Every primitive is presentation-only: it takes typed props and emits markup
 * with the canonical class names defined in the vendored style layer
 * (src/web/vendor/styles/app-shell.css). No data fetching, no router imports,
 * no `window` globals (the reference JSX attached to `window`; these export
 * normally). Screens reuse these for one consistent vocabulary.
 *
 * Source of truth: scratch/ui/designs/app-kit.jsx (lines 1–161).
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
  | 'search';

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
};

export interface IconProps {
  name: IconName;
  size?: number;
  style?: CSSProperties;
}

/** A stroke-based, currentColor SVG icon from the fixed named set. */
export function Icon({ name, size = 16, style }: IconProps) {
  return (
    <span className="icon" style={{ width: size, height: size, ...style }}>
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

const STATUS_MAP: Record<StatusKind, { cls: string; text: string }> = {
  todo: { cls: 'pill--todo', text: 'todo' },
  doing: { cls: 'pill--doing', text: 'doing' },
  done: { cls: 'pill--done', text: 'done' },
  drafted: { cls: 'pill--drafted', text: 'drafted' },
  ready: { cls: 'pill--ready', text: 'tasks ready' },
};

export interface StatusPillProps {
  kind: StatusKind;
  label?: string;
}

/** A status pill; renders a dot for every kind except `drafted` and `todo`. */
export function StatusPill({ kind, label }: StatusPillProps) {
  const m = STATUS_MAP[kind] ?? STATUS_MAP.todo;
  return (
    <span className={cn('pill', m.cls)}>
      {kind !== 'drafted' && kind !== 'todo' && <span className="pill__dot" />}
      {label ?? m.text}
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

/** A task-state indicator box; `done` renders the check glyph. */
export function Tickbox({ state = 'todo' }: TickboxProps) {
  if (state === 'done') {
    return (
      <span className="tickbox tickbox--done">
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
  if (state === 'doing') return <span className="tickbox tickbox--doing" />;
  return <span className="tickbox" />;
}

/* =========================================================================
 * Button — app-kit.jsx:70–75
 * ======================================================================= */

export type ButtonKind = 'primary' | 'dalia' | 'outline' | 'ghost';

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
    <button className={cn('btn', `btn--${kind}`, size === 'sm' && 'btn--sm')} onClick={onClick}>
      {icon && <Icon name={icon} size={size === 'sm' ? 13 : 14} style={{ marginLeft: -2 }} />}
      {children}
    </button>
  );
}

/* =========================================================================
 * Chip / BranchChip — app-kit.jsx:77–83
 * ======================================================================= */

export interface ChipProps {
  children: ReactNode;
  kind?: string;
}

/** A monospace code chip with an optional `chip--{kind}` variant. */
export function Chip({ children, kind }: ChipProps) {
  return <span className={cn('chip', kind && `chip--${kind}`)}>{children}</span>;
}

export interface BranchChipProps {
  children: ReactNode;
}

/** The branch-prefixed chip variant. */
export function BranchChip({ children }: BranchChipProps) {
  return <span className="chip chip--branch">{children}</span>;
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
 */
export function Modal({ eyebrow, title, children, onClose, actions }: ModalProps) {
  return (
    <div className="modal-veil" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal__close" onClick={onClose}>
          <Icon name="close" size={16} />
        </div>
        {eyebrow != null && <div className="modal__eyebrow">{eyebrow}</div>}
        <h2 className="modal__title">{title}</h2>
        <div className="modal__body">{children}</div>
        {actions && <div className="modal__actions">{actions}</div>}
      </div>
    </div>
  );
}
