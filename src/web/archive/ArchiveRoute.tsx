/**
 * Archive route component — browse + live search (Plan 90, Task 002).
 *
 * The `/archive` section's single routed feature module. It consumes the live
 * `/api/plans` data through the Task 002 adapter (archived slice, sorted by
 * `created` desc), drives a controlled search box through the Task 001
 * helpers (`filterPlans` / `highlight` / `archiveStats`), and renders the
 * six-column table that matches the Plans list density, the aggregate stats
 * strip, the result bar (when a query is active), and the empty-archive and
 * no-results states. Rows link to the existing read-only Plan Detail route.
 *
 * Faithful to `scratch/ui/designs/screens-archive.jsx` with the plan's
 * corrections: no `ARCHIVE_PLANS` mock (live data only), the status bar reads
 * `.ai/strikethroo/archive/` (the design's `.ai/task-manager/` is stale). The
 * model surfaces no completion date for archived plans, so the date axis (sort,
 * range filter, month grouping, the displayed column) is `created`; `branch` is
 * rendered defensively since the API model does not surface it.
 *
 * The "Sort" and "Date range" controls are wired (Plan 95, Task 06): the
 * displayed list is composed search → date-range → sort over the fetched
 * archived plans (the result count and `archiveStats` reflect that composed
 * set), then regrouped under created-month headings. The archive has no view
 * switcher — the By-month grouping is the only view.
 */

import { useState, type ReactNode } from 'react';
import { Chrome } from '../components/Chrome';
import { Button, Chip, Icon } from '../components/primitives';
import { ErrorSurface, LoadingSurface } from '../components/StateSurface';
import { useNavigate } from '../router';
import { sortRows, useTableSort, type SortState } from '../data/sort';
import { useArchiveData } from './useArchiveData';
import {
  archiveStats,
  filterByDateRange,
  filterPlans,
  groupByMonth,
  highlight,
  type ArchivePlanView,
} from './helpers';

/** The columns the Archive table can sort by (the displayed columns). */
type ArchiveSortKey = 'id' | 'title' | 'total' | 'phaseCount' | 'created';

/** Accessor map for the shared sort helper, keyed by displayed column. */
const ARCHIVE_ACCESSORS: Record<ArchiveSortKey, (row: ArchivePlanView) => unknown> = {
  id: row => row.id,
  title: row => row.title,
  total: row => row.total,
  phaseCount: row => row.phaseCount,
  created: row => row.created ?? '',
};

/** Human labels for the sortable columns, shown in the sort control. */
const SORT_LABELS: Record<ArchiveSortKey, string> = {
  id: 'id',
  title: 'plan',
  total: 'tasks',
  phaseCount: 'phases',
  created: 'created',
};

/** Grid column template ported verbatim from the design. */
const COL_TPL = '46px 1fr 80px 90px 110px 110px';

/** Status-bar copy — strikethroo workspace path (the design's is stale). */
const ARCHIVE_PATH = '.ai/strikethroo/archive/';

/** The interactive controls shown on the right of the Archive chrome bar. */
function ArchiveControls({
  sortState,
  onToggleSort,
  from,
  to,
  onFrom,
  onTo,
}: {
  sortState: SortState<ArchiveSortKey>;
  onToggleSort: () => void;
  from: string;
  to: string;
  onFrom: (v: string) => void;
  onTo: (v: string) => void;
}) {
  return (
    <>
      <Button kind="ghost" size="sm" icon="sort" onClick={onToggleSort}>
        Sort: {SORT_LABELS[sortState.key]} {sortState.dir === 'desc' ? '↓' : '↑'}
      </Button>
      <label
        className="inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-md bg-cream px-2.5 py-1 font-sans text-sm font-medium text-ink ring-1 ring-border-strong"
        title="Filter archived plans by created date"
      >
        <Icon name="filter" size={13} style={{ marginLeft: -2 }} />
        <input
          type="date"
          value={from}
          onChange={e => onFrom(e.target.value)}
          aria-label="Created from"
          className="cursor-pointer border-none bg-transparent font-sans text-inherit"
        />
        <span className="text-ink-3">→</span>
        <input
          type="date"
          value={to}
          onChange={e => onTo(e.target.value)}
          aria-label="Created to"
          className="cursor-pointer border-none bg-transparent font-sans text-inherit"
        />
      </label>
    </>
  );
}

