---
okf_version: '0.1'
---
# kenkeep Index

> kenkeep navigation: the injected body above is the root index node, the top-level catalog of branches and root-level leaves. Do not expect the whole knowledge base here; descend on demand. Read the root index node, pick one or more branches whose intent and tags match your task (several branches can be relevant), and read those branch `index.md` nodes. Descend further only where the task needs it, opening only the leaves you have confirmed are relevant. Follow each leaf's `relates_to` and `depends_on` cross edges to reach related leaves in other branches. You decide how deep to go per branch.

> This index only orients you; leaves hold the durable guidance. Open at least one relevant leaf before acting.

## Subfolders
- Load [`capture/`](capture/index.md) for more information on the documentation-visual capture harness — its committed fixture workspace and Playwright SPA-driving technique.
- Load [`code-review/`](code-review/index.md) for more information on Code Review.
- Load [`conventions/`](conventions/index.md) for more information on documentation and terminology conventions — current-state-only docs and the reserved meaning of phase.
- Load [`dev/`](dev/index.md) for more information on the local development loop — dev:serve hot reload, the three concurrent processes, and rebuilding the SPA for serve.
- Load [`devcontainer/`](devcontainer/index.md) for more information on devcontainer environment and t3 agent sandbox setup — Docker networking, port configuration, and t3 desktop connection; read when configuring or troubleshooting the devcontainer.
- Load [`git/`](git/index.md) for more information on Git workflow constraints — commit-message hooks, the pre-commit test gate, attribution rules, and gitignored workspace state.
- Load [`release/`](release/index.md) for more information on releasing and distribution — semantic-release, the npm-tarball vs GitHub-git-tree channels, and skill-artifact force-adding.
- Load [`serve/`](serve/index.md) for more information on the read-only serve backend — HTTP/JSON API routes, the workspace data model and derivation, and the archive and self-review operations.
- Load [`skills/`](skills/index.md) for more information on the harness-agnostic Agent Skills system — intent-based loading, the skill-scripts root utility, and cross-harness abstraction.
- Load [`testing/`](testing/index.md) for more information on the test strategy — the committed fixture workspace, Vitest node-env limits, and Playwright e2e selectors and flakiness.
- Load [`tooling/`](tooling/index.md) for more information on lint, format, and type-check tooling — the ESLint flat config, Prettier exclusions, and gaps in the lint gate.
- Load [`web/`](web/index.md) for more information on Web.

## Conventions (how we build)
- Open [**Never hand-commit generated skill artifacts; they cannot be gitignored**](practice-never-hand-commit-generated-skill-artifacts.md) to learn about: SKILL.md and .cjs bundles are build output force-added by CI, so .gitattributes and a pre-commit guard cover them and the review gate skips them. #build #skills #git #gitattributes #review-gate #generated-artifacts
- Open [**Review gate artifacts are git-ignored by a workspace-root .gitignore**](practice-review-gate-artifacts-are-git-ignored-by-a-workspace-root-gitignore.md) to learn about: init ships .ai/strikethroo/.gitignore covering plans/*/review/ and archive/*/review/, keeping reviewer output out of git and its own diff. #code-review #gitignore #workspace #init #generated-artifacts
- Open [**Strikethroo takes no stance on committing the .ai/strikethroo/ workspace**](practice-takes-no-stance-on-committing-the-ai-strikethroo-workspace.md) to learn about: Whether a consuming project commits .ai/strikethroo/ is that project's call; this repo's root .gitignore entry is dogfooding, not product behavior. #gitignore #workspace #documentation #code-review #init

## Components (what exists)
_None yet._

## By topic

