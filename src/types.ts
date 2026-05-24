/**
 * TypeScript Type Definitions
 *
 * This file contains all TypeScript interfaces, types, and enums
 * used throughout the AI Task Manager CLI application
 */

/**
 * Supported AI assistants for task management
 */
export type Assistant = 'claude' | 'codex' | 'cursor' | 'gemini' | 'github' | 'opencode';

/**
 * Options for the init command
 */
export interface InitOptions {
  /**
   * Comma-separated list of assistants to configure
   */
  assistants: string;
  /**
   * Optional destination directory for the configuration
   */
  destinationDirectory?: string;
  /**
   * Force overwrite all files without prompting
   */
  force?: boolean;
}

/**
 * Configuration for directory structure
 */
export interface DirectoryConfig {
  /**
   * Path to the directory
   */
  path: string;
  /**
   * Optional list of files to create in the directory
   */
  files?: string[];
}

/**
 * Task status enumeration
 */
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

/**
 * Task priority levels
 */
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

/**
 * Individual task definition
 */
export interface Task {
  /**
   * Unique identifier for the task
   */
  id: string;
  /**
   * Task title/name
   */
  title: string;
  /**
   * Detailed task description
   */
  description?: string;
  /**
   * Current status of the task
   */
  status: TaskStatus;
  /**
   * Task priority level
   */
  priority: TaskPriority;
  /**
   * Task creation timestamp
   */
  createdAt: Date;
  /**
   * Last update timestamp
   */
  updatedAt: Date;
  /**
   * Optional due date
   */
  dueDate?: Date;
  /**
   * Tags associated with the task
   */
  tags: string[];
  /**
   * AI assistant assigned to the task
   */
  assignedTo?: Assistant;
}

/**
 * Task list configuration
 */
export interface TaskList {
  /**
   * List name/identifier
   */
  name: string;
  /**
   * List description
   */
  description?: string;
  /**
   * Tasks in the list
   */
  tasks: Task[];
  /**
   * Creation timestamp
   */
  createdAt: Date;
  /**
   * Last update timestamp
   */
  updatedAt: Date;
}

/**
 * CLI command options base interface
 */
export interface BaseCommandOptions {
  /**
   * Enable verbose logging
   */
  verbose?: boolean;
  /**
   * Dry run mode - show what would be done without executing
   */
  dryRun?: boolean;
}

/**
 * Assistant configuration
 */
export interface AssistantConfig {
  /**
   * Assistant type
   */
  type: Assistant;
  /**
   * API endpoint URL
   */
  endpoint?: string;
  /**
   * API key for authentication
   */
  apiKey?: string;
  /**
   * Model name/version to use
   */
  model?: string;
  /**
   * Additional configuration options
   */
  options?: Record<string, unknown>;
}

/**
 * Project configuration
 */
export interface ProjectConfig {
  /**
   * Project name
   */
  name: string;
  /**
   * Project description
   */
  description?: string;
  /**
   * Default assistant for the project
   */
  defaultAssistant?: Assistant;
  /**
   * Configured assistants
   */
  assistants: AssistantConfig[];
  /**
   * Project creation timestamp
   */
  createdAt: Date;
  /**
   * Configuration file version
   */
  version: string;
}

/**
 * Validation result interface
 */
export interface ValidationResult {
  /**
   * Whether validation passed
   */
  valid: boolean;
  /**
   * Validation errors if any
   */
  errors: string[];
  /**
   * Validation warnings if any
   */
  warnings: string[];
}

/**
 * Command execution result
 */
export interface CommandResult {
  /**
   * Whether command executed successfully
   */
  success: boolean;
  /**
   * Result message
   */
  message: string;
  /**
   * Additional data from command execution
   */
  data?: unknown;
  /**
   * Error information if command failed
   */
  error?: Error;
}

/**
 * Metadata tracking for init command file management
 */
export interface InitMetadata {
  /**
   * Package version at time of init
   */
  version: string;
  /**
   * Workspace schema version. Bumped only when .ai/task-manager/ shape changes incompatibly.
   */
  workspaceSchemaVersion: number;
  /**
   * Timestamp of last init operation
   */
  timestamp: string;
  /**
   * Map of relative file paths to SHA-256 hashes
   */
  files: Record<string, string>;
}

/**
 * Represents a file conflict detected during init
 */
export interface FileConflict {
  /**
   * Relative path from .ai/task-manager/ directory
   */
  relativePath: string;
  /**
   * User's current file content
   */
  userFileContent: string;
  /**
   * New incoming file content from package
   */
  newFileContent: string;
  /**
   * Original hash from metadata when file was first copied
   */
  originalHash: string;
  /**
   * Current hash of user's file
   */
  currentHash: string;
}

/**
 * User's resolution choice for file conflicts
 */
export type ConflictResolution = 'keep' | 'overwrite' | 'keep-all' | 'overwrite-all';
