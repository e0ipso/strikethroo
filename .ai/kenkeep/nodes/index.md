---
okf_version: '0.1'
---
# kenkeep Index

> kenkeep navigation: the injected body above is the root index node, the top-level catalog of branches and root-level leaves. Do not expect the whole knowledge base here; descend on demand. Read the root index node, pick one or more branches whose intent and tags match your task (several branches can be relevant), and read those branch `index.md` nodes. Descend further only where the task needs it, opening only the leaves you have confirmed are relevant. Follow each leaf's `relates_to` and `depends_on` cross edges to reach related leaves in other branches. You decide how deep to go per branch.

> This index only orients you; leaves hold the durable guidance. Open at least one relevant leaf before acting.

## Subfolders
- Load [`capture/`](capture/index.md) for more information on the documentation-visual capture harness — its committed fixture workspace and Playwright SPA-driving technique.
- Load [`code-review/`](code-review/index.md) for more information on the report-only code review gate — reviewer discovery and dispatch, the stdout delivery channel, XSD certification, and cumulative-diff scoping.
- Load [`conventions/`](conventions/index.md) for more information on documentation and terminology conventions — current-state-only docs and the reserved meaning of phase.
- Load [`dev/`](dev/index.md) for more information on the local development loop — dev:serve hot reload, the three concurrent processes, and rebuilding the SPA for serve.
- Load [`devcontainer/`](devcontainer/index.md) for more information on devcontainer environment and t3 agent sandbox setup — Docker networking, port configuration, and t3 desktop connection; read when configuring or troubleshooting the devcontainer.
- Load [`git/`](git/index.md) for more information on Git workflow constraints — commit-message hooks, the pre-commit test gate, attribution rules, and gitignored workspace state.
- Load [`release/`](release/index.md) for more information on releasing and distribution — semantic-release, the npm-tarball vs GitHub-git-tree channels, and the root skills/ release mirror with its release-only sync.
- Load [`serve/`](serve/index.md) for more information on the read-only serve backend — HTTP/JSON API routes, the workspace data model and derivation, and the archive and self-review operations.
- Load [`skills/`](skills/index.md) for more information on the harness-agnostic Agent Skills system — intent-based loading, the skill-scripts root utility, and cross-harness abstraction.
- Load [`testing/`](testing/index.md) for more information on the test strategy — the committed fixture workspace, Vitest node-env limits, and Playwright e2e selectors and flakiness.
- Load [`tooling/`](tooling/index.md) for more information on lint, format, and type-check tooling — the ESLint flat config, Prettier exclusions, and gaps in the lint gate.
- Load [`web/`](web/index.md) for more information on the React + Vite + Tailwind SPA — data layer, screens, routing, and the branding, editor, rendering, styling, and ui subareas.

## Conventions (how we build)
- Open [**Never hand-commit generated skill artifacts in either tree**](practice-never-hand-commit-generated-skill-artifacts.md) to learn about: templates/harness/skills is gitignored build output; the root skills/ mirror is tracked but written only by the release sync. .gitattributes and the pre-commit guard cover both trees and the review gate skips them. #build #skills #git #gitattributes #review-gate #generated-artifacts
- Open [**Review gate artifacts are git-ignored by a workspace-root .gitignore**](practice-review-gate-artifacts-are-git-ignored-by-a-workspace-root-gitignore.md) to learn about: init ships .ai/strikethroo/.gitignore covering plans/*/review/ and archive/*/review/, keeping reviewer output out of git and its own diff. #code-review #gitignore #workspace #init #generated-artifacts
- Open [**Workspace tracking is project-owned except local configuration and runtime output**](practice-takes-no-stance-on-committing-the-ai-strikethroo-workspace.md) to learn about: Projects choose whether to track plans and authored workspace files, while init ignores machine-local config.yaml, review artifacts, and runtime output. #gitignore #workspace #documentation #code-review #init
- Open [**Strikethroo profile packages tolerate inert package-root extras**](practice-strikethroo-profile-packages-tolerate-inert-package-root-extras.md) to learn about: validateProfilePackage scopes to profile.yaml plus config/; entries at the package root are accepted and are never copied, hash-tracked, or executed. #profiles #init #validation #security

## Components (what exists)
_None yet._

## By topic

