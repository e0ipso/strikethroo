# kenkeep Index: git

↑ Parent: [kenkeep](../index.md)

> kenkeep navigation: the injected body above is the root index node, the top-level catalog of branches and root-level leaves. Do not expect the whole knowledge base here; descend on demand. Read the root index node, pick one or more branches whose intent and tags match your task (several branches can be relevant), and read those branch `index.md` nodes. Descend further only where the task needs it, opening only the leaves you have confirmed are relevant. Follow each leaf's `relates_to` and `depends_on` cross edges to reach related leaves in other branches. You decide how deep to go per branch.

> This index only orients you; leaves hold the durable guidance. Open at least one relevant leaf before acting.

## Subfolders
_None._

## Conventions (how we build)
- Open [**Pre-commit test hook prevents per-phase commits during multi-phase plan execution**](practice-pre-commit-test-hook-prevents-per-phase-commits-during-multi-phase-plan-execution.md) to learn about: The pre-commit hook runs npm test; mid-execution the source is in a broken state, so per-phase commits fail until all phases complete. #pre-commit #testing #phase #commit
- Open [**Keep .ai/strikethroo (dogfood workspace) explicitly ignored in .gitignore**](practice-keep-ai-strikethroo-dogfood-workspace-explicitly-ignored-in-gitignore.md) to learn about: The /.ai/strikethroo path must stay in .gitignore to prevent accidentally committing dogfood workspace state. #git #gitignore #workspace
- Open [**Do not use --no-verify to skip git commit hooks**](practice-do-not-use-no-verify-to-skip-git-commit-hooks.md) to learn about: Bypassing commit hooks with --no-verify hides real breakage and triggers an approval prompt that halts autonomous runs. #git #commit #pre-commit #hooks
- Open [**lint-staged scopes lint/format but pre-commit still runs the full test suite**](practice-lint-staged-scopes-lint-format-but-pre-commit-still-runs-the-full-test-suite.md) to learn about: lint-staged runs eslint+prettier on staged src files; the pre-commit hook still runs the full npm test suite after lint-staged completes. #linting #tooling #eslint #prettier #pre-commit
- Open [**Project commit hook rejects AI co-authorship attribution trailers**](practice-project-commit-hook-rejects-ai-co-authorship-attribution-trailers.md) to learn about: A commit hook rejects Co-Authored-By AI attribution lines; omit them when committing in this repository. #git #commit #hooks #attribution
- Open [**Commit subject ≤50 chars; body wrapped at 72 chars (hook enforced)**](practice-commit-subject-50-chars-body-wrapped-at-72-chars-hook-enforced.md) to learn about: A commit-message hook enforces 50-char subject lines and 72-char body wrapping; violations abort the commit. #git #commit #hooks #formatting
- Open [**Isolate concurrent-agent changes before committing by excluding entangled files from staging**](practice-isolate-concurrent-agent-changes-before-committing-by-excluding-entangled-files.md) to learn about: When two agents work on the same tree simultaneously, stage only your files; verify routing direction against HEAD; expect pre-commit failures from the other agent's in-progress WIP. #git #concurrent-agents #staging #pre-commit

## Components (what exists)
_None yet._

## By topic

