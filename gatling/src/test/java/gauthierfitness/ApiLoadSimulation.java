package gauthierfitness;

import static io.gatling.javaapi.core.CoreDsl.*;
import static io.gatling.javaapi.http.HttpDsl.*;

import io.gatling.javaapi.core.*;
import io.gatling.javaapi.http.*;

// Load test targeting the read-heavy public endpoints of the storefront
// (health check, product listing, product detail, guest cart). These are
// side-effect-free on purpose: no register/login/payment spam against a
// shared environment. Run with: mvnw.cmd gatling:test -Dgatling.baseUrl=... -Dusers=...
public class ApiLoadSimulation extends Simulation {

    private static final String baseUrl = System.getProperty("gatling.baseUrl", "http://localhost:8000");
    private static final int users = Integer.getInteger("users", 20);
    private static final int rampSeconds = Integer.getInteger("rampSeconds", 10);

    private static final HttpProtocolBuilder httpProtocol = http.baseUrl(baseUrl)
            .acceptHeader("application/json")
            .header("X-Guest-Cart-Token", "gatling-load-test");

    private static final ScenarioBuilder scenario = scenario("Parcours de lecture (health, catalogue, panier)")
            .exec(
                    http("Health check")
                            .get("/api/health")
                            .check(status().is(200))
            )
            .pause(1)
            .exec(
                    http("Liste des produits")
                            .get("/api/products?per_page=20")
                            .check(status().is(200))
                            .check(jsonPath("$.data[0].slug").saveAs("productSlug"))
            )
            .pause(1)
            .exec(
                    http("Détail produit")
                            .get("/api/products/#{productSlug}")
                            .check(status().is(200))
            )
            .pause(1)
            .exec(
                    http("Panier invité")
                            .get("/api/cart")
                            .check(status().is(200))
            );

    // Response time target: p95 under 300ms, no failed requests (per the C.1.5
    // test strategy: "Temps de réponse < 300 ms").
    private static final Assertion[] assertions = {
            global().responseTime().percentile(95).lt(300),
            global().failedRequests().percent().lt(1.0)
    };

    {
        setUp(scenario.injectOpen(rampUsers(users).during(rampSeconds)))
                .assertions(assertions)
                .protocols(httpProtocol);
    }
}
