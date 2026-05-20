#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const {
  resolvePlan,
  extractIdFromFrontmatter
} = require('./shared-utils.cjs');

/**
 * Get the next available task ID for a specific plan
 * @private
 * @param {number|string} inputId - The plan ID or path to get next task ID for
 * @returns {number} Next available task ID
 */
function _getNextTaskId(inputId) {
  if (!inputId) {
    console.error('Error: Plan ID or path is required');
    process.exit(1);
  }

  const resolved = resolvePlan(inputId);

  if (!resolved) {
    console.error(`Error: Plan "${inputId}" not found or invalid.`);
    process.exit(1);
  }

  const {
    planDir
  } = resolved;
  const tasksPath = path.join(planDir, 'tasks');

  // Optimization: If no tasks directory exists, return 1 immediately (90% case)
  if (!fs.existsSync(tasksPath)) {
    return 1;
  }

  let maxId = 0;

  try {
    const entries = fs.readdirSync(tasksPath, {
      withFileTypes: true
    });

    // Another optimization: If directory is empty, return 1 immediately
    if (entries.length === 0) {
      return 1;
    }

    entries.forEach(entry => {
      if (entry.isFile() && entry.name.endsWith('.md')) {
        try {
          const filePath = path.join(tasksPath, entry.name);
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

  return maxId + 1;
}

// Get plan ID from command line argument
if (require.main === module) {
  const inputId = process.argv[2];
  process.stdout.write(`${_getNextTaskId(inputId)}\n`);
}

module.exports = {
  _getNextTaskId
};
