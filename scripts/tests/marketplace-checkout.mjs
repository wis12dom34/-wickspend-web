import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const source = await readFile(new URL("../../lib/marketplaceCheckout.ts", import.meta.url), "utf8");
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { prepareMarketplaceCheckout: prepare, finishMarketplaceCheckout: finish } = await import(`data:text/javascript;base64,${Buffer.from(js).toString("base64")}`);
const values = new Map();
const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
let issued = 0;
const newKey = () => `synthetic-request-${++issued}`;
const first = await prepare("synthetic-session", "161", 1, newKey, storage);
const retry = await prepare("synthetic-session", "161", 1, newKey, storage);
assert.equal(retry.requestKey, first.requestKey, "lost responses must reuse the saved reference");
assert.equal(issued, 1);
assert(!JSON.stringify([...values]).includes("synthetic-session"), "never persist the bearer token");
for (const result of [null, { ok: true, status: "processing" }, { ok: false, status: "failed" }, { ok: true, status: "fulfilled", provider_pending: true }]) {
  finish(first, result, storage);
  assert.equal((await prepare("synthetic-session", "161", 1, newKey, storage)).requestKey, first.requestKey);
}
assert.notEqual((await prepare("other-session", "161", 1, newKey, storage)).requestKey, first.requestKey);
assert.notEqual((await prepare("synthetic-session", "162", 1, newKey, storage)).requestKey, first.requestKey);
assert.notEqual((await prepare("synthetic-session", "161", 2, newKey, storage)).requestKey, first.requestKey);
finish(first, { ok: true, status: "fulfilled" }, storage);
const next = await prepare("synthetic-session", "161", 1, newKey, storage);
assert.notEqual(next.requestKey, first.requestKey, "confirmed fulfillment allows a new intentional purchase");
finish(first, { ok: true, status: "fulfilled" }, storage);
assert.equal(storage.getItem(next.storageKey), next.requestKey, "a late response cannot clear a newer attempt");
finish(next, { ok: true, refunded: true }, storage);
assert.equal(storage.getItem(next.storageKey), null);
await assert.rejects(() => prepare("synthetic-session", "161", 1, newKey, { ...storage, setItem() { throw new Error("storage unavailable"); } }), /Unable to verify this checkout/);
console.log("PASS Marketplace retry persistence, pending outcomes, session isolation, terminal outcomes, late responses, and storage failure");
