# kenkeep Index: conventions

↑ Parent: [kenkeep](../index.md)

> kenkeep navigation: the injected body above is the root index node, the top-level catalog of branches and root-level leaves. Do not expect the whole knowledge base here; descend on demand. Read the root index node, pick one or more branches whose intent and tags match your task (several branches can be relevant), and read those branch `index.md` nodes. Descend further only where the task needs it, opening only the leaves you have confirmed are relevant. Follow each leaf's `relates_to` and `depends_on` cross edges to reach related leaves in other branches. You decide how deep to go per branch.

> This index only orients you; leaves hold the durable guidance. Open at least one relevant leaf before acting.

## Subfolders
_None._

## Conventions (how we build)
- Open [**Documentation captures current state only**](practice-documentation-captures-current-state-only.md) to learn about: All docs describe how things work now. No historical context, migration notes, or retired-term mappings. #documentation #conventions
- Open [**Phase is reserved for execution blueprint task groups**](practice-phase-reserved-for-blueprint-task-groups.md) to learn about: "Phase" means parallel task batches in the blueprint. The three workflow stages are "steps", never "phases". #terminology #documentation #execution-blueprint
- Open [**Exclude host-specific knowledge from the repository knowledge base**](practice-exclude-host-specific-knowledge-from-the-repository-knowledge-base.md) to learn about: Keep host-specific tooling availability and credential conventions out of repository Kenkeep nodes. #kenkeep #knowledge #conventions
- Open [**Keep comment prose terse and single-sourced**](practice-keep-comment-prose-terse-and-single-sourced.md) to learn about: Do not write long doc comments or repeat the same rationale across call sites and file copies. State it once where it belongs. #comments #code-style #documentation #xsd #prose

## Components (what exists)
_None yet._

## By topic

### #documentation
- Open [**Documentation captures current state only**](practice-documentation-captures-current-state-only.md) — All docs describe how things work now. No historical context, migration notes, or retired-term mappings.
- Open [**Workspace tracking is project-owned except local configuration and runtime output**](../git/practice-takes-no-stance-on-committing-the-ai-strikethroo-workspace.md) — Projects choose whether to track plans and authored workspace files, while init ignores machine-local config.yaml, review artifacts, and runtime output.
- Open [**Keep uncommitted workflow identifiers out of public issue and PR text**](../git/practice-keep-uncommitted-workflow-identifiers-out-of-public-issue-and-pr-text.md) — Public issues and PRs describe changes without internal plan numbers or references to uncommitted workflow documents.
### #conventions
- Open [**Documentation captures current state only**](practice-documentation-captures-current-state-only.md) — All docs describe how things work now. No historical context, migration notes, or retired-term mappings.
- Open [**Exclude host-specific knowledge from the repository knowledge base**](practice-exclude-host-specific-knowledge-from-the-repository-knowledge-base.md) — Keep host-specific tooling availability and credential conventions out of repository Kenkeep nodes.
### #code-style
- Open [**Keep comment prose terse and single-sourced**](practice-keep-comment-prose-terse-and-single-sourced.md) — Do not write long doc comments or repeat the same rationale across call sites and file copies. State it once where it belongs.
### #comments
- Open [**Avoid */ inside @theme CSS comments to prevent premature comment termination**](../web/styling/practice-avoid-inside-theme-css-comments-to-prevent-premature-comment-termination.md) — A comment containing */ inside a Tailwind @theme block terminates the comment early, producing a cryptic parse error that halts the build.
- Open [**Keep comment prose terse and single-sourced**](practice-keep-comment-prose-terse-and-single-sourced.md) — Do not write long doc comments or repeat the same rationale across call sites and file copies. State it once where it belongs.
### #execution-blueprint
- Open [**Plan Detail: blueprint markdown section is distinct from the tasks-frontmatter Tasks tab**](../serve/practice-plan-detail-blueprint-markdown-vs-tasks-frontmatter.md) — Four data sources feed the Plan Detail tabs; the blueprint prose and tasks-frontmatter rendering must not be conflated
- Open [**Phase is reserved for execution blueprint task groups**](practice-phase-reserved-for-blueprint-task-groups.md) — "Phase" means parallel task batches in the blueprint. The three workflow stages are "steps", never "phases".
### #kenkeep
- Open [**Exclude host-specific knowledge from the repository knowledge base**](practice-exclude-host-specific-knowledge-from-the-repository-knowledge-base.md) — Keep host-specific tooling availability and credential conventions out of repository Kenkeep nodes.
### #knowledge
- Open [**Exclude host-specific knowledge from the repository knowledge base**](practice-exclude-host-specific-knowledge-from-the-repository-knowledge-base.md) — Keep host-specific tooling availability and credential conventions out of repository Kenkeep nodes.
### #prose
- Open [**Keep comment prose terse and single-sourced**](practice-keep-comment-prose-terse-and-single-sourced.md) — Do not write long doc comments or repeat the same rationale across call sites and file copies. State it once where it belongs.
### #terminology
- Open [**Phase is reserved for execution blueprint task groups**](practice-phase-reserved-for-blueprint-task-groups.md) — "Phase" means parallel task batches in the blueprint. The three workflow stages are "steps", never "phases".
### #xsd
- Open [**Keep comment prose terse and single-sourced**](practice-keep-comment-prose-terse-and-single-sourced.md) — Do not write long doc comments or repeat the same rationale across call sites and file copies. State it once where it belongs.