### #git
- Open [**Do not use --no-verify to skip git commit hooks**](practice-do-not-use-no-verify-to-skip-git-commit-hooks.md) — Bypassing commit hooks with --no-verify hides real breakage and triggers an approval prompt that halts autonomous runs.
- Open [**Project commit hook rejects AI co-authorship attribution trailers**](practice-project-commit-hook-rejects-ai-co-authorship-attribution-trailers.md) — A commit hook rejects Co-Authored-By AI attribution lines; omit them when committing in this repository.
- Open [**Commit subject ≤50 chars; body wrapped at 72 chars (hook enforced)**](practice-commit-subject-50-chars-body-wrapped-at-72-chars-hook-enforced.md) — A commit-message hook enforces 50-char subject lines and 72-char body wrapping; violations abort the commit.
### #commit
- Open [**Do not use --no-verify to skip git commit hooks**](practice-do-not-use-no-verify-to-skip-git-commit-hooks.md) — Bypassing commit hooks with --no-verify hides real breakage and triggers an approval prompt that halts autonomous runs.
- Open [**Commit subject ≤50 chars; body wrapped at 72 chars (hook enforced)**](practice-commit-subject-50-chars-body-wrapped-at-72-chars-hook-enforced.md) — A commit-message hook enforces 50-char subject lines and 72-char body wrapping; violations abort the commit.
- Open [**Project commit hook rejects AI co-authorship attribution trailers**](practice-project-commit-hook-rejects-ai-co-authorship-attribution-trailers.md) — A commit hook rejects Co-Authored-By AI attribution lines; omit them when committing in this repository.
### #pre-commit
- Open [**Do not use --no-verify to skip git commit hooks**](practice-do-not-use-no-verify-to-skip-git-commit-hooks.md) — Bypassing commit hooks with --no-verify hides real breakage and triggers an approval prompt that halts autonomous runs.
- Open [**Pre-commit test hook prevents per-phase commits during multi-phase plan execution**](practice-pre-commit-test-hook-prevents-per-phase-commits-during-multi-phase-plan-execution.md) — The pre-commit hook runs npm test; mid-execution the source is in a broken state, so per-phase commits fail until all phases complete.
- Open [**Isolate concurrent-agent changes before committing by excluding entangled files from staging**](practice-isolate-concurrent-agent-changes-before-committing-by-excluding-entangled-files.md) — When two agents work on the same tree simultaneously, stage only your files; verify routing direction against HEAD; expect pre-commit failures from the other agent's in-progress WIP.
### #hooks
- Open [**Do not use --no-verify to skip git commit hooks**](practice-do-not-use-no-verify-to-skip-git-commit-hooks.md) — Bypassing commit hooks with --no-verify hides real breakage and triggers an approval prompt that halts autonomous runs.
- Open [**Project commit hook rejects AI co-authorship attribution trailers**](practice-project-commit-hook-rejects-ai-co-authorship-attribution-trailers.md) — A commit hook rejects Co-Authored-By AI attribution lines; omit them when committing in this repository.
- Open [**Commit subject ≤50 chars; body wrapped at 72 chars (hook enforced)**](practice-commit-subject-50-chars-body-wrapped-at-72-chars-hook-enforced.md) — A commit-message hook enforces 50-char subject lines and 72-char body wrapping; violations abort the commit.
### #attribution
- Open [**Project commit hook rejects AI co-authorship attribution trailers**](practice-project-commit-hook-rejects-ai-co-authorship-attribution-trailers.md) — A commit hook rejects Co-Authored-By AI attribution lines; omit them when committing in this repository.
### #concurrent-agents
- Open [**Isolate concurrent-agent changes before committing by excluding entangled files from staging**](practice-isolate-concurrent-agent-changes-before-committing-by-excluding-entangled-files.md) — When two agents work on the same tree simultaneously, stage only your files; verify routing direction against HEAD; expect pre-commit failures from the other agent's in-progress WIP.
### #eslint
- Open [**lint-staged scopes lint/format but pre-commit still runs the full test suite**](practice-lint-staged-scopes-lint-format-but-pre-commit-still-runs-the-full-test-suite.md) — lint-staged runs eslint+prettier on staged src files; the pre-commit hook still runs the full npm test suite after lint-staged completes.
- Open [**ESLint config: eslint.config.mjs (flat config, ESLint 9)**](../tooling/map-eslint-config-eslint-config-mjs-flat-config-eslint-9.md) — The active ESLint config is eslint.config.mjs (flat config, ESLint 9). A legacy .eslintrc.js at the repo root is dead cruft ignored by ESLint 9.
- Open [**ESLint test block must include browser globals for page.evaluate callbacks**](../testing/practice-eslint-test-block-must-include-browser-globals-for-page-evaluate-callbacks.md) — Playwright e2e tests use page.evaluate with browser globals (location, URL, document); the ESLint test block must include browserGlobals to avoid no-undef errors.
### #formatting
- Open [**Commit subject ≤50 chars; body wrapped at 72 chars (hook enforced)**](practice-commit-subject-50-chars-body-wrapped-at-72-chars-hook-enforced.md) — A commit-message hook enforces 50-char subject lines and 72-char body wrapping; violations abort the commit.
### #gitignore
- Open [**Keep .ai/strikethroo (dogfood workspace) explicitly ignored in .gitignore**](practice-keep-ai-strikethroo-dogfood-workspace-explicitly-ignored-in-gitignore.md) — The /.ai/strikethroo path must stay in .gitignore to prevent accidentally committing dogfood workspace state.
- Open [**Do not commit .agents/skills/ or skills-lock.json — they are local installation artifacts**](../release/practice-do-not-commit-agents-skills-or-skills-lock-json-they-are-local-installation-artifacts.md) — \`.agents/skills/\` and \`skills-lock.json\` are produced by running \`npx skills add\` locally and must be gitignored, not committed.
- Open [**Use committed fixture workspaces, not the live gitignored .ai/strikethroo/ tree**](../testing/practice-use-committed-fixture-workspaces-not-the-live-ai-strikethroo-tree.md) — Capture, integration, and e2e must use committed fixture workspaces — not the live gitignored .ai/strikethroo/ tree that breaks CI and capture determinism.
### #linting
- Open [**ESLint test block must include browser globals for page.evaluate callbacks**](../testing/practice-eslint-test-block-must-include-browser-globals-for-page-evaluate-callbacks.md) — Playwright e2e tests use page.evaluate with browser globals (location, URL, document); the ESLint test block must include browserGlobals to avoid no-undef errors.
- Open [**lint-staged scopes lint/format but pre-commit still runs the full test suite**](practice-lint-staged-scopes-lint-format-but-pre-commit-still-runs-the-full-test-suite.md) — lint-staged runs eslint+prettier on staged src files; the pre-commit hook still runs the full npm test suite after lint-staged completes.
### #phase
- Open [**Pre-commit test hook prevents per-phase commits during multi-phase plan execution**](practice-pre-commit-test-hook-prevents-per-phase-commits-during-multi-phase-plan-execution.md) — The pre-commit hook runs npm test; mid-execution the source is in a broken state, so per-phase commits fail until all phases complete.
### #prettier
- Open [**lint-staged scopes lint/format but pre-commit still runs the full test suite**](practice-lint-staged-scopes-lint-format-but-pre-commit-still-runs-the-full-test-suite.md) — lint-staged runs eslint+prettier on staged src files; the pre-commit hook still runs the full npm test suite after lint-staged completes.
- Open [**src/web/vendor/ and dist-web/ are excluded from Prettier formatting**](../tooling/practice-src-web-vendor-and-dist-web-are-excluded-from-prettier-formatting.md) — Vendored CSS under src/web/vendor/ must not be reformatted. Both src/web/vendor/ and dist-web/ are excluded via .prettierignore.
### #staging
- Open [**Isolate concurrent-agent changes before committing by excluding entangled files from staging**](practice-isolate-concurrent-agent-changes-before-committing-by-excluding-entangled-files.md) — When two agents work on the same tree simultaneously, stage only your files; verify routing direction against HEAD; expect pre-commit failures from the other agent's in-progress WIP.
### #testing
- Open [**window.__stRevalidationCount — Playwright observability hook for SSE-driven revalidation**](../testing/map-window-strevalidationcount-playwright-observability-hook-for-sse-driven-revalidation.md) — Deliberately-shipped window counter that Playwright e2e tests read to verify live-data revalidation fired after an SSE change event.
- Open [**Playwright e2e suites flake under full-suite parallelism due to CPU contention**](../testing/practice-playwright-e2e-suites-flake-under-full-suite-parallelism-due-to-cpu-contention.md) — Under default workers, parallel Playwright/Chromium processes starve each other; random tests timeout. Run --workers=2 to prove genuine green.
- Open [**E2e tests must use stable semantic selectors, not Tailwind utility class names**](../testing/practice-e2e-tests-must-use-stable-semantic-selectors-not-tailwind-utility-class-names.md) — Playwright e2e assertions must target role, text, aria-*, or data-testid — never Tailwind utility class names, which change during styling iterations.
### #tooling
- Open [**ESLint config: eslint.config.mjs (flat config, ESLint 9)**](../tooling/map-eslint-config-eslint-config-mjs-flat-config-eslint-9.md) — The active ESLint config is eslint.config.mjs (flat config, ESLint 9). A legacy .eslintrc.js at the repo root is dead cruft ignored by ESLint 9.
- Open [**lint-staged scopes lint/format but pre-commit still runs the full test suite**](practice-lint-staged-scopes-lint-format-but-pre-commit-still-runs-the-full-test-suite.md) — lint-staged runs eslint+prettier on staged src files; the pre-commit hook still runs the full npm test suite after lint-staged completes.
- Open [**Hot-reload dev loop requires three concurrent processes**](../dev/practice-hot-reload-dev-loop-requires-three-concurrent-processes.md) — Backend: ts-node via node --watch. Frontend: Vite at localhost:5173 with /api/* proxied to localhost:4317. No dist/ involvement.
### #workspace
- Open [**Keep .ai/strikethroo (dogfood workspace) explicitly ignored in .gitignore**](practice-keep-ai-strikethroo-dogfood-workspace-explicitly-ignored-in-gitignore.md) — The /.ai/strikethroo path must stay in .gitignore to prevent accidentally committing dogfood workspace state.
- Open [**Capture fixture workspace: plans 102–104 as active demo plans for screen capture**](../capture/map-capture-fixture-workspace-plans-102-104-as-active-demo-plans-for-screen-capture.md) — src/capture/fixtures/capture-workspace/ uses plans 102–104 as active plans; plan 103 drives the primary stills (2 done tasks), plan 102 drives the Graph screenshot.