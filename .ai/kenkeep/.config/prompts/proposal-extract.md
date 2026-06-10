# Proposal Extraction Prompt

<!--
  Version: 1
  Used by: the kk-proposal-drain hook (via a headless harness session)
  Owner contract: produces the structured `proposals.practice` and `proposals.map` arrays
  for a session log. Must emit one JSON object on stdout as the final message.
-->

You are extracting reusable project knowledge from a transcript of an AI coding session. Your job is to identify the small subset of session content that represents **knowledge worth remembering across sessions** - and ignore everything else, which is the vast majority.

The transcript is provided as role-tagged segments below. Each segment is prefixed with `[USER]:` or `[AGENT]:`. You will run two extraction passes and produce a single combined JSON output at the end.

---

## Session-disposition gate

Before extracting any candidate, judge the **session disposition**: did the session, taken as a whole, converge on durable knowledge worth recording? The unit of judgment here is the **session**, not the individual turn. This filter operates at a different level from the two later filters and stacks with them: the task-specific scope filter judges whether a single rule generalizes across files and changes, and the end-state framing rule judges the wording of a single candidate body. Session disposition asks a prior question, about the conversation as a whole.

If the session reads as **non-productive**, emit `{"practice": [], "map": []}` and stop. Four non-productive shapes apply, each a whole-session reject: abandoned, exploratory, unrelated, and meta-only.

- **Abandoned / dead-end.** The user reverses an in-flight approach without committing to a replacement. Triggers in the transcript include "let's not do this", "never mind", "we'll come back to this", "let's defer this", "actually, don't bother". The session ends with the reversal or with a tangent, not with a durable claim. This shape is distinct from the corrective pattern below: a corrective pattern names a replacement rule ("don't do X, do Y"); abandonment names no replacement.
- **Exploratory / open-ended.** The session is investigation that surveys options without selecting one. Triggers include "what could we do about X?", "let me look at how this works", "I'm trying to understand Y". Questions are raised, hypotheses are floated, no end-state claim is committed to.
- **Unrelated / off-project.** The session is not about this project. General programming help, work on a different repository, personal conversation, support questions that do not reference this project's modules, vocabulary, or conventions.
- **Meta-only.** The session's visible work is planning, tasking, brainstorming, scoping, or architecture-sketching, without arriving at a durable end-state claim about the project itself. Plan or task documents under `.ai/task-manager` (or any equivalent location the session reveals) are the canonical case, but the category is broader: any conversation that talks *about* what to build rather than capturing how the project already is. The whole session is skipped, with **no exception** for imperative corrections that occur mid-conversation; consistency with the other three shapes wins over per-candidate salvage.

**Gate decision.** If any of the four shapes applies to the session as a whole, emit `{"practice": [], "map": []}` and stop. Producing nothing is the correct output for a non-productive session, just as it is for a productive session with no teaching moments.

**Confidence-bias rule for the gate.** When the session's disposition is ambiguous (could be productive, could not), prefer the empty proposal. A phantom convention costs more to remove than a missed real one costs to leave on the table.

**Scope clarification.** The gate is about session disposition, not candidate quality. A productive session with low-quality candidates still passes the gate; the per-candidate filters then decide which candidates are kept. A non-productive session with apparently high-quality candidates fails the gate; no candidates survive.

### Inline example: a meta-only session that contains a rule-shaped statement

This example exists to inoculate against the most common false positive: phantom conventions extracted from planning conversations.

**Input transcript:**

```
[USER]: I'm drafting a plan under .ai/task-manager/plans/12--release-gate/ for the new release gate. Can you outline the success criteria for me?
[AGENT]: Sure. I'll list candidate criteria: a CI run on the PR, a successful build of the docs site, and a passing smoke test on the staging deploy.
[USER]: Good. Let me state it as a rule: we always want a CI gate before merging. Add that to the plan's success criteria section.
[AGENT]: Added. The success criteria now lists "CI gate before merging" as criterion 1.
[USER]: Let me reread the plan and decide what else belongs there. I'll come back to this.
```

