# Tests de performance (Gatling)

Simulation de charge sur les endpoints de lecture publics (health check, liste
produits, détail produit, panier invité) — volontairement sans écriture
(pas de register/login/paiement) pour ne pas polluer un environnement partagé.

Cible : p95 des temps de réponse < 300 ms, < 1 % de requêtes en échec.

## Lancer la simulation

Nécessite un JDK 17+ (Java 11 minimum pour la compilation, mais utilisez
une version récente pour l'exécution). Le wrapper Maven (`mvnw`/`mvnw.cmd`)
télécharge Maven automatiquement, rien d'autre à installer.

```bash
# Contre le staging (recommandé pour un chiffre représentatif)
./mvnw gatling:test -Dgatling.baseUrl=https://api-staging.gauthierfitness.fr -Dusers=20 -DrampSeconds=10

# Contre un backend local
./mvnw gatling:test -Dgatling.baseUrl=http://localhost:8000 -Dusers=5 -DrampSeconds=5
```

Sur Windows : remplacez `./mvnw` par `mvnw.cmd`.

Le rapport HTML est généré dans `target/gatling/<simulation>-<timestamp>/index.html`.

## Note

Les résultats dépendent fortement de la machine/l'environnement qui exécute
le test **et** de la charge de la cible au moment du test. Pour un chiffre
qui a du sens dans la documentation RNCP, lancez-le contre le staging (ou la
prod hors heures de trafic), pas contre un poste de dev chargé.
