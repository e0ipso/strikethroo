import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'src/__tests__',
  testMatch: '**/*.e2e.test.ts',
  fullyParallel: true,
  reporter: 'list',
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