### #code-review
- Open [**Review gate artifacts are git-ignored by a workspace-root .gitignore**](practice-review-gate-artifacts-are-git-ignored-by-a-workspace-root-gitignore.md) — init ships .ai/strikethroo/.gitignore covering plans/*/review/ and archive/*/review/, keeping reviewer output out of git and its own diff.
- Open [**Strikethroo takes no stance on committing the .ai/strikethroo/ workspace**](practice-takes-no-stance-on-committing-the-ai-strikethroo-workspace.md) — Whether a consuming project commits .ai/strikethroo/ is that project's call; this repo's root .gitignore entry is dogfooding, not product behavior.
### #generated-artifacts
- Open [**Never hand-commit generated skill artifacts; they cannot be gitignored**](practice-never-hand-commit-generated-skill-artifacts.md) — SKILL.md and .cjs bundles are build output force-added by CI, so .gitattributes and a pre-commit guard cover them and the review gate skips them.
- Open [**Review gate artifacts are git-ignored by a workspace-root .gitignore**](practice-review-gate-artifacts-are-git-ignored-by-a-workspace-root-gitignore.md) — init ships .ai/strikethroo/.gitignore covering plans/*/review/ and archive/*/review/, keeping reviewer output out of git and its own diff.
### #gitignore
- Open [**Strikethroo takes no stance on committing the .ai/strikethroo/ workspace**](practice-takes-no-stance-on-committing-the-ai-strikethroo-workspace.md) — Whether a consuming project commits .ai/strikethroo/ is that project's call; this repo's root .gitignore entry is dogfooding, not product behavior.
- Open [**Review gate artifacts are git-ignored by a workspace-root .gitignore**](practice-review-gate-artifacts-are-git-ignored-by-a-workspace-root-gitignore.md) — init ships .ai/strikethroo/.gitignore covering plans/*/review/ and archive/*/review/, keeping reviewer output out of git and its own diff.
- Open [**Keep .ai/strikethroo (dogfood workspace) explicitly ignored in .gitignore**](git/practice-keep-ai-strikethroo-dogfood-workspace-explicitly-ignored-in-gitignore.md) — The /.ai/strikethroo path must stay in .gitignore to prevent accidentally committing dogfood workspace state.
### #init
- Open [**Review gate artifacts are git-ignored by a workspace-root .gitignore**](practice-review-gate-artifacts-are-git-ignored-by-a-workspace-root-gitignore.md) — init ships .ai/strikethroo/.gitignore covering plans/*/review/ and archive/*/review/, keeping reviewer output out of git and its own diff.
- Open [**Strikethroo takes no stance on committing the .ai/strikethroo/ workspace**](practice-takes-no-stance-on-committing-the-ai-strikethroo-workspace.md) — Whether a consuming project commits .ai/strikethroo/ is that project's call; this repo's root .gitignore entry is dogfooding, not product behavior.
### #workspace
- Open [**Review gate artifacts are git-ignored by a workspace-root .gitignore**](practice-review-gate-artifacts-are-git-ignored-by-a-workspace-root-gitignore.md) — init ships .ai/strikethroo/.gitignore covering plans/*/review/ and archive/*/review/, keeping reviewer output out of git and its own diff.
- Open [**Strikethroo takes no stance on committing the .ai/strikethroo/ workspace**](practice-takes-no-stance-on-committing-the-ai-strikethroo-workspace.md) — Whether a consuming project commits .ai/strikethroo/ is that project's call; this repo's root .gitignore entry is dogfooding, not product behavior.
- Open [**Keep .ai/strikethroo (dogfood workspace) explicitly ignored in .gitignore**](git/practice-keep-ai-strikethroo-dogfood-workspace-explicitly-ignored-in-gitignore.md) — The /.ai/strikethroo path must stay in .gitignore to prevent accidentally committing dogfood workspace state.
### #build
- Open [**Exclude README.md from skill-prompt template processing in the assembler**](skills/prompts/practice-exclude-readme-md-from-skill-prompt-template-processing-in-the-assembler.md) — The build-skill-prompts.cjs assembler must explicitly skip README.md to avoid treating it as a source template and failing the build.
- Open [**Use build-time composition to eliminate cross-skill prompt duplication**](skills/prompts/practice-use-build-time-composition-to-eliminate-cross-skill-prompt-duplication.md) — Shared procedural blocks in SKILL.md files must live as include-resolved sections under src/skill-prompts/sections/, not copy-pasted per skill.
- Open [**Skill-prompt build system — src/skill-prompts/ source, assembler, shared sections**](skills/prompts/map-src-skill-prompts-is-the-authored-source-of-truth-for-skill-md-content.md) — src/skill-prompts/ templates + sections/ are authored source; build-skill-prompts.cjs assembles git-ignored SKILL.md output via {{include}} and {{variable}}.
### #documentation
- Open [**Documentation captures current state only**](conventions/practice-documentation-captures-current-state-only.md) — All docs describe how things work now. No historical context, migration notes, or retired-term mappings.
- Open [**Phase is reserved for execution blueprint task groups**](conventions/practice-phase-reserved-for-blueprint-task-groups.md) — "Phase" means parallel task batches in the blueprint. The three workflow stages are "steps", never "phases".
- Open [**Strikethroo takes no stance on committing the .ai/strikethroo/ workspace**](practice-takes-no-stance-on-committing-the-ai-strikethroo-workspace.md) — Whether a consuming project commits .ai/strikethroo/ is that project's call; this repo's root .gitignore entry is dogfooding, not product behavior.
### #git
- Open [**Do not use --no-verify to skip git commit hooks**](git/practice-do-not-use-no-verify-to-skip-git-commit-hooks.md) — Bypassing commit hooks with --no-verify hides real breakage and triggers an approval prompt that halts autonomous runs.
- Open [**Project commit hook rejects AI co-authorship attribution trailers**](git/practice-project-commit-hook-rejects-ai-co-authorship-attribution-trailers.md) — A commit hook rejects Co-Authored-By AI attribution lines; omit them when committing in this repository.
- Open [**Commit subject ≤50 chars; body wrapped at 72 chars (hook enforced)**](git/practice-commit-subject-50-chars-body-wrapped-at-72-chars-hook-enforced.md) — A commit-message hook enforces 50-char subject lines and 72-char body wrapping; violations abort the commit.
### #gitattributes
- Open [**Never hand-commit generated skill artifacts; they cannot be gitignored**](practice-never-hand-commit-generated-skill-artifacts.md) — SKILL.md and .cjs bundles are build output force-added by CI, so .gitattributes and a pre-commit guard cover them and the review gate skips them.
### #review-gate
- Open [**Never hand-commit generated skill artifacts; they cannot be gitignored**](practice-never-hand-commit-generated-skill-artifacts.md) — SKILL.md and .cjs bundles are build output force-added by CI, so .gitattributes and a pre-commit guard cover them and the review gate skips them.
- Open [**Review loop ordering: POST_EXECUTION re-runs after fixes, not before**](code-review/practice-review-loop-ordering-post-execution-reruns-after-fixes.md) — Detect → threshold → fix on implementer route → full re-run of mechanical gates → re-verify. The re-run happens after every fix because fixes invalidate the prior green build.
### #skills
- Open [**Skills are auto-loaded by intent matching, not slash-command prefix**](skills/map-skills-are-auto-loaded-by-intent-matching-not-slash-command-prefix.md) — Users do not type /st-create-plan; the harness matches the user's intent to the skill description and auto-loads it.
- Open [**Cross-harness code abstraction centralized in ~54 lines across 3 locations**](skills/map-cross-harness-code-abstraction-centralized-in-54-lines-across-3-locations.md) — All harness-specific logic lives in src/types.ts (union type), src/utils.ts (VALID_HARNESSES + getAgentFormat), and src/index.ts (createHarnessStructure). Skills are harness-agnostic.
- Open [**Installed skills in .claude/skills/ are decoupled from repo builds**](release/map-installed-skills-in-claude-skills-are-decoupled-from-repo-builds.md) — Skills installed via npx skills add are separate from repo-built artifacts; a rebuild does not update the installed copies. Restart required after reinstall.
