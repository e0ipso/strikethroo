---
id: 9
group: "verification"
dependencies: [1, 2, 3, 4, 5, 6, 7, 8]
status: "completed"
created: 2026-05-28
skills:
  - bash
  - debugging
---
# Verify rebrand via build, test, smoke init, and exhaustive identifier grep

## Objective
Run every self-validation check from the plan to confirm the rebrand is complete and consistent before the release commit is opened. Capture and triage any remaining old-identifier hits.

## Skills Required
- bash — running build/test/grep verification commands.
- debugging — interpreting failures and tracing the offending file/task.

## Acceptance Criteria
- [ ] `npm run build` exits zero from a clean working tree (no unresolved-include errors, no missing-frontmatter errors, no schema-version smoke-assertion failures).
- [ ] `npm test` exits zero with no test skipped or disabled.
- [ ] Clean-room init smoke test: `rm -rf /tmp/strikethroo-smoke && node dist/cli.js init --harnesses claude --destination-directory /tmp/strikethroo-smoke` produces `/tmp/strikethroo-smoke/.ai/strikethroo/.init-metadata.json` and does NOT produce `/tmp/strikethroo-smoke/.ai/task-manager/`.
- [ ] `ls templates/harness/skills/` lists exactly six directories, all prefixed `st-`. None prefixed `task-`.
- [ ] `grep -l strikethroo templates/harness/skills/*/scripts/*.cjs | wc -l` prints `6` (every bundle carries the new product name).
- [ ] `grep -L 'EXPECTED_WORKSPACE_SCHEMA_VERSION' templates/harness/skills/*/scripts/*.cjs` produces empty output (no bundle leaks the unsubstituted identifier).
- [ ] `jq '.skills | length' .claude-plugin/plugin.json` prints `6` and `jq -r '.skills[]' .claude-plugin/plugin.json` lists six paths all under `./templates/harness/skills/st-`. The manifest's top-level `name` field is `strikethroo` (`jq -r '.name' .claude-plugin/plugin.json`).
- [ ] Exhaustive identifier sweep (command in implementation notes) returns only documented exceptions: this plan file, archived completed plans under `.ai/task-manager/archive/`, knowledge-base nodes under `.ai/knowledge-base/`, and URLs pointing at `github.com/e0ipso/ai-task-manager` or the npm package URL.
- [ ] Publish-time package-name availability is confirmed: `npm view strikethroo` is captured. Either the package does not exist (proceed) or it is owned by this account (proceed) or it is owned by someone else (halt and surface to user — the fallback `@e0ipso/strikethroo` must be confirmed before release).
- [ ] A written summary lists: (a) every check above with PASS/FAIL, (b) every identifier-sweep hit triaged with reason, (c) the `npm view strikethroo` result and the recommended action.

Use your internal Todo tool to track these and keep on track.

## Technical Requirements
- Run all commands from `/workspace`.
- Do not modify production code from this task. If a check fails, surface the failure and the file responsible — the fix belongs in the originating task (01–08), not here. Re-run the failing check after the originating task is fixed.
- The `npm view strikethroo` check is read-only and safe to run repeatedly.

## Input Dependencies
- All eight prior tasks.

## Output Artifacts
- A verification summary embedded in the task's completion log, listing each check's outcome and any exceptions.

## Implementation Notes
<details>
<summary>Execution detail</summary>

Run each check in sequence and capture output. If any check fails, halt and report.

1. **Clean build.**
   ```bash
   cd /workspace && npm run build
   ```
   Expect zero errors. Specifically watch for unresolved `{{include}}` directives or missing frontmatter — those originate in task 05.

2. **Test suite.**
   ```bash
   cd /workspace && npm test
   ```
   Expect zero failures and zero skipped tests. If a test is skipped, that violates the acceptance criteria — find who added the `.skip` and remove it.

