
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts?(x)', '**/?(*.)+(spec|test).ts?(x)'],
  transform: {
    '^.+\.tsx?$': [
      'ts-jest',
      {
        tsconfig: 'tsconfig.test.json',
      },
    ],
  },
  transformIgnorePatterns: ['node_modules/(?!(inquirer|chalk|diff)/)'],
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/cli.ts',
    '!src/**/*.test.ts',
    '!src/**/__tests__/**',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'json-summary'],
  coverageThreshold: {
    global: {
      branches: 19,
      functions: 12,
      lines: 24,
      statements: 24,
    },
  },
  // Optimized for performance
  verbose: false,
  maxWorkers: '50%',
  cache: true,
  cacheDirectory: '.jest-cache',
  // Fast execution settings
  bail: false,
  errorOnDeprecated: false,
  // Skip setup files for faster execution
  setupFilesAfterEnv: [],
};
