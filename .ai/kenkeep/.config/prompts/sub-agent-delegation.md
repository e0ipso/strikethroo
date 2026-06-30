# Sub-agent delegation: probe, cap, fallback

<!--
  Version: 1
  Single source of truth for the sub-agent probe / concurrency-cap / inline-
  fallback orchestration contract shared by kk-curate, kk-bootstrap, and kk-add.
  Each skill points at this file and keeps only its skill-specific draft shape
  and collector handling. Edit here; do not restate this contract in a skill.
-->

Some runtimes can delegate focused work to a sub-agent that runs in a **separate
context window** and returns a structured result. Delegating keeps the host
transcript free of the agent's intermediate deliberation, so the user sees only
the final summary. Each skill that uses delegation decides once, here, whether
to take its parallel path or its inline fallback.

## Probe (decide once)

Probe your own tool surface: **does your runtime expose a sub-agent / task
dispatch primitive that runs in a separate context window and returns a
structured result?**

- **Yes** → take the skill's parallel path.
- **No, or unsure** → take the skill's inline fallback path.

Recursion into yourself, or shelling out to another instance of your own CLI in
`-p`-style headless mode, does **not** count as delegation — take the inline
fallback in that case. Make this probe once, before issuing any work, so you can
never end up in a half-state: if at any moment you are unsure whether the
dispatch primitive exists, take the fallback.

## Concurrency cap

Cap concurrency at **5 sub-agents per orchestrator turn**. If the work splits
into N > 5 units, issue them in waves of up to 5: dispatch wave 1, await all
results in the collector, then dispatch wave 2, and so on. Hosts that support
concurrent agents top out near ~10; holding the cap at 5 leaves headroom for the
orchestrator's own tool calls and bounds rate-limit risk.

## Draft and log artefacts

- Each delegated unit writes its result to a **predetermined absolute path**
  (`${LOG_DIR}/${RUN_ID}__<batchN>.draft.json`). The path must be absolute —
  sub-agents may not share the orchestrator's cwd.
- Before delegating a unit, append an `{"event":"issued",...}` line to that
  unit's `${RUN_ID}__<batchN>.jsonl` log.
- The **collector turn** runs in the orchestrator's context after every agent in
  the wave returns. For each unit it reads the draft, validates it, records an
  `{"event":"validated",...}` or `{"event":"invalid",...}` line, and on invalid
  output surfaces `batch <batchN> produced invalid output, skipped` and
  continues. **Never abort the whole run** — partial progress across surviving
  units beats re-running everything.

The skill defines what goes in each draft and how the collector consumes the
survivors; this appendix owns only the probe, the cap, and the artefact shape.
