# Changelog

Toutes les évolutions notables de l'infrastructure GauthierFitness sont documentées ici.

Format inspiré de [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/).

## [v1.1.2] - 2026-07-13

### Fixed
- `deploy.yml` : le déploiement staging/prod échouait (`ssh: unable to authenticate`) après la mise à jour groupée des actions GitHub — `appleboy/scp-action` était passé de v0.1.7 à v1.0.0 (bump majeur caché dans le groupe), rendant invalide le chemin codé en dur `/github/runner_temp/{staging,prod}_key` utilisé pour la clé SSH. Remplacé par `${{ runner.temp }}/{staging,prod}_key`, cohérent avec ce qu'utilisait déjà l'étape `appleboy/ssh-action` voisine. Vérifié par un déploiement staging réel + suite E2E Cypress complète, les deux au vert.

## [v1.1.1] - 2026-07-13

### Fixed
- `security-scan.yml` : permission `issues: write` manquante empêchait `zaproxy/action-baseline` de consigner ses résultats sur GitHub Issues, faisant échouer le job même quand le scan lui-même ne relevait aucune faille bloquante (`FAIL-NEW: 0`). Vérifié en conditions réelles : le scan tourne désormais au vert et l'issue est bien créée.

### Changed
- Mise à jour des actions GitHub utilisées en CI/CD groupées par Dependabot (7 mises à jour).

## [v1.1.0] - 2026-07-12

### Added
- Sauvegarde quotidienne chiffrée de la base MySQL (`scripts/backup-db.sh`, GPG) et script de test de restauration mensuel (`scripts/restore-db-test.sh`).

### Changed
- `deploy.yml` synchronise désormais `backup-db.sh` sur le VPS à chaque déploiement.
- Commentaires et scripts infra traduits en anglais (`.gitignore`, `.env.*.example`, configs Nginx, scripts de backup/restauration).

### Fixed
- `restore-db-test.sh` : évite une race condition avec le redémarrage interne de MySQL au premier lancement (exige deux pings positifs consécutifs).

## [v1.0.1] - 2026-07-10

### Fixed
- CSP : ajout de `wasm-unsafe-eval` et `blob:` pour débloquer le configurateur 3D (page blanche en production, voir Fiche d'incident 8).
- Nginx : `fastcgi_read_timeout` relevé à 200s pour aligner le proxy sur le timeout réel de la génération IA (voir Fiche d'incident 9).

## [v1.0.0] - 2026-07-08

Première release taguée de l'infra. Pipeline de déploiement continu complet pour le staging et la production sur
2 VPS OVH (Docker, Nginx, Let's Encrypt), avec suite de tests E2E, scan de sécurité et supervision.

### Added
- Pipeline CI/CD (GitHub Actions), orchestration Docker (`docker-compose.yml` / `.staging.yml` / `.prod.yml`).
- Suite de tests E2E Cypress, incluant le parcours d'achat complet.
- Scan de sécurité OWASP ZAP et tests de charge Gatling.
- Supervision uptime de la production.
- Dependabot (GitHub Actions, npm E2E).

### Changed
- Nginx : configuration HTTPS (Let's Encrypt) pour le front et le sous-domaine API, en staging et en production.
- Déploiement prod : option de déploiement ciblé (prod-only), correctifs SCP/SSH (clé au format base64, permissions,
  chemin runner) pour fiabiliser la connexion aux VPS.

### Security
- Fermeture du port MySQL exposé sur le VPS suite à l'incident ransomware de staging (mai 2026) : durcissement des
  2 VPS (SSH clé uniquement, ufw, DB non exposée publiquement).

### Fixed
- Alias de stockage Nginx, routage Sanctum, variable `DB_HOST`, étape SCP du déploiement.
