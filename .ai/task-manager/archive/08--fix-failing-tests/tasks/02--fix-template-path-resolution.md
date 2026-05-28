---
id: 2
group: "path-fixes"
dependencies: []
status: "completed"
created: "2025-09-02"
---

## Objective
Fix template path resolution failures where tests fail with "Template file not found: /templates/ai-task-manager/TASK_MANAGER.md" by correcting absolute path handling to use workspace-relative paths.

## Acceptance Criteria
- [x] CLI integration tests find template files correctly
- [x] Template paths resolve relative to workspace root, not as absolute paths
- [x] All failing integration tests that reference template files now pass
- [x] Path resolution works consistently across test environments

## Technical Requirements
- Investigate and fix getTemplatePath utility function path construction
- Ensure template paths are workspace-relative (e.g., 'templates/ai-task-manager/TASK_MANAGER.md')
- Verify path resolution works with different working directories

## Input Dependencies
None - can start immediately

## Output Artifacts
- Updated path resolution logic in utilities or test setup
- Correctly resolved template paths in all test scenarios

## Implementation Notes
The issue is that paths are being constructed as `/templates/` (absolute) when they should be `templates/` (relative to workspace). Check getTemplatePath function and test mocks for path construction logic.