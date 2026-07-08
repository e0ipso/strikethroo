# Spec: Kiro Harness Support

**GitHub Issue:** https://github.com/e0ipso/strikethroo/issues/49  
**Branch:** `feat/kiro-harness`  
**Target:** PR to `e0ipso/strikethroo`

---

## 1. Background

Kiro (https://kiro.dev) is an AI coding assistant built around a native Spec-Driven Development workflow. Its configuration is stored under `.kiro/` in each project:

- `.kiro/steering/` — Markdown files injected as always-active context into every session (equivalent to Claude's `CLAUDE.md` but per-file, each opt-in via `inclusion: always` frontmatter).
- `.kiro/agents/` — Sub-agent definitions in JSON format.
- Skills — installed via `npx skills add`, using the same `SKILL.md` format strikethroo already ships.

Kiro is currently absent from strikethroo's harness list. Because of its steering system, Kiro can host strikethroo's shared enforcement disciplines as always-active context rather than requiring each skill to explicitly read them — a tighter integration than any currently supported harness.

---

## 2. Goals

1. `npx strikethroo init --harnesses kiro` succeeds end-to-end.
2. The `plan-creator` agent template is emitted as a valid Kiro agent JSON file at `.kiro/agents/plan-creator.json`.
3. Strikethroo's shared enforcement files (`verification-gate.md`, `clarification-gate.md`, `anti-rationalization.md`) are copied to `.kiro/steering/` with `inclusion: always` frontmatter prepended, so they are active in every Kiro session without any per-skill instruction.
4. All existing harness behaviour is unchanged.
5. README documents the new harness.

---

## 3. Non-goals

- Modifying the skills themselves (`SKILL.md` files) — they already work with Kiro via `npx skills add`.
- Adding Kiro-specific hooks or templates beyond what ships in `templates/strikethroo/`.
- Kiro IDE extension integration or MCP server wiring.

---

## 4. Kiro agent JSON format

Inspecting `~/.kiro/agents/test-agent.json`, the minimal structure strikethroo needs to emit is:

```json
{
  "name": "<agent-name>",
  "description": "<one-line description>",
  "prompt": "<full agent instruction text>",
  "tools": ["*"],
  "mcpServers": {},
  "toolAliases": {},
  "allowedTools": [],
  "resources": [],
  "hooks": {},
  "toolsSettings": {},
  "includeMcpJson": true,
  "model": null
}
```

Fields sourced from the `plan-creator.md` template:
- `name` ← frontmatter `name`
- `description` ← frontmatter `description` (trimmed)
- `prompt` ← markdown body (after frontmatter)

All other fields use the minimal defaults above.

---

## 5. Steering file format

Each file copied to `.kiro/steering/` must begin with this YAML frontmatter block prepended:

```markdown
---
inclusion: always
---

<original file content>
```

The three files to copy, from `<workspace>/config/shared/`:
- `verification-gate.md` → `.kiro/steering/strikethroo-verification-gate.md`
- `clarification-gate.md` → `.kiro/steering/strikethroo-clarification-gate.md`
- `anti-rationalization.md` → `.kiro/steering/strikethroo-anti-rationalization.md`

The `strikethroo-` prefix avoids collisions with the user's own steering files.

---

## 6. Implementation plan

### Phase 1 — Type and validation layer

**File:** `src/types.ts`

Add `'kiro'` to the `Harness` union type:

```typescript
export type Harness = 'claude' | 'codex' | 'cursor' | 'gemini' | 'github' | 'opencode' | 'kiro';
```

**File:** `src/utils.ts`

1. Add `'kiro'` to `VALID_HARNESSES`.

2. Add `getAgentFormat` case:
   ```typescript
   case 'kiro':
     return { format: 'json', extension: '.json', directory: '.kiro/agents' };
   ```
   This requires adding `'json'` to the `AgentFormatInfo.format` union type.

3. Add `convertAgentMdToKiroJson(mdContent: string): string`:
   ```typescript
   export function convertAgentMdToKiroJson(mdContent: string): string {
     const { frontmatter, body } = parseFrontmatter(mdContent);
     const name = (frontmatter.name ?? '').trim();
     const description = (frontmatter.description ?? '').trim();
     const agent = {
       name,
       description,
       prompt: body.trim(),
       tools: ['*'],
       mcpServers: {},
       toolAliases: {},
       allowedTools: [],
       resources: [],
       hooks: {},
       toolsSettings: {},
       includeMcpJson: true,
       model: null,
     };
     return JSON.stringify(agent, null, 2);
   }
   ```

### Phase 2 — Init command: agent file emission

**File:** `src/index.ts`, function `createHarnessStructure`

Add a branch for `format === 'json'`:
```typescript
if (formatInfo.format === 'json') {
  await fs.writeFile(targetPath, convertAgentMdToKiroJson(content), 'utf-8');
} else if (formatInfo.format === 'toml') {
  await fs.writeFile(targetPath, convertAgentMdToToml(content), 'utf-8');
} else {
  await fs.writeFile(targetPath, content, 'utf-8');
}
```

### Phase 3 — Init command: steering file copy

**File:** `src/index.ts`, function `init` (after `createHarnessStructure`)

Add a new helper `copyKiroSteeringFiles(baseDir: string): Promise<string[]>`:

```typescript
async function copyKiroSteeringFiles(baseDir: string): Promise<string[]> {
  const sharedDir = resolvePath(baseDir, '.ai/strikethroo/config/shared');
  const steeringDir = resolvePath(baseDir, '.kiro/steering');
  await fs.ensureDir(steeringDir);

  const FILES: Array<{ src: string; dest: string }> = [
    { src: 'verification-gate.md',    dest: 'strikethroo-verification-gate.md' },
    { src: 'clarification-gate.md',   dest: 'strikethroo-clarification-gate.md' },
    { src: 'anti-rationalization.md', dest: 'strikethroo-anti-rationalization.md' },
  ];

  const created: string[] = [];
  for (const { src, dest } of FILES) {
    const sourcePath = path.join(sharedDir, src);
    const destPath = path.join(steeringDir, dest);
    if (!(await exists(sourcePath))) continue;
    const original = await fs.readFile(sourcePath, 'utf-8');
    const withFrontmatter = `---\ninclusion: always\n---\n\n${original}`;
    await fs.writeFile(destPath, withFrontmatter, 'utf-8');
    created.push(destPath);
  }
  return created;
}
```

Call this inside `init()` after the harness loop, only when `harnesses.includes('kiro')`:

```typescript
if (harnesses.includes('kiro')) {
  const steeringFiles = await copyKiroSteeringFiles(baseDir);
  // print steeringFiles in the "Created Files" section
}
```

Note: `copyCommonTemplates` runs first, which copies `config/shared/` to `.ai/strikethroo/config/shared/`. The steering copy reads from there, so order matters and is correct as-is.

### Phase 4 — Tests

**File:** `src/__tests__/utils.test.ts`

Add tests for `convertAgentMdToKiroJson`:
- Valid frontmatter + body → correct JSON structure with expected field values.
- Missing `name`/`description` → defaults to empty string, does not throw.
- Body with special characters (quotes, backslashes) → valid JSON (JSON.stringify handles escaping natively).

**File:** `src/__tests__/cli.integration.test.ts`

Add an integration test for `--harnesses kiro`:
- After `init({ harnesses: 'kiro', destinationDirectory: tmpDir })`:
  - `.kiro/agents/plan-creator.json` exists and parses as valid JSON with `name`, `description`, `prompt` fields.
  - `.kiro/steering/strikethroo-verification-gate.md` exists and contains `inclusion: always` in its frontmatter.
  - `.kiro/steering/strikethroo-clarification-gate.md` exists with `inclusion: always`.
  - `.kiro/steering/strikethroo-anti-rationalization.md` exists with `inclusion: always`.
  - `.ai/strikethroo/` workspace is also created (the common templates still run).

### Phase 5 — Documentation

**File:** `README.md`

In the Quick Start section, update the `--harnesses` option description to include `kiro`:

```
--harnesses claude,codex,cursor,gemini,github,opencode,kiro
```

Add a brief note explaining that for Kiro users, strikethroo's shared enforcement disciplines are automatically installed as always-active steering context under `.kiro/steering/`.

---

## 7. File change summary

| File | Change |
|---|---|
| `src/types.ts` | Add `'kiro'` to `Harness` union |
| `src/utils.ts` | Add `'kiro'` to `VALID_HARNESSES`; add `'json'` format to `AgentFormatInfo`; add `getAgentFormat('kiro')` case; add `convertAgentMdToKiroJson()` |
| `src/index.ts` | Handle `format === 'json'` in `createHarnessStructure`; add `copyKiroSteeringFiles()`; call it from `init()` when kiro is selected |
| `src/__tests__/utils.test.ts` | Unit tests for `convertAgentMdToKiroJson` |
| `src/__tests__/cli.integration.test.ts` | Integration test for `--harnesses kiro` |
| `README.md` | Document kiro in harness list and note steering integration |

---

## 8. Acceptance criteria

- [ ] `npx strikethroo init --harnesses kiro` completes without error in a clean temp directory
- [ ] `.kiro/agents/plan-creator.json` is valid JSON with `name`, `description`, `prompt` populated from the template
- [ ] `.kiro/steering/strikethroo-verification-gate.md` has `inclusion: always` frontmatter
- [ ] `.kiro/steering/strikethroo-clarification-gate.md` has `inclusion: always` frontmatter
- [ ] `.kiro/steering/strikethroo-anti-rationalization.md` has `inclusion: always` frontmatter
- [ ] All existing harness integration tests pass unchanged
- [ ] `npm test` (unit + e2e) passes
- [ ] `npm run lint` passes

---

## 9. Open questions

1. **Hash-tracking for steering files** — Should the steering files be tracked in `.init-metadata.json` like the common templates? If the user edits them, a re-init would currently overwrite. The simplest path is to track them; the alternative is to treat them as always-overwrite (simpler but destructive). Recommendation: always-overwrite on re-init, since they are strikethroo-prefixed and users are unlikely to edit them.

2. **`tools: ["*"]` default** — The test-agent uses `"*"` (all tools). A more conservative default (e.g. `["read", "write", "grep"]`) would be safer. Worth discussing with the upstream maintainer before the PR.

3. **`resources` list** — The test-agent lists `skill://~/.kiro/skills/*/SKILL.md` in `resources` so globally installed skills are visible. Should the emitted `plan-creator.json` include this? Probably yes, since strikethroo skills are installed globally.
