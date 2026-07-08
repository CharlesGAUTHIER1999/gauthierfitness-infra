# Changelog

Toutes les évolutions notables de l'infrastructure GauthierFitness sont documentées ici.

Format inspiré de [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/).

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
