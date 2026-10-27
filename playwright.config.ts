import { defineConfig, devices } from '@playwright/test';
import { availableParallelism } from 'os';

export default defineConfig({
  testDir: 'src/__tests__',
  testMatch: '**/*.e2e.test.ts',
  fullyParallel: true,
  workers: Math.max(1, Math.min(2, Math.floor(availableParallelism() / 2))),
  reporter: 'list',
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
