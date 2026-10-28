# kenkeep Index: code-review

↑ Parent: [kenkeep](../index.md)

> kenkeep navigation: the injected body above is the root index node, the top-level catalog of branches and root-level leaves. Do not expect the whole knowledge base here; descend on demand. Read the root index node, pick one or more branches whose intent and tags match your task (several branches can be relevant), and read those branch `index.md` nodes. Descend further only where the task needs it, opening only the leaves you have confirmed are relevant. Follow each leaf's `relates_to` and `depends_on` cross edges to reach related leaves in other branches. You decide how deep to go per branch.

> This index only orients you; leaves hold the durable guidance. Open at least one relevant leaf before acting.

## Subfolders
_None._

## Conventions (how we build)
- Open [**The review gate reports; it never fixes. Re-run POST_EXECUTION after acting on a finding**](practice-review-gate-reports-it-does-not-fix.md) to learn about: The gate runs once after POST_EXECUTION, records findings, and applies nothing. If you act on a finding, re-run POST_EXECUTION in full before declaring complete. #review-gate #ordering #mechanical-gates #report-only
- Open [**Optional-by-absence pattern: new workspace files do not bump schema version**](practice-optional-by-absence-new-files-absent-means-feature-off.md) to learn about: CODE_REVIEW.md and self-review-v2.xsd are both optional by absence; their presence/absence gates the feature. v4 workspaces keep working unchanged. #schema-version #compatibility #optional-gates
- Open [**An uncertified review is never reported clean**](practice-uncertified-review-is-never-reported-clean.md) to learn about: Only an XSD-certified findings document counts. The orchestrator alone writes review.xml from reviewer stdout. #review-gate #certification
- Open [**Design thesis: configuration is Markdown, guarantees are compiled**](practice-design-thesis-markdown-is-negotiable-guarantees-are-compiled.md) to learn about: Hooks and templates are editable Markdown. Rules a user must not loosen live in TypeScript. #design-thesis #enforcement
- Open [**Review gate runs only on explicit opt-in**](practice-review-gate-runs-only-on-explicit-opt-in.md) to learn about: code_review.enabled must be boolean true. Anything else skips before any other check. #review-gate #config-yaml

