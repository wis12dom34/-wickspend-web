import { readFile } from "node:fs/promises";

const backendBase = (process.env.RESELLER_BACKEND_BASE || "https://n8n.wickspend.com/webhook").replace(/\/$/, "");
let failures = 0;

function fail(message) {
  failures += 1;
  console.error(`FAIL ${message}`);
}

function pass(message) {
  console.log(`PASS ${message}`);
}

const billingSource = await readFile("app/reseller/billing/page.tsx", "utf8");
const dashboardSource = await readFile("app/reseller/ResellerClient.tsx", "utf8");
const adminResellerSource = await readFile("app/admin/resellers/page.tsx", "utf8");

for (const required of [
  'title: "1 Month"',
  'title: "6 Months"',
  'title: "1 Year"',
  'Number(basePlan.monthly_price_ngn)',
  'Number(basePlan.six_month_price_ngn)',
  'Number(basePlan.annual_price_ngn)',
  'badge: "MOST POPULAR"',
  'badge: "BEST SAVINGS"',
  'payment_method: "wallet"',
  'INSUFFICIENT_BALANCE',
  'WALLET_PAYMENT_REQUIRED',
  'WALLET_NOT_FOUND',
  'useRef<Partial<Record<BillingCycle, string>>>',
  'requestKeys.current[choice.cycle] || newRequestKey()',
  'requestKeys.current[choice.cycle] = request_key',
  'delete requestKeys.current[choice.cycle]',
  'wallet?.wallet_balance_ngn',
  'wallet?.wallet?.balance_ngn',
  'wallet?.data?.balance_ngn',
  '.sort((a, b) => subscriptionTimestamp(b) - subscriptionTimestamp(a))',
  'basePlan.monthly_enabled !== true || basePlan.six_month_enabled !== true || basePlan.annual_enabled !== true',
  'basePlan.monthly_price_ngn == null || basePlan.six_month_price_ngn == null || basePlan.annual_price_ngn == null',
  'const hadPaidSubscription = Boolean(latestSubscription) || Boolean(sub?.active);',
  'sub?.active && reseller?.plan_code',
  'const subscriptionAction = hadPaidSubscription ? "Renew Subscription" : "Subscribe";',
]) {
  if (!billingSource.includes(required)) fail(`Billing source missing ${required}`);
  else pass(`Billing source contains ${required}`);
}

for (const forbidden of [
  'const hadPaidSubscription = Boolean(reseller?.plan_code) || Boolean(latestSubscription);',
  'const subscriptionAction = hadPaidSubscription || sub?.active ? "Renew Subscription" : "Subscribe";',
]) {
  if (billingSource.includes(forbidden)) fail(`Billing source still contains stale renewal heuristic ${forbidden}`);
  else pass(`Billing source does not use stale renewal heuristic ${forbidden}`);
}

if (billingSource.includes("window.location.assign(result.checkout_url)")) {
  fail("Billing source still redirects to hosted checkout_url");
} else {
  pass("Billing source has no legacy hosted checkout redirect");
}

for (const required of [
  'monthly:"7500"',
  'sixMonth:"30000"',
  'annual:"50000"',
  'apiKeyLimit:"5"',
  'customDomainLimit:"1"',
  'monthly_enabled:true,six_month_enabled:true,annual_enabled:true',
  'features:{api_access:true,api_key_limit:Number(FIXED_RESELLER_POLICY.apiKeyLimit),custom_domain:true,custom_domain_limit:Number(FIXED_RESELLER_POLICY.customDomainLimit)}',
  "Fixed production policy: ₦7,500 monthly, ₦30,000 for 6 months and ₦50,000 yearly.",
]) {
  if (!adminResellerSource.includes(required)) fail(`Admin reseller source missing ${required}`);
  else pass(`Admin reseller source contains ${required}`);
}

for (const required of [
  "One subscription. Full reseller access.",
  "API access",
  "Mini Store",
  "Personal reseller website",
  "Admin dashboard",
  "Wallet integration",
  "Reseller subscription pricing is not fully configured yet.",
]) {
  if (!dashboardSource.includes(required)) fail(`Dashboard source missing ${required}`);
  else pass(`Dashboard source contains ${required}`);
}

async function assertUnauthorized(label, headers = {}) {
  const response = await fetch(`${backendBase}/wickspend/backend/reseller/subscription/initialize`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({
      plan_code: "reseller",
      billing_cycle: "six_months",
      request_key: `smoke-reseller-subscription-${label}`,
      payment_method: "wallet",
    }),
    redirect: "manual",
  });
  const json = await response.json().catch(() => null);
  if (response.status !== 401 || json?.code !== "UNAUTHORIZED") {
    fail(`${label} subscription initialize expected 401 UNAUTHORIZED, got ${response.status} ${JSON.stringify(json)}`);
  } else {
    pass(`${label} subscription initialize is blocked before wallet mutation`);
  }
}

await assertUnauthorized("no-session");
await assertUnauthorized("invalid-session", { Authorization: "Bearer wickspend-smoke-invalid-session" });

if (failures) {
  console.error(`\n${failures} reseller subscription smoke test(s) failed.`);
  process.exit(1);
}

console.log("\nAll reseller subscription smoke tests passed.");
