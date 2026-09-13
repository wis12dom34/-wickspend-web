const base = (process.env.BASE_URL || "http://127.0.0.1:3080").replace(/\/$/, "");
const invalidKey = "wick_smoke_invalid_key";
let failures = 0;

function fail(message) {
  failures += 1;
  console.error(`FAIL ${message}`);
}

function pass(message) {
  console.log(`PASS ${message}`);
}

async function request(path, options = {}) {
  const response = await fetch(`${base}${path}`, { redirect: "manual", ...options });
  const text = await response.text();
  let json = null;
  try { json = JSON.parse(text); } catch {}
  return { response, text, json };
}

async function expectStatus(path, status, options = {}) {
  const result = await request(path, options);
  if (result.response.status !== status) fail(`${options.method || "GET"} ${path}: expected ${status}, got ${result.response.status}`);
  else pass(`${options.method || "GET"} ${path}: ${status}`);
  return result;
}

for (const path of ["/reseller", "/reseller/developer", "/api/v1/docs"]) {
  await expectStatus(path, 200);
}

const specResult = await expectStatus("/api/v1/openapi.json", 200);
const requiredPaths = [
  "/numbers/orders",
  "/rentals/orders",
  "/temp-mail/services",
  "/temp-mail/orders",
  "/marketplace/orders",
  "/boostly/orders",
];
if (!specResult.json?.paths) fail("OpenAPI response has no paths object");
else {
  const missing = requiredPaths.filter((path) => !specResult.json.paths[path]);
  if (missing.length) fail(`OpenAPI missing: ${missing.join(", ")}`);
  else pass(`OpenAPI exposes required reseller paths (${specResult.json.info?.version || "unknown version"})`);
}

const invalidHeaders = { "X-API-Key": invalidKey };
for (const path of [
  "/api/v1/numbers/orders?page=1&limit=5",
  "/api/v1/rentals/orders?page=1&limit=5",
  "/api/v1/temp-mail/services",
  "/api/v1/temp-mail/orders?page=1&limit=5",
  "/api/v1/marketplace/orders?page=1&limit=5",
  "/api/v1/boostly/orders?page=1&limit=5",
]) {
  const result = await expectStatus(path, 401, { headers: invalidHeaders });
  if (result.json?.code !== "INVALID_API_KEY") fail(`${path}: expected INVALID_API_KEY`);
}

const invalidWrites = [
  ["/api/v1/numbers/buy", { country_code:"187", service_code:"wa", provider_id:"invalid", request_key:"smoke-numbers-invalid-key" }],
  ["/api/v1/rentals/buy", { country_code:"US", service_code:"wa", duration_minutes:1440, request_key:"smoke-rentals-invalid-key" }],
  ["/api/v1/temp-mail/buy", { service_code:"wa", request_key:"smoke-mail-invalid-key" }],
  ["/api/v1/temp-mail/cancel", { reference:"SMOKE-NOT-REAL" }],
  ["/api/v1/marketplace/buy", { product_id:"smoke", quantity:1, request_key:"smoke-market-invalid-key" }],
  ["/api/v1/boostly/buy", { service_id:"smoke", target_link:"https://example.com", quantity:1, request_key:"smoke-boost-invalid-key" }],
];
for (const [path, body] of invalidWrites) {
  const result = await expectStatus(path, 401, {
    method: "POST",
    headers: { ...invalidHeaders, "Content-Type":"application/json" },
    body: JSON.stringify(body),
  });
  if (result.json?.code !== "INVALID_API_KEY") fail(`${path}: expected auth rejection before mutation`);
}

if (failures) {
  console.error(`\n${failures} reseller smoke test(s) failed.`);
  process.exit(1);
}
console.log("\nAll reseller smoke tests passed.");
