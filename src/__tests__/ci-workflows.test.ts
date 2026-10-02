/**
 * Authority invariants for .github/workflows/*.yml.
 *
 * Every action is pinned to a commit, every job declares the permissions it
 * needs, checkout never persists credentials, and release publication runs in
 * a job separate from dependency installation and testing.
 */

import * as fs from 'fs';
import * as path from 'path';
import { load } from 'js-yaml';

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const WORKFLOWS_DIR = path.join(REPO_ROOT, '.github', 'workflows');

type Step = {
  uses?: string;
  run?: string;
  with?: Record<string, unknown>;
  env?: Record<string, unknown>;
};
type Job = {
  needs?: string | string[];
  permissions?: Record<string, string>;
  env?: Record<string, unknown>;
  steps: Step[];
};
type Workflow = {
  on: Record<string, unknown>;
  permissions?: Record<string, string>;
  jobs: Record<string, Job>;
};

const workflowFiles = fs
  .readdirSync(WORKFLOWS_DIR)
  .filter(name => name.endsWith('.yml'))
  .sort();

const readSource = (name: string) => fs.readFileSync(path.join(WORKFLOWS_DIR, name), 'utf8');
const readWorkflow = (name: string) => load(readSource(name)) as Workflow;

const PINNED_USES = /^\s*-?\s*uses:\s+[\w.-]+\/[\w.-]+@[0-9a-f]{40}\s+# v\d+\.\d+\.\d+\s*$/;

describe('workflow action pinning', () => {
  test('there are workflows to check', () => {
    expect(workflowFiles).toEqual(['docs.yml', 'release.yml', 'test.yml']);
  });

  test.each(workflowFiles)(
    '%s pins every uses: to a full commit SHA with a version comment',
    name => {
      const usesLines = readSource(name)
        .split('\n')
        .filter(line => /^\s*-?\s*uses:/.test(line));
      expect(usesLines.length).toBeGreaterThan(0);
      for (const line of usesLines) {
        expect(line).toMatch(PINNED_USES);
      }
    }
  );
});

describe('workflow permissions', () => {
  test.each(workflowFiles)('%s declares top-level permissions of {} or contents: read', name => {
    const { permissions } = readWorkflow(name);
    expect(permissions).toBeDefined();
    expect([{}, { contents: 'read' }]).toContainEqual(permissions);
  });

  test.each(workflowFiles)('%s gives every job an explicit permissions block', name => {
    for (const [jobId, job] of Object.entries(readWorkflow(name).jobs)) {
      expect(job.permissions, `${name} job ${jobId}`).toBeDefined();
    }
  });

  test.each(workflowFiles)('%s never persists checkout credentials', name => {
    let checkouts = 0;
    for (const job of Object.values(readWorkflow(name).jobs)) {
      for (const step of job.steps) {
        if (step.uses?.startsWith('actions/checkout@')) {
          checkouts += 1;
          expect(step.with?.['persist-credentials']).toBe(false);
        }
      }
    }
    expect(checkouts).toBeGreaterThan(0);
  });
});

describe('pull request validation', () => {
  const workflow = readWorkflow('test.yml');

  test('runs on pull_request, never pull_request_target', () => {
    expect(workflow.on).toHaveProperty('pull_request');
    expect(workflow.on).not.toHaveProperty('pull_request_target');
  });

  test('is read-only and runs the dependency security check', () => {
    const jobs = Object.values(workflow.jobs);
    expect(jobs).toHaveLength(1);
    expect(jobs[0].permissions).toEqual({ contents: 'read' });
    expect(readSource('test.yml')).toContain('npm run security:check');
  });
});

