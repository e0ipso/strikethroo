/**
 * Task Detail route container (`/plans/:id/tasks/:taskId`).
 *
 * A strictly read-only screen that renders one task's full markdown body plus a
 * metadata header (group, skills, dependency links); a done task reads as a
 * struck-through page title rather than a status pill. It owns NO data
 * fetch of its own — it reads the already-shared `usePlanDetail(id)` resource
 * and locates the task by numeric id within `detail.tasks`, mirroring how
 * `PlanDetailRoute` surfaces the shared `LoadingSurface`/`ErrorSurface` states.
 *
 * A missing/non-numeric task id renders a dedicated "task not found" surface
 * (composed from the shared shell classes), never a blank screen or a crash.
 * The body renders through the shared `Section` component (same path as the Plan
 * tab, so markdown still flows through the SPA's single `renderMarkdown`
 * boundary), with the `## Implementation Notes` section sliced into its own
 * local-state tab. In that tab the redundant `## Implementation Notes` heading
 * is dropped (the tab label names it) and a root `<details>` disclosure wrapping
 * the notes is unwrapped to its inner content. The screen introduces no
 * `Tickbox`, no status-editing control, and no write.
 */

import { Fragment, useState, type ReactNode } from 'react';
import { Chrome, type ChromeTab } from '../../components/Chrome';
import { StatusPill, Chip } from '../../components/primitives';
import { ErrorSurface, LoadingSurface } from '../../components/StateSurface';
import { usePlanDetail, type PlanDetail, type Task } from '../../data/api';
import { useNavigate } from '../../router';
import { stripIdPrefix, splitTaskSections, unwrapRootDetails } from '../derive';
import { toTickboxState } from '../taskStatus';
import { READER, READER_INNER, READER_META, Section } from './ReaderProse';

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
      <div className="flex items-center gap-3 p-7 font-sans text-sm text-ink-3" role="alert">
        <StatusPill kind="todo" label="not found" />
        <span>
          No task <strong className="text-ink-2">{taskId}</strong> exists in this plan.
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
const stripLeadingTitle = (body: string): string => body.replace(/^\s*#[ \t]+[^\n]*(?:\r?\n)*/, '');

/** The dependency list: each resolved dep links to its task; others stay inert. */
function Dependencies({ id, task, byId }: { id: string; task: Task; byId: Map<number, Task> }) {
  const navigate = useNavigate();
  const deps = task.dependencies ?? [];
  if (deps.length === 0) {
    return <span className="text-ink-3">none</span>;
  }
  return (
    <>
      {deps.map(depId => {
        const resolved = byId.has(depId);
        if (resolved) {
          return (
            <Chip key={depId}>
              <span
                className="cursor-pointer"
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

/**
 * The task metadata header — an inline `.reader__meta` row at the top of the
 * reader column, mirroring the Plan reader's `filename · id · date` meta line
 * (`ReaderProse`). It replaces the former right rail (the task's metadata is too
 * sparse to justify a full column): group, skills, and dependency links sit
 * dot-separated on one wrapping row, so the prose runs full-width below with no
 * stranded dead space. Done state is conveyed by striking through the page
 * title (see `LoadedRoute`), not by a status pill — matching the blueprint
 * rails' done treatment.
 */
function TaskMeta({ id, task, byId }: { id: string; task: Task; byId: Map<number, Task> }) {
  const skills = task.skills ?? [];
  // The present meta items, dot-joined; the leading item carries no separator.
  const items: ReactNode[] = [];
  if (task.group) {
    items.push(
      <span className="inline-flex items-center gap-1.5">
        group <Chip>{task.group}</Chip>
      </span>
    );
  }
  if (skills.length > 0) {
    items.push(
      <span className="inline-flex items-center gap-1.5">
        skills
        {skills.map(skill => (
          <Chip key={skill}>{skill}</Chip>
        ))}
      </span>
    );
  }
  items.push(
    <span className="inline-flex items-center gap-1.5">
      deps <Dependencies id={id} task={task} byId={byId} />
    </span>
  );

  return (
    <div className="mb-6 flex flex-wrap items-center gap-x-3.5 gap-y-1 font-mono text-sm text-ink-3 [&>*]:whitespace-nowrap">
      {items.map((item, i) => (
        <Fragment key={i}>
          {i > 0 && <span>·</span>}
          {item}
        </Fragment>
      ))}
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

  // In the Implementation Notes tab, the tab label already names the section, so
  // the leading `## Implementation Notes` heading is dropped, and a root
  // `<details>` disclosure wrapping the notes is unwrapped to its inner content.
  // Sections after the boundary (rare) keep their own headings untouched.
  const notesForDisplay = notesSections.map((section, i) =>
    i === 0 ? { heading: '', content: unwrapRootDetails(section.content) } : section
  );

  // Render the active tab's sections through the shared `Section` component.
  // When the body has prose but no `##` headings at all, fall back to a single
  // synthetic section so leading-prose-only tasks do not blank — but render the
  // body with its leading `# ` title removed so it does not duplicate the page
  // heading as a second `<h1>`.
  const activeSections = hasNotes && activeTab === 1 ? notesForDisplay : bodySections;
  const fallbackBody = stripLeadingTitle(rawBody);
  const isEmpty = sections.length === 0 && fallbackBody.trim().length === 0;
  const renderSections =
    sections.length === 0 && fallbackBody.trim().length > 0
      ? [{ heading: '', content: fallbackBody }]
      : activeSections;

  // Done state reads as a struck-through, muted title (the blueprint rails'
  // convention), replacing a status pill in the metadata header.
  const isDone = toTickboxState(task.status) === 'done';
  const titleNode = isDone ? (
    <span className="text-ink-3 line-through">{task.name}</span>
  ) : (
    task.name
  );

  return (
    <>
      <Chrome
        title={titleNode}
        crumbs={['Plans', { label: slug, href: `/plans/${id}` }, 'tasks', task.name]}
        tabs={tabs}
        activeTab={activeTab}
        onTabSelect={setActiveTab}
      />
      <div className={READER} data-testid="reader">
        <div className={READER_INNER}>
          <TaskMeta id={id} task={task} byId={byId} />
          {isEmpty ? (
            <p className={READER_META}>This task has no description.</p>
          ) : (
            renderSections.map((section, i) => <Section key={i} section={section} />)
          )}
        </div>
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
