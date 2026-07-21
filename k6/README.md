# Performance tests (k6)

Load on the same public read endpoints as the old Gatling simulation
(health check, product list, product detail, guest cart) - deliberately
no writes (no register/login/payment) to avoid polluting a shared
environment.

Target: p95 response time < 300 ms, < 1% failed requests.

Replaces `infra/gatling`: Gatling measurements (JVM/Netty client) were
noisy due to engine startup

## Running the test

Requires [k6](https://k6.io/) installed (`winget install k6` on Windows).

```bash
# Against staging
k6 run infra/k6/api-load-test.js

# Against local backend
BASE_URL=http://localhost:8000 k6 run infra/k6/api-load-test.js
```

On PowerShell, set the environment variable separately:

```powershell
$env:BASE_URL = "https://api-staging.gauthierfitness.fr"
k6 run infra/k6/api-load-test.js
```

## Note

Results depend on the target's load at the time of the test. For a
figure that makes sense in the RNCP documentation, run it against
staging (or production outside traffic hours), not against a loaded
dev machine.
