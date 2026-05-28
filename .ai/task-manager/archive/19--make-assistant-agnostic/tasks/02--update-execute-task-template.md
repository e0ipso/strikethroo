---
id: 2
group: "template-language-updates"
dependencies: []
status: "completed"
created: "2025-09-06"
skills: ["bash", "text-processing"]
---

## Objective
Replace Claude-specific language and hardcoded shell logic in execute-task.md template to work dynamically with any assistant directory structure.

## Skills Required
- **bash**: Update shell script logic to detect assistant directories dynamically
- **text-processing**: Replace Claude-specific language with assistant-agnostic alternatives

## Acceptance Criteria
- [ ] Hardcoded `.claude/agents` shell check replaced with dynamic assistant detection
- [ ] Shell logic works with any assistant directory structure (.claude/, .gemini/, .opencode/)
- [ ] Language references updated to be assistant-agnostic
- [ ] Shell code maintains same logical flow and functionality
- [ ] Comments and output messages use generic terminology

## Technical Requirements
- Target file: `/workspace/templates/assistant/commands/tasks/execute-task.md`
- Replace hardcoded shell check around line 170
- Update associated echo messages to use generic language
- Maintain backward compatibility with existing assistant setups

## Input Dependencies
None - this is a standalone template update

## Output Artifacts
- Updated execute-task.md template with dynamic assistant detection
- Shell logic that works across all supported assistant types

## Implementation Notes
<details>
<summary>Detailed implementation guidance</summary>

**Current Shell Code to Replace** (around lines 170-174):
```bash
# Check for available sub-agents (placeholder - will use Task tool for execution)
if [ -d ".claude/agents" ] && [ -n "$(ls .claude/agents 2>/dev/null)" ]; then
    echo "Available sub-agents detected - will match to task requirements"
else
    echo "Using general-purpose agent for task execution"
fi
```

**New Dynamic Approach:**
```bash
# Check for available sub-agents across assistant directories
AGENT_FOUND=false
for assistant_dir in .claude .gemini .opencode; do
    if [ -d "$assistant_dir/agents" ] && [ -n "$(ls $assistant_dir/agents 2>/dev/null)" ]; then
        echo "Available sub-agents detected in $assistant_dir - will match to task requirements"
        AGENT_FOUND=true
        break
    fi
done

if [ "$AGENT_FOUND" = false ]; then
    echo "Using general-purpose agent for task execution"
fi
```

**Language Updates:**
- Replace "sub-agents" with "sub-agents" in comments and output
- Ensure all terminology is assistant-neutral

**Testing Verification:**
After changes, the shell logic should:
1. Work when .claude/agents exists
2. Work when .gemini/agents exists
3. Work when .opencode/agents exists
4. Gracefully handle when no agent directories exist
</details>