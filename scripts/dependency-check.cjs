#!/usr/bin/env node
/**
 * Dependency security check (`npm run security:check`).
 *
 * Runs `npm audit --json` over the full lockfile (dev included — the SPA and
 * the skill bundles are built from devDependencies, so `--omit=dev` would hide
 * shipped exposure) and fails on any high or critical advisory that is not
 * covered by a reviewed entry in security/dependency-dispositions.json. A
 * disposition covers exactly one advisory on one package at one installed
 * version; when the installed version moves, the entry is stale and the check
 * fails so it is re-reviewed rather than silently carried forward.
 *
 * Packages bundled into dist-web/ and the skill .cjs files (SHIPPED_PACKAGES)
 * gate at every severity and have each installed copy printed from
 * `npm ls --all --json`, so an advisory reaching shipped code is never merely
 * informational.
 *
 * `evaluate` is pure and exported for tests; `main` does the process work.
 */

'use strict';

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const DISPOSITIONS_PATH = path.join(REPO_ROOT, 'security', 'dependency-dispositions.json');

const SHIPPED_PACKAGES = ['mermaid', 'dompurify', 'marked', 'js-yaml', 'diff', 'react', 'react-dom'];
const GATED_SEVERITIES = new Set(['high', 'critical']);
const REQUIRED_FIELDS = ['advisory', 'package', 'version', 'usage', 'reason', 'recheck'];
const RESOLVED_FIELDS = ['advisory', 'package', 'fixedIn', 'note'];

const GHSA_PATTERN = /GHSA-[0-9a-z]{4}-[0-9a-z]{4}-[0-9a-z]{4}/i;

/** 'https://github.com/advisories/GHSA-x…' and 'GHSA-x…' compare equal (canonical lowercase id). */
function advisoryId(value) {
  const match = GHSA_PATTERN.exec(String(value ?? ''));
  return match ? `GHSA-${match[0].slice(5).toLowerCase()}` : String(value ?? '').trim();
}

