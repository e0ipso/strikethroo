---
id: 1
group: "jekyll-link-fix"
dependencies: []
status: "completed"
created: 2025-10-17
skills:
  - markdown
  - bash
---
# Replace Jekyll Link Tags with Relative Paths

## Objective

Replace all instances of `{% link filename.md %}` tags in documentation markdown files with proper relative paths (`filename.html`) that Jekyll's markdown processor will handle correctly with the baseurl configuration.

## Skills Required

- **markdown**: Understanding of markdown syntax and link formats
- **bash**: Text processing with grep/sed for pattern matching and replacement

## Acceptance Criteria

- [ ] All `{% link filename.md %}` patterns replaced with `filename.html` format
- [ ] Link text and surrounding markdown structure preserved
- [ ] All 9 affected documentation files updated
- [ ] No syntax errors introduced during replacement
- [ ] Replacement includes .md to .html extension conversion

Use your internal Todo tool to track these and keep on track.

## Technical Requirements

- Work within `/workspace/docs/` directory
- Process markdown (.md) files only
- Use grep to identify files containing `{% link` patterns
- Use sed or similar for pattern replacement
- Maintain markdown link syntax: `[Link Text](url)`

## Input Dependencies

No dependencies - this is the first task in the sequence.

## Output Artifacts

- Modified markdown files in `/workspace/docs/` with corrected link syntax
- List of files modified for verification in next task

## Implementation Notes

<details>
<summary>Detailed Implementation Steps</summary>

### Step 1: Identify All Affected Files

Use grep to find all markdown files containing Jekyll link tags:

```bash
cd /workspace/docs
grep -l "{% link" *.md
```

Expected files (approximately 9):
- architecture.md
- customization-extension.md
- getting-started.md
- reference.md
- core-concepts.md
- workflow.md
- (and 3 more)

### Step 2: Understand the Pattern

Current pattern:
```markdown
[Customization Guide]({% link customization.md %})
```

Target pattern:
```markdown
[Customization Guide](customization.html)
```

Regex breakdown:
- Match: `{% link ([a-zA-Z0-9_-]+)\.md %}`
- Replace with: `$1.html`

### Step 3: Perform Replacement

Use sed to replace patterns in all affected files. Two approaches:

**Approach A: sed in-place replacement (recommended)**
```bash
cd /workspace/docs
for file in *.md; do
  sed -i 's/{% link \([a-zA-Z0-9_-]*\)\.md %}/\1.html/g' "$file"
done
```

**Approach B: Manual per-file replacement**
```bash
sed -i 's/{% link \([a-zA-Z0-9_-]*\)\.md %}/\1.html/g' architecture.md
sed -i 's/{% link \([a-zA-Z0-9_-]*\)\.md %}/\1.html/g' customization-extension.md
# ... repeat for each file
```

### Step 4: Verify Pattern Coverage

Check for any variant patterns that might have been missed:
```bash
# Check for spacing variations
grep -E "{% *link" *.md

# Check for different capitalization
grep -i "{% link" *.md

# Should return no results if all patterns replaced
```

### Step 5: Quick Syntax Validation

Verify no broken markdown syntax:
```bash
# Check for unmatched brackets or parentheses
grep -E '\[([^\]]*)\]\(([^\)]*$)' *.md  # Should be empty
grep -E '\[([^\]]*$)' *.md              # Should be empty
```

### Important Notes

- Use `-i` flag with sed for in-place editing
- Test the sed command on one file first before batch processing
- Keep the regex simple to avoid edge case issues
- The pattern assumes standard Jekyll link tag format with single space after "link"
- All referenced files should exist in same directory (docs/)

### Example Output

Before:
```markdown
- **[Customization Guide]({% link customization.md %})**: Learn to customize
- **[Workflow Patterns]({% link workflows.md %})**: Advanced patterns
```

After:
```markdown
- **[Customization Guide](customization.html)**: Learn to customize
- **[Workflow Patterns](workflows.html)**: Advanced patterns
```

</details>
