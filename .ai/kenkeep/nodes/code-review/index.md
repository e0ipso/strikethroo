# kenkeep Index: code-review

↑ Parent: [kenkeep](../index.md)

> kenkeep navigation: the injected body above is the root index node, the top-level catalog of branches and root-level leaves. Do not expect the whole knowledge base here; descend on demand. Read the root index node, pick one or more branches whose intent and tags match your task (several branches can be relevant), and read those branch `index.md` nodes. Descend further only where the task needs it, opening only the leaves you have confirmed are relevant. Follow each leaf's `relates_to` and `depends_on` cross edges to reach related leaves in other branches. You decide how deep to go per branch.

> This index only orients you; leaves hold the durable guidance. Open at least one relevant leaf before acting.

## Subfolders
_None._

## Conventions (how we build)
- Open [**Optional-by-absence pattern: new workspace files do not bump schema version**](practice-optional-by-absence-new-files-absent-means-feature-off.md) to learn about: CODE_REVIEW.md and self-review-v2.xsd are both optional by absence; their presence/absence gates the feature. v4 workspaces keep working unchanged. #schema-version #compatibility #optional-gates
- Open [**The review gate reports; it never fixes. Re-run POST_EXECUTION after acting on a finding**](practice-review-gate-reports-it-does-not-fix.md) to learn about: The gate runs once after POST_EXECUTION, records findings, and applies nothing. If you act on a finding, re-run POST_EXECUTION in full before declaring complete. #review-gate #ordering #mechanical-gates #report-only

## Components (what exists)
- Open [**Model-optional dispatch: reviewer harness omits --model to use CLI defaults**](map-model-optional-dispatch-reviewer-harness-omits-model.md) to learn about: Harness discovery yields a harness, not a model id. Reviewer dispatch omits \`--model\`; execution_routing dispatch still requires it. Harness probes work the same way for the same reason. #dispatch #harness-discovery #model-selection

## By topic

### #compatibility
- Open [**Optional-by-absence pattern: new workspace files do not bump schema version**](practice-optional-by-absence-new-files-absent-means-feature-off.md) — CODE_REVIEW.md and self-review-v2.xsd are both optional by absence; their presence/absence gates the feature. v4 workspaces keep working unchanged.
### #dispatch
- Open [**Model-optional dispatch: reviewer harness omits --model to use CLI defaults**](map-model-optional-dispatch-reviewer-harness-omits-model.md) — Harness discovery yields a harness, not a model id. Reviewer dispatch omits \`--model\`; execution_routing dispatch still requires it. Harness probes work the same way for the same reason.
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
### #review-gate
- Open [**Never hand-commit generated skill artifacts in either tree**](../practice-never-hand-commit-generated-skill-artifacts.md) — templates/harness/skills is gitignored build output; the root skills/ mirror is tracked but written only by the release sync. .gitattributes and the pre-commit guard cover both trees and the review gate skips them.
- Open [**The review gate reports; it never fixes. Re-run POST_EXECUTION after acting on a finding**](practice-review-gate-reports-it-does-not-fix.md) — The gate runs once after POST_EXECUTION, records findings, and applies nothing. If you act on a finding, re-run POST_EXECUTION in full before declaring complete.
### #schema-version
- Open [**Optional-by-absence pattern: new workspace files do not bump schema version**](practice-optional-by-absence-new-files-absent-means-feature-off.md) — CODE_REVIEW.md and self-review-v2.xsd are both optional by absence; their presence/absence gates the feature. v4 workspaces keep working unchanged.