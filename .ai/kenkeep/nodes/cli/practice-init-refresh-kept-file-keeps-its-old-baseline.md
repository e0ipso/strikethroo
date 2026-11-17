---
type: practice
title: 'Init refresh: a kept file keeps its old baseline'
description: >-
  copyCommonTemplates records the previous hash for a kept config file, so the
  next refresh asks again.
tags:
  - init
  - refresh
kk_schema_version: 3
kk_id: practice-init-refresh-kept-file-keeps-its-old-baseline
kk_derived_from: []
kk_relates_to:
  - practice-bump-workspace-schema-version-only-for-incompatible-shape
  - practice-takes-no-stance-on-committing-the-ai-strikethroo-workspace
kk_depends_on: []
kk_confidence: high
---
`copyCommonTemplates` in `src/index.ts` gives each `config/` path one outcome against the SHA-256 baseline in `.init-metadata.json`. A file the user keeps records its previous baseline, not its own hash. Recording the user's hash would make the edit the baseline, and the next refresh would overwrite it without asking.

`config/config.yaml` is the exception (`INSTALL_ONLY_CONFIG_FILES` in `src/conflict-detector.ts`): it is copied only when absent, never prompted for, and never replaced, even by `--force` or `--profile`. When kept, it records the incoming hash, not the old baseline: a different incoming hash prints a diff (`showIncomingInstallOnlyDiff` in `src/prompts.ts`), and recording it shows each incoming version once.

Agent files use the same rules through `src/managed-files.ts`, with hashes in `managedFiles` (project-relative keys); all conflicts go to one prompt before any write. The workspace `.gitignore` is always replaced, with a diff when it had local changes. `profile.files` lists profile-supplied paths; a refresh without `--profile` treats a baseline match on them as a conflict (`protectedBaseline` in `classifyRefresh`).

Missing or unparsable metadata means no baseline, so every differing file conflicts. Without a TTY the prompt throws, which leaves `--force` as the only non-interactive route. Metadata is written last.
