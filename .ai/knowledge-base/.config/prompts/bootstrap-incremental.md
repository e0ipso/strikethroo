# Bootstrap-Incremental Extraction Prompt

<!--
  Version: 4
  Used by: ai-knowledge-base bootstrap-incremental (via `claude -p`)
  Owner contract: receives exactly one markdown documentation file per
  invocation, produces candidate practice and map nodes. The wrapper attributes
  `derived_from` deterministically from the source file path, so candidates do
  not author it. Emits one JSON object on stdout as the final message.
-->

Extract project knowledge from the markdown documentation file below. Produce structured candidate nodes for the project knowledge base.

## Inputs

Documentation file format:

```
=== FILE: <path-relative-to-repo> ===
<file content>
=== END FILE ===
```

Exactly one file is provided per invocation.

## Output

Single JSON object:

```json
{
  "practice": [{ ...practice node... }],
  "map": [{ ...map node... }]
}
```

Each candidate has:

- `kind`: `"practice"` | `"map"`
- `tags`: 1-5 short lowercase tags
- `title`: imperative phrase (practice) or noun phrase (map), ≤80 chars
- `summary`: ≤140 chars
- `body`: markdown, 1-4 short paragraphs
- `confidence`: `"low"` | `"medium"` | `"high"`

## What to extract

**Practice nodes - imperative project guidance:**
- Conventions: "Always do X." "Use Y for Z."
- Prohibitions: "Don't use X." "Never call Y directly."
- Gotchas: "If you do X, Y happens; avoid by doing Z."
- Rationale: "We chose X because Y."
- Tooling: "Tests run with X." "Deploys via Y."

Triggers in docs: imperative verbs ("use," "do," "avoid," "always," "never," "must"); rationale markers ("because," "since," "to avoid"); admonition blocks (`> Note:`, `> Warning:`); explicit do/don't sections.

**Map nodes - what exists in the project:**
- Features: named systems, modules, services.
- Vocabulary: project-specific terms and their meanings.
- Locations: file paths for major systems.

Triggers in docs: section headers naming components ("## Bravo Cards Module"); definition patterns ("X is our service for Y"); explicit file-path references ("`modules/custom/x/`").

## What to skip

- API reference dumps (auto-generated method lists, parameter tables).
- Boilerplate (standard MIT license preamble, generic CI badges).
- Generic framework knowledge (Drupal/React/Django basics that anyone reading the framework docs would know).
- TODOs, FIXMEs, and aspirational content ("we should eventually do X").
- Content that is purely narrative or marketing.

## Confidence calibration

Documentation may be stale or aspirational. Default `confidence: medium` unless:
- `high`: the doc states the rule explicitly with rationale, and the doc appears actively maintained (recent dates, no stale markers).
- `low`: the rule is implicit, the doc is marked draft/deprecated/legacy, or the content is ambiguous.

## Ownership boundary

Same as proposal extraction: practice owns imperative knowledge; map owns named-entity definitions. Split combined content across the two passes.

## Rules

1. Produce zero candidates if the file is pure boilerplate or pure API reference.
2. Never invent facts not present in the source.
3. Quote or close-paraphrase rationale from the source; do not generate plausible-sounding rationale.
4. Emit only the JSON object. No prose before or after.

The file begins below.

---

[CHUNK PLACEHOLDER, substituted at runtime]
