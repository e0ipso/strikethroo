---
id: 3
group: "documentation"
dependencies: [1, 2]
status: "completed"
created: "2025-09-04"
---

## Objective

Update the TASK_MANAGER.md documentation to reflect the new archive directory structure and explain how completed plans are automatically moved to maintain workspace organization.

## Acceptance Criteria

- [ ] TASK_MANAGER.md includes archive directory in the directory structure diagram
- [ ] Documentation explains the purpose and behavior of the archive system
- [ ] Updated find command example for locating plans in both locations
- [ ] Clear distinction between active plans (plans/) and completed plans (archive/)
- [ ] Documentation explains automatic archival upon successful execution

## Technical Requirements

**File to modify**: `.ai/task-manager/config/TASK_MANAGER.md`

**Updates needed**:

1. **Directory Structure Section**: Add archive folder to the tree diagram:
```
.ai/
  task-manager/
    plans/           # Active plans (work in progress)
      01--authentication-provider/
        plan-01--authentication-provider.md
        tasks/
          01--create-project-structure.md
          ...
    archive/         # Completed plans (successfully executed)
      05--user-management/
        plan-05--user-management.md
        tasks/
          ...
```

2. **Plan Location Section**: Update the find command to search both locations:
```shell
find .ai/task-manager/{plans,archive} -name "plan-[0-9][0-9]*--*.md" -type f -exec grep -l "^id: \\?{planId}$" {} \\;
```

3. **Archive System Explanation**: Add new section explaining:
   - Automatic archival upon successful blueprint execution
   - Archive directory purpose (completed work separation)
   - Plans lifecycle (plans/ → archive/ upon completion)

## Input Dependencies

- Completed implementation of tasks 1 and 2
- Understanding of the implemented archive functionality
- Current TASK_MANAGER.md structure

## Output Artifacts

- Updated TASK_MANAGER.md with archive documentation

## Implementation Notes

- Maintain existing documentation structure and style
- Focus on user-facing behavior rather than implementation details
- Ensure directory tree accurately reflects the new structure
- Update any other references to plan locations throughout the document