/** Flattens an `npm ls --all --json` tree into name -> installed copies. */
function collectInstalled(tree) {
  const byName = new Map();
  const walk = (dependencies, prefix) => {
    for (const [name, node] of Object.entries(dependencies ?? {})) {
      if (!node || typeof node !== 'object') continue;
      const nodePath = `${prefix}node_modules/${name}`;
      if (typeof node.version === 'string') {
        if (!byName.has(name)) byName.set(name, []);
        byName.get(name).push({
          version: node.version,
          path: nodePath,
          inBundle: node.inBundle === true,
        });
      }
      walk(node.dependencies, `${nodePath}/`);
    }
  };
  walk(tree?.dependencies, '');
  return byName;
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function validateDispositions(file) {
  const problems = [];
  if (!file || typeof file !== 'object' || !Array.isArray(file.dispositions)) {
    problems.push('dispositions file must be an object with a "dispositions" array');
    return problems;
  }
  if (file.resolved !== undefined) {
    if (!Array.isArray(file.resolved)) {
      problems.push('"resolved" must be an array when present');
    } else {
      file.resolved.forEach((entry, index) => {
        for (const field of RESOLVED_FIELDS) {
          if (!isNonEmptyString(entry?.[field])) {
            problems.push(`resolved[${index}] is missing "${field}"`);
          }
        }
      });
    }
  }
  return problems;
}

/**
 * @param {object} input
 * @param {object} input.audit        parsed `npm audit --json`
 * @param {object} input.tree         parsed `npm ls --all --json`
 * @param {object} input.dispositions parsed dispositions file
 * @param {(nodePath: string) => string | undefined} input.readVersion
 * @param {string[]} [input.shipped]
 */
function evaluate({ audit, tree, dispositions, readVersion, shipped = SHIPPED_PACKAGES }) {
  if (!audit || typeof audit !== 'object') {
    throw new Error('npm audit produced no JSON report');
  }
  if (audit.error) {
    const { code, summary, detail } = audit.error;
    throw new Error(`npm audit failed: ${code ?? 'unknown'} ${summary ?? ''} ${detail ?? ''}`.trim());
  }

  const violations = [];
  const shippedSet = new Set(shipped);
  const installed = collectInstalled(tree);

  const fileProblems = validateDispositions(dispositions);
  for (const problem of fileProblems) violations.push(`dispositions: ${problem}`);
  const entries = Array.isArray(dispositions?.dispositions) ? dispositions.dispositions : [];

  const dispositionReports = entries.map((entry, index) => {
    const missing = REQUIRED_FIELDS.filter(field => !isNonEmptyString(entry?.[field]));
    if (missing.length > 0) {
      violations.push(`disposition #${index + 1} is missing: ${missing.join(', ')}`);
      return { index, entry, status: 'invalid', detail: `missing ${missing.join(', ')}` };
    }
    const copies = installed.get(entry.package) ?? [];
    const versions = [...new Set(copies.map(copy => copy.version))];
    if (!versions.includes(entry.version)) {
      violations.push(
        `disposition #${index + 1} (${advisoryId(entry.advisory)} ${entry.package}@${entry.version}) ` +
          `is stale: installed ${versions.length > 0 ? versions.join(', ') : 'none'}`
      );
      return { index, entry, status: 'stale', detail: `installed ${versions.join(', ') || 'none'}` };
    }
    return { index, entry, status: 'unused', detail: '' };
  });

  const usable = dispositionReports.filter(report => report.status === 'unused');
  const findDisposition = (id, pkg, version) =>
    usable.find(
      report =>
        advisoryId(report.entry.advisory) === id &&
        report.entry.package === pkg &&
        report.entry.version === version
    );

  const advisories = [];
  for (const [pkg, entry] of Object.entries(audit.vulnerabilities ?? {})) {
    const nodes = Array.isArray(entry.nodes) ? entry.nodes : [];
    const installedVersions = [
      ...new Set(nodes.map(node => readVersion(node)).filter(version => typeof version === 'string')),
    ];
    for (const via of entry.via ?? []) {
      // String entries point at the vulnerable dependency; the advisory itself
      // is reported on that dependency's own entry.
      if (typeof via !== 'object' || via === null) continue;
      const id = advisoryId(via.url ?? via.source);
      const severity = String(via.severity ?? entry.severity ?? 'unknown').toLowerCase();
      const gated = GATED_SEVERITIES.has(severity) || shippedSet.has(pkg);

      const matched = installedVersions.map(version => findDisposition(id, pkg, version));
      const covered = installedVersions.length > 0 && matched.every(Boolean);
      for (const report of matched) if (report) report.status = 'matched';

      let status;
      if (covered) status = 'allowed';
      else if (gated) status = 'violation';
      else status = 'informational';

      if (status === 'violation') {
        violations.push(
          `${severity} ${pkg}@${installedVersions.join(',') || '?'} ${id} ` +
            `(${via.title ?? 'untitled'}) has no matching disposition` +
            (shippedSet.has(pkg) ? ' [shipped package]' : '')
        );
      }
      advisories.push({
        package: pkg,
        advisory: id,
        title: via.title ?? '',
        url: via.url ?? '',
        severity,
        shipped: shippedSet.has(pkg),
        installedVersions,
        nodes,
        status,
      });
    }
  }

  const shippedReport = shipped.map(name => ({
    package: name,
    versions: (installed.get(name) ?? []).map(copy => ({ version: copy.version, path: copy.path })),
  }));

  const resolved = Array.isArray(dispositions?.resolved) ? dispositions.resolved : [];

  return {
    ok: violations.length === 0,
    violations,
    advisories,
    dispositions: dispositionReports,
    shipped: shippedReport,
    resolved,
    metadata: audit.metadata ?? {},
  };
}

function runNpmJson(args) {
  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const result = spawnSync(npm, [...args, '--json'], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    maxBuffer: 256 * 1024 * 1024,
    shell: false,
  });
  if (result.error) throw result.error;
  // Both commands exit non-zero when they have something to report; the JSON
  // on stdout is still the complete document.
  const stdout = result.stdout.trim();
  if (!stdout) {
    throw new Error(`npm ${args.join(' ')} produced no output${result.stderr ? `: ${result.stderr}` : ''}`);
  }
  return JSON.parse(stdout);
}

