/**
 * Plans Cards view (Plan 86, Task 003).
 *
 * Ports the design's `PlansCardView` responsive card grid onto the vendored
 * `cards`/`card` classes and the Task 001 derived data. Each card shows
 * `plan · id`, title, summary, progress dots (via `progressDots`), a
 * `done/total · N phase(s)` line, a footer date, and a Review action for
 * drafted plans. Cards with no tasks show the "no tasks generated yet"
 * affordance. With no plans at all, a centered empty-state message replaces
 * the grid (mirroring the Board view's per-column "empty" affordance and the
 * Archive screen's empty state). View switching / Chrome belong to the Task
 * 006 route container.
 */

import { Button, Chip, StatusPill } from '../components/primitives';
import { useNavigate } from '../router';
import { cn } from '../vendor/utils/cn';
import { progressDots, planMdPath, type PlanView } from './derive';

export interface PlansCardViewProps {
  plans: PlanView[];
  /** Opens the Review command-hint modal for the given plan path. */
  openReview: (path: string) => void;
  /** Opens the archive-confirmation modal for a done plan. */
  openArchive: (name: string, id: number, title: string) => void;
}

/** The Cards (grid) view of the active plans. */
export function PlansCardView({ plans, openReview, openArchive }: PlansCardViewProps) {
  const navigate = useNavigate();

  if (plans.length === 0) {
    return (
      <div
        data-testid="plans-empty"
        className="flex flex-1 flex-col items-center justify-center gap-1.5 px-7 py-12 text-center"
      >
        <div className="font-display text-2xl font-semibold text-ink">No plans yet</div>
        <div className="max-w-md text-base text-ink-3">
          Plans are produced by the <Chip>st-create-plan</Chip> skill running inside your AI
          assistant and appear here automatically.
        </div>
      </div>
    );
  }

  return (
    <div className="grid flex-1 grid-cols-1 content-start gap-6 overflow-y-auto px-7 py-6 sm:grid-cols-2 lg:grid-cols-3">
      {plans.map(card => {
        const dots = progressDots(card.done, card.total, card.state);
        return (
          <div
            key={card.id}
            data-testid="plan-card"
            className={cn(
              'relative flex cursor-pointer flex-col rounded-card p-5',
              card.state === 'drafted'
                ? 'border border-dashed border-ink-3 bg-transparent'
                : 'border border-border-soft bg-cream shadow-sm'
            )}
            onClick={() => navigate(`/plans/${encodeURIComponent(card.name)}`)}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="font-mono text-xs font-semibold uppercase text-ink-3">
                  plan · {card.id}
                </div>
                <div className="mt-px overflow-hidden text-ellipsis whitespace-nowrap font-mono text-base font-semibold text-ink">
                  {card.title}
                </div>
              </div>
              <StatusPill kind={card.state} />
            </div>
            <div className="mt-2 mb-1 font-display text-lg font-semibold text-ink">
              {card.summary}
            </div>

            {card.total != null ? (
              <>
                <div className="mt-3 flex flex-wrap items-center gap-1">
                  {dots.map((dot, i) => (
                    <span
                      key={i}
                      className={cn(
                        'h-3 w-3 rounded-sm ring-1',
                        dot === 'done'
                          ? 'bg-done ring-done'
                          : dot === 'doing'
                            ? 'bg-doing ring-doing'
                            : 'bg-transparent ring-border-strong'
                      )}
                    />
                  ))}
                </div>
                <div className="mt-1.5 font-mono text-xs text-ink-3">
                  {card.done}/{card.total} tasks done
                  {card.phases != null && ` · ${card.phases} phase${card.phases > 1 ? 's' : ''}`}
                </div>
              </>
            ) : (
              <div className="mt-3 font-mono text-xs italic text-ink-3">no tasks generated yet</div>
            )}

            <div className="mt-3 flex items-center justify-between gap-2 border-t border-border-soft pt-3 font-mono text-xs text-ink-3">
              <span>
                {card.completedAt ? `done ${card.completedAt}` : `created ${card.created}`}
              </span>
            </div>

            {card.state === 'drafted' && (
              <div className="mt-2.5 flex justify-end">
                <span
                  onClick={e => {
                    e.stopPropagation();
                    openReview(planMdPath(card));
                  }}
                >
                  <Button kind="outline" size="sm" icon="review">
                    Review in self-review
                  </Button>
                </span>
              </div>
            )}

            {card.state === 'done' && (
              <div className="mt-2.5 flex justify-end">
                <span
                  onClick={e => {
                    e.stopPropagation();
                    openArchive(card.name, card.id, card.title);
                  }}
                >
                  <Button kind="outline" size="sm" icon="archive">
                    Archive
                  </Button>
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
