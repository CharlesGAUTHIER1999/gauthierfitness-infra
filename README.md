# GauthierFitness - Infra

> Orchestration Docker, configurations Nginx, scripts de déploiement et tests E2E pour les environnements **staging** et
**production** de GauthierFitness.

Repo : `CharlesGAUTHIER1999/gauthierfitness-infra` &nbsp; &nbsp; Déploiements vers : `staging.gauthierfitness.fr` et
`gauthierfitness.fr`

> Documentation projet transverse (architecture, manuel utilisateur, mise à jour) : [meta-repo
`gauthierfitness/docs`](https://github.com/CharlesGAUTHIER1999/gauthierfitness/tree/main/docs)

---

## Rôle du répertoire

| Composant                      | Rôle                                                                      |
|--------------------------------|---------------------------------------------------------------------------|
| `docker-compose.yml`           | Stack complète : nginx, backend, frontend, db, redis, queue worker (base) |
| `docker-compose.staging.yml`   | Override staging (HTTPS, domaines staging)                                |
| `docker-compose.prod.yml`      | Override prod (HTTPS, domaines prod)                                      |
| `nginx/`                       | Configs Nginx : `nginx.conf` (base), `staging.conf`, `prod.conf`          |
| `scripts/`                     | `deploy-staging.sh`, `deploy-prod.sh` - exécutés via SSH sur les VPS      |
| `e2e/`                         | Tests Cypress joués contre le staging après chaque déploiement            |
| `.github/workflows/deploy.yml` | Pipeline complet : Deploy Staging -> E2E -> Deploy Prod                   |

Les images Docker du backend et du frontend sont **buildées par leurs CI respectives** (cf. `gauthierfitness-backend` et
`gauthierfitness-frontend`) et publiées sur GHCR. Ce repo ne build aucune image lui-même, il les **orchestre**.

---

## Stack

| Couche            | Technologie                                                          |
|-------------------|----------------------------------------------------------------------|
| Conteneurisation  | Docker + Docker Compose v2                                           |
| Reverse proxy     | Nginx Alpine 1.27                                                    |
| Base de données   | MySQL 8                                                              |
| Cache / Queue     | Redis 7                                                              |
| Hébergement       | 2 VPS OVH (staging + production)                                     |
| Registry          | GHCR (GitHub Container Registry)                                     |
| CI/CD             | GitHub Actions (déclenché manuellement ou via `repository_dispatch`) |
| TLS               | Let's Encrypt (Certbot, renouvellement auto)                         |
| Tests post-deploy | Cypress (Chrome)                                                     |

---

## Démarrage local (test du compose en isolation)

```bash
cp .env.example .env       # remplir les secrets
docker compose -f docker-compose.yml up -d
docker compose logs -f nginx
```

Stack accessible sur `http://localhost`. Pour le dev applicatif quotidien, mieux vaut lancer le backend et le frontend *
*hors Docker** (cf. leurs READMEs).

---

## Pipeline de déploiement

```
              +---------------------------------------------------------+
              | Trigger : workflow_dispatch (manuel) ou                 |
              |           repository_dispatch (depuis backend/frontend) |
              +-------------------------+-------------------------------+
                                        |
                                        v
              +---------------------------------------------------------+
              | JOB 1 - Deploy Staging                                  |
              |  * SCP compose + nginx -> VPS staging                   |
              |  * SSH : docker login GHCR -> pull -> migrate -> up -d  |
              |  * Re-cache config/route/view Laravel                   |
              +-------------------------+-------------------------------+
                                        |
                                        v
              +---------------------------------------------------------+
              | JOB 2 - Tests E2E Cypress                               |
              |  * Joue les specs e2e/cypress/e2e/ contre staging       |
              |  * Upload screenshots/vidéos en artifact si échec       |
              +-------------------------+-------------------------------+
                                        |
                                        v (gate manuelle ou paramètre both/prod-only)
              +---------------------------------------------------------+
              | JOB 3 - Deploy Production                               |
              |  * Idem job 1 mais sur VPS prod + docker-compose.prod   |
              |  * artisan down -> migrate -> up -d -> cache -> up      |
              +---------------------------------------------------------+
```

Workflow : [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml).

### Déclenchement manuel

GitHub UI -> onglet **Actions** -> workflow **Deploy Pipeline** -> **Run workflow** :

| Input         | Valeur typique                                                               |
|---------------|------------------------------------------------------------------------------|
| `image_tag`   | `latest` (= dernier `main`), `develop`, ou un sha court (`abc1234`)          |
| `environment` | `staging` (défaut) - `prod-only` (skip staging+e2e) - `both` (enchaîne tout) |

### Déclenchement automatique

Les CI backend et frontend, à chaque push sur `develop`, envoient un `repository_dispatch` de type `deploy-staging` vers
ce repo -> Jobs 1 + 2 enchaînés automatiquement. Pas de prod automatique.

---

## Tests E2E (Cypress)

```bash
cd e2e
npm install
BASE_URL=http://localhost npx cypress open                        # contre le compose local
BASE_URL=https://staging.gauthierfitness.fr npx cypress run        # contre staging (headless)
```

Specs disponibles dans `e2e/cypress/e2e/` : `auth.cy.js`, `admin.cy.js`, `admin-stock.cy.js`, `purchase-journey.cy.js`.
Le `package-lock.json` doit être **commité** dans `e2e/` - sans lui, le job CI plante (`setup-node` exige le lockfile
pour calculer la cache key, et `npm ci` l'exige aussi).
En cas d'échec, screenshots et vidéos sont générés dans `e2e/cypress/screenshots/` et `e2e/cypress/videos/`
(gitignorés) puis uploadés en artifact GitHub par la CI.

---

## VPS - durcissement et accès

Suite à l'incident ransomware staging de mai 2026, les deux VPS sont durcis :

- **SSH** : clé uniquement (`PasswordAuthentication no`, `PermitRootLogin no`), port non standard.
- **UFW** : seuls 22 (port custom SSH), 80 (redirect HTTPS) et 443 ouverts.
- **MySQL** : **jamais exposé** depuis l'extérieur. Accessible uniquement via le réseau Docker `gf_network`. Pour debug
  ponctuel : tunnel SSH (`ssh -L 3306:localhost:3306 ...`).
- **Backups** : dump MySQL chiffré GPG, quotidien, copie hors-VPS.

Détail : [docs/02-deployment.md § 8](https://github.com/CharlesGAUTHIER1999/gauthierfitness/blob/main/docs/02-deployment.md#8-sécurité-serveur-durcissement).

---

## Secrets GitHub Actions requis

| Secret                                     | Usage                                  |
|--------------------------------------------|----------------------------------------|
| `STAGING_SSH_HOST` / `PROD_SSH_HOST`       | IP / hostname des VPS                  |
| `STAGING_SSH_USER` / `PROD_SSH_USER`       | Utilisateur SSH (non-root)             |
| `STAGING_SSH_PORT` / `PROD_SSH_PORT`       | Port SSH custom                        |
| `STAGING_SSH_KEY` / `PROD_SSH_KEY`         | Clé privée SSH **base64-encoded**      |
| `GHCR_TOKEN`                               | PAT pour `docker login ghcr.io`        |
| `TEST_ADMIN_EMAIL` / `TEST_ADMIN_PASSWORD` | Compte admin de test E2E (sur staging) |
| `TEST_USER_EMAIL` / `TEST_USER_PASSWORD`   | Compte user de test E2E                |

Et les **variables** (non-secret) : `STAGING_URL`, `PROD_URL`.

---

## Convention de branchage

Multi-repo, mais pour **ce repo** la convention diffère légèrement des repos applicatifs : pas de branches feature
`GF{n}-...`, juste `develop` -> `main`.

- `develop` : itérations courantes
- `main` : configuration appliquée en prod (PR depuis develop)

Les commits sont étiquetés `hotfix:`, `fix:`, `chore:`, `prod:` selon le sujet.

---

## Liens utiles

- [Manuel de déploiement complet](https://github.com/CharlesGAUTHIER1999/gauthierfitness/blob/main/docs/02-deployment.md)
- [Manuel de mise à jour](https://github.com/CharlesGAUTHIER1999/gauthierfitness/blob/main/docs/04-upgrade.md)
- [Manuel d'utilisation](https://github.com/CharlesGAUTHIER1999/gauthierfitness/blob/main/docs/03-user-guide.md)
- [Architecture détaillée](https://github.com/CharlesGAUTHIER1999/gauthierfitness/blob/main/docs/01-architecture.md)
- [Documentation API Rest](https://github.com/CharlesGAUTHIER1999/gauthierfitness/blob/main/docs/05-api.md)
- [Repo backend détaillé](https://github.com/CharlesGAUTHIER1999/gauthierfitness-backend)
- [Repo frontend](https://github.com/CharlesGAUTHIER1999/gauthierfitness-frontend)