function readVersionFromDisk(nodePath) {
  try {
    const manifest = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, nodePath, 'package.json'), 'utf8'));
    return typeof manifest.version === 'string' ? manifest.version : undefined;
  } catch {
    return undefined;
  }
}

function pad(value, width) {
  const text = String(value);
  return text.length >= width ? text : text + ' '.repeat(width - text.length);
}

function printReport(result) {
  const counts = result.metadata.vulnerabilities ?? {};
  const deps = result.metadata.dependencies ?? {};
  console.log('Dependency security check');
  console.log(
    `  npm audit: ${counts.total ?? 0} vulnerable package(s) ` +
      `(critical ${counts.critical ?? 0}, high ${counts.high ?? 0}, moderate ${counts.moderate ?? 0}, ` +
      `low ${counts.low ?? 0}) across ${deps.total ?? '?'} dependencies (dev included)`
  );

  console.log('\nAdvisories');
  if (result.advisories.length === 0) console.log('  none');
  for (const entry of result.advisories) {
    console.log(
      `  ${pad(entry.status, 14)}${pad(entry.severity, 10)}` +
        `${pad(`${entry.package}@${entry.installedVersions.join(',') || '?'}`, 32)}` +
        `${pad(entry.advisory, 22)}${entry.shipped ? '[shipped] ' : ''}${entry.title}`
    );
  }

  console.log(`\nDispositions (${path.relative(REPO_ROOT, DISPOSITIONS_PATH)})`);
  if (result.dispositions.length === 0) console.log('  none');
  for (const report of result.dispositions) {
    const entry = report.entry ?? {};
    console.log(
      `  ${pad(report.status, 9)}#${pad(report.index + 1, 3)}` +
        `${pad(advisoryId(entry.advisory), 22)}${pad(`${entry.package ?? '?'}@${entry.version ?? '?'}`, 32)}` +
        `${report.detail}`
    );
  }

  if (result.resolved.length > 0) {
    console.log('\nResolved advisories (documentation only; never suppress anything)');
    for (const entry of result.resolved) {
      console.log(`  ${pad(advisoryId(entry.advisory), 22)}${pad(entry.package, 14)}fixed in ${entry.fixedIn}`);
    }
  }

  console.log('\nShipped packages (npm ls --all)');
  for (const entry of result.shipped) {
    const copies =
      entry.versions.length === 0
        ? 'NOT INSTALLED'
        : entry.versions.map(copy => `${copy.version} (${copy.path})`).join('; ');
    console.log(`  ${pad(entry.package, 14)}${copies}`);
  }

  console.log('');
  if (result.ok) {
    console.log('Result: OK');
  } else {
    console.log(`Result: FAILED (${result.violations.length} problem(s))`);
    for (const violation of result.violations) console.log(`  - ${violation}`);
  }
}

function main() {
  const dispositions = JSON.parse(fs.readFileSync(DISPOSITIONS_PATH, 'utf8'));
  const audit = runNpmJson(['audit']);
  const tree = runNpmJson(['ls', '--all']);
  const result = evaluate({ audit, tree, dispositions, readVersion: readVersionFromDisk });
  printReport(result);
  process.exitCode = result.ok ? 0 : 1;
}

module.exports = { evaluate, collectInstalled, advisoryId, SHIPPED_PACKAGES };

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(`dependency-check: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}
