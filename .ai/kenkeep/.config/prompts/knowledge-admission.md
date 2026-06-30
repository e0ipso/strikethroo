# Knowledge admission criteria

<!--
  Version: 1
  Single source of truth for the durability admission criteria. Referenced by
  kk-curate (drop rules), kk-bootstrap (step 5 skip list), the kk-curate batch
  agent prompt, and proposal-extract.md. Edit here; the consumers point at this
  file rather than restating it.
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
