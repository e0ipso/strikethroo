# Migration

This project ships in two channels:

1. **Skills** — installed by [vercel-labs/skills](https://github.com/vercel-labs/skills) (pin: `TODO: verify latest release` at the time you adopt this guide).
2. **Workspace** — initialized by `@e0ipso/ai-task-manager`'s `init` subcommand.

Each is independently versioned and independently re-runnable.

## Update skills

```bash
npx skills add e0ipso/ai-task-manager
```

This walks the latest release tag of `e0ipso/ai-task-manager` and copies the `skills/<name>/` directories into the per-agent location your installed `skills` CLI knows about (for example `.claude/skills/<name>/`). Pin to a specific release with `@<tag>`:

```bash
npx skills add e0ipso/ai-task-manager@v1.4.0
```

## Update workspace

```bash
npx @e0ipso/ai-task-manager init --assistants <list> --destination-directory <path>
```

Re-running `init` is safe. Files you've modified surface a diff-on-conflict prompt with keep/overwrite options (see below). Use `--force` to accept all overwrites non-interactively. The CLI also writes `workspaceSchemaVersion: 1` into `.ai/task-manager/.init-metadata.json` on every run.

## Diff-on-conflict prompt

`init` tracks file hashes in `.init-metadata.json`. When a re-run would overwrite a file you've modified, it prompts you per-file to keep your version or accept the new one. The hashes guarantee the prompt only fires for files you actually changed; unmodified files update silently.

## Schema-mismatch errors

Skill scripts compare the workspace's `workspaceSchemaVersion` against the version baked into the skill bundle (see `AGENTS.md` → "Schema Version Contract"). Two messages can fire:

- ```
  Workspace schema v<N> is older than this skill requires (v<M>). Re-run `npx @e0ipso/ai-task-manager init` with the latest CLI to update.
  ```
  → Workspace is behind the skill. Run `init` with the latest CLI version.

- ```
  This skill (built for workspace schema v<M>) is older than the workspace (v<N>). Re-run `npx skills add e0ipso/ai-task-manager` to update skills.
  ```
  → Skill bundles are behind the workspace. Re-add skills.

Both errors exit non-zero so they fail fast in scripts and CI.

## Manual fallback (if `vercel-labs/skills` is unavailable)

```bash
git clone --depth 1 -b <tag> https://github.com/e0ipso/ai-task-manager /tmp/atm
cp -r /tmp/atm/skills/<name>/ .claude/skills/<name>/
```

Use the latest release tag (not `main`) so the `skills/<name>/scripts/` bundles are present.
