---
layout: default
title: Customization Guide
nav_order: 4
description: "Hooks, templates, and workflow customization"
---

# Customization Guide

Hooks inject LLM intelligence and deterministic tool execution at key points of the [workflow](workflow.html). Templates define the structure of plans, tasks, and execution artifacts. Together they let you adapt Strikethroo to your project without modifying any code.

![Strikethroo's customizable spec-driven workflow, showing where the hooks fire: PRE_PLAN, POST_PLAN, POST_TASK_GENERATION_ALL, PRE_TASK_ASSIGNMENT, and POST_EXECUTION]({{ '/assets/strikethroo-customization.png' | relative_url }})

## Hooks

Hooks are Markdown files in `.ai/strikethroo/config/hooks/`. The LLM reads them at specific workflow points and follows the instructions they contain. They serve two purposes:

<div class="st-cards st-cards--2" markdown="0">
<div class="st-card">
<span class="st-card__icon st-card__icon--focus" aria-hidden="true"></span>
<p class="st-card__title">LLM Intelligence Injection</p>
<p>Bring the LLM's reasoning, judgment, and contextual understanding to bear at the right moment. Examples: YAGNI enforcement, complexity analysis, error diagnosis, agent selection.</p>
</div>
<div class="st-card">
<span class="st-card__icon st-card__icon--terminal" aria-hidden="true"></span>
<p class="st-card__title">Deterministic Tool Execution</p>
<p>Have the LLM execute specific commands or enforce concrete behaviors on your behalf. Examples: running bundled validation scripts, conventional commit formatting, status tracking updates.</p>
</div>
</div>

{% capture not_for %}
**Not for:** linting, test execution, coverage thresholds, security scans. Those belong in CI/CD pipelines or git commit hooks. Asking an LLM to "run npm test and ensure coverage > 80%" wastes its reasoning ability &mdash; a shell script does that more reliably.
{% endcapture %}
{% include callout.html variant="warning" title="NOT A HOOK'S JOB" content=not_for %}

Not sure which hooks the workspace ships with? Run `npx strikethroo serve` and open the **Customize** view -- it lists every hook with a description, no file digging required.

[![Customize, Hooks tab]({{ '/assets/customize-hooks.png' | relative_url }})]({{ '/assets/customize-hooks.png' | relative_url }})

### LLM Intelligence Hooks

These hooks leverage the LLM's reasoning ability -- pattern recognition, judgment calls, and contextual analysis that a deterministic script cannot replicate.

#### PRE_PLAN

**When:** Before plan creation begins.

Enforces YAGNI, scope control, and simplicity principles. The LLM applies judgment about what belongs in the plan and what constitutes scope creep. Add project-specific architectural constraints ("prefer composition over inheritance"), technology mandates ("must use our existing auth library"), or domain rules the LLM should enforce during planning.

#### POST_PLAN

**When:** After the plan document is written.

The LLM validates the plan: does it cover the requirements? Does it include a self-validation section? Does it account for documentation updates? Add checks that require reading comprehension and reasoning about completeness.

#### POST_TASK_GENERATION_ALL

**When:** After all tasks for a plan have been generated.

The LLM generates the execution blueprint with dependency diagrams and phase groupings. Complexity analysis happens earlier, during `st-generate-tasks`; this hook only assembles the blueprint. Customize phase rules or add project-specific blueprint conventions.

#### TASK_EXECUTION_ROUTING

**When:** During task generation, after all task files exist and before the execution blueprint is generated.

The LLM classifies every freshly generated task into one of the execution profiles configured in the `execution_routing` section of `config/config.yaml`, using the task content still in its context (`skills`, `complexity_score`, objective, acceptance criteria). A bundled deterministic helper validates the complete mapping and persists each selected profile as `execution_profile`; concrete targets are selected at dispatch. Add project-specific classification guidance here ("treat anything touching billing as demanding"). See [Execution routing](#execution-routing) below for the configuration itself.

#### PRE_TASK_ASSIGNMENT

**When:** Before dispatching each task to a sub-agent.

The LLM reads the task's `skills` frontmatter, analyzes available sub-agents, and selects the best match. It considers domain expertise, task complexity, and resource efficiency. Customize agent matching criteria or add fallback strategies for unmatched skills.

#### POST_ERROR_DETECTION

**When:** When a task execution fails.

The LLM diagnoses the failure, updates task status, documents what went wrong, and proposes remediation steps before re-executing. Add project-specific error categorization or custom retry strategies.

#### POST_EXECUTION

**When:** After all blueprint phases complete, before summary generation and archival.

The LLM verifies all tasks reached `completed` status, checks that documentation (including AGENTS.md) is still accurate, executes the plan's self-validation steps, and assesses whether the plan left behind tech debt or dead code. If any validation gate fails, the plan stays in `plans/` for debugging.

#### CODE_REVIEW

**When:** After `POST_EXECUTION` reports green, before execution summary and archival.

Terminal review gate, terminal only — runs once per plan, creates no task files, never mutates the blueprint. When a second harness is discovered and this hook is present and non-empty, a reviewer harness critiques the cumulative diff and emits schema-validated findings (`review.xml`). The findings are recorded for the implementer to read and act on; nothing is applied automatically. Any fix you then make forces a full `POST_EXECUTION` re-run before execution is declared complete.

Reviewer discovery uses the same local `harnesses.<name>.cli_args` and readiness check as task dispatch. Permission flags may give the reviewer CLI technical write access, but the reviewer prompt still says to detect and report without changing source files. The reviewer prints its findings document to stdout; the Strikethroo process writes `review.xml` and checks the artifact and diff. Local harness permissions do not turn review findings into automatic fixes.

**Reviewed scope**: a two-dot diff from a base commit recorded before phase execution against the **working tree**, so committed phase work and uncommitted fixes are both included. Untracked, unignored files are included too — the gate synthesizes an add-diff for each with `git diff --no-index` against `/dev/null`, so nothing needs to be staged or committed for the reviewer to see it, and the gate never writes to the git index.

**Configuration**: The hook body specifies the mandate — which finding categories are in scope and how the reviewer should grade `severity` (`critical`, `major`, `minor`, `info`) and `confidence` (`high`, `medium`, `low`). Both are advisory labels that help you sort the review; nothing is filtered or applied on the strength of them.

**To disable**: Empty or delete this file. The gate skips cleanly and notes it in the execution summary. No error. `init` preserves your edits on re-run unless you pass `--force`.

**Uses `xmllint` when available**: findings are validated against the vendored schema by shelling out to it. It is a soft dependency — without it the gate skips cleanly and says so in the execution summary, exactly as it does when the hook is missing. Your plan still completes. Install `libxml2-utils` (Debian/Ubuntu), `libxml2` (Homebrew), or your platform's equivalent to turn the gate on. A skip is never reported as a review that passed.

**Limitations** — the complete list:
- Harness diversity is not model diversity — discovery operates at harness level, so a second CLI on the same model family looks independent while sharing blind spots.
- The reviewer model is unknown at dispatch — the gate records the harness, not the model.
- Findings do not survive a fresh clone — `init` ships a workspace `.gitignore` that excludes `plans/*/review/` and `archive/*/review/`, so the gate never sees its own output as changed content. That exclusion covers review artifacts only; whether you track the rest of `.ai/strikethroo/` is your project's call.
- Conformance-only scope has a blind spot — correct code matching the plan but badly abstracted passes.
- Blast-radius checking is partial — the full `POST_EXECUTION` re-run is the real catcher.
- Generated and vendored files are outside the review scope — paths that `.gitattributes` marks `linguist-generated` or `linguist-vendored` are dropped from the diff, so changes to build output or vendored code are never reviewed. Fix the authored source instead; the mandatory `POST_EXECUTION` re-run regenerates build output.
- Ignored files are outside the review scope — the gate honours your ignore rules, which also keeps its own `review/` output out of the reviewed diff.

### Workflow Control Hooks

These hooks execute deterministic actions -- committing, status updates, validation gates -- where the LLM acts as executor rather than reasoner. Bundled validation scripts (`create-feature-branch.cjs`, `check-phase-readiness.cjs`, etc.) live in the skill's `scripts/` directory and are invoked by the skill prompt, not by workspace hooks.

#### PRE_PHASE

**When:** Before each execution phase begins.

The execute-blueprint skill runs `check-phase-readiness.cjs` before this hook fires. Use the hook for phase identification, resume logic, and project-specific pre-flight checks (required services running, tool versions).

#### POST_PHASE

**When:** After each execution phase completes.

Creates a descriptive conventional commit for the phase and updates blueprint and task statuses with completion markers. Add your project's lint/format commands here if you want a phase-level check — Strikethroo does not ship or prescribe a linter. CI remains the authoritative gate for quality thresholds.

#### PRE_TASK_EXECUTION

**When:** Before each individual task is dispatched.

Ships a default RED → GREEN → REFACTOR test-first cycle scoped to meaningful tests (custom logic, critical paths, edge cases). Add project-specific pre-flight checks here too -- for example, verifying required services are running or that necessary environment variables are set.

To change or remove the default discipline, edit or empty this file in your workspace. `init` preserves your edits on re-run unless you pass `--force`.

## Shared disciplines

Cross-skill enforcement rules live in `.ai/strikethroo/config/shared/` (copied by `init`, hash-tracked like hooks). Skills read them at runtime when present:

| File | Applied by | Purpose |
| --- | --- | --- |
| `clarification-gate.md` | Plan creation and refinement | One question at a time, multiple-choice first, explicit approval before emitting a plan |
| `anti-rationalization.md` | Planning, task generation, execution | Framing for excuse → counter tables in the skills |
| `verification-gate.md` | Blueprint execution | Evidence before any "done" or "passing" claim |

Edit these files to tune project discipline. Empty a file to disable that shared rule set. `init` preserves your edits unless `--force` is used.

## Workspace configuration

`.ai/strikethroo/config/config.yaml` is the workspace's single structured configuration file. Every configurable feature claims one top-level section in it. `init` creates the file from a template and hash-tracks it so later `init` runs preserve local edits and report conflicts.

The workspace `.gitignore` ignores `config/config.yaml` by default. Harness permissions, installed models, and routing preferences usually differ between developers and machines, so a newly initialized project does not add this file to Git through normal `git add` commands. This is a default, not a security boundary. Anyone can force-add an ignored file, and ignore rules do not remove a file that Git already tracks.

If an existing project already tracks the file, each checkout that adopts the local-only policy can remove it from the Git index once:

```bash
git rm --cached .ai/strikethroo/config/config.yaml
```

The command leaves the working copy in place. Commit the resulting deletion if the repository should stop distributing the file. Strikethroo never runs this command automatically because changing tracked files is a project decision.

There are two ways to edit the local file:

- **The Customize view's Config tab.** The web app renders a form for the sections it understands, currently execution routing, and preserves other top-level sections structurally. Saving rewrites the file, so YAML comments are not preserved.
- **Directly on the filesystem.** Use this method to edit `harnesses`; the file is plain YAML.

### Harness invocation arguments

The `harnesses` section supplies the extra arguments an external CLI needs to work without interactive permission prompts. Each `cli_args` item is one exact argument:

```yaml
harnesses:
  claude:
    cli_args:
      - --dangerously-skip-permissions
  codex:
    cli_args:
      - --sandbox
      - workspace-write
```

Order and spelling are preserved. Strikethroo does not trim values, split them on whitespace, expand environment variables or globs, or parse shell syntax. It launches child processes with Node's `spawn` and `shell: false`, so a value such as `"two words"` remains one argument. Missing harness entries and missing `cli_args` keys become empty arrays. Unknown harness names, unknown keys, scalar commands, empty strings, non-string values, and strings containing NUL characters make the configuration invalid before an external launch.

The local user owns the permission policy. Strikethroo does not reject permissive flags, including Claude's `--dangerously-skip-permissions`. The shipped template starts with these arguments because unattended task execution must be able to edit files and run verification commands:

| Harness | Starter `cli_args` | Vendor reference |
| --- | --- | --- |
| Claude Code | `["--dangerously-skip-permissions"]` | [Claude Code CLI reference](https://docs.anthropic.com/en/docs/claude-code/cli-usage) |
| Codex CLI | `["--sandbox", "workspace-write"]` | [Codex CLI command reference](https://developers.openai.com/codex/cli/reference) |
| Cursor Agent | `["--force"]` | [Cursor headless CLI](https://docs.cursor.com/en/cli/headless) |
| Gemini CLI | `["--approval-mode", "yolo"]` | [Gemini CLI configuration](https://google-gemini.github.io/gemini-cli/docs/get-started/configuration.html) |
| GitHub Copilot CLI | `["--allow-all"]` | [Copilot CLI command reference](https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-command-reference) |
| OpenCode | `["--auto"]` | [OpenCode permissions](https://opencode.ai/docs/permissions/) |

These are editable starter values, not a promise that every CLI version or machine policy accepts them. Replace them with the permission settings appropriate for the local environment. Some options grant broad filesystem, command, or network access, so use an external sandbox when the local setup requires one.

Do not put API keys, tokens, headers, or other secrets in `cli_args`. Command-line arguments can be visible to other local processes. Use the CLI's authentication command, environment support, or user-level configuration instead. Normal Strikethroo diagnostics record a hash of the ordered arguments rather than echoing the array.

### External harness readiness

Strikethroo checks an external harness before using it for a task or code review. Native targets and targets on the current harness do not incur the external readiness requests or apply external harness arguments.

For an external target, Strikethroo makes one request in a disposable Git directory using the exact configured arguments. The prompt tells the harness to run a shell command that creates one nonce-bearing file. Strikethroo verifies the file contents and removes the directory afterward. A zero exit without the file is a failed check.

Results live in `.ai/strikethroo/runtime/harness-availability.json`. Ready results last 30 minutes; unavailable results last 5 minutes. The cache key includes the harness, resolved executable path, ordered-argument hash, normalization version, and probe-registry version. Changing an argument or its order, moving the executable, or updating the readiness contract causes a new check.

Readiness errors do not print model output or configured arguments:

| Error | What to check |
| --- | --- |
| Harness configuration is invalid | Fix the reported `config.yaml` path and exact-array shape. |
| Harness executable is unavailable | Install the CLI and make its executable available on `PATH`. |
| Harness readiness check failed | Check authentication and adjust the local arguments so the harness can run a command that creates a file. |

Task dispatch and code review use the same harness baseline that passed readiness. A zero exit code means only that the external process completed. Task status and verification evidence decide whether a task completed; the review gate separately requires a valid findings document.

### Execution routing

The `execution_routing` section defines named **execution profiles**. Task generation persists the selected profile, and dispatch chooses a configured model target immediately before delegation. The shipped local template contains `docs-and-config`, `standard-implementation`, and `complex-architecture` profiles with an ordered model matrix. Edit the models for the CLIs installed on the local machine. Setting `profiles: {}` disables routing; tasks with no `execution_profile` use the current harness and its normal defaults.

The following configuration is **an example** — profile names, descriptions, and model identifiers are placeholders to adapt, not defaults Strikethroo recognizes:

```yaml
execution_routing:
  profiles:
    routine:
      description: >
        Localized, well-specified changes with low integration risk and a low
        complexity score.
      models:
        - model: exact-model-id
    demanding:
      description: >
        Cross-cutting or high-risk work requiring stronger reasoning.
      models:
        - model: exact-stronger-model-id
          reasoning_effort: high
        - harness: codex
          model: exact-codex-model-id

  resolver:
    script: ./scripts/select-execution-target.cjs   # optional
```

How the pieces divide responsibility:

- **Profile names are yours.** They are arbitrary routing concepts — nothing in Strikethroo depends on particular names.
- **Descriptions are the contract.** During task generation the LLM matches each task against them, so describe *when* a profile applies (kind of work, risk, complexity) rather than restating a model name. Weak: "Uses the big model." Strong: "Cross-cutting refactors, security-sensitive code, or tasks scoring 7+ complexity."
- **`models` order is priority.** The built-in selector picks the first target not present in the task's avoid set.
- **Targets are exact.** `model` is required; `harness` and `reasoning_effort` are optional. The selected values are passed verbatim to dispatch, with no aliases or translation.
- **One optional global selector.** Advanced policies go in one repository-relative script under `resolver.script` (`.js`/`.cjs`/`.mjs` runs under Node; anything else executes directly). For one task it receives `{"version":1,"task":{"id":6,"profile":"demanding"},"candidates":[{"id":"…","target":{"model":"…"}}],"avoid":["…"]}` on stdin and must print exactly `{"target":"<candidate id>"}`. Candidate IDs identify the complete configured target. It may select only a supplied, non-avoided candidate. Missing scripts, timeouts, non-zero exits, malformed output, and unknown or avoided targets cause a visible fallback to current-harness defaults; a configured selector is authoritative and is not replaced by the built-in policy on failure.
- **Readiness is harness-level.** Native and current-harness targets bypass the check. An external target must complete the one file-creation request described above. The request omits a model override so the CLI uses its configured default. A passing check does not prove that every model named in a routing profile exists.
- **Readiness results are cached by invocation identity.** The cache includes the resolved executable path and exact argument hash, so moving the CLI or changing local arguments cannot reuse an older result.
- **Unavailable targets retry safely.** Dispatch adds a rejected target's complete ID to the avoid set and invokes selection again. Exhausting the profile, losing the configured profile, or failing the selector falls back to the current harness without model or reasoning overrides.

Classification runs inside `st-generate-tasks` (and the task-generation step of `st-full-workflow`) after task files are emitted and before `POST_TASK_GENERATION_ALL` assembles the blueprint. The durable task metadata is `execution_profile`; selection, availability checking, retries, and fallback happen immediately before delegation.

## Templates

Templates are editable Markdown files in `.ai/strikethroo/config/templates/`. They define the structure the LLM follows when generating plans, tasks, and execution artifacts. The **Customize** view has a matching Templates tab:

[![Customize, Templates tab]({{ '/assets/customize-templates.png' | relative_url }})]({{ '/assets/customize-templates.png' | relative_url }})

<div class="st-cards" markdown="0">
<div class="st-card">
<span class="st-card__icon st-card__icon--file-text" aria-hidden="true"></span>
<p class="st-card__title">PLAN_TEMPLATE.md</p>
<p>Structure for project plans. Frontmatter: <code>id</code>, <code>summary</code>, <code>created</code>. Sections cover Original Work Order, Clarifications, Executive Summary, Context, Technical Approach, Risks, Success Criteria, and Resources. Add domain-specific sections (security architecture, compliance) as needed.</p>
</div>
<div class="st-card">
<span class="st-card__icon st-card__icon--list-checks" aria-hidden="true"></span>
<p class="st-card__title">TASK_TEMPLATE.md</p>
<p>Structure for individual tasks. Frontmatter: <code>id</code>, <code>group</code>, <code>dependencies</code>, <code>status</code>, <code>created</code>, <code>skills</code>, <code>complexity_score</code> (required on newly generated tasks), and optionally <code>complexity_notes</code>. Sections cover Objective, Skills Required, Acceptance Criteria, Technical Requirements, Dependencies, Output Artifacts, and Implementation Notes. Add project checklists to the acceptance criteria.</p>
</div>
<div class="st-card">
<span class="st-card__icon st-card__icon--waypoints" aria-hidden="true"></span>
<p class="st-card__title">BLUEPRINT_TEMPLATE.md</p>
<p>Structure for the phase-based execution blueprint. Defines quality-gate references, phase groupings with parallel task assignments, post-phase actions, and execution summary metrics (phase count, task count, parallelism, critical path).</p>
</div>
<div class="st-card">
<span class="st-card__icon st-card__icon--file-check" aria-hidden="true"></span>
<p class="st-card__title">EXECUTION_SUMMARY_TEMPLATE.md</p>
<p>Structure for post-completion documentation. Captures completion status, date, results summary, noteworthy events, and follow-up recommendations.</p>
</div>
</div>

## Strikethroo profiles

Everything above — hooks, shared disciplines, `config.yaml`, templates, and the `STRIKETHROO.md` project context — can be packaged into a **strikethroo profile**: a shareable directory holding a `profile.yaml` manifest plus a sparse `config/` tree mirroring `.ai/strikethroo/config/`. This is the explicit way to distribute a starting `config.yaml` even though initialized workspaces ignore their local copy. Passing `--profile <value>` to `init` seeds the workspace from that package, then the recipient can adjust harness permissions, models, and routing for that machine without committing those edits.

Not to be confused with the **execution profiles** of [execution routing](#execution-routing) above: those are task-routing concepts selected at dispatch time, while a strikethroo profile is a setup package consumed once at `init`.

### Importing

`--profile` accepts three source forms, resolved in this order:

1. **A local directory** — an existing path on disk is read in place.
2. **GitHub shorthand** — `<user>/<repo>` expands to `https://github.com/<user>/<repo>.git`.
3. **Any git URL** — GitLab, ssh, any git host; used verbatim.

Remote profiles are shallow-cloned, so `git` on the PATH is required only for remote imports. A relative local path that happens to look like `user/repo` resolves as the folder — the existing-path check runs first.

```bash
npx strikethroo init --harnesses claude --profile ./my-profile
npx strikethroo init --harnesses claude --profile someuser/drupal-profile
npx strikethroo init --harnesses claude --profile https://gitlab.com/team/profile.git
```

The profile's files overlay the shipped defaults and then flow through the normal `init` machinery — conflict prompts, `--force`, and hash tracking treat profile-supplied files exactly like stock ones. Validation is all-or-nothing and runs before any workspace mutation; there is no partial import.

Imports are **fork-and-forget**: the profile seeds your workspace once, and from then on the files are yours — no link back, no updates to pull. A subsequent plain `init` uses the shipped defaults again. The only trace is a `profile` field in `.init-metadata.json` recording the name, source, and import date — display and forensics only, nothing reads it for behavior.

### The manifest

`profile.yaml` must carry `schema_version` (currently `1`), a kebab-case `name`, and a one-line `description`. Optional fields: `purpose` (long-form statement of what the profile is tuned for), `tags`, `author`, and two informational dependency lists — `requires` and `recommends`, each a list of `{kind, name, install?}` entries with `kind` of `skill` or `tool`. These are printed during init as prerequisites and pairings; they are never probed, executed, or installed.

The `config/` tree may contain `hooks/*.md`, `templates/*.md`, `shared/*.md`, `config.yaml`, and `STRIKETHROO.md` — flat Markdown only inside the three subdirectories. The `schemas/` subtree is CLI-owned and rejected, as are dotfiles and nested directories. Entries at the package root other than `profile.yaml` and `config/` — a repository's `README.md`, `LICENSE`, `.git` — are tolerated and inert: only `config/` is ever copied into the workspace, so root extras are neither imported nor executed.

### Exporting

Share your own setup with the export command:

```bash
npx strikethroo export profile --destination-directory ./my-profile
```

It packages the current workspace's `config/` (minus `schemas/`) verbatim — including the ignored local `config.yaml` — as the full configuration, not a diff against defaults. It collects the manifest interactively, refuses a non-empty destination, and validates the package against the same contract `init --profile` enforces. Review harness flags and model names before publishing the profile; the export is an intentional snapshot of local settings. Push the resulting folder to a git host or share it directly.

## Customization Example

Here is a PRE_PLAN hook customized for a project with specific architectural constraints. This is a good use of hooks because the LLM must exercise judgment -- deciding whether a proposed approach violates these guidelines requires understanding, not just execution.

```markdown
# PRE_PLAN Hook

## Scope Control Guidelines

(keep defaults)

## Project Architecture Constraints

When evaluating the plan, enforce these project-specific rules:

- **Data layer**: All database access goes through the repository pattern.
  Do not propose direct query construction in controllers or services.
- **API design**: REST endpoints follow our existing resource naming
  conventions in `/docs/api-style-guide.md`. Review it before proposing
  new endpoints.
- **State management**: Frontend state uses Zustand. Do not introduce
  Redux, MobX, or other state libraries.
- **Authentication**: All new endpoints must use the existing JWT
  middleware in `src/middleware/auth.ts`. Do not build new auth flows.

If any of these constraints conflict with the user's request, surface
the conflict in the Plan Clarifications section rather than silently
choosing an approach.
```

This works because the LLM reads these constraints and applies them contextually during planning.

{% capture good_hook %}
A good hook needs judgment ("does this approach violate our constraints?"). A poor hook is a deterministic check ("run `npm run lint` and fail under 80% coverage") &mdash; that belongs in CI or a git pre-commit hook, not here.
{% endcapture %}
{% include callout.html variant="tip" content=good_hook %}

You don't have to leave the browser to write a hook like this. The **Customize** view opens any hook or template in an in-place editor -- one of only two writes the web app ever makes to disk:

[![Editing a hook in the Customize editor]({{ '/assets/customize-detail-editor.png' | relative_url }})]({{ '/assets/customize-detail-editor.png' | relative_url }})

Make your edit, save, and the change lands live:

<video class="wide-video" controls preload="metadata" src="{{ '/assets/customize-editor-save.webm' | relative_url }}"></video>