**Correct output:**

```json
{"practice": [], "map": []}
```

**Commentary on why the gate fires (not part of the JSON output):**

The session is meta-only. Its visible work is plan-authoring under `.ai/task-manager/plans/`. The statement "we always want a CI gate before merging" reads rule-shaped, but its subject is the plan's success criteria section, not a project-wide convention. The conservative gate skips the whole session, with no exception for the rule-shaped mid-thread statement. This is the failure mode the gate inoculates against: extracting a phantom project rule from a planning conversation. If the project genuinely adopts a CI-gate rule later, a follow-up session that states the rule in non-planning context will capture it then.

---

## What you are looking for

There are exactly two kinds of knowledge worth capturing:

### End-state framing rule (applies to both kinds)

Every candidate body describes the project as it currently is. Practice bodies state the rule in present tense. Map bodies describe the entity as it now exists.

Transition narratives are not valid bodies. A transition narrative is any wording that describes the journey rather than the destination, such as "we used to do X, now do Y", "renamed F to G", "removed Z", "switched from A to B", or "migrated from old framework to new framework". When a transition is present in the transcript, you record only the resulting **end-state** claim (for example: "the config file is YAML") and discard the journey.

Map nodes are not emitted with bodies like "X was added" or "Y was renamed to Z". They describe the entity as it now is. If the only information you have about a thing is that it changed, that thing is not yet a map candidate.

If a candidate body cannot be rewritten in present tense without losing its meaning, drop it. A pure transition narrative has no end-state claim to extract.

### Practice nodes, "how we build things"

These are imperative, action-guiding statements about how this project does things. They include:

- **Conventions:** "When doing X, use Y." "We always do A before B."
- **Prohibitions:** "Don't use approach Z." "Never call this method directly."
- **Gotchas:** "If you do X the obvious way, it breaks because of Y."
- **Decision rationale:** "We chose A because B didn't handle case C." Rationale makes a practice node much more durable; capture it when you see it.
- **Tooling/workflow:** "Tests run with command X." "Deploys go through pipeline Y."

**Practice nodes are extracted strictly from `[USER]:` turns.** The user is the source of project-specific knowledge; the agent's text is context only. If the agent says "So you want me to use X for Y" after the user said "use X for Y," do not treat the agent's paraphrase as a teaching moment - the user's statement is the source. Quote or paraphrase from the user's turn.

#### Imperative corrections in user turns (corrective pattern)

Some of the strongest practice signal lives in `[USER]:` turns that reverse what the agent just did. Treat these phrasings as first-class practice candidates whenever the corrected behavior generalizes beyond the current task:

- "don't do X, do Y"
- "no, never use that approach"
- "stop doing Z"
- "use Y instead"
- Similar imperative reversals, including "actually, …", "wrong, …", "that's not how we do it, …".

Each such turn is a **corrective pattern** trigger. Extract the rule (not the violation) in present tense: the practice body states what to do (or not do) going forward, framed as a project convention. If the user provided a rationale, capture that too.

Gate every corrective pattern through the task-specific filter below. If the underlying rule only constrains code touched in the current change, prefer drop.

#### Self-review-apply turns

When you see a `[USER /self-review-apply ...]:` tag, treat each narrated change in the following agent turn (which is tagged `[AGENT NARRATION OF SELF-REVIEW ...]:`) as a candidate corrective signal. Apply both the corrective-pattern rule and the task-specific filter to each narrated change independently.

### Map nodes, "what exists in this project"

These describe the entities, features, vocabulary, and locations of the project:

- **Features:** "Bravo Insider is our personalized section for authenticated users."
- **Vocabulary:** Project-specific names and what they mean. "CardSourceResolver is the service that picks which entities go into a feed."
- **Module/file locations:** "The card feed module lives at `modules/custom/bravo_cards`."
- **Architectural relationships:** "Module X depends on service Y."

