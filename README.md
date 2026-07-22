# GauthierFitness - Infra

> Docker orchestration, Nginx configurations, deployment scripts, and E2E tests for GauthierFitness's **staging** and
**production** environments.

Repo: `CharlesGAUTHIER1999/gauthierfitness-infra` &nbsp; &nbsp; Deploys to: `staging.gauthierfitness.fr` and
`gauthierfitness.fr`

> Cross-project documentation (architecture, user manual, upgrades): [meta-repo
`gauthierfitness/docs`](https://github.com/CharlesGAUTHIER1999/gauthierfitness/tree/main/docs)

---

## Role of this directory

| Component                      | Role                                                                 |
|--------------------------------|----------------------------------------------------------------------|
| `docker-compose.yml`           | Full stack: nginx, backend, frontend, db, redis, queue worker, scheduler (base) |
| `docker-compose.staging.yml`   | Staging override (HTTPS, staging domains)                            |
| `docker-compose.prod.yml`      | Production override (HTTPS, prod domains)                            |
| `nginx/`                       | Nginx configs: `nginx.conf` (base), `staging.conf`, `prod.conf`      |
| `scripts/`                     | `deploy-staging.sh`, `deploy-prod.sh` - run via SSH on the VPS       |
| `e2e/`                         | Cypress tests run against staging after each deployment              |
| `.github/workflows/deploy.yml` | Full pipeline: Deploy Staging -> E2E -> Deploy Prod                  |

The backend and frontend Docker images are **built by their own respective CIs** (see `gauthierfitness-backend` and
`gauthierfitness-frontend`) and published to GHCR. This repo doesn't build any image itself, it **orchestrates** them.

---

## Stack

| Layer             | Technology                                                       |
|-------------------|------------------------------------------------------------------|
| Containerization  | Docker + Docker Compose v2                                       |
| Reverse proxy     | Nginx Alpine 1.27                                                |
| Database          | MySQL 8                                                          |
| Cache / Queue     | Redis 7                                                          |
| Hosting           | 2 OVH VPS (staging + production)                                 |
| Registry          | GHCR (GitHub Container Registry)                                 |
| CI/CD             | GitHub Actions (triggered manually or via `repository_dispatch`) |
| TLS               | Let's Encrypt (Certbot, auto-renewal)                            |
| Post-deploy tests | Cypress (Chrome)                                                 |

---

## Local setup (testing the compose stack in isolation)

```bash
cp .env.example .env       # fill in the secrets
docker compose -f docker-compose.yml up -d
docker compose logs -f nginx
```

Stack available at `http://localhost`. For day-to-day app development, it's better to run the backend and frontend
**outside Docker** (see their READMEs).

---

## Deployment pipeline

```
              +---------------------------------------------------------+
              | Trigger: workflow_dispatch (manual) or                  |
              |          repository_dispatch (from backend/frontend)    |
              +-------------------------+-------------------------------+
                                        |
                                        v
              +---------------------------------------------------------+
              | JOB 1 - Deploy Staging                                  |
              |  * SCP compose + nginx -> staging VPS                   |
              |  * SSH: docker login GHCR -> pull -> migrate -> up -d   |
              |  * Re-cache Laravel config/route/view                  |
              +-------------------------+-------------------------------+
                                        |
                                        v
              +---------------------------------------------------------+
              | JOB 2 - Cypress E2E Tests                               |
              |  * Runs the e2e/cypress/e2e/ specs against staging      |
              |  * Uploads screenshots/videos as artifact on failure     |
              +-------------------------+-------------------------------+
                                        |
                                        v (manual gate, or both/prod-only parameter)
              +---------------------------------------------------------+
              | JOB 3 - Deploy Production                               |
              |  * Same as job 1 but on the prod VPS + docker-compose.prod |
              |  * artisan down -> migrate -> up -d -> cache -> up      |
              +---------------------------------------------------------+
```

Workflow: [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml).

### Manual trigger

GitHub UI → **Actions** tab → **Deploy Pipeline** workflow → **Run workflow**:

| Input         | Typical value                                                                     |
|---------------|-----------------------------------------------------------------------------------|
| `image_tag`   | `latest` (= latest `main`), `develop`, or a short sha (`abc1234`)                 |
| `environment` | `staging` (default) - `prod-only` (skip staging+e2e) - `both` (chains everything) |

### Automatic trigger

The backend and frontend CIs, on every push to `develop`, send a `repository_dispatch` of type `deploy-staging` to
this repo -> Jobs 1 + 2 chain automatically. No automatic production deploy.

---

## E2E Tests (Cypress)

```bash
cd e2e
npm install
BASE_URL=http://localhost npx cypress open  # against local compose stack
BASE_URL=https://staging.gauthierfitness.fr npx cypress run # against staging
```

Specs available in `e2e/cypress/e2e/`: `auth.cy.js`, `admin.cy.js`, `admin-stock.cy.js`, `purchase-journey.cy.js`.
`package-lock.json` must be **committed** in `e2e/` - without it, the CI job breaks (`setup-node` requires the lockfile
to compute the cache key, and `npm ci` requires it too).
On failure, screenshots and videos are generated in `e2e/cypress/screenshots/` and `e2e/cypress/videos/`
(gitignored) then uploaded as a GitHub artifact by CI.

---

## VPS - hardening and access

Following the staging ransomware incident of May 2026, both VPS are hardened :

- **SSH**: key-only (`PasswordAuthentication no`, `PermitRootLogin no`), non-standard port.
- **UFW**: only 22 (custom SSH port), 80 (HTTPS redirect), and 443 open.
- **MySQL**: **never exposed** externally. Accessible only via the `gf_network` Docker network. For occasional
  debugging: SSH tunnel (`ssh -L 3306:localhost:3306 ...`).
- **Backups**: GPG-encrypted MySQL dump, daily, copied off-VPS.

Details: [docs/02-deployment.md § 8](https://github.com/CharlesGAUTHIER1999/gauthierfitness/blob/main/docs/02-deployment.md#8-server-security-hardening).

---

## Required GitHub Actions secrets

| Secret                                     | Use                                 |
|--------------------------------------------|-------------------------------------|
| `STAGING_SSH_HOST` / `PROD_SSH_HOST`       | VPS IP / hostname                   |
| `STAGING_SSH_USER` / `PROD_SSH_USER`       | SSH user (non-root)                 |
| `STAGING_SSH_PORT` / `PROD_SSH_PORT`       | Custom SSH port                     |
| `STAGING_SSH_KEY` / `PROD_SSH_KEY`         | **base64-encoded** SSH private key  |
| `GHCR_TOKEN`                               | PAT for `docker login ghcr.io`      |
| `TEST_ADMIN_EMAIL` / `TEST_ADMIN_PASSWORD` | E2E test admin account (on staging) |
| `TEST_USER_EMAIL` / `TEST_USER_PASSWORD`   | E2E test user account               |

Plus the (non-secret) **variables**: `STAGING_URL`, `PROD_URL`.

---

## Branching convention

Multi-repo, but for **this repo** the convention differs slightly from the app repos: no `GF{n}-...` feature
branches, just `develop` -> `main`.

- `develop`: ongoing iterations
- `main`: config applied in production (PR from develop)

Commits are tagged `hotfix:`, `fix:`, `chore:`, `prod:` depending on the subject.

---

## Useful links

- [Full deployment manual](https://github.com/CharlesGAUTHIER1999/gauthierfitness/blob/main/docs/02-deployment.md)
- [Upgrade manual](https://github.com/CharlesGAUTHIER1999/gauthierfitness/blob/main/docs/04-upgrade.md)
- [User guide](https://github.com/CharlesGAUTHIER1999/gauthierfitness/blob/main/docs/03-user-guide.md)
- [Detailed architecture](https://github.com/CharlesGAUTHIER1999/gauthierfitness/blob/main/docs/01-architecture.md)
- [REST API documentation](https://github.com/CharlesGAUTHIER1999/gauthierfitness/blob/main/docs/05-api.md)
- [Detailed backend repo](https://github.com/CharlesGAUTHIER1999/gauthierfitness-backend)
- [Frontend repo](https://github.com/CharlesGAUTHIER1999/gauthierfitness-frontend)
