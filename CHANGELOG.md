# Changelog

All notable changes to the GauthierFitness infrastructure are documented here.

Format inspired by [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [v1.1.2] - 2026-07-13

### Fixed

- `deploy.yml`: staging/prod deployment was failing (`ssh: unable to authenticate`) after the grouped GitHub Actions
  update — `appleboy/scp-action` had been bumped from v0.1.7 to v1.0.0 (a major bump hidden inside the group),
  invalidating the hardcoded `/github/runner_temp/{staging,prod}_key` path used for the SSH key. Replaced with
  `${{ runner.temp }}/{staging,prod}_key`, consistent with what the neighboring `appleboy/ssh-action` step already used.
  Verified with a real staging deployment + full Cypress E2E suite, both green.

## [v1.1.1] - 2026-07-13

### Fixed

- `security-scan.yml`: a missing `issues: write` permission prevented `zaproxy/action-baseline` from logging its results
  to GitHub Issues, failing the job even when the scan itself found no blocking issue (`FAIL-NEW: 0`). Verified under
  real conditions: the scan now runs green and the issue is created correctly.

### Changed

- Updated the GitHub Actions used in CI/CD, grouped by Dependabot (7 updates).

## [v1.1.0] - 2026-07-12

### Added

- Daily encrypted backup of the MySQL database (`scripts/backup-db.sh`, GPG) and a monthly restore test script (
  `scripts/restore-db-test.sh`).

### Changed

- `deploy.yml` now syncs `backup-db.sh` to the VPS on every deployment.
- Translated infra comments and scripts to English (`.gitignore`, `.env.*.example`, Nginx configs, backup/restore
  scripts).

### Fixed

- `restore-db-test.sh`: avoids a race condition with MySQL's internal restart on first launch (requires two consecutive
  successful pings).

## [v1.0.1] - 2026-07-10

### Fixed

- CSP: added `wasm-unsafe-eval` and `blob:` to unblock the 3D configurator (blank page in production, see Incident
  Report 8).
- Nginx: raised `fastcgi_read_timeout` to 200s to align the proxy with the actual timeout of AI generation (see Incident
  Report 9).

## [v1.0.0] - 2026-07-08

First tagged release of the infra. Full continuous deployment pipeline for staging and production on
2 OVH VPS (Docker, Nginx, Let's Encrypt), with an E2E test suite, security scan, and monitoring.

### Added

- CI/CD pipeline (GitHub Actions), Docker orchestration (`docker-compose.yml` / `.staging.yml` / `.prod.yml`).
- Cypress E2E test suite, including the full purchase journey.
- OWASP ZAP security scan and Gatling load tests.
- Production uptime monitoring.
- Dependabot (GitHub Actions, npm E2E).

### Changed

- Nginx: HTTPS configuration (Let's Encrypt) for frontend and API subdomain, in staging and production.
- Prod deployment : targeted deployment option (prod-only), SCP/SSH fixes (base64-encoded key, permissions,
  runner path) to make VPS connection more reliable.

### Security

- Closed MySQL port exposed on VPS following staging ransomware incident (May 2026) : hardened
  both VPS (SSH key-only, ufw, DB not publicly exposed).

### Fixed

- Nginx storage alias, Sanctum routing, `DB_HOST` variable, deployment SCP step.