**Map nodes can be extracted from either `[USER]:` or `[AGENT]:` turns.** Sometimes the agent surfaces a module name or file location during exploration that's worth recording. Both roles are valid sources.

---

## What you are NOT looking for

Most of the transcript is not knowledge. Do not capture:

- Code the agent wrote that the user accepted without correction.
- Bug fixes for typos, syntax errors, or generic mistakes ("you have a typo in line 4" is not knowledge).
- File reads, `ls`, `grep`, or exploration steps the agent took to orient.
- Routine method implementations that the user accepted as-is.
- General programming knowledge (how to write a getter, what dependency injection is, how HTTP works).
- Restatements of standard framework behavior that anyone reading the docs would know.
- Anything that could be re-derived by reading the codebase.
- Maintenance or lifecycle actions: version bumps, deprecations, releases, dependency updates, rebuilds, changelog edits. Record the current state, not the act that produced it.
- Project story or history - and especially any reference to a plan, ticket, issue, work-order, or task id. That history belongs in git, not the knowledge base.
- Incidental facts the agent hit once while fixing a one-off problem but that read like a convention. A practice is a rule the project deliberately and repeatedly follows.

The signal for capture is: **did the user have to teach the agent something the agent couldn't have known from the codebase or from general knowledge? Or did the user introduce a named thing that didn't exist in the project's vocabulary before?** Everything else is noise. When in doubt, skip.

### Task-specific scope filter

Many corrective signals look like rules but only apply to the immediate change. These have **task-specific scope** and must be dropped. Concrete heuristics:

- References to one-off variable names, function names, or single file paths that are not load-bearing elsewhere in the project.
- Scope markers such as "in this PR", "in this branch", "in this commit", "for this file", "for this function", "for this test".
- Wording that only makes sense in the context of the current change ("rename this back", "undo the line you just added", "the new field you introduced should be camelCase").
- Comments whose subject is a specific edit, not a general property of the codebase.

Pair this filter with a confidence-bias rule: **when a corrective signal does not generalize to a project-level rule, prefer drop over emitting a low-confidence practice candidate.** A high-confidence project rule is worth a node; a low-confidence guess at a rule is not.

Framing aid: **the rule's *scope*, not its *occasion*, decides task-specificity.** A genuine project-wide rule that the user happens to mention "in this PR" (because that is where the violation was noticed) is still project-wide and is kept. A rule that only constrains code touched in this PR is task-specific and is dropped. Read the corrective signal carefully and ask: would this rule still be true on a different file, in a different change, six months from now? If yes, keep. If no, drop.

### Transition narratives (change-oriented framing)

Even outside corrective signals, transcripts often contain change-oriented framing: "we used to do X", "this was renamed", "we removed the old service", "we migrated to Y". Treat a **transition narrative** as a transcript artifact, not as knowledge. The only retainable content in such a turn is the resulting end-state claim, extracted in present tense. If no clean end-state claim is present, drop the whole turn.

### Durability filter: principles and facts, not actions or story

The knowledge base holds only **durable operating principles** and **current-state facts** the project deliberately maintains. Activities, events, and history are not knowledge, even when stated as plain fact. Drop a candidate when it is any of the following:

- **Maintenance or lifecycle action.** Version bumps, deprecations, releases, dependency updates, rebuilds, changelog edits - "we deprecated the old npm package", "bumped the prompt to v5". Record the current state, never the act that produced it.
- **Project story or history.** Narration of what was done. **Any reference to a plan, ticket, issue, work-order, or task id is a red flag** (for example "Plan 96 wire and fix serve UI interactions"): that history belongs in git, not the knowledge base. A candidate that names or links such an artifact is almost always a drop.
- **Incidental fact disguised as a practice.** A fact the agent happened to hit while fixing a one-off problem, dressed up as a convention - "first publish of an npm package requires a token". A real practice is a rule the project deliberately and repeatedly follows, not a circumstance encountered once.

