# Knowledge admission criteria

<!--
  Version: 2
  Single source of truth for the durability admission criteria (keep/drop) and
  the modification-restraint criteria (how a curate `modify` may touch an
  existing node). Referenced by kk-curate (drop + modify rules), kk-bootstrap
  (step 5 skip list), the kk-curate batch agent prompt, and proposal-extract.md.
  Edit here; the consumers point at this file rather than restating it.
-->

The knowledge base holds only **durable operating principles** and
**current-state facts** the project deliberately maintains. Activities, events,
and history are not knowledge, even when stated as plain fact. Skip (for
bootstrap/extraction) or `drop` (for curation) a candidate when it is any of the
following:

- **Maintenance or lifecycle action.** Version bumps, deprecations, releases,
  dependency updates, rebuilds, changelog edits ("we deprecated the old npm
  package", "bumped the prompt to v5"). Record the current state, never the act
  that produced it.
- **Project story or history — especially plan/ticket/issue references.**
  Narration of what was done. **Any reference to a plan, ticket, issue,
  work-order, or task id is a red flag** (for example "Plan 96 wire and fix
  serve UI interactions"): that history belongs in git, not the knowledge base.
  A candidate that names or links such an artifact is almost always out.
- **Incidental fact disguised as a practice.** A fact hit once while fixing a
  one-off problem, dressed up as a convention ("first publish of an npm package
  requires a token"). A real practice is a rule the project deliberately and
  repeatedly follows, not a circumstance encountered once.

**The keep test:** would this still be a deliberate operating principle, or a
current structural fact, six months from now — independent of the activity that
surfaced it? If yes, keep it; if it only makes sense as a record of something
that happened, skip/drop it.

**Salvage rule.** When a candidate carries a clean durable principle or
current-state fact alongside the action or story, keep only that part, rewritten
as a standing rule or a present-tense fact. When the entire candidate is the
activity, the journey, or the history, drop the whole thing.

## Modification restraint (curate `modify` only)

Admission decides whether a candidate enters the knowledge base at all; this
section decides how an admitted `modify` may touch an existing node. It applies
only to the curator's `modify` action — `add`, `contradict`, and `drop` are
unaffected, and bootstrap / extraction never modify in place.

- **Prefer minimal in-place edits over rewrites.** Merge the candidate's new
  information into the existing body surgically — replace the one stale
  sentence, add the one missing case — rather than rewriting the whole node.
  Accurate nodes are never churned to absorb a candidate that adds nothing real.
  If the candidate is essentially the same content rephrased, that is a `drop`,
  not a `modify`.
- **Every edit traces to a cause.** No node may be edited without a traceable
  source: the specific proposal (its `candidate_origin`) or the specific
  conflict that necessitated the change. If you cannot name the proposal or
  conflict that caused the edit, do not make the edit. Impact-plan style:
  source change → node affected → edit needed → why.
- **No formatting-only edits.** Never rewrite a node's prose, reorder its
  bullets, or restyle its headings just to tidy it up. A `modify` must carry
  real new information; a formatting-only change is a `drop`.
- **A no-op curate run is a correct outcome.** When every candidate is a
  rephrasing, low-signal, or already covered, the correct result is zero writes
  — every candidate `drop`ped and the existing nodes left untouched. Report
  "no changes; the knowledge base is current" plainly; do not manufacture edits
  to justify the run.
