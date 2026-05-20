#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { findTaskManagerRoot, getAllPlans } = require('./shared-utils.cjs');

/**
 * Error logging utility
 * @private
 * @param {string} message - Error message
 * @param {...any} args - Additional arguments to log
 */
function _errorLog(message, ...args) {
  console.error(`[ERROR] ${message}`, ...args);
}

/**
 * Get the next available plan ID by scanning existing plan files
 * @private
 * @returns {number} Next available plan ID
 */
function _getNextPlanId() {
  const taskManagerRoot = findTaskManagerRoot();

  if (!taskManagerRoot) {
    _errorLog('No .ai/task-manager/plans directory found in current directory or any parent directory.');
    _errorLog('');
    _errorLog('Please ensure you are in a project with task manager initialized, or navigate to the correct');
    _errorLog('project directory. The task manager looks for the .ai/task-manager/plans structure starting');
    _errorLog('from the current working directory and traversing upward through parent directories.');
    _errorLog('');
    _errorLog(`Current working directory: ${process.cwd()}`);
    process.exit(1);
  }

  const plans = getAllPlans(taskManagerRoot);
  const maxId = plans.reduce((max, p) => Math.max(max, p.id), 0);

  return maxId + 1;
}

// Output the next plan ID if run directly
if (require.main === module) {
  process.stdout.write(`${_getNextPlanId()}\n`);
}

module.exports = {
  _getNextPlanId
};
