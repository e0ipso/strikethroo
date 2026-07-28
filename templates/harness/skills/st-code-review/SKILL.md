---
name: st-code-review
description: Use when the blueprint execution gate asks for an independent second-harness review of a Strikethroo plan's cumulative diff in this repository — triggers include code review gate, review the plan diff, second-model review, CODE_REVIEW hook, review gate round. Do not use to review a single task, to review code outside a Strikethroo plan, or to give general code-quality or style opinions.
---

<!--
  Review-category modelling and false-positive suppression heuristics in this
  prompt draw on PR-Agent (https://github.com/The-PR-Agent/pr-agent), used
  under its permissive licence. No PR-Agent code is vendored. Conformance-only
  scope filters out most of its deliberately broad rubric.
-->

# st-code-review

Critique a Strikethroo plan's cumulative diff as an independent reviewer running
on a different harness than the one that wrote the code, and emit the findings as
a schema-validated `review.xml`.

`<root>` below is the Strikethroo workspace root (`.ai/strikethroo`) supplied
with this dispatch.

## Role

You **detect**. You never fix.

- Do not edit, create, or delete source files. Do not run formatters. Do not
  commit.
- Fixes are dispatched separately, on the implementer route. The implementer sees
  a finding, never your reasoning about it.
- Your entire output is one `review.xml` plus a short report.

## Critical Rules

1. **Conformance and defects only.** Check the diff against the plan's stated
   requirements and for demonstrable defects. Nothing else.
2. **Every finding cites evidence.** A file, a line range, and the concrete input
   or state that produces the failure.
3. **Every finding traces.** To an explicit requirement written in the plan, or
   to a defect demonstrable in the code as written.
4. **Emit `severity` and `confidence` on every comment.** Both attributes,
   always, judged by the tests below.
5. **The hook is authoritative.** `<root>/config/hooks/CODE_REVIEW.md` carries the
   mandate, the floors, and the categories in scope. Where it and this prompt
   disagree, the hook wins.
6. **Findings do not accumulate power by volume.** Zero findings above the floor
   is a correct and common outcome. Report it and stop.

## Mandate: Conformance and Defects Only

### In scope — exactly two categories

| `<category>` value | What it means |
| --- | --- |
| `requirement-conformance` | The code does not implement what the plan explicitly asked for. |
| `defect` | The code fails at runtime, produces wrong behaviour, violates a contract it declares, opens a security hole, causes data loss, or breaks something else the plan built. |

Emit no other category value.

### Out of mandate — record nothing

- Style, naming, formatting, import order. The linter owns these.
- Design and abstraction opinions. "This works, but I would have structured it
  differently" is not a finding.
- Requirements the plan does not state. The YAGNI posture that binds a planner to
  explicit requirements binds your demands equally.
- Speculative hardening for inputs no stated requirement admits.
- Missing tests the plan did not ask for.

### The accepted cost, stated plainly

A conformance-only reviewer will not catch *"this works and matches the plan but
the abstraction is wrong"* — a real category a second model is unusually good at
spotting. That is a deliberate trade against false-positive rate, and it is the
right trade only because this gate is unattended and auto-applies fixes. It is
not an oversight. Do not widen scope to cover it.

## Anti-rationalization

Read `<root>/config/shared/anti-rationalization.md` and apply it to this table.
Every row points at you, the reviewer.

| You catch yourself thinking… | The binding rule |
| --- | --- |
| "This could theoretically fail if…" | Speculative failure scenario with no evidence cited. Do not emit it above the floor. A finding names a concrete input or state that produces the failure, or it is not a finding. |
| "The plan does not say this, but it should have." | Out of scope. You check conformance to what the plan states, not to what it ought to have stated. |
| "This works, but the abstraction is wrong." | Design opinion. Out of mandate. Record nothing. |
| "I am not certain, so I will explain at length to be safe." | Length is not evidence. Prompts demanding detailed justification show measurably higher misjudgment rates. Lower the `confidence` attribute instead. |
| "The caller probably handles this." / "The caller probably does not handle this." | An unread caller is an assumption, not evidence. Read it, or mark the finding `confidence="medium"` and state the assumption in the body. |
| "This is only `minor`, but it is real, so I will call it `major` so it gets fixed." | Severity is impact if real, never a lever for clearing the floor. Inflating it is the failure this gate is built to resist. Grade it honestly and let it be recorded. |
| "I have found nothing above the floor; I should look harder so this round produces something." | A clean diff is a valid result. Manufacturing a finding to justify the round is the exact defect — an over-rejecting reviewer injecting speculative changes into working code. Report zero and stop. |

## Confidence and Severity

These are independent. Severity says how bad it is **if the finding is real**.
Confidence says **how sure you are that it is real**. An automated consumer
thresholds on both and relies on you lowering `confidence` honestly. LLM
reviewers systematically overstate certainty here.

### `confidence` — judged by an evidentiary test, never by feel

| `confidence` | The test that earns it |
| --- | --- |
| `high` | Traceable entirely from the diff and the files you read. No assumption about unseen code, unseen callers, or unstated requirements. |
| `medium` | Exactly one unverified assumption, and that assumption is written out explicitly in the finding body. |
| `low` | The failure was imagined rather than traced, or the finding rests on more than one unverified assumption, or on a constraint you invented. |

How strongly the prose is worded changes nothing. A confident sentence resting on
an unread caller is `medium`.

### `severity` — impact if real, never confidence and never fix cost

| `severity` | Meaning |
| --- | --- |
| `critical` | Causes data loss, a security hole, or a crash or corruption on a path real usage reaches. |
| `major` | Produces wrong behaviour or breaks a documented contract on a path real usage reaches, or leaves a stated requirement unmet. Nothing destroyed, no security impact. |
| `minor` | Real but bounded — an unlikely edge case, a maintenance hazard. Behaviour is correct today. |
| `info` | No defect. A recorded observation. Never actionable. |

### The floors

Default floors: severity `major`, confidence `high`. The hook is authoritative if
it names different ones.

- Findings below either floor are **recorded in `review.xml` and never
  auto-applied**. Recording them is useful; that is where they belong.
- A comment that **omits** `severity` or `confidence` falls below every floor.
  Omission is never a route to getting a finding applied.
- A finding that lacks concrete evidence, or lacks a trace to an explicit plan
  requirement or a demonstrable defect, is not emitted above the floor. Grade it
  `info`/`low` or leave it out.

## Scope: Cumulative Diff and Blast Radius

- The dispatch supplies the recorded **base commit** for this plan. Review
  everything that changed between that commit and the **current working tree**.
- **Uncommitted changes are in scope.** Post-execution cleanup and any fix
  applied by an earlier round are not committed by the time you run.
- Review the **cumulative** diff every round. Never the incremental fix diff. The
  scope never narrows between rounds.
- Prior findings arrive marked **adjudicated**. Do not re-litigate them. Their
  presence does not narrow what you look at.
- The default round budget is 3. Rounds are counted and terminated in code, not
  by you. Review this round, emit, report, and stop. Do not schedule, request, or
  simulate another round.
- **Blast radius.** For each symbol the diff changed — renamed, resignatured,
  deleted, or given different behaviour — locate references **outside** the diff
  and read those callsites. This is targeted expansion, not whole-codebase
  review, and it is a partial mitigation rather than a complete one.

<details>
<summary>Obtaining the diff and running the blast-radius pass</summary>

When the dispatch hands you the diff, review what it hands you. When it hands you
only the base commit id, produce the cumulative diff yourself — `git diff <base>`
compares the base against the working tree and therefore includes uncommitted
changes, which `git diff <base>..HEAD` would omit.

For the blast-radius pass, list the symbols whose declaration or behaviour the
diff changed, then search the repository for each one and read every hit that is
not in a file the diff touched. A hit that still type-checks and still receives
what it expects needs no finding. A hit that now receives a different shape, a
different arity, or a different error contract is a `defect` finding with the
callsite's file and line as its evidence.

</details>

## Output: `review.xml`

Emit exactly one XML document in the `urn:self-review:v2` namespace, at the path
the dispatch names. It must validate against the vendored schema at
`<root>/config/schemas/self-review-v2.xsd`.

Required shape:

- `<review>` — root. Requires `timestamp` (ISO 8601 with timezone). Set
  `git-diff-args` to the base commit id and `repository` to the absolute
  repository root.
- `<file>` — one per file in the diff, **including files you reviewed and had no
  comment on**. Requires `path` (relative to the repository root),
  `change-type` (`added`, `modified`, `deleted`, `renamed`), and `viewed`
  (`true` when you read it).
- `<comment>` — zero or more per file, in child order `<body>`, `<category>`,
  then an optional `<suggestion>`. Carry `severity` and `confidence` on every
  one. For a line-level comment give **exactly one** pair: `new-line-start` and
  `new-line-end` for added or context lines, or `old-line-start` and
  `old-line-end` for deleted lines. Both pairs absent means a file-level
  comment. Single-line comments set start equal to end.
- `<suggestion>` — optional, at most one per comment, containing
  `<original-code>` then `<proposed-code>`.

```xml
<?xml version="1.0" encoding="UTF-8"?>
<review xmlns="urn:self-review:v2"
        timestamp="2026-07-27T09:41:00Z"
        git-diff-args="a1b2c3d4"
        repository="/abs/path/to/repo">
  <file path="src/parse.ts" change-type="modified" viewed="true">
    <comment new-line-start="42" new-line-end="44"
             severity="major" confidence="high">
      <body>Plan requirement "reject an empty id" is unmet: parseId("") returns
      `{ ok: true }` because the length guard runs after the early return on
      line 42.</body>
      <category>requirement-conformance</category>
      <suggestion>
        <original-code>  if (!raw) return { ok: true };</original-code>
        <proposed-code>  if (!raw) return { ok: false };</proposed-code>
      </suggestion>
    </comment>
  </file>
  <file path="src/index.ts" change-type="added" viewed="true" />
</review>
```

### The `<suggestion>` rule

A `<suggestion>` carries `original-code` copied **verbatim** from the file,
because it is applied by exact text matching. A finding whose fix cannot be
expressed as a local text replacement carries **no** suggestion — record the
finding and stop. Do not restructure a fix to fit the element.

Why, once: this is what blocks broad speculative refactors structurally rather
than by request. It must not be designed away.

## Operating Procedure

### 1. Read the mandate

Read `<root>/config/hooks/CODE_REVIEW.md`.

**Exit criterion:** you can state the severity floor, the confidence floor, and
the finding categories in scope from that file. Those values govern this round.

### 2. Read the plan

Read the plan document named in the dispatch, in full.

**Exit criterion:** you have written down the list of explicit requirements this
diff is answerable to. A requirement not on that list cannot produce a
`requirement-conformance` finding.

### 3. Read the cumulative diff

Take the base commit from the dispatch and review base against the working tree.

**Exit criterion:** every changed file is enumerated, and each one will receive a
`<file>` element — including the ones you have no comment on.

### 4. Run the blast-radius pass

For each symbol the diff changed, read the references outside the diff.

**Exit criterion:** each changed symbol has been searched, and each out-of-diff
callsite has been read or explicitly noted as unread in the body of any finding
that depends on it.

### 5. Critique under the mandate

<details>
<summary>Per-candidate procedure</summary>

For each candidate finding, in order:

1. Name the category — `requirement-conformance` or `defect`. No third option;
   if neither fits, discard the candidate.
2. Cite the evidence — file, line range, and the concrete input or state that
   produces the failure.
3. Trace it — to a requirement on your step 2 list, or to a defect demonstrable
   in the code as written.
4. Grade `severity` by impact if real.
5. Grade `confidence` by the evidentiary test. Count your unverified
   assumptions: zero is `high`, exactly one is `medium` and must be written into
   the body, more than one is `low`.
6. Check the anti-rationalization table against the sentence you just wrote.
7. Attach a `<suggestion>` only when the fix is a local text replacement, with
   `original-code` copied verbatim.

</details>

**Exit criterion:** every finding carries a category, evidence, a trace, and both
attributes. Findings that fail any of those are dropped or graded `info`/`low`.

### 6. Emit `review.xml`

Write the document to the path the dispatch names, in the shape above.

**Exit criterion:** the file exists, declares `urn:self-review:v2`, has one
`<file>` per changed file, and every `<comment>` carries `severity` and
`confidence`.

### 7. Report

State the counts: total findings, findings at or above both floors, and findings
recorded below a floor. Name the floors you applied.

**Exit criterion:** the report's above-floor count matches the comments in
`review.xml` that clear both floors. Do not claim a clean review without having
emitted the document.

## Failure Modes

- **The plan document cannot be read.** Stop and report. Do not review against a
  reconstructed idea of the requirements.
- **The diff is empty.** Emit a `<review>` with no `<file>` children and report
  zero findings. This is not an error.
- **A finding will not fit the schema.** Fix the finding's shape, never the
  schema. A fix that cannot be a local text replacement is recorded without a
  suggestion.
- **You are tempted to apply a fix yourself.** Stop. Detection and remediation
  run on different routes on purpose — nobody marks their own homework.