### #init
- Open [**Review gate artifacts are git-ignored by a workspace-root .gitignore**](practice-review-gate-artifacts-are-git-ignored-by-a-workspace-root-gitignore.md) — init ships .ai/strikethroo/.gitignore covering plans/*/review/ and archive/*/review/, keeping reviewer output out of git and its own diff.
- Open [**Workspace tracking is project-owned except local configuration and runtime output**](practice-takes-no-stance-on-committing-the-ai-strikethroo-workspace.md) — Projects choose whether to track plans and authored workspace files, while init ignores machine-local config.yaml, review artifacts, and runtime output.
- Open [**Strikethroo profile packages tolerate inert package-root extras**](practice-strikethroo-profile-packages-tolerate-inert-package-root-extras.md) — validateProfilePackage scopes to profile.yaml plus config/; entries at the package root are accepted and are never copied, hash-tracked, or executed.
### #code-review
- Open [**Review gate artifacts are git-ignored by a workspace-root .gitignore**](practice-review-gate-artifacts-are-git-ignored-by-a-workspace-root-gitignore.md) — init ships .ai/strikethroo/.gitignore covering plans/*/review/ and archive/*/review/, keeping reviewer output out of git and its own diff.
- Open [**Workspace tracking is project-owned except local configuration and runtime output**](practice-takes-no-stance-on-committing-the-ai-strikethroo-workspace.md) — Projects choose whether to track plans and authored workspace files, while init ignores machine-local config.yaml, review artifacts, and runtime output.
### #generated-artifacts
- Open [**Never hand-commit generated skill artifacts in either tree**](practice-never-hand-commit-generated-skill-artifacts.md) — templates/harness/skills is gitignored build output; the root skills/ mirror is tracked but written only by the release sync. .gitattributes and the pre-commit guard cover both trees and the review gate skips them.
- Open [**Review gate artifacts are git-ignored by a workspace-root .gitignore**](practice-review-gate-artifacts-are-git-ignored-by-a-workspace-root-gitignore.md) — init ships .ai/strikethroo/.gitignore covering plans/*/review/ and archive/*/review/, keeping reviewer output out of git and its own diff.
### #gitignore
- Open [**Workspace tracking is project-owned except local configuration and runtime output**](practice-takes-no-stance-on-committing-the-ai-strikethroo-workspace.md) — Projects choose whether to track plans and authored workspace files, while init ignores machine-local config.yaml, review artifacts, and runtime output.
- Open [**Review gate artifacts are git-ignored by a workspace-root .gitignore**](practice-review-gate-artifacts-are-git-ignored-by-a-workspace-root-gitignore.md) — init ships .ai/strikethroo/.gitignore covering plans/*/review/ and archive/*/review/, keeping reviewer output out of git and its own diff.
- Open [**Keep .ai/strikethroo (dogfood workspace) explicitly ignored in .gitignore**](git/practice-keep-ai-strikethroo-dogfood-workspace-explicitly-ignored-in-gitignore.md) — The /.ai/strikethroo path must stay in .gitignore to prevent accidentally committing dogfood workspace state.
### #workspace
- Open [**Review gate artifacts are git-ignored by a workspace-root .gitignore**](practice-review-gate-artifacts-are-git-ignored-by-a-workspace-root-gitignore.md) — init ships .ai/strikethroo/.gitignore covering plans/*/review/ and archive/*/review/, keeping reviewer output out of git and its own diff.
- Open [**Workspace tracking is project-owned except local configuration and runtime output**](practice-takes-no-stance-on-committing-the-ai-strikethroo-workspace.md) — Projects choose whether to track plans and authored workspace files, while init ignores machine-local config.yaml, review artifacts, and runtime output.
- Open [**Keep .ai/strikethroo (dogfood workspace) explicitly ignored in .gitignore**](git/practice-keep-ai-strikethroo-dogfood-workspace-explicitly-ignored-in-gitignore.md) — The /.ai/strikethroo path must stay in .gitignore to prevent accidentally committing dogfood workspace state.
### #build
- Open [**Use build-time composition to eliminate cross-skill prompt duplication**](skills/prompts/practice-use-build-time-composition-to-eliminate-cross-skill-prompt-duplication.md) — Shared procedural blocks in SKILL.md files must live as Handlebars partials under src/skill-prompts/_partials/, not copy-pasted per skill.
- Open [**SPA source changes require npm run build:web before serve reflects them**](dev/practice-spa-source-changes-require-npm-run-build-web-before-serve-reflects-them.md) — serve hosts the prebuilt dist-web/ bundle. SPA source changes are not visible until npm run build:web is run; a hard-refresh clears cached content-hashed chunks.
- Open [**Avoid */ inside @theme CSS comments to prevent premature comment termination**](web/styling/practice-avoid-inside-theme-css-comments-to-prevent-premature-comment-termination.md) — A comment containing */ inside a Tailwind @theme block terminates the comment early, producing a cryptic parse error that halts the build.
### #documentation
- Open [**Documentation captures current state only**](conventions/practice-documentation-captures-current-state-only.md) — All docs describe how things work now. No historical context, migration notes, or retired-term mappings.
- Open [**Phase is reserved for execution blueprint task groups**](conventions/practice-phase-reserved-for-blueprint-task-groups.md) — "Phase" means parallel task batches in the blueprint. The three workflow stages are "steps", never "phases".
- Open [**Workspace tracking is project-owned except local configuration and runtime output**](practice-takes-no-stance-on-committing-the-ai-strikethroo-workspace.md) — Projects choose whether to track plans and authored workspace files, while init ignores machine-local config.yaml, review artifacts, and runtime output.
### #git
- Open [**Do not use --no-verify to skip git commit hooks**](git/practice-do-not-use-no-verify-to-skip-git-commit-hooks.md) — Bypassing commit hooks with --no-verify hides real breakage and triggers an approval prompt that halts autonomous runs.
- Open [**Project commit hook rejects AI co-authorship attribution trailers**](git/practice-project-commit-hook-rejects-ai-co-authorship-attribution-trailers.md) — A commit hook rejects Co-Authored-By AI attribution lines; omit them when committing in this repository.
- Open [**Commit subject ≤50 chars; body wrapped at 72 chars (hook enforced)**](git/practice-commit-subject-50-chars-body-wrapped-at-72-chars-hook-enforced.md) — A commit-message hook enforces 50-char subject lines and 72-char body wrapping; violations abort the commit.
### #gitattributes
- Open [**Never hand-commit generated skill artifacts in either tree**](practice-never-hand-commit-generated-skill-artifacts.md) — templates/harness/skills is gitignored build output; the root skills/ mirror is tracked but written only by the release sync. .gitattributes and the pre-commit guard cover both trees and the review gate skips them.
### #profiles
- Open [**Strikethroo profile packages tolerate inert package-root extras**](practice-strikethroo-profile-packages-tolerate-inert-package-root-extras.md) — validateProfilePackage scopes to profile.yaml plus config/; entries at the package root are accepted and are never copied, hash-tracked, or executed.
### #review-gate
- Open [**Never hand-commit generated skill artifacts in either tree**](practice-never-hand-commit-generated-skill-artifacts.md) — templates/harness/skills is gitignored build output; the root skills/ mirror is tracked but written only by the release sync. .gitattributes and the pre-commit guard cover both trees and the review gate skips them.
- Open [**The review gate reports; it never fixes. Re-run POST_EXECUTION after acting on a finding**](code-review/practice-review-gate-reports-it-does-not-fix.md) — The gate runs once after POST_EXECUTION, records findings, and applies nothing. If you act on a finding, re-run POST_EXECUTION in full before declaring complete.
### #security
- Open [**Keep t3 pairing auth — sibling devcontainers can reach the Docker bridge**](devcontainer/practice-keep-t3-pairing-auth-sibling-devcontainers-can-reach-the-docker-bridge.md) — t3 binds 0.0.0.0 inside the container; sibling devcontainers on the Docker default bridge can reach it without auth.
- Open [**Strikethroo profile packages tolerate inert package-root extras**](practice-strikethroo-profile-packages-tolerate-inert-package-root-extras.md) — validateProfilePackage scopes to profile.yaml plus config/; entries at the package root are accepted and are never copied, hash-tracked, or executed.
- Open [**Web routes and API resolve plans by composite {id}--{slug} directory name, not numeric id alone**](serve/practice-web-routes-and-api-resolve-plans-by-composite-id-slug-directory-name-not-numeric.md) — The serve API and SPA router use the composite {id}--{slug} directory name as the routing key. Numeric-only URLs 404. The numeric id is display/sort only.
### #skills
- Open [**Skills are auto-loaded by intent matching, not slash-command prefix**](skills/map-skills-are-auto-loaded-by-intent-matching-not-slash-command-prefix.md) — Users do not type /st-create-plan; the harness matches the user's intent to the skill description and auto-loads it.
- Open [**Cross-harness code abstraction centralized in ~54 lines across 3 locations**](skills/map-cross-harness-code-abstraction-centralized-in-54-lines-across-3-locations.md) — All harness-specific logic lives in src/types.ts (union type), src/utils.ts (VALID_HARNESSES + getAgentFormat), and src/index.ts (createHarnessStructure). Skills are harness-agnostic.
- Open [**Installed skills in .claude/skills/ are decoupled from repo builds**](release/map-installed-skills-in-claude-skills-are-decoupled-from-repo-builds.md) — Skills installed via npx skills add are separate from repo-built artifacts; a rebuild does not update the installed copies. Restart required after reinstall.
### #validation
- Open [**Strikethroo profile packages tolerate inert package-root extras**](practice-strikethroo-profile-packages-tolerate-inert-package-root-extras.md) — validateProfilePackage scopes to profile.yaml plus config/; entries at the package root are accepted and are never copied, hash-tracked, or executed.
