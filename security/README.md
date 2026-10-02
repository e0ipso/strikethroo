# Dependency audit policy

Run `npm run security:check` after `npm ci`. The command uses the exact `audit-ci` devDependency version and the checked-in [configuration](audit-ci.json), both locally and in the PR and release verification jobs.

The audit includes the full lockfile, including dev dependencies that feed the viewer and skill bundles. Unallowlisted high and critical advisories fail the gate. Low and moderate advisories are informational for every package. Audit errors fail the gate, including a registry that cannot perform an audit.

## Maintaining exceptions

Use an exact advisory/path record supported by [audit-ci](https://github.com/IBM/audit-ci#allowlisting). Keep the affected package and observed version, usage, reason for accepting the risk, and recheck condition in the record's `notes`. Avoid package-wide and wildcard suppressions. Add only exceptions needed to pass the configured threshold.

Audit-ci reconstructs paths from npm's advisory graph rather than the installed filesystem. npm's bundled release-tooling copies currently appear as `GHSA-…|brace-expansion` and `GHSA-…|undici`; these records cannot distinguish them from another copy with the same advisory/path. Review the full `npm run security:audit-json` report and its `nodes` before accepting a finding. If the same advisory reaches shipped code, reassess the exception.

The active exceptions cover three high-severity advisories in npm@11.21.0 bundled under @semantic-release/npm@13.2.0. The bundled files cannot be replaced with overrides. The brace-expansion inputs are release tooling's own glob patterns, and npm does not open WebSockets through undici. Each record names its patch version and recheck condition.

Exceptions do not bind installed versions. Review them whenever release tooling is upgraded or its usage changes, and remove records that no longer match a high/critical finding. Audit-ci reports unused exceptions but does not fail on them. Its optional `expiry` field can impose a calendar deadline; review dates should reflect an actual maintenance commitment.
