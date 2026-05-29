/**
 * Archive route component — browse + live search (Plan 90, Task 002).
 *
 * The `/archive` section's single routed feature module. It consumes the live
 * `/api/plans` data through the Task 002 adapter (archived slice, sorted by
 * `completedAt` desc), drives a controlled search box through the Task 001
 * helpers (`filterPlans` / `highlight` / `archiveStats`), and renders the
 * six-column table that matches the Plans list density, the aggregate stats
 * strip, the result bar (when a query is active), and the empty-archive and
 * no-results states. Rows link to the existing read-only Plan Detail route.
 *
 * Faithful to `scratch/ui/designs/screens-archive.jsx` with the plan's
 * corrections: no `ARCHIVE_PLANS` mock (live data only), the status bar reads
 * `.ai/strikethroo/archive/` (the design's `.ai/task-manager/` is stale), and
 * the "By month" tab and "Sort"/"Date range" controls are inert chrome (out of
 * ticket scope per the YAGNI clarification). Optional `completedAt`/`branch` are
 * rendered defensively since the current API model does not surface them.
 */

import { useState } from 'react';
import { Chrome } from '../components/Chrome';
import { Button, Icon } from '../components/primitives';
import { ErrorSurface, LoadingSurface } from '../components/StateSurface';
import { useNavigate } from '../router';
import { useArchiveData } from './useArchiveData';
import { archiveStats, filterPlans, highlight, type ArchivePlanView } from './helpers';

/** Grid column template ported verbatim from the design. */
const COL_TPL = '46px 1fr 80px 90px 110px 110px';

/** Status-bar copy — strikethroo workspace path (the design's is stale). */
const ARCHIVE_PATH = '.ai/strikethroo/archive/';

/** The top chrome bar for the Archive route: crumbs, tabs, and inert controls. */
function ArchiveChrome({ count }: { count: number }) {
  return (
    <Chrome
      title="Archive"
      crumbs={['workspace', 'archive']}
      tabs={[['All', count], 'By month']}
      activeTab={0}
      right={
        <>
          {/* Inert chrome (out of ticket scope per the YAGNI clarification). */}
          <Button kind="ghost" size="sm" icon="sort">
            Sort: completed ↓
          </Button>
          <Button kind="outline" size="sm" icon="filter">
            Date range
          </Button>
        </>
      }
    />
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
    <div className="archive__head">
      <div className="archive__search">
        <Icon name="search" size={15} style={{ color: 'var(--ink-3)' }} />
        <input
          className="archive__search-input"
          type="text"
          placeholder="Search archived plans — slug, summary, date…"
          value={query}
          onChange={e => onQuery(e.target.value)}
          aria-label="Search archived plans"
        />
        {query && (
          <span className="archive__search-clear" onClick={() => onQuery('')}>
            <Icon name="close" size={13} /> clear
          </span>
        )}
        <span className="archive__search-kbd mono">⌘K</span>
      </div>

      <div className="archive__stats">
        <div className="archive__stat">
          <div className="archive__stat-num">{stats.totalPlans}</div>
          <div className="archive__stat-label">archived plans</div>
        </div>
        <div className="archive__stat">
          <div className="archive__stat-num">{stats.totalTasks}</div>
          <div className="archive__stat-label">tasks completed</div>
        </div>
        <div className="archive__stat">
          <div className="archive__stat-num">{stats.totalPhases}</div>
          <div className="archive__stat-label">phases run</div>
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
      className="tbl tbl--row"
      style={{ gridTemplateColumns: COL_TPL }}
      onClick={() => navigate(`/plans/${row.id}`)}
    >
      <span className="tbl__id">{row.id}</span>
      <div className="tbl__title">
        <div className="tbl__title-slug">{highlight(row.title, query)}</div>
        <div className="tbl__title-summary">{highlight(row.summary, query)}</div>
      </div>
      <span className="mono" style={{ fontSize: 12, color: 'var(--ink-2)' }}>
        <strong style={{ color: 'var(--done)' }}>{row.done}</strong>/{row.total}
      </span>
      <span className="mono" style={{ fontSize: 12, color: 'var(--ink-3)' }}>
        {phases} phase{phases === 1 ? '' : 's'}
      </span>
      <span className="mono" style={{ color: 'var(--ink-2)', fontSize: 12 }}>
        {row.completedAt ? highlight(row.completedAt, query) : '—'}
      </span>
      <div style={{ textAlign: 'right' }}>
        <span
          onClick={e => {
            e.stopPropagation();
            navigate(`/plans/${row.id}`);
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

/** The archive table, including the empty-archive and no-results branches. */
function ArchiveTable({
  rows,
  total,
  query,
}: {
  rows: ArchivePlanView[];
  total: number;
  query: string;
}) {
  return (
    <div className="scroll">
      <div className="tbl tbl--head" style={{ gridTemplateColumns: COL_TPL }}>
        <span>id</span>
        <span>plan</span>
        <span>tasks</span>
        <span>phases</span>
        <span>completed</span>
        <span />
      </div>
      {total === 0 ? (
        <div className="archive__empty">
          <div className="archive__empty-title">No archived plans yet</div>
          <div className="archive__empty-hint">
            Completed plans move to <strong>{ARCHIVE_PATH}</strong> automatically when every task is
            done.
          </div>
        </div>
      ) : rows.length === 0 ? (
        <div className="archive__empty">
          <div className="archive__empty-title">
            No archived plans match <span className="chip">{query}</span>
          </div>
          <div className="archive__empty-hint">Try a shorter query, or search by slug or month.</div>
        </div>
      ) : (
        rows.map(row => <ArchiveRow key={row.id} row={row} query={query} />)
      )}
    </div>
  );
}

/** The Archive screen body, driven by the resolved archived-plan list. */
function ArchiveScreen({ plans }: { plans: ArchivePlanView[] }) {
  const [query, setQuery] = useState('');
  const rows = filterPlans(plans, query);

  return (
    <>
      <ArchiveChrome count={plans.length} />
      <ArchiveHead query={query} onQuery={setQuery} rows={plans} />
      {query && (
        <div className="archive__resultbar">
          <span>
            <strong style={{ color: 'var(--ink)' }}>{rows.length}</strong>{' '}
            {rows.length === 1 ? 'result' : 'results'} for <span className="chip">{query}</span>
          </span>
          <span className="archive__resultbar-hint">
            searching across slug · summary · completion date
          </span>
        </div>
      )}
      <ArchiveTable rows={rows} total={plans.length} query={query} />
      <div className="statusbar">
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
        <ArchiveChrome count={0} />
        <LoadingSurface label="Loading archive…" />
      </>
    );
  }
  if (resource.status === 'error') {
    return (
      <>
        <ArchiveChrome count={0} />
        <ErrorSurface error={resource.error} />
      </>
    );
  }
  return <ArchiveScreen plans={resource.data} />;
}
