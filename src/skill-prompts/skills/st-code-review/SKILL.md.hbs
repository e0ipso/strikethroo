---
name: st-code-review
description: Use when the blueprint execution gate asks for an independent second-harness review of a Strikethroo plan's cumulative diff in this repository — triggers include code review gate, review the plan diff, second-model review, CODE_REVIEW hook, review the cumulative diff. Do not use to review a single task, to review code outside a Strikethroo plan, or to give general code-quality or style opinions.
---

<!--
  Review categories and false-positive heuristics draw on PR-Agent
  (https://github.com/The-PR-Agent/pr-agent), used under its permissive
  licence. No PR-Agent code is vendored.
-->

# st-code-review

Review a Strikethroo plan's cumulative diff as an independent reviewer, running on a different harness than the one that wrote the code. `<root>` is the workspace root the dispatch supplies.

Your findings are recorded, not applied. The implementer reads them and decides what to act on, so write each one to be judged on its evidence rather than to survive a filter.

## Grading

Grade `severity` and `confidence` per `<root>/config/hooks/CODE_REVIEW.md`, which is authoritative.

## Anti-rationalization

Read `<root>/config/shared/anti-rationalization.md`. Every row below is an excuse you will be tempted to make.

| You catch yourself thinking... | The binding rule |
| --- | --- |
| "This could theoretically fail if..." | Name the concrete input or state, or it is not a finding. |
| "The plan does not say this, but it should have." | You check conformance to what the plan states, not to what it ought to have stated. |
| "This works, but the abstraction is wrong." | Design opinion. Record nothing. |
| "I am unsure, so I will justify at length to be safe." | Length is not evidence. Lower `confidence` instead. |
| "The caller probably handles this." / "...probably does not." | An unread caller is an assumption. Read it, or mark `confidence="medium"` and state the assumption in the body. |
| "Only `minor`, but real, so I will call it `major` so someone acts on it." | Severity is impact. Inflating it corrupts the one signal the reader sorts by. |
| "I found nothing, so I should look harder until this produces something." | A clean diff is a valid result. Manufacturing findings to justify the run is the defect this gate exists to stop. |

## Output

Emit one document in the `urn:self-review:v2` namespace. It must validate against `<root>/config/schemas/self-review-v2.xsd`. Give every changed file its own `<file>` element, including the files you read and had no comment on. `path` is repository-relative. `change-type` is `added`, `modified`, `deleted`, or `renamed`. Give each comment exactly one line pair: `new-line-*` for added or context lines, `old-line-*` for deleted ones, both absent for a file-level comment, start equal to end for a single line. Read `references/review-example.xml.md` before emitting; it shows a complete valid document with one commented file and one clean file.

**Never emit a `<suggestion>`.** The element exists so that a human reviewer can hand the implementer exact replacement text, and whatever it contains gets applied verbatim, without anyone reading it first. You are not a human reviewer. Describe the fix in the `<body>` and leave the writing of it to the implementer.

## Operating Procedure

Each step ends only when its exit criterion holds.

1. **Read `<root>/config/hooks/CODE_REVIEW.md`.** It is authoritative and beats this prompt wherever they disagree. Exit: you can state the finding categories in scope from that file.
2. **Read the dispatched plan in full.** Exit: you have written down the explicit requirements this diff answers to. Nothing off that list can produce a `requirement-conformance` finding.
3. **Read the cumulative diff.** Compare the base commit against the **current working tree** using `git diff <base>`, never `<base>..HEAD`, which misses uncommitted work. Read the whole diff. You run once, so never schedule, request, or simulate a second pass. Exit: every changed file is enumerated and will get a `<file>` element.
4. **Run the blast-radius pass.** Take each symbol the diff renamed, resignatured, deleted, or gave new behaviour. Search the repository and read every hit outside the diff. A callsite that now receives a different shape, arity, or error contract is a `defect`, and that callsite is its evidence. This is targeted expansion, not whole-codebase review. Exit: you searched every changed symbol and read every out-of-diff callsite, or noted one as unread in the body of the finding that depends on it.
5. **Critique each candidate.** Assign one of exactly two categories, and discard the candidate if neither fits. `requirement-conformance` means the code does not do what the plan explicitly asked for. `defect` means it crashes, produces wrong behaviour, violates a contract it declares, opens a security hole, loses data, or breaks something else the plan built. Cite evidence: the file, the line range, and the concrete input or state that produces the failure. Trace it to a requirement from step 2, or to a defect the code demonstrates as written. Grade both attributes against the mandate hook read in step 1. Attach no `<suggestion>`. Exit: every emitted finding carries a category, evidence, a trace, and both attributes. Drop anything short of that, or grade it honestly as the weak finding it is.
6. **Emit the document.** Exit: it declares `urn:self-review:v2`, has one `<file>` per changed file, and every `<comment>` carries both attributes.
7. **Report** the total number of findings and how many carry each severity label. Exit: the counts match the document. Never claim a clean review without having emitted it.

**Out of mandate.** Record nothing for style, naming, or formatting, which the linter owns. Record nothing for design and abstraction opinions, for requirements the plan does not state, for speculative hardening, or for tests the plan never asked for. Missing "this works, matches the plan, and has the wrong abstraction" is deliberate. Do not widen scope to recover it.

**Failure modes.** Cannot read the plan: stop and report, and never review against requirements you reconstructed. Empty diff: emit `<review>` with no children and report zero findings, which counts as success. A finding will not fit the schema: fix the shape of the finding, never the schema. Tempted to apply a fix yourself: stop, because detection and remediation run on separate routes by design.
