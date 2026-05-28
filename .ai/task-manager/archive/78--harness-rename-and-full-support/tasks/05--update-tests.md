---
id: 5
group: "quality-assurance"
dependencies: [1, 2, 3, 4]
status: "completed"
created: "2026-05-25"
skills:
  - jest
  - typescript
complexity_score: 4
complexity_notes: "Mix of mechanical test renames and new integration test authoring. Follows 'write a few tests, mostly integration' principle."
---
# Update and Extend Test Suite

## Objective
Update all existing tests to use the new "harness" terminology and add integration tests for the new per-harness agent deployment functionality, including TOML conversion and harness-specific file placement.

## Skills Required
- **jest**: Test framework, assertions, mocking patterns
- **typescript**: Type-safe test code, import updates

## Acceptance Criteria
- [ ] All existing tests updated to use `--harnesses` instead of `--assistants`
- [ ] All existing tests updated to reference `Harness` type instead of `Assistant`
- [ ] All existing tests updated to reference `parseHarnesses` and `validateHarnesses` instead of `parseAssistants` and `validateAssistants`
- [ ] New integration test: `init --harnesses claude` creates `.claude/agents/plan-creator.md` with valid markdown
- [ ] New integration test: `init --harnesses codex` creates `.codex/agents/plan-creator.toml` with valid TOML containing `name`, `description`, `developer_instructions`
- [ ] New integration test: `init --harnesses github` creates `.github/agents/plan-creator.agent.md` with `.agent.md` extension
- [ ] New integration test: `init --harnesses claude,codex,github` creates agent files in all three directories
- [ ] Unit tests for `convertAgentMdToToml()` — verifies frontmatter maps to TOML fields and body maps to `developer_instructions`
- [ ] Unit tests for `getAgentFormat()` — verifies correct format/extension/directory for each of the 6 harnesses
- [ ] `npm test` passes with all tests green
- [ ] `grep -rn "assistant\|Assistant" src/__tests__/ --include="*.ts" | grep -v "// "` returns zero relevant matches
- [ ] Old `--assistants` flag is confirmed rejected (test that `init --assistants claude` fails)

Use your internal Todo tool to track these and keep on track.

## Technical Requirements
- Follow the project's existing test patterns in `src/__tests__/`
- Integration tests should use real filesystem operations (tmp directories), consistent with the existing `cli.integration.test.ts` approach
- Use `fs-extra` for filesystem operations in tests, consistent with existing test code

## Input Dependencies
- Task 1: All source types/functions renamed (tests must import the new names)
- Task 2: Template directory at `templates/harness/` (integration tests read from this)
- Task 3: `convertAgentMdToToml()`, `getAgentFormat()` available for unit testing
- Task 4: `createHarnessStructure()` fully implemented for integration testing

## Output Artifacts
- Updated test files in `src/__tests__/`
- All tests passing

## Implementation Notes

<details>

### Meaningful Test Strategy Guidelines

Your critical mantra for test generation is: "write a few tests, mostly integration".

**When TO Write Tests:**
- Custom business logic and algorithms
- Critical user workflows and data transformations
- Edge cases and error conditions for core functionality
- Integration points between different system components
- Complex validation logic or calculations

**When NOT to Write Tests:**
- Third-party library functionality (already tested upstream)
- Framework features
- Simple CRUD operations without custom logic
- Getter/setter methods or basic property access
- Obvious functionality that would break immediately if incorrect

### Test files to update

**`src/__tests__/utils.test.ts`**: 
- Rename all references from `parseAssistants` → `parseHarnesses`, `validateAssistants` → `validateHarnesses`
- Update all test descriptions and variable names
- Add unit tests for new functions:
  - `getAgentFormat('claude')` returns `{ format: 'md', extension: '.md', directory: '.claude/agents' }`
  - `getAgentFormat('codex')` returns `{ format: 'toml', extension: '.toml', directory: '.codex/agents' }`
  - `getAgentFormat('github')` returns `{ format: 'md', extension: '.agent.md', directory: '.github/agents' }`
  - `convertAgentMdToToml()` with sample markdown input produces valid TOML output

**`src/__tests__/cli.integration.test.ts`**:
- Update all `--assistants` references to `--harnesses`
- Add integration tests:
  1. Test that `init --harnesses codex` creates `.codex/agents/plan-creator.toml`
  2. Test that the TOML file contains `name =`, `description =`, and `developer_instructions =` fields
  3. Test that `init --harnesses github` creates `.github/agents/plan-creator.agent.md`
  4. Test that `init --harnesses claude,gemini` creates agent files in both directories
  5. Test that `init --assistants claude` fails (old flag rejected)
  6. Test that `init --harnesses invalid` shows error with all 6 valid harness names

**Other test files** (`conflict-detection.integration.test.ts`, `plan.test.ts`, `skill-scripts.test.ts`, `status.test.ts`, `task-full-workflow.skill.test.ts`, `task-generate-tasks.skill.test.ts`):
- Grep each file for "assistant" references and update. Most may have none, but check all.

### Unit test for convertAgentMdToToml

```typescript
describe('convertAgentMdToToml', () => {
  it('converts markdown agent to Codex TOML format', () => {
    const md = [
      '---',
      'name: plan-creator',
      'description: Creates strategic plans',
      '---',
      '',
      'You are a planning specialist.',
      '',
      '## Core Mission',
      'Create strategic blueprints.',
    ].join('\n');

    const toml = convertAgentMdToToml(md);
    expect(toml).toContain('name = "plan-creator"');
    expect(toml).toContain('description = "Creates strategic plans"');
    expect(toml).toContain('developer_instructions = """');
    expect(toml).toContain('You are a planning specialist.');
    expect(toml).toContain('## Core Mission');
  });
});
```

### Running tests

```bash
npm test
# Or for focused testing during development:
npx jest --testPathPattern="utils.test" --no-coverage
npx jest --testPathPattern="cli.integration" --no-coverage
```

</details>
