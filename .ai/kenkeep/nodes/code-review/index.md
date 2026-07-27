# kenkeep Index: code-review

↑ Parent: [kenkeep](../index.md)

> kenkeep navigation: the injected body above is the root index node, the top-level catalog of branches and root-level leaves. Do not expect the whole knowledge base here; descend on demand. Read the root index node, pick one or more branches whose intent and tags match your task (several branches can be relevant), and read those branch `index.md` nodes. Descend further only where the task needs it, opening only the leaves you have confirmed are relevant. Follow each leaf's `relates_to` and `depends_on` cross edges to reach related leaves in other branches. You decide how deep to go per branch.

> This index only orients you; leaves hold the durable guidance. Open at least one relevant leaf before acting.

## Subfolders
_None._

## Conventions (how we build)
- Open [**Optional-by-absence pattern: new workspace files do not bump schema version**](practice-optional-by-absence-new-files-absent-means-feature-off.md) to learn about: CODE_REVIEW.md and self-review-v2.xsd are both optional by absence; their presence/absence gates the feature. v4 workspaces keep working unchanged. #schema-version #compatibility #optional-gates
- Open [**Review loop ordering: POST_EXECUTION re-runs after fixes, not before**](practice-review-loop-ordering-post-execution-reruns-after-fixes.md) to learn about: Detect → threshold → fix on implementer route → full re-run of mechanical gates → re-verify. The re-run happens after every fix because fixes invalidate the prior green build. #review-gate #ordering #mechanical-gates

## Components (what exists)
- Open [**Model-optional dispatch: reviewer harness omits --model to use CLI defaults**](map-model-optional-dispatch-reviewer-harness-omits-model.md) to learn about: Harness discovery yields a harness, not a model id. Reviewer dispatch omits `--model`; execution_routing dispatch still requires it. Harness probes work the same way for the same reason. #dispatch #harness-discovery #model-selection

## By topic

### #schema-version
- Open [**Optional-by-absence pattern: new workspace files do not bump schema version**](practice-optional-by-absence-new-files-absent-means-feature-off.md) — CODE_REVIEW.md and self-review-v2.xsd are both optional by absence; their presence/absence gates the feature. v4 workspaces keep working unchanged.

### #compatibility
- Open [**Optional-by-absence pattern: new workspace files do not bump schema version**](practice-optional-by-absence-new-files-absent-means-feature-off.md) — CODE_REVIEW.md and self-review-v2.xsd are both optional by absence; their presence/absence gates the feature. v4 workspaces keep working unchanged.

### #optional-gates
- Open [**Optional-by-absence pattern: new workspace files do not bump schema version**](practice-optional-by-absence-new-files-absent-means-feature-off.md) — CODE_REVIEW.md and self-review-v2.xsd are both optional by absence; their presence/absence gates the feature. v4 workspaces keep working unchanged.

### #review-gate
- Open [**Review loop ordering: POST_EXECUTION re-runs after fixes, not before**](practice-review-loop-ordering-post-execution-reruns-after-fixes.md) — Detect → threshold → fix on implementer route → full re-run of mechanical gates → re-verify. The re-run happens after every fix because fixes invalidate the prior green build.
- Open [**Model-optional dispatch: reviewer harness omits --model to use CLI defaults**](map-model-optional-dispatch-reviewer-harness-omits-model.md) — Harness discovery yields a harness, not a model id. Reviewer dispatch omits `--model`; execution_routing dispatch still requires it. Harness probes work the same way for the same reason.

### #ordering
- Open [**Review loop ordering: POST_EXECUTION re-runs after fixes, not before**](practice-review-loop-ordering-post-execution-reruns-after-fixes.md) — Detect → threshold → fix on implementer route → full re-run of mechanical gates → re-verify. The re-run happens after every fix because fixes invalidate the prior green build.

### #mechanical-gates
- Open [**Review loop ordering: POST_EXECUTION re-runs after fixes, not before**](practice-review-loop-ordering-post-execution-reruns-after-fixes.md) — Detect → threshold → fix on implementer route → full re-run of mechanical gates → re-verify. The re-run happens after every fix because fixes invalidate the prior green build.

### #dispatch
- Open [**Model-optional dispatch: reviewer harness omits --model to use CLI defaults**](map-model-optional-dispatch-reviewer-harness-omits-model.md) — Harness discovery yields a harness, not a model id. Reviewer dispatch omits `--model`; execution_routing dispatch still requires it. Harness probes work the same way for the same reason.

### #harness-discovery
- Open [**Model-optional dispatch: reviewer harness omits --model to use CLI defaults**](map-model-optional-dispatch-reviewer-harness-omits-model.md) — Harness discovery yields a harness, not a model id. Reviewer dispatch omits `--model`; execution_routing dispatch still requires it. Harness probes work the same way for the same reason.

### #model-selection
- Open [**Model-optional dispatch: reviewer harness omits --model to use CLI defaults**](map-model-optional-dispatch-reviewer-harness-omits-model.md) — Harness discovery yields a harness, not a model id. Reviewer dispatch omits `--model`; execution_routing dispatch still requires it. Harness probes work the same way for the same reason.
