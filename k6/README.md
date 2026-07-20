# Tests de performance (k6)

Charge sur les mêmes endpoints de lecture publics que l'ancienne simulation
Gatling (health check, liste produits, détail produit, panier invité) -
volontairement sans écriture (pas de register/login/paiement) pour ne pas
polluer un environnement partagé.

Cible : p95 des temps de réponse < 300 ms, < 1 % de requêtes en échec.

Remplace `infra/gatling` : les mesures Gatling (client JVM/Netty) étaient
bruitées par le démarrage du moteur et non représentatives de la performance
réelle du serveur. k6, sans JVM, donne une mesure fiable - confirmé en
croisant les deux sur le même run (voir historique du projet).

## Lancer le test

Nécessite [k6](https://k6.io/) installé (`winget install k6` sous Windows).

```bash
# Contre le staging (chiffre représentatif)
k6 run infra/k6/api-load-test.js

# Contre un backend local
BASE_URL=http://localhost:8000 k6 run infra/k6/api-load-test.js
```

Sous PowerShell, définir la variable d'environnement séparément :

```powershell
$env:BASE_URL = "https://api-staging.gauthierfitness.fr"
k6 run infra/k6/api-load-test.js
```

## Note
Les résultats dépendent de la charge de la cible au moment du test. Pour un
chiffre qui a du sens dans la documentation RNCP, lancez-le contre le staging
(ou la prod hors heures de trafic), pas contre un poste de dev chargé.
