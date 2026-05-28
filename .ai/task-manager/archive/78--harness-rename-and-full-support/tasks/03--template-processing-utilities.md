---
id: 3
group: "agent-deployment"
dependencies: [1]
status: "completed"
created: "2026-05-25"
skills:
  - typescript
complexity_score: 4
complexity_notes: "Requires porting TOML conversion from main branch and adapting for agent schema. Core parsing logic is proven but mapping changes."
---
# Template Processing Utilities for Agent Conversion

## Objective
Implement the utility functions needed to transform the canonical markdown agent template into harness-native formats. Specifically: frontmatter parsing, TOML escaping, and a `convertAgentMdToToml()` function for Codex agents, plus a harness-to-format mapping function.

## Skills Required
- **typescript**: Parsing logic, string manipulation, TOML format generation, utility function design

## Acceptance Criteria
- [ ] `parseFrontmatter(content: string)` function extracts YAML frontmatter and body from markdown content
- [ ] `escapeTomlString(str: string)` and `escapeTomlTripleQuotedString(str: string)` handle TOML special characters
- [ ] `convertAgentMdToToml(mdContent: string)` converts markdown agent with YAML frontmatter to Codex TOML agent format
- [ ] `getAgentFormat(harness: Harness)` returns `{ format: 'md' | 'toml', extension: string, directory: string }` for each harness
- [ ] TOML output contains `name`, `description`, and `developer_instructions` fields matching Codex agent schema
- [ ] All functions are exported from `src/utils.ts` (or a new `src/template-utils.ts` if utils.ts is already large)
- [ ] `npm run build` succeeds with no TypeScript errors

Use your internal Todo tool to track these and keep on track.

## Technical Requirements
- The `main` branch contains reference implementations in `src/utils.ts`: `parseFrontmatter()`, `escapeTomlString()`, `escapeTomlTripleQuotedString()`, `convertMdToToml()`. Use `git show main:src/utils.ts` to view them.
- **Important**: The `main` branch `convertMdToToml()` was for command templates (different TOML schema). For agents, the Codex TOML schema is:
  ```toml
  name = "plan-creator"
  description = "..."
  developer_instructions = """
  ...agent instructions...
  """
  ```
- The `getAgentFormat()` mapping for agents is different from the old command mapping on `main`:
  | Harness | Format | Extension | Agent Directory |
  |---------|--------|-----------|-----------------|
  | claude | md | `.md` | `.claude/agents/` |
  | gemini | md | `.md` | `.gemini/agents/` |
  | codex | toml | `.toml` | `.codex/agents/` |
  | cursor | md | `.md` | `.cursor/agents/` |
  | github | md | `.agent.md` | `.github/agents/` |
  | opencode | md | `.md` | `.opencode/agents/` |

## Input Dependencies
- Task 1 must be complete so that the `Harness` type is available for type signatures

## Output Artifacts
- Exported utility functions: `parseFrontmatter`, `escapeTomlString`, `escapeTomlTripleQuotedString`, `convertAgentMdToToml`, `getAgentFormat`
- These functions are consumed by Task 4 (per-harness deployment)

## Implementation Notes

<details>

### Reference: main branch utilities

Run this to see the existing implementations on `main`:
```bash
git show main:src/utils.ts
```

Look for these functions to port:
- `parseFrontmatter(content)` — extracts `{ frontmatter: Record<string, string>, body: string }`
- `escapeTomlString(str)` — escapes backslashes, quotes, and control characters for TOML single-line strings
- `escapeTomlTripleQuotedString(str)` — escapes for TOML multi-line strings (triple-quoted)

### New function: `convertAgentMdToToml`

```typescript
export function convertAgentMdToToml(mdContent: string): string {
  const { frontmatter, body } = parseFrontmatter(mdContent);
  const name = escapeTomlString(frontmatter.name || '');
  const description = escapeTomlString(frontmatter.description?.trim() || '');
  const instructions = escapeTomlTripleQuotedString(body.trim());

  return [
    `name = "${name}"`,
    `description = "${description}"`,
    `developer_instructions = """`,
    instructions,
    `"""`,
    '', // trailing newline
  ].join('\n');
}
```

### New function: `getAgentFormat`

```typescript
interface AgentFormatInfo {
  format: 'md' | 'toml';
  extension: string;
  directory: string;
}

export function getAgentFormat(harness: Harness): AgentFormatInfo {
  switch (harness) {
    case 'codex':
      return { format: 'toml', extension: '.toml', directory: '.codex/agents' };
    case 'github':
      return { format: 'md', extension: '.agent.md', directory: '.github/agents' };
    case 'claude':
      return { format: 'md', extension: '.md', directory: '.claude/agents' };
    case 'gemini':
      return { format: 'md', extension: '.md', directory: '.gemini/agents' };
    case 'cursor':
      return { format: 'md', extension: '.md', directory: '.cursor/agents' };
    case 'opencode':
      return { format: 'md', extension: '.md', directory: '.opencode/agents' };
  }
}
```

### Where to place the code

Check the current size of `src/utils.ts`. If it's manageable (under ~150 lines), add the new functions there alongside the existing `parseHarnesses()` and `validateHarnesses()`. If it's already large, create `src/template-utils.ts` and export from there. Import the `Harness` type from `./types`.

### Validation

After implementation:
```bash
npm run build
```

The functions don't need standalone tests in this task — Task 5 covers testing. But verify the TOML output manually by writing a quick script or console.log test if desired.

</details>
