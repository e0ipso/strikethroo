/**
 * Task Detail route container (`/plans/:id/tasks/:taskId`).
 *
 * A strictly read-only screen that renders one task's full markdown body plus a
 * metadata header (status, group, skills, dependency links). It owns NO data
 * fetch of its own — it reads the already-shared `usePlanDetail(id)` resource
 * and locates the task by numeric id within `detail.tasks`, mirroring how
 * `PlanDetailRoute` surfaces the shared `LoadingSurface`/`ErrorSurface` states.
 *
 * A missing/non-numeric task id renders a dedicated "task not found" surface
 * (composed from the shared shell classes), never a blank screen or a crash.
 * The body renders through the shared `Section` component (same path as the Plan
 * tab, so markdown still flows through the SPA's single `renderMarkdown`
 * boundary), with the `## Implementation Notes` section sliced into its own
 * local-state tab. The screen introduces no `Tickbox`, no status-editing
 * control, and no write.
 */

import { useState } from 'react';
import { Chrome, type ChromeTab } from '../../components/Chrome';
import { StatusPill, Chip, type StatusKind } from '../../components/primitives';
import { ErrorSurface, LoadingSurface } from '../../components/StateSurface';
import { usePlanDetail, type PlanDetail, type Task } from '../../data/api';
import { useNavigate } from '../../router';
import { stripIdPrefix, splitTaskSections } from '../derive';
import { toTickboxState } from '../taskStatus';
import { Section } from './ReaderProse';

/**
 * The not-found surface, shown when the route's `taskId` is non-numeric or no
 * task in the plan matches. Reuses the same shell vocabulary as the shared
 * loading/error surfaces so it reads as a designed state, not a crash.
 */
function TaskNotFound({ id, slug, taskId }: { id: string; slug: string; taskId: string }) {
  return (
    <>
      <Chrome
        title="Task not found"
        crumbs={['Plans', { label: slug, href: `/plans/${id}` }, 'tasks', taskId]}
      />
      <div
        style={{
          padding: '28px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          color: 'var(--ink-3)',
          fontFamily: 'var(--font-body)',
          fontSize: '14px',
        }}
        role="alert"
      >
        <StatusPill kind="todo" label="not found" />
        <span>
          No task <strong style={{ color: 'var(--ink-2)' }}>{taskId}</strong> exists in this plan.
        </span>
      </div>
    </>
  );
}

/**
 * Strips a leading level-1 (`# `) heading from a markdown body. That heading is
 * the task title, already rendered as the page heading by `Chrome`; the
 * no-`##`-section fallback must not re-render it as a second `<h1>` in the body.
 * Only a `#`-prefixed first heading is removed — `##` and deeper are untouched.
 */
const stripLeadingTitle = (body: string): string =>
  body.replace(/^\s*#[ \t]+[^\n]*(?:\r?\n)*/, '');

/** The dependency list: each resolved dep links to its task; others stay inert. */
function Dependencies({ id, task, byId }: { id: string; task: Task; byId: Map<number, Task> }) {
  const navigate = useNavigate();
  const deps = task.dependencies ?? [];
  if (deps.length === 0) {
    return <span style={{ color: 'var(--ink-3)' }}>none</span>;
  }
  return (
    <>
      {deps.map(depId => {
        const resolved = byId.has(depId);
        if (resolved) {
          return (
            <Chip key={depId}>
              <span
                style={{ cursor: 'pointer' }}
                onClick={() => navigate(`/plans/${id}/tasks/${depId}`)}
              >
                #{depId}
              </span>
            </Chip>
          );
        }
        return <Chip key={depId}>#{depId}</Chip>;
      })}
    </>
  );
}

/** The metadata header: status pill, group/skills chips, dependency links. */
function MetaHeader({ id, task, byId }: { id: string; task: Task; byId: Map<number, Task> }) {
  const state = toTickboxState(task.status);
  const skills = task.skills ?? [];
  return (
    <div className="reader__meta" style={{ flexWrap: 'wrap', rowGap: '8px' }}>
      <StatusPill kind={state as StatusKind} />
      {task.group && <Chip>{task.group}</Chip>}
      {skills.map(skill => (
        <Chip key={skill}>{skill}</Chip>
      ))}
      <span>·</span>
      <span>deps · </span>
      <Dependencies id={id} task={task} byId={byId} />
    </div>
  );
}

/** The loaded route: shared Chrome plus the task's metadata header and body. */
function LoadedRoute({ id, taskId, detail }: { id: string; taskId: string; detail: PlanDetail }) {
  // Hooks run unconditionally, before any early return (rules of hooks).
  const [activeTab, setActiveTab] = useState(0);

  const slug = stripIdPrefix(detail.name);

  const numericId = Number(taskId);
  const task = Number.isInteger(numericId) ? detail.tasks.find(t => t.id === numericId) : undefined;

  if (!task) {
    return <TaskNotFound id={id} slug={slug} taskId={taskId} />;
  }

  const byId = new Map(detail.tasks.map(t => [t.id, t]));
  const rawBody = task.body ?? '';
  const sections = task.sections ?? [];
  const { bodySections, notesSections } = splitTaskSections(sections);
  const hasNotes = notesSections.length > 0;
  const tabs: ChromeTab[] = hasNotes ? ['Task', 'Implementation Notes'] : ['Task'];

  // Render the active tab's sections through the shared `Section` component.
  // When the body has prose but no `##` headings at all, fall back to a single
  // synthetic section so leading-prose-only tasks do not blank — but render the
  // body with its leading `# ` title removed so it does not duplicate the page
  // heading as a second `<h1>`.
  const activeSections = hasNotes && activeTab === 1 ? notesSections : bodySections;
  const fallbackBody = stripLeadingTitle(rawBody);
  const isEmpty = sections.length === 0 && fallbackBody.trim().length === 0;
  const renderSections =
    sections.length === 0 && fallbackBody.trim().length > 0
      ? [{ heading: '', content: fallbackBody }]
      : activeSections;

  return (
    <>
      <Chrome
        title={task.name}
        crumbs={['Plans', { label: slug, href: `/plans/${id}` }, 'tasks', task.name]}
        tabs={tabs}
        activeTab={activeTab}
        onTabSelect={setActiveTab}
      />
      <div className="reader">
        <MetaHeader id={id} task={task} byId={byId} />
        {isEmpty ? (
          <p className="reader__meta">This task has no description.</p>
        ) : (
          renderSections.map((section, i) => <Section key={i} section={section} />)
        )}
      </div>
    </>
  );
}

/**
 * The `/plans/:id/tasks/:taskId` route: reads the shared plan detail resource
 * and renders the loading / error / data surfaces (never a blank or a throw).
 */
export function TaskDetailRoute({ id, taskId }: { id: string; taskId: string }) {
  const detail = usePlanDetail(id);

  if (detail.status === 'loading') return <LoadingSurface label={`Loading plan ${id}…`} />;
  if (detail.status === 'error') return <ErrorSurface error={detail.error} />;
  return <LoadedRoute id={id} taskId={taskId} detail={detail.data} />;
}
