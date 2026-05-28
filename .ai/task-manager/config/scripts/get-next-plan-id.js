#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Find the task manager root directory by traversing up from CWD
 * @returns {string|null} Path to task manager root or null if not found
 */
function findTaskManagerRoot() {
  let currentPath = process.cwd();
  const root = path.parse(currentPath).root;

  while (currentPath !== root) {
    const taskManagerPath = path.join(currentPath, '.ai', 'task-manager', 'plans');
    if (fs.existsSync(taskManagerPath)) {
      return path.join(currentPath, '.ai', 'task-manager');
    }
    currentPath = path.dirname(currentPath);
  }

  // Check root directory as well
  const rootTaskManager = path.join(root, '.ai', 'task-manager', 'plans');
  if (fs.existsSync(rootTaskManager)) {
    return path.join(root, '.ai', 'task-manager');
  }

  return null;
}

/**
 * Parse YAML frontmatter for ID with resilience to different formats
 * @param {string} content - File content
 * @returns {number|null} Extracted ID or null
 */
function extractIdFromFrontmatter(content) {
  const frontmatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!frontmatterMatch) return null;

  const frontmatterText = frontmatterMatch[1];

  // Handle various YAML formats for id field using regex:
  // id: 5
  // id: "5"
  // id: '5'
  // "id": 5
  // 'id': 5
  // id : 5 (with spaces)
  const patterns = [
    /^\s*["']?id["']?\s*:\s*["']?(\d+)["']?\s*$/m,  // Most flexible pattern
    /^\s*id\s*:\s*(\d+)\s*$/m,                       // Simple numeric
    /^\s*id\s*:\s*"(\d+)"\s*$/m,                     // Double quoted
    /^\s*id\s*:\s*'(\d+)'\s*$/m,                     // Single quoted
  ];

  for (const pattern of patterns) {
    const match = frontmatterText.match(pattern);
    if (match) {
      const id = parseInt(match[1], 10);
      if (!isNaN(id)) return id;
    }
  }

  return null;
}

/**
 * Get the next available plan ID by scanning existing plan files
 * @returns {number} Next available plan ID
 */
function getNextPlanId() {
  const taskManagerRoot = findTaskManagerRoot();

  if (!taskManagerRoot) {
    console.error('Error: No .ai/task-manager/plans directory found in current directory or any parent directory.');
    console.error('Please ensure you are in a project with task manager initialized.');
    process.exit(1);
  }

  const plansDir = path.join(taskManagerRoot, 'plans');
  const archiveDir = path.join(taskManagerRoot, 'archive');

  let maxId = 0;

  // Scan both plans and archive directories
  [plansDir, archiveDir].forEach(dir => {
    if (!fs.existsSync(dir)) return;

    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      entries.forEach(entry => {
        if (entry.isFile() && entry.name.match(/^plan-\d+--.*\.md$/)) {
          // Extract ID from filename as fallback
          const filenameMatch = entry.name.match(/^plan-(\d+)--/);
          if (filenameMatch) {
            const id = parseInt(filenameMatch[1], 10);
            if (!isNaN(id) && id > maxId) maxId = id;
          }

          // Also check frontmatter for more reliable ID
          try {
            const filePath = path.join(dir, entry.name);
            const content = fs.readFileSync(filePath, 'utf8');
            const id = extractIdFromFrontmatter(content);

            if (id !== null && id > maxId) {
              maxId = id;
            }
          } catch (err) {
            // Skip corrupted files
          }
        }
      });
    } catch (err) {
      // Skip directories that can't be read
    }
  });

  return maxId + 1;
}

// Output the next plan ID
console.log(getNextPlanId());