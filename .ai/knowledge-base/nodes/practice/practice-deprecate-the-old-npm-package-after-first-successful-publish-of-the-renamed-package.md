---
schema_version: 1
id: >-
  practice-deprecate-the-old-npm-package-after-first-successful-publish-of-the-renamed-package
title: >-
  Deprecate the old npm package after first successful publish of the renamed
  package
kind: practice
tags:
  - npm
  - deprecate
  - rebrand
derived_from: []
relates_to: []
confidence: high
summary: >-
  After publishing under the new name, run npm deprecate on the old package to
  redirect users.
---
Once the renamed package (`strikethroo`) is successfully published, the old package (`@e0ipso/ai-task-manager`) should be deprecated with a forwarding message:
```
npm deprecate @e0ipso/ai-task-manager@'*' 'Renamed to strikethroo. Install with: npx strikethroo init'
```
This is a post-publish manual step; it cannot be automated in the release workflow because it targets the old package name.
