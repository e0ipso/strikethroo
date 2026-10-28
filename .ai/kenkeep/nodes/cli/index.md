# kenkeep Index: cli

↑ Parent: [kenkeep](../index.md)

> kenkeep navigation: the injected body above is the root index node, the top-level catalog of branches and root-level leaves. Do not expect the whole knowledge base here; descend on demand. Read the root index node, pick one or more branches whose intent and tags match your task (several branches can be relevant), and read those branch `index.md` nodes. Descend further only where the task needs it, opening only the leaves you have confirmed are relevant. Follow each leaf's `relates_to` and `depends_on` cross edges to reach related leaves in other branches. You decide how deep to go per branch.

> This index only orients you; leaves hold the durable guidance. Open at least one relevant leaf before acting.

## Subfolders
_None._

## Conventions (how we build)
- Open [**Bump the workspace schema version only for incompatible shape changes**](practice-bump-workspace-schema-version-only-for-incompatible-shape.md) to learn about: CURRENT_WORKSPACE_SCHEMA_VERSION is baked into skills and duplicated as a fallback in root.ts. #schema-version #metadata
- Open [**Init refresh: a kept file keeps its old baseline**](practice-init-refresh-kept-file-keeps-its-old-baseline.md) to learn about: copyCommonTemplates records the previous hash for a kept config file, so the next refresh asks again. #init #refresh
- Open [**validate reports deleted files, never hash drift**](practice-validate-reports-deletions-not-hash-drift.md) to learn about: validateWorkspace avoids findStrikethrooRoot, treats edits as customization, and keeps its own strict reader. #validate #frontmatter

## Components (what exists)
_None yet._

## By topic

### #frontmatter
- Open [**validate reports deleted files, never hash drift**](practice-validate-reports-deletions-not-hash-drift.md) — validateWorkspace avoids findStrikethrooRoot, treats edits as customization, and keeps its own strict reader.
### #init
- Open [**Workspace tracking is project-owned except local configuration and runtime output**](../git/practice-takes-no-stance-on-committing-the-ai-strikethroo-workspace.md) — Projects choose whether to track plans and authored workspace files, while init ignores machine-local config.yaml, review artifacts, and runtime output.
- Open [**Review gate artifacts are git-ignored by a workspace-root .gitignore**](../git/practice-review-gate-artifacts-are-git-ignored-by-a-workspace-root-gitignore.md) — init ships .ai/strikethroo/.gitignore covering plans/*/review/ and archive/*/review/, keeping reviewer output out of git and its own diff.
- Open [**Init refresh: a kept file keeps its old baseline**](practice-init-refresh-kept-file-keeps-its-old-baseline.md) — copyCommonTemplates records the previous hash for a kept config file, so the next refresh asks again.
### #metadata
- Open [**Bump the workspace schema version only for incompatible shape changes**](practice-bump-workspace-schema-version-only-for-incompatible-shape.md) — CURRENT_WORKSPACE_SCHEMA_VERSION is baked into skills and duplicated as a fallback in root.ts.
### #refresh
- Open [**Init refresh: a kept file keeps its old baseline**](practice-init-refresh-kept-file-keeps-its-old-baseline.md) — copyCommonTemplates records the previous hash for a kept config file, so the next refresh asks again.
### #schema-version
- Open [**Optional-by-absence pattern: new workspace files do not bump schema version**](../code-review/practice-optional-by-absence-new-files-absent-means-feature-off.md) — CODE_REVIEW.md and self-review-v2.xsd are both optional by absence; their presence/absence gates the feature. v4 workspaces keep working unchanged.
- Open [**Bump the workspace schema version only for incompatible shape changes**](practice-bump-workspace-schema-version-only-for-incompatible-shape.md) — CURRENT_WORKSPACE_SCHEMA_VERSION is baked into skills and duplicated as a fallback in root.ts.
### #validate
- Open [**validate reports deleted files, never hash drift**](practice-validate-reports-deletions-not-hash-drift.md) — validateWorkspace avoids findStrikethrooRoot, treats edits as customization, and keeps its own strict reader.