---
schema_version: 1
id: map-docs-config-yml-controls-github-pages-baseurl-for-the-jekyll-docs-site
title: docs/_config.yml controls GitHub Pages baseurl for the Jekyll docs site
kind: map
tags:
  - docs
  - github-pages
  - jekyll
derived_from: []
relates_to: []
confidence: medium
summary: >-
  docs/_config.yml sets baseurl and aux_links GitHub URL; must be updated after
  a repo rename.
---
`docs/_config.yml` contains `baseurl: "/strikethroo"` and the `aux_links` GitHub repository URL. Both must match the current repo slug for the Jekyll docs site to serve correctly. Updated as part of the rebrand from `ai-task-manager`.