The keep test: *would this still be a deliberate operating principle, or a current structural fact, six months from now - independent of the activity that surfaced it?* If yes, keep it; if it only makes sense as a record of something that happened, drop it. Examples that pass: "e2e tests must use stable semantic selectors", "CodeMirror is code-split in the markdown editor page". Examples that fail: the three bullets above.

This filter stacks with the end-state framing rule rather than replacing it. A transition narrative describes a *change* ("X became Y"); a maintenance action or story need not describe any change at all - it is simply an activity or an event. Both are out. When a candidate carries a clean durable principle or current-state fact alongside the action or story, keep only that part, rewritten as a standing rule or a present-tense fact.

---

## Ownership boundary between the two passes

A single user statement can contain both kinds of content. Split them:

> "Use the bravo_analytics dispatcher for tracking - it's a service we built so we can swap backends without rewriting every module."

This has:
- A practice node: "Use the bravo_analytics dispatcher for all event tracking (rationale: swappable backends)."
- A map node: "bravo_analytics.dispatcher - service that fans out tracking events to whatever backend is currently wired in."

Practice owns the imperative knowledge (do/don't/why). Map owns the named entity (what it is). They reference each other later via `relates_to` populated by the curator; you do not need to populate `relates_to` in your output.

---

## Inline example

Here is a small example transcript and the correct output, so you know exactly what's expected.

**Input transcript:**

```
[USER]: Let's add caching to the user profile page. Use Drupal's render cache.
[AGENT]: I'll add #cache properties with appropriate contexts and tags.
[USER]: No, don't use the default render cache for profile pages. We have a custom cache backend for anything with PII - the service is bravo_pii.cache. It encrypts at rest. Default Drupal cache stores plaintext in the database and we got dinged on that during the GDPR audit.
[AGENT]: Got it. I'll use bravo_pii.cache instead.
```

**Correct output:**

```json
{
  "practice": [
    {
      "kind": "practice",
      "tags": ["caching", "pii", "gdpr", "drupal"],
      "title": "Use bravo_pii.cache for any content with PII",
      "summary": "Don't use Drupal's default render cache for PII-bearing pages; use bravo_pii.cache (encrypts at rest).",
      "body": "For pages that render personally-identifiable information, the default Drupal render cache is not acceptable because it stores plaintext in the database. Use the `bravo_pii.cache` service instead - it encrypts at rest. This was flagged during the GDPR audit.\n\nApplies to: any route or render array that includes user-identifying data.",
      "confidence": "high"
    }
  ],
  "map": [
    {
      "kind": "map",
      "tags": ["service", "caching", "pii"],
      "title": "bravo_pii.cache - encrypted cache backend for PII",
      "summary": "Custom Drupal cache backend service that encrypts at rest; used wherever content includes user PII.",
      "body": "`bravo_pii.cache` is a custom cache backend service. It encrypts cached entries at rest, unlike Drupal's default render cache which stores plaintext in the database. Adopted in response to a GDPR audit finding.",
      "confidence": "high"
    }
  ]
}
```

Notice what the example does NOT capture:
- The agent's initial mention of "#cache properties" - that's just standard Drupal knowledge, not project-specific.
- The agent's "Got it" acknowledgment - paraphrasing isn't a teaching moment.

### Inline example: a self-review-apply turn

This second example shows the self-review-apply pattern in action. It produces one kept practice candidate (a generalizable rule) and one dropped item (a task-specific comment). Note the role markers: the user turn carries the `[USER /self-review-apply ...]:` tag and the agent narration carries `[AGENT NARRATION OF SELF-REVIEW ...]:`. The example below uses those tags directly.

**Input transcript:**

```
[USER /self-review-apply feedback/round-2.xml]: /self-review-apply feedback/round-2.xml
[AGENT NARRATION OF SELF-REVIEW feedback/round-2.xml]: I worked through the review comments in feedback/round-2.xml and applied two changes.

First, the reviewer flagged that I had used a single-letter loop variable `i` inside `src/lib/feed-builder.ts`. The note said loop variables in this codebase always use descriptive names so the intent is readable at a glance. I renamed `i` to `cardIndex`.

Second, the reviewer pointed out a typo in the JSDoc for `assembleHeroCard`: "recieves" should be "receives". I fixed the typo in that one docstring.
```

**Correct output:**

```json
{
  "practice": [
    {
      "kind": "practice",
      "tags": ["typescript", "naming", "readability"],
      "title": "Loop variables use descriptive names",
      "summary": "Loop variables in this codebase use descriptive names (for example cardIndex) rather than single letters, so intent is readable at a glance.",
      "body": "Loop variables in this codebase use descriptive names that convey what is being iterated, such as `cardIndex` or `userId`. Single-letter loop counters like `i`, `j`, or `k` are not used. The rule applies to every loop in the codebase, not only to the file where it was flagged.\n\nRationale: readability at a glance. A descriptive loop variable removes the need to scan the loop body to remember what is being indexed.",
      "confidence": "high"
    }
  ],
  "map": []
}
```

**Commentary on what was dropped (not part of the JSON output):**

The second review comment (the "recieves" typo in `assembleHeroCard`'s JSDoc) is dropped. The drop reason is **task-specific scope**: the comment names one specific docstring in one specific function, and the underlying rule (spell words correctly) is general programming knowledge rather than a project convention. No practice candidate is emitted for it. Producing nothing for that comment is correct; emitting a low-confidence "spell things correctly" practice candidate would be noise.

Notice how the kept candidate's body is written in present tense as an end-state rule. It does not say "the agent used to write single-letter loop variables and was corrected"; it says "loop variables in this codebase use descriptive names". The transition (the rename of `i` to `cardIndex`) is the occasion that surfaced the rule; the rule itself is the captured knowledge.

---

## Output schema

You must produce exactly one JSON object as your final output. It has two keys: `practice` and `map`, each an array of zero or more candidate nodes.

Each candidate has these required fields:

- `kind`: `"practice"` or `"map"` (must match the array it's in).
- `tags`: array of 1-5 short lowercase tags. Prefer existing tag conventions if visible from the transcript.
- `title`: short imperative (for practice) or noun phrase (for map). Max ~80 characters.
- `summary`: max 140 characters. This is what shows up in the knowledge base index.
- `body`: markdown explaining the knowledge. Include rationale when present in the source ("because…", "since…"). Keep concise - 1-4 short paragraphs is typical.
- `confidence`: `"low"`, `"medium"`, or `"high"`. Use `"high"` when the user stated it explicitly with rationale; `"medium"` when the user stated it without rationale; `"low"` when you're inferring from context.

The wrapper rejects any additional keys on a candidate (including the legacy `supports_existing_node` / `contradicts_existing_node` hints).

Either array may be empty. Many sessions produce zero of one kind or both - that's expected and correct. **Producing nothing is better than producing low-signal noise.**

---

## Final instructions

1. Read the transcript carefully.
2. For each `[USER]:` turn, ask: is the user teaching the agent something project-specific, or stating a project convention/prohibition/rationale? If yes, that's a practice candidate.
3. For each `[USER]:` or `[AGENT]:` turn, ask: does this introduce a named entity, feature, module, file location, or vocabulary term that someone unfamiliar with the project wouldn't know? If yes, that's a map candidate.
4. Apply the ownership boundary: split combined statements into a practice piece and a map piece.
5. Reject anything that fails the "could be derived from the codebase or general knowledge" test, plus anything that is a maintenance or lifecycle action, project story or history (especially plan/ticket/issue references), or an incidental one-off fact dressed up as a practice.
6. Emit one final JSON object matching the schema above. No prose before or after the JSON.

The transcript begins below.

---

[TRANSCRIPT PLACEHOLDER, substituted at runtime]