/** The top chrome bar for the Archive route: crumbs and controls. */
function ArchiveChrome({ right }: { right?: ReactNode }) {
  return (
    <Chrome title="Archive" crumbs={[{ label: 'workspace', href: '/' }, 'archive']} right={right} />
  );
}

/** The aggregate stats strip plus the controlled search box. */
function ArchiveHead({
  query,
  onQuery,
  rows,
}: {
  query: string;
  onQuery: (q: string) => void;
  rows: ArchivePlanView[];
}) {
  const stats = archiveStats(rows);
  return (
    <div className="flex items-center justify-between gap-7 border-b border-border bg-cream px-7 py-4">
      <div className="relative flex max-w-xl flex-1 items-center gap-2.5 rounded-lg bg-cream-mid px-3.5 py-2.5 font-sans ring-1 ring-border-soft focus-within:bg-cream focus-within:ring-2 focus-within:ring-ink">
        <Icon name="search" size={15} style={{ color: 'var(--color-ink-3)' }} />
        <input
          className="min-w-0 flex-1 border-none bg-transparent font-sans text-base text-ink outline-none placeholder:text-ink-3"
          type="text"
          placeholder="Search archived plans — slug, summary, date…"
          value={query}
          onChange={e => onQuery(e.target.value)}
          aria-label="Search archived plans"
        />
        {query && (
          <span
            className="inline-flex cursor-pointer items-center gap-1 rounded px-2 py-0.5 font-sans text-sm text-ink-3 hover:bg-cream-mid hover:text-ink"
            onClick={() => onQuery('')}
          >
            <Icon name="close" size={13} /> clear
          </span>
        )}
        <span className="rounded bg-cream px-1.5 py-0.5 font-mono text-xs text-ink-3 ring-1 ring-border">
          ⌘K
        </span>
      </div>

      <div className="flex gap-7 border-l border-border pl-7">
        <div className="text-right font-sans">
          <div className="font-display text-4xl font-bold leading-none text-ink">
            {stats.totalPlans}
          </div>
          <div className="mt-1 font-mono text-xs uppercase text-ink-3">archived plans</div>
        </div>
        <div className="text-right font-sans">
          <div className="font-display text-4xl font-bold leading-none text-ink">
            {stats.totalTasks}
          </div>
          <div className="mt-1 font-mono text-xs uppercase text-ink-3">tasks completed</div>
        </div>
        <div className="text-right font-sans">
          <div className="font-display text-4xl font-bold leading-none text-ink">
            {stats.totalPhases}
          </div>
          <div className="mt-1 font-mono text-xs uppercase text-ink-3">phases run</div>
        </div>
      </div>
    </div>
  );
}

/** A single archived-plan row, with query matches highlighted. */
function ArchiveRow({ row, query }: { row: ArchivePlanView; query: string }) {
  const navigate = useNavigate();
  const phases = row.phaseCount ?? 0;
  return (
    <div
      data-testid="archive-row"
      className="grid cursor-pointer items-center gap-4 border-b border-border-soft px-7 py-3 hover:bg-cream-mid"
      style={{ gridTemplateColumns: COL_TPL }}
      onClick={() => navigate(`/plans/${encodeURIComponent(row.name)}`)}
    >
      <span className="font-mono text-base font-semibold text-ink-2">{row.id}</span>
      <div className="min-w-0">
        <div className="overflow-hidden text-ellipsis whitespace-nowrap font-mono text-base font-medium text-ink">
          {highlight(row.title, query)}
        </div>
        <div className="mt-px overflow-hidden text-ellipsis whitespace-nowrap text-base text-ink-2">
          {highlight(row.summary, query)}
        </div>
      </div>
      <span className="font-mono text-xs text-ink-2">
        <strong className="text-done">{row.done}</strong>/{row.total}
      </span>
      <span className="font-mono text-xs text-ink-3">
        {phases} phase{phases === 1 ? '' : 's'}
      </span>
      <span className="font-mono text-xs text-ink-2">
        {row.created ? highlight(row.created, query) : '—'}
      </span>
      <div className="text-right">
        <span
          onClick={e => {
            e.stopPropagation();
            navigate(`/plans/${encodeURIComponent(row.name)}`);
          }}
        >
          <Button kind="outline" size="sm" icon="book">
            View
          </Button>
        </span>
      </div>
    </div>
  );
}

