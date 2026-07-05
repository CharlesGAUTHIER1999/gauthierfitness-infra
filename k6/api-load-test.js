import http from 'k6/http';
import { check, sleep } from 'k6';

// Cross-check of ApiLoadSimulation.java (Gatling) against the same read-heavy
// storefront journey (health, catalogue, guest cart), run with a client that
// has near-zero JVM/Netty startup overhead. Same targets, same p95<300ms bar.
const BASE_URL = __ENV.BASE_URL || 'https://api-staging.gauthierfitness.fr';

export const options = {
    stages: [
        { duration: '10s', target: 20 },
        { duration: '20s', target: 20 },
    ],
    thresholds: {
        http_req_duration: ['p(95)<300'],
        http_req_failed: ['rate<0.01'],
    },
};

const params = {
    headers: {
        Accept: 'application/json',
        'X-Guest-Cart-Token': 'k6-load-test',
    },
};

export default function () {
    let res = http.get(`${BASE_URL}/api/health`, params);
    check(res, { 'health check status is 200': (r) => r.status === 200 });
    sleep(1);

    res = http.get(`${BASE_URL}/api/products?per_page=20`, params);
    check(res, { 'products list status is 200': (r) => r.status === 200 });
    const slug = res.json('data.0.slug');
    sleep(1);

    if (slug) {
        res = http.get(`${BASE_URL}/api/products/${slug}`, params);
        check(res, { 'product detail status is 200': (r) => r.status === 200 });
    }
    sleep(1);

    res = http.get(`${BASE_URL}/api/cart`, params);
    check(res, { 'cart status is 200': (r) => r.status === 200 });
    sleep(1);
}
