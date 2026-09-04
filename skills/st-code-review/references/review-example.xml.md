# Review document example

A complete document that validates against `<root>/config/schemas/self-review-v2.xsd`.

```xml
<?xml version="1.0" encoding="UTF-8"?>
<review xmlns="urn:self-review:v2" timestamp="2026-07-27T09:41:00Z"
        git-diff-args="a1b2c3d4" repository="/abs/path/to/repo">
  <file path="src/parse.ts" change-type="modified" viewed="true">
    <comment new-line-start="42" new-line-end="42" severity="major" confidence="high">
      <body>Plan requirement "reject an empty id" is unmet: parseId("") returns
      `{ ok: true }` because the length guard runs after the early return.</body>
      <category>requirement-conformance</category>
    </comment>
  </file>
  <file path="src/index.ts" change-type="added" viewed="true" />
</review>
```
