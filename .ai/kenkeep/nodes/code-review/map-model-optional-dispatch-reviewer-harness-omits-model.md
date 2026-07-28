---
type: map
title: >-
  Model-optional dispatch: reviewer harness omits --model to use CLI defaults
description: >-
  Harness discovery yields a harness, not a model id. Reviewer dispatch omits
  `--model`; execution_routing dispatch still requires it. Harness probes work
  the same way for the same reason.
tags:
  - dispatch
  - harness-discovery
  - model-selection
kk_schema_version: 3
kk_id: >-
  map-model-optional-dispatch-reviewer-harness-omits-model
kk_derived_from: []
kk_relates_to: []
kk_depends_on: []
kk_confidence: high
---

Harness discovery (via `src/skill-scripts/shared/harness-discovery.ts`) returns the set of installed, responsive harnesses by probing each known harness with a cheap non-interactive request. It returns a harness identifier like `"claude"` or `"gemini"`, **not** a model id.

When a second harness is discovered, `st-code-review` constructs a reviewer dispatch command **without `--model`**:

```typescript
// Reviewer dispatch (optional model)
const reviewerCommand = [
  harness, 'agent', '--skill', skillPath,
  '--model-optional'  // ← note: no --model flag
];

// Execution routing dispatch (required model)
const routingCommand = [
  harness, 'agent', '--skill', skillPath,
  '--model', configuredModelId  // ← always present
];
```

**Why the reviewer omits `--model`:**

1. **Harness probes already work this way.** `src/skill-scripts/shared/harness-availability.ts` documents its own reasoning:
   > A probe proves harness access, not selected-model access, so each probe invokes the harness non-interactively with no explicit model override, letting the CLI use its own configured/default model.

2. **Discovery yields a harness, not a model.** If discovery found `gemini`, it proved `gemini` is installed and responsive. It proved nothing about which specific model ids that harness accepts. Pinning a model id and having it retire is precisely the failure mode the probe design avoids.

3. **Let the harness CLI choose.** Each harness (Claude Code, Gemini, Codex, etc.) maintains its own model registry and default. Telling `claude` to use a specific model that `claude` doesn't accept is a dispatch failure. Omitting `--model` lets `claude` use whatever default the user configured, or the harness's fallback.

**Execution routing is unchanged.** Tasks with `execution_profile` still dispatch with exact model ids:

```typescript
// execution_routing still requires exact model
routingResult = dispatchWithModel(
  target.harness,
  target.model  // ← required, exact id
);
```

This additive optionality is why `ExternalDispatchRequest.model` became `model?: string` (optional). Reviewer dispatch passes `undefined` for model; routing dispatch passes a configured value. The adapters in `external-dispatch.ts` handle both cases.

**Cache and probe logic unchanged.** Harness discovery reuses the existing cache in `.ai/strikethroo/runtime/harness-availability.json` with the same 30-minute available and 5-minute unavailable lifetimes, and the same 20-second probe timeout.