3. **Clean-room init smoke test.**
   ```bash
   rm -rf /tmp/strikethroo-smoke
   node /workspace/dist/cli.js init --harnesses claude --destination-directory /tmp/strikethroo-smoke
   test -f /tmp/strikethroo-smoke/.ai/strikethroo/.init-metadata.json && echo OK || echo FAIL_METADATA
   test ! -d /tmp/strikethroo-smoke/.ai/task-manager && echo OK || echo FAIL_OLD_DIR_PRESENT
   ```
   Both lines must print `OK`. If the first fails, the CLI is not writing under `.ai/strikethroo/` (task 04 incomplete). If the second fails, the CLI is still creating the old directory somewhere (task 04 incomplete).

4. **Output directory inventory.**
   ```bash
   ls /workspace/templates/harness/skills/
   ```
   Expect six directories, all prefixed `st-`. Any `task-*` listing means task 02 deletion was incomplete or task 03 emitted under the wrong path.

5. **Bundle content check.**
   ```bash
   ls /workspace/templates/harness/skills/*/scripts/*.cjs | wc -l
   ```
   Expect `6` (one bundle per skill). Then:
   ```bash
   grep -l strikethroo /workspace/templates/harness/skills/*/scripts/*.cjs | wc -l
   ```
   Expect `6`. If any bundle doesn't contain `strikethroo`, the source it was bundled from still uses old strings (task 04 incomplete for that surface).

6. **Schema-version identifier substitution check.**
   ```bash
   grep -L 'EXPECTED_WORKSPACE_SCHEMA_VERSION' /workspace/templates/harness/skills/*/scripts/*.cjs
   ```
   Expect empty output. Any output here means a bundle's `define` substitution failed — orthogonal to the rebrand, but if it surfaces, the post-build smoke assertion in `scripts/build-skills.cjs` should already have caught it.

7. **Manifest sanity.**
   ```bash
   jq '.skills | length' /workspace/.claude-plugin/plugin.json
   jq -r '.skills[]' /workspace/.claude-plugin/plugin.json
   jq -r '.name' /workspace/.claude-plugin/plugin.json
   ```
   Expect `6`, six lines all starting with `./templates/harness/skills/st-`, and `strikethroo` respectively.

8. **Package tarball sanity.**
   ```bash
   cd /workspace && npm pack --dry-run 2>&1 | head -40
   ```
   Look for the tarball name `strikethroo-<version>.tgz` and confirm the `files` payload listing includes `templates/harness/skills/st-*/scripts/*.cjs` and `templates/harness/skills/st-*/SKILL.md`. No `task-*` entries should appear.

9. **Exhaustive identifier sweep.** This is the central correctness check.
   ```bash
   cd /workspace && grep -rEn 'ai-task-manager|AI Task Manager|task-manager|task-(create-plan|generate-tasks|execute-blueprint|execute-task|refine-plan|full-workflow)|\.ai/task-manager|TASK_MANAGER\.md' \
     --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=dist \
     --exclude-dir=archive \
     .
   ```
   Triage every remaining hit. Acceptable exceptions:
   - This plan file (`plan-80--rebrand-to-strikethroo.md`) — discusses the rebrand history.
   - Task files under this plan (`tasks/*.md`) — same reason.
   - URL strings (`github.com/e0ipso/ai-task-manager`, `npmjs.com/package/@e0ipso/ai-task-manager`) — repo rename deferred.
   - The single deferred-rename note in `README.md` added by task 06.
   - Files under `.ai/knowledge-base/` — historical snapshots not in scope.
   - Any historical changelog entries.

   Document the exception list verbatim in the verification summary.

10. **Publish-time package availability.**
    ```bash
    npm view strikethroo 2>&1 | head -20
    ```
    Three outcomes:
    - `npm error 404 ... is not in this registry` — name is available. Proceed.
    - Output shows package metadata with maintainers including this account's npm user — already owned. Proceed.
    - Output shows package metadata with maintainers belonging to someone else — HALT. Surface to user; the plan's documented fallback is `@e0ipso/strikethroo`.

11. **Compose the verification summary.** Output a list of every check above with PASS/FAIL, the count of identifier-sweep hits and the triage outcome for each, and the `npm view` result with recommended action. If all checks pass, the rebrand is ready for the release commit.

If any check fails, do NOT attempt to fix from this task. Identify the originating task (e.g., a path string still in `src/skill-scripts/shared/root.ts` belongs to task 04) and either re-open that task or surface the gap to the user. This task's role is verification, not remediation.
</details>
