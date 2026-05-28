/**
 * Plans Cards view (Plan 86, Task 003).
 *
 * Ports the design's `PlansCardView` responsive card grid onto the vendored
 * `cards`/`card` classes and the Task 001 derived data. Each card shows
 * `plan · id`, title, summary, progress dots (via `progressDots`), a
 * `done/total · N phase(s)` line, a footer date, and a Review action for
 * drafted plans. Cards with no tasks show the "no tasks generated yet"
 * affordance. View switching / Chrome belong to the Task 006 route container.
 */

import { Button, StatusPill } from '../components/primitives';
import { useNavigate } from '../router';
import { progressDots, planMdPath, type PlanView } from './derive';

export interface PlansCardViewProps {
  plans: PlanView[];
  /** Opens the Review command-hint modal for the given plan path. */
  openReview: (path: string) => void;
}

/** The Cards (grid) view of the active plans. */
export function PlansCardView({ plans, openReview }: PlansCardViewProps) {
  const navigate = useNavigate();

  return (
    <div className="cards">
      {plans.map(card => {
        const dots = progressDots(card.done, card.total, card.state);
        return (
          <div
            key={card.id}
            className={`card${card.state === 'drafted' ? ' card--drafted' : ''}`}
            onClick={() => navigate(`/plans/${card.id}`)}
          >
            <div className="card__head">
              <div style={{ minWidth: 0, flex: 1 }}>
                <div className="card__id">plan · {card.id}</div>
                <div className="card__slug">{card.title}</div>
              </div>
              <StatusPill kind={card.state} />
            </div>
            <div className="card__title" style={{ fontSize: 17, margin: '8px 0 4px' }}>
              {card.summary}
            </div>

            {card.total != null ? (
              <>
                <div className="card__progress">
                  {dots.map((dot, i) => (
                    <span
                      key={i}
                      className={`card__progress-dot${
                        dot === 'done'
                          ? ' card__progress-dot--done'
                          : dot === 'doing'
                            ? ' card__progress-dot--doing'
                            : ''
                      }`}
                    />
                  ))}
                </div>
                <div
                  style={{
                    marginTop: 6,
                    fontFamily: 'var(--font-mono)',
                    fontSize: 11,
                    color: 'var(--ink-3)',
                  }}
                >
                  {card.done}/{card.total} tasks done
                  {card.phases != null && ` · ${card.phases} phase${card.phases > 1 ? 's' : ''}`}
                </div>
              </>
            ) : (
              <div
                style={{
                  marginTop: 12,
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11.5,
                  color: 'var(--ink-3)',
                  fontStyle: 'italic',
                }}
              >
                no tasks generated yet
              </div>
            )}

            <div className="card__foot">
              <span>{card.completedAt ? `done ${card.completedAt}` : `created ${card.created}`}</span>
            </div>

            {card.state === 'drafted' && (
              <div style={{ marginTop: 10, display: 'flex', justifyContent: 'flex-end' }}>
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
          </div>
        );
      })}
    </div>
  );
}