/** The composed rows grouped by completion month, each under a heading. */
function ArchiveMonthGroups({
  rows,
  total,
  query,
}: {
  rows: ArchivePlanView[];
  total: number;
  query: string;
}) {
  const groups = groupByMonth(rows);
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <div
        className="grid items-center gap-4 border-b border-border bg-cream px-7 py-2.5 font-sans text-xs font-semibold uppercase text-ink-3"
        style={{ gridTemplateColumns: COL_TPL }}
      >
        <span>id</span>
        <span>plan</span>
        <span>tasks</span>
        <span>phases</span>
        <span>created</span>
        <span />
      </div>
      {total === 0 ? (
        <div className="flex flex-col items-center gap-1.5 px-7 py-12 text-center">
          <div className="font-display text-2xl font-semibold text-ink">No archived plans yet</div>
          <div className="text-base text-ink-3">
            Completed plans move to <strong>{ARCHIVE_PATH}</strong> automatically when every task is
            done.
          </div>
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center gap-1.5 px-7 py-12 text-center">
          <div className="font-display text-2xl font-semibold text-ink">
            No archived plans match <Chip>{query}</Chip>
          </div>
          <div className="text-base text-ink-3">
            Try a shorter query, or search by slug or month.
          </div>
        </div>
      ) : (
        groups.map(group => (
          <div key={group.month}>
            <div className="px-3 pt-2.5 pb-1.5 font-mono text-xs font-semibold uppercase text-ink-2">
              {group.label}
              <span className="font-normal text-ink-3"> · {group.plans.length}</span>
            </div>
            {group.plans.map(row => (
              <ArchiveRow key={row.id} row={row} query={query} />
            ))}
          </div>
        ))
      )}
    </div>
  );
}

/** The Archive screen body, driven by the resolved archived-plan list. */
function ArchiveScreen({ plans }: { plans: ArchivePlanView[] }) {
  const [query, setQuery] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const sort = useTableSort<ArchiveSortKey>({ key: 'created', dir: 'desc' });

  // Composition order: search → date-range → sort, then group for By-month.
  const searched = filterPlans(plans, query);
  const ranged = filterByDateRange(searched, from, to);
  const rows = sortRows(ranged, ARCHIVE_ACCESSORS, sort.state);

  const isFiltered = Boolean(query) || Boolean(from) || Boolean(to);

  return (
    <>
      <ArchiveChrome
        right={
          <ArchiveControls
            sortState={sort.state}
            onToggleSort={() => sort.toggle('created')}
            from={from}
            to={to}
            onFrom={setFrom}
            onTo={setTo}
          />
        }
      />
      <ArchiveHead query={query} onQuery={setQuery} rows={rows} />
      {isFiltered && (
        <div className="flex items-center justify-between border-b border-dalia/20 bg-dalia-bg px-7 py-2.5 font-sans text-base text-dalia-deep">
          <span>
            <strong className="text-ink">{rows.length}</strong>{' '}
            {rows.length === 1 ? 'result' : 'results'}
            {query && (
              <>
                {' '}
                for <Chip>{query}</Chip>
              </>
            )}
          </span>
          <span className="font-mono text-xs opacity-70">
            searching across slug · summary · created date
          </span>
        </div>
      )}
      <ArchiveMonthGroups rows={rows} total={plans.length} query={query} />
      <div className="flex items-center justify-between border-t border-border bg-cream-mid px-7 py-2 font-mono text-xs text-ink-3">
        <span>
          workspace · <strong>{ARCHIVE_PATH}</strong>
        </span>
      </div>
    </>
  );
}

/** The composed Archive route: chrome + screen, driven by live data. */
export function ArchiveRoute() {
  const resource = useArchiveData();

  if (resource.status === 'loading') {
    return (
      <>
        <ArchiveChrome />
        <LoadingSurface label="Loading archive…" />
      </>
    );
  }
  if (resource.status === 'error') {
    return (
      <>
        <ArchiveChrome />
        <ErrorSurface error={resource.error} />
      </>
    );
  }
  return <ArchiveScreen plans={resource.data} />;
}