## Components (what exists)
- Open [**Model-optional dispatch: reviewer harness omits --model to use CLI defaults**](map-model-optional-dispatch-reviewer-harness-omits-model.md) to learn about: Harness discovery yields a harness, not a model id. Reviewer dispatch omits \`--model\`; execution_routing dispatch still requires it. Harness probes work the same way for the same reason. #dispatch #harness-discovery #model-selection

## By topic

### #review-gate
- Open [**An uncertified review is never reported clean**](practice-uncertified-review-is-never-reported-clean.md) — Only an XSD-certified findings document counts. The orchestrator alone writes review.xml from reviewer stdout.
- Open [**Review gate runs only on explicit opt-in**](practice-review-gate-runs-only-on-explicit-opt-in.md) — code_review.enabled must be boolean true. Anything else skips before any other check.
- Open [**The review gate reports; it never fixes. Re-run POST_EXECUTION after acting on a finding**](practice-review-gate-reports-it-does-not-fix.md) — The gate runs once after POST_EXECUTION, records findings, and applies nothing. If you act on a finding, re-run POST_EXECUTION in full before declaring complete.
### #certification
- Open [**An uncertified review is never reported clean**](practice-uncertified-review-is-never-reported-clean.md) — Only an XSD-certified findings document counts. The orchestrator alone writes review.xml from reviewer stdout.
### #compatibility
- Open [**Optional-by-absence pattern: new workspace files do not bump schema version**](practice-optional-by-absence-new-files-absent-means-feature-off.md) — CODE_REVIEW.md and self-review-v2.xsd are both optional by absence; their presence/absence gates the feature. v4 workspaces keep working unchanged.
### #config-yaml
- Open [**config.yaml is local, and empty means unconfigured**](../skills/practice-config-yaml-is-local-and-empty-means-unconfigured.md) — Init tracks config.yaml but gitignores it. hasYamlContent is duplicated in the SPA; change both.
- Open [**Customize editors keep draft, baseline, and disk apart**](../web/editor/practice-config-editors-keep-draft-baseline-and-disk-apart.md) — configYaml.ts is the only YAML boundary; draftState.ts stops revalidation from overwriting typing.
- Open [**Review gate runs only on explicit opt-in**](practice-review-gate-runs-only-on-explicit-opt-in.md) — code_review.enabled must be boolean true. Anything else skips before any other check.
### #design-thesis
- Open [**Design thesis: configuration is Markdown, guarantees are compiled**](practice-design-thesis-markdown-is-negotiable-guarantees-are-compiled.md) — Hooks and templates are editable Markdown. Rules a user must not loosen live in TypeScript.
### #dispatch
- Open [**Model-optional dispatch: reviewer harness omits --model to use CLI defaults**](map-model-optional-dispatch-reviewer-harness-omits-model.md) — Harness discovery yields a harness, not a model id. Reviewer dispatch omits \`--model\`; execution_routing dispatch still requires it. Harness probes work the same way for the same reason.
- Open [**Task routing: one profile writer, strict dispatch**](../skills/practice-task-routing-and-harness-dispatch.md) — route-task-execution.cjs alone writes execution_profile. Dispatch never silently falls back on bad metadata.
### #enforcement
- Open [**Design thesis: configuration is Markdown, guarantees are compiled**](practice-design-thesis-markdown-is-negotiable-guarantees-are-compiled.md) — Hooks and templates are editable Markdown. Rules a user must not loosen live in TypeScript.
### #harness-discovery
- Open [**Model-optional dispatch: reviewer harness omits --model to use CLI defaults**](map-model-optional-dispatch-reviewer-harness-omits-model.md) — Harness discovery yields a harness, not a model id. Reviewer dispatch omits \`--model\`; execution_routing dispatch still requires it. Harness probes work the same way for the same reason.
### #mechanical-gates
- Open [**The review gate reports; it never fixes. Re-run POST_EXECUTION after acting on a finding**](practice-review-gate-reports-it-does-not-fix.md) — The gate runs once after POST_EXECUTION, records findings, and applies nothing. If you act on a finding, re-run POST_EXECUTION in full before declaring complete.
### #model-selection
- Open [**Model-optional dispatch: reviewer harness omits --model to use CLI defaults**](map-model-optional-dispatch-reviewer-harness-omits-model.md) — Harness discovery yields a harness, not a model id. Reviewer dispatch omits \`--model\`; execution_routing dispatch still requires it. Harness probes work the same way for the same reason.
### #optional-gates
- Open [**Optional-by-absence pattern: new workspace files do not bump schema version**](practice-optional-by-absence-new-files-absent-means-feature-off.md) — CODE_REVIEW.md and self-review-v2.xsd are both optional by absence; their presence/absence gates the feature. v4 workspaces keep working unchanged.
### #ordering
- Open [**The review gate reports; it never fixes. Re-run POST_EXECUTION after acting on a finding**](practice-review-gate-reports-it-does-not-fix.md) — The gate runs once after POST_EXECUTION, records findings, and applies nothing. If you act on a finding, re-run POST_EXECUTION in full before declaring complete.
### #report-only
- Open [**The review gate reports; it never fixes. Re-run POST_EXECUTION after acting on a finding**](practice-review-gate-reports-it-does-not-fix.md) — The gate runs once after POST_EXECUTION, records findings, and applies nothing. If you act on a finding, re-run POST_EXECUTION in full before declaring complete.
### #schema-version
- Open [**Optional-by-absence pattern: new workspace files do not bump schema version**](practice-optional-by-absence-new-files-absent-means-feature-off.md) — CODE_REVIEW.md and self-review-v2.xsd are both optional by absence; their presence/absence gates the feature. v4 workspaces keep working unchanged.
- Open [**Bump the workspace schema version only for incompatible shape changes**](../cli/practice-bump-workspace-schema-version-only-for-incompatible-shape.md) — CURRENT_WORKSPACE_SCHEMA_VERSION is baked into skills and duplicated as a fallback in root.ts.