describe('release workflow job split', () => {
  const workflow = readWorkflow('release.yml');
  const { verify, release } = workflow.jobs;
  const runs = (job: Job) => job.steps.map(step => step.run ?? '').join('\n');

  test('verify is a read-only job with no secrets that installs, builds, tests, and checks dependencies', () => {
    expect(verify).toBeDefined();
    expect(verify.permissions).toEqual({ contents: 'read' });
    expect(verify.env).toBeUndefined();
    for (const step of verify.steps) {
      expect(JSON.stringify(step.env ?? {})).not.toContain('secrets.');
    }
    const script = runs(verify);
    expect(script).toContain("git describe --tags --abbrev=0 --match 'v*'");
    expect(script).toContain('npm ci');
    expect(script).toContain('npm run build');
    expect(script).toContain('npm test');
    expect(script).toContain('npm run security:check');
  });

  test('release depends on verify and holds only what semantic-release needs', () => {
    expect(release).toBeDefined();
    expect(release.needs).toBe('verify');
    // id-token is for npm trusted publishing (OIDC); there is no NPM_TOKEN.
    expect(release.permissions).toEqual({
      contents: 'write',
      issues: 'write',
      'pull-requests': 'write',
      'id-token': 'write',
    });
    expect(release.env).toBeUndefined();
  });

  test('release installs without lifecycle scripts and exposes tokens to the semantic-release step only', () => {
    const script = runs(release);
    expect(script).toContain('npm ci --ignore-scripts');
    expect(script).not.toContain('npm test');

    const withSecrets = release.steps.filter(step =>
      JSON.stringify(step.env ?? {}).includes('secrets.')
    );
    expect(withSecrets).toHaveLength(1);
    const [publish] = withSecrets;
    expect(publish.run).toContain('npx semantic-release');
    expect(publish.env).toEqual({
      GITHUB_TOKEN: '${{ secrets.GITHUB_TOKEN }}',
      HUSKY: 0,
    });
  });
});

describe('docs workflow', () => {
  const workflow = readWorkflow('docs.yml');

  test('scopes pages: write and id-token: write to the job that deploys', () => {
    const entries = Object.entries(workflow.jobs);
    const deploying = entries.filter(([, job]) =>
      job.steps.some(step => step.uses?.startsWith('actions/deploy-pages@'))
    );
    expect(deploying).toHaveLength(1);
    const [deployId, deploy] = deploying[0];
    expect(deploy.permissions).toEqual({ pages: 'write', 'id-token': 'write' });

    for (const [jobId, job] of entries) {
      if (jobId === deployId) continue;
      expect(job.permissions?.['id-token']).toBeUndefined();
      expect(job.permissions?.pages).not.toBe('write');
    }
  });
});

describe('security:check script entry', () => {
  test('uses a pinned audit-ci dependency with the checked-in policy', () => {
    const { scripts, devDependencies } = JSON.parse(
      fs.readFileSync(path.join(REPO_ROOT, 'package.json'), 'utf8')
    ) as {
      scripts: Record<string, string>;
      devDependencies: Record<string, string>;
    };
    expect(scripts['security:check']).toBe('audit-ci --config security/audit-ci.json');
    expect(devDependencies['audit-ci']).toMatch(/^\d+\.\d+\.\d+$/);
  });

  test('gates high/critical advisories, includes dev dependencies, and rejects audit errors', () => {
    const config = JSON.parse(
      fs.readFileSync(path.join(REPO_ROOT, 'security', 'audit-ci.json'), 'utf8')
    );
    expect(config['package-manager']).toBe('npm');
    expect(config.high).toBe(true);
    expect(config.low ?? false).toBe(false);
    expect(config.moderate ?? false).toBe(false);
    expect(config['skip-dev']).toBe(false);
    expect(config['extra-args']).toEqual(['--include=dev']);
    expect(config['pass-enoaudit']).toBe(false);

    for (const record of config.allowlist) {
      const entries = Object.entries(record);
      expect(entries).toHaveLength(1);
      const [id, content] = entries[0] as [string, { active: boolean; notes: string }];
      expect(id).toMatch(/^GHSA-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}\|[\w@/.-]+(?:>[\w@/.-]+)*$/);
      expect(content.active).toBe(true);
      expect(content.notes).toContain('Recheck when');
    }
  });
});
