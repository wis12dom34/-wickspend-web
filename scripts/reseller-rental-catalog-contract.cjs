// Offline end-to-end contract for the Mini Store rental catalog proxy.
// Runs the actual route module with a fake upstream fetch: no provider, payment,
// wallet, database, or external network access is used.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");

const routeSource = fs.readFileSync("app/webhook/wickspend/store/[...path]/route.ts", "utf8");
const js = ts.transpileModule(routeSource, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS }
}).outputText;
const moduleForRoute = { exports: {} };
new Function("require", "module", "exports", js)(
  (name) => {
    if (name === "@/lib/number-service-names") return { NUMBER_SERVICE_NAMES: {} };
    throw new Error("Unexpected route import: " + name);
  },
  moduleForRoute,
  moduleForRoute.exports
);
const route = moduleForRoute.exports;
assert.equal(typeof route.GET, "function");

const fixture = {
  ok: true,
  services: [
    {
      service_code: "wa",
      service_name: "WhatsApp",
      countries: [{
        country_code: "US",
        country_name: "United States",
        periods: [
          { duration_minutes: 1440, duration_label: "1 day", price_ngn: 6200, is_available: true },
          { duration_minutes: 0, price_ngn: 1000, is_available: true }
        ]
      }]
    }
  ],
  countries: [{ country_code: "US", country_name: "United States" }]
};

async function simulate(status, payload, slug = "fixturestore") {
  let requests = 0;
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async (url, options = {}) => {
      requests++;
      assert.equal(url, "https://n8n.wickspend.com/webhook/wickspend/store/catalog/rentals?store_slug=" + slug);
      assert.equal(options.method, "GET");
      assert.equal(options.cache, "force-cache");
      assert.equal(options.headers.get("Authorization"), null, "public catalogs should not forward customer session");
      return new Response(JSON.stringify(payload), {
        status,
        headers: { "content-type": "application/json", "cache-control": "no-store" }
      });
    };
    const response = await route.GET(
      new Request("http://127.0.0.1:3080/webhook/wickspend/store/catalog/rentals?store_slug=" + slug, {
        headers: { Authorization: "Bearer isolated-synthetic-session" }
      }),
      { params: Promise.resolve({ path: ["catalog", "rentals"] }) }
    );
    assert.equal(requests, 1, "one mocked upstream request");
    const body = await response.json();
    return { response, body };
  } finally {
    globalThis.fetch = originalFetch;
  }
}

(async () => {
  const success = await simulate(200, fixture);
  assert.equal(success.response.status, 200);
  assert.equal(success.body.ok, true);
  assert.equal(success.body.service_count, 1);
  assert.equal(success.body.country_count, 1);
  assert.equal(success.body.services[0].service_code, "wa");
  assert.equal(success.body.services[0].country_code, "US");
  assert.deepEqual(success.body.services[0].periods, [
    { duration_minutes: 1440, duration_label: "1 day", price_ngn: 6200, is_available: true }
  ]);
  assert.equal(success.body.countries[0].country_code, "US");
  assert.equal(success.body.countries[0].flag, "🇺🇸");
  console.log("PASS Mini Store rental catalog: real proxy normalizes mocked available service/prices");

  for (const code of ["STORE_UNAVAILABLE", "STORE_NOT_FOUND"]) {
    const missing = await simulate(404, { ok: false, code });
    assert.equal(missing.response.status, 404);
    assert.deepEqual(missing.body, { ok: false, code });
    console.log("PASS Mini Store rental catalog: " + code + " fails closed without inventing availability");
  }

  const upstreamError = await simulate(503, { ok: false, code: "UNRECOGNIZED_PROVIDER_ERROR" });
  assert.equal(upstreamError.response.status, 503);
  assert.deepEqual(upstreamError.body, { ok: false, code: "RENTAL_FAILED" });
  console.log("PASS Mini Store rental catalog: unrecognized upstream error maps to safe provider failure");
  console.log("All offline rental catalog contract tests passed.");
})().catch((error) => { console.error(error); process.exitCode = 1; });
