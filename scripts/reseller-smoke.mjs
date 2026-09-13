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

async function get(path, headers = {}) {
  const response = await fetch(`${base}${path}`, { headers, redirect: "manual" });
  const text = await response.text();
  let json = null;
  try { json = JSON.parse(text); } catch {}
  return { response, text, json };
}

async function expectStatus(path, status, headers = {}) {
  const result = await get(path, headers);
  if (result.response.status !== status) fail(`${path}: expected ${status}, got ${result.response.status}`);
  else pass(`${path}: ${status}`);
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
];
if (!specResult.json?.paths) fail("OpenAPI response has no paths object");
else {
  const missing = requiredPaths.filter((path) => !specResult.json.paths[path]);
  if (missing.length) fail(`OpenAPI missing: ${missing.join(", ")}`);
  else pass(`OpenAPI exposes required reseller paths (${specResult.json.info?.version || "unknown version"})`);
}

for (const path of [
  "/api/v1/numbers/orders?page=1&limit=5",
  "/api/v1/rentals/orders?page=1&limit=5",
  "/api/v1/temp-mail/services",
  "/api/v1/temp-mail/orders?page=1&limit=5",
]) {
  const result = await expectStatus(path, 401, { "X-API-Key": invalidKey });
  if (result.json?.code !== "INVALID_API_KEY") fail(`${path}: expected INVALID_API_KEY`);
}

if (failures) {
  console.error(`\n${failures} reseller smoke test(s) failed.`);
  process.exit(1);
}
console.log("\nAll reseller smoke tests passed.");
