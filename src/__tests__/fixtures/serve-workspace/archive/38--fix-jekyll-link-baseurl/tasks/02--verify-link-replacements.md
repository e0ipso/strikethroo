---
id: 2
group: "jekyll-link-fix"
dependencies: [1]
status: "completed"
created: 2025-10-17
skills:
  - bash
---
# Verify Link Replacements and Validate

## Objective

Verify that all Jekyll link tag replacements were successful, confirm no broken links remain, validate that all referenced files exist, and ensure markdown syntax integrity across all modified documentation files.

## Skills Required

- **bash**: Running verification scripts, grep patterns, and file existence checks

## Acceptance Criteria

- [ ] Zero instances of `{% link` pattern remain in documentation files
- [ ] All replacement links use consistent `filename.html` format
- [ ] No broken markdown syntax (unmatched brackets/parentheses)
- [ ] All referenced target files exist in docs directory
- [ ] Verification report generated showing success status

Use your internal Todo tool to track these and keep on track.

## Technical Requirements

- Run comprehensive grep searches for remaining Jekyll tags
- Validate markdown link syntax
- Check file existence for all referenced links
- Use bash commands and scripts for automation
- Generate clear pass/fail output

## Input Dependencies

- Modified markdown files from task 1 (01--replace-jekyll-link-tags)
- List of files that were modified

## Output Artifacts

- Verification report confirming:
  - Number of files checked
  - Total replacements made
  - Any remaining issues found
  - File existence validation results
- Green light to proceed with deployment or flag issues for manual review

## Implementation Notes

<details>
<summary>Detailed Verification Steps</summary>

### Step 1: Verify No Jekyll Link Tags Remain

Check for any remaining `{% link` patterns:

```bash
cd /workspace/docs

# Primary check - should return 0 results
echo "=== Checking for remaining Jekyll link tags ==="
grep -n "{% link" *.md && echo "❌ FAILED: Jekyll link tags still present" || echo "✅ PASSED: No Jekyll link tags found"

# Check for spacing variations
grep -n "{% *link" *.md && echo "⚠️  WARNING: Variant spacing found" || echo "✅ PASSED: No variant patterns"

# Case-insensitive check
grep -in "{% link" *.md && echo "⚠️  WARNING: Case variants found" || echo "✅ PASSED: No case variants"
```

### Step 2: Validate Markdown Syntax

Check for broken markdown link syntax:

```bash
echo "=== Validating markdown link syntax ==="

# Check for unmatched opening brackets
grep -E '\[[^\]]*$' *.md | grep -v '^\[' && echo "❌ FAILED: Unmatched brackets found" || echo "✅ PASSED: All brackets matched"

# Check for unmatched parentheses in links
grep -E '\]\([^\)]*$' *.md && echo "❌ FAILED: Unmatched parentheses found" || echo "✅ PASSED: All parentheses matched"

# Check for empty links
grep -E '\]\(\s*\)' *.md && echo "⚠️  WARNING: Empty links found" || echo "✅ PASSED: No empty links"
```

### Step 3: Verify Replacement Format Consistency

Ensure all replacements follow the correct pattern:

```bash
echo "=== Checking replacement format consistency ==="

# Extract all markdown links and check for .html extension
grep -oh '\]([-a-zA-Z0-9_/]*\.html)' *.md > /tmp/replaced_links.txt

# Count replacements
LINK_COUNT=$(wc -l < /tmp/replaced_links.txt)
echo "✅ Found $LINK_COUNT .html links in markdown files"

# Look for any remaining .md references in links (should be converted to .html)
grep -E '\]\([a-zA-Z0-9_-]*\.md\)' *.md && echo "⚠️  WARNING: .md links still present (should be .html)" || echo "✅ PASSED: All links use .html extension"
```

### Step 4: Validate Referenced Files Exist

Check that all linked files actually exist:

```bash
echo "=== Validating linked files exist ==="

# Extract unique filenames from links
grep -oh '\]([a-zA-Z0-9_-]*\.html)' *.md | sed 's/\](\(.*\)\.html)/\1.md/' | sort -u > /tmp/referenced_files.txt

# Check each referenced file exists
while IFS= read -r filename; do
  if [ -f "${filename}.md" ]; then
    echo "✅ $filename.md exists"
  else
    echo "❌ WARNING: $filename.md not found"
  fi
done < /tmp/referenced_files.txt
```

### Step 5: Count Total Replacements Made

Provide statistics on the changes:

```bash
echo "=== Replacement Statistics ==="

# Count files modified (files that used to have Jekyll links)
MODIFIED_FILES=$(grep -l "customization.html\|workflows.html\|workflow.html\|features.html\|architecture.html\|installation.html\|comparison.html" *.md | wc -l)
echo "📝 Files modified: $MODIFIED_FILES"

# Estimate total replacements (count .html links in internal doc references)
TOTAL_REPLACEMENTS=$(grep -oh '\]([a-zA-Z0-9_-]*\.html)' *.md | wc -l)
echo "🔗 Total link replacements: $TOTAL_REPLACEMENTS"
```

### Step 6: Generate Final Verification Report

```bash
echo "======================================"
echo "VERIFICATION REPORT SUMMARY"
echo "======================================"
echo ""
echo "Status: [PASS/FAIL based on above checks]"
echo "Files checked: [count of .md files]"
echo "Link replacements: [count]"
echo "Issues found: [count of failures/warnings]"
echo ""
echo "✅ All verifications passed - ready for deployment"
# OR
echo "❌ Issues found - manual review required"
```

### Expected Results

All checks should pass with output similar to:

```
=== Checking for remaining Jekyll link tags ===
✅ PASSED: No Jekyll link tags found

=== Validating markdown link syntax ===
✅ PASSED: All brackets matched
✅ PASSED: All parentheses matched
✅ PASSED: No empty links

=== Checking replacement format consistency ===
✅ Found 20 .html links in markdown files
✅ PASSED: All links use .html extension

=== Validating linked files exist ===
✅ customization.md exists
✅ workflows.md exists
✅ workflow.md exists
...

=== Replacement Statistics ===
📝 Files modified: 9
🔗 Total link replacements: 20

======================================
VERIFICATION REPORT SUMMARY
======================================
Status: PASS
Files checked: 12
Link replacements: 20
Issues found: 0

✅ All verifications passed - ready for deployment
```

### Troubleshooting

If verification fails:

1. **Remaining Jekyll tags**: Re-run sed command from task 1 with corrected pattern
2. **Syntax errors**: Manually inspect and fix broken markdown
3. **Missing files**: Verify file references are correct or fix typos
4. **Inconsistent format**: Apply additional sed replacements for edge cases

</details>
