# WickSpend capacity work

This change reduces frontend request amplification. It does not certify whole-system capacity or change backend transaction safety. Production remains on the existing VPS. The existing Mini Store and payment systems are retained.

## Implemented

- Navigation warmup prefetches contextual routes once per mounted session, only while visible and online. It no longer fetches wallet, orders and notifications independently of their screens.
- Public and private browser caches each retain at most 128 completed reads. Expired entries are removed on subsequent access; frequently accessed entries are retained before less recently used entries. Server reads bypass these caches.
- Exact in-memory session identities replace the collision-prone 32-bit private cache key. Keys are not persisted or logged.
- Concurrent fresh refreshes share one fresh request. Invalidated or superseded responses cannot overwrite current cache contents. In-flight identities replace the previously unbounded invalidation generation map.
- Filtered/paginated order lists are invalidated alongside the base list after successful wallet mutations.
- Number, rental, Boostly and Temp Mail status reads share overlapping requests without caching the returned status. Mutations remain independent POST requests with their existing request keys, timeout and error semantics. This cache does not implement backend idempotency or retry purchases.

## Validation

Run from the repository root:

```
node --test scripts/read-load-regression.cjs
npm run typecheck
npm run build
```

To measure an isolated production build, start it on loopback port 3097 and run:

```
node scripts/frontend-capacity.mjs
```

The harness permits only loopback URLs and refuses the production service port 3080. It makes 240 unauthenticated frontend GETs with 12 concurrent workers and consumes their response bodies. It does not execute browser JavaScript, call authenticated APIs, create orders or debit wallets.

On the development environment, the initial warm run completed with zero errors, 152 requests/second and 245 ms p95. This brief static HTML measurement is not an orders/second or users capacity estimate. It excludes backend work, browser assets, database contention, provider latency and a sustained soak test.

Nine mocked regressions cover concurrent reads, expiry/LRU eviction, failed-read retry, fresh-read supersession, invalidation races, a legacy session-hash collision, successful mutation invalidation, status coalescing, unchanged insufficient/pending error handling and navigation visibility. CI also retains the existing reseller database regression and build checks.

## Whole-system work still required

The October 5 inspection found a shared VPS with four CPUs and about 8 GiB RAM. WickSpend's frontend service has a 1 GiB memory limit and one CPU quota; other applications share the host. The inspection did not establish CPU saturation, so increasing limits without a measured workload is not justified.

The connected workflow definitions belong to the existing WickSpend n8n backend. A sample of 200 recent Marketplace executions had 339 ms median, 943 ms p95 and a 24,418 ms maximum. These execution durations exclude client/network latency, represent mixed workflow triggers and are not a controlled capacity test. No execution samples were returned for the selected wallet and unified orders workflows, so their capacity remains unknown.

Before claiming whole-website scale:

1. Obtain read-only operational metrics for the actual WickSpend backend host and database: execution concurrency/queue delay, CPU/RAM, connection saturation, slow queries, lock waits, database size and execution-data retention. The connected frontend VPS and workflow definitions alone do not expose these metrics.
2. Capture plans and index usage for session validation, wallet lookups, paginated unified orders and transaction history against representative non-production data. Add only demonstrated missing indexes to existing tables, then compare plans and write overhead. Do not infer table scans solely from SQL text.
3. Use an isolated backend/database with synthetic accounts and stubbed providers. Measure sustained authenticated reads and synthetic order lifecycle traffic, including pending provider outcomes, retries, same-key concurrent requests, renewal boundaries and insufficient funds. Verify exactly-once debit/activation, refund correctness and ledger consistency after the run.
4. Define the required sustained and burst traffic, latency/error targets and recovery behavior. Choose worker/process capacity and database connection budgets from those measurements, accounting for shared-host applications. Verify queue/worker compatibility before changing the current n8n deployment mode.
5. Move remaining background polling to visibility-aware, serialized schedules where measurements justify it. Status request coalescing in this change prevents overlap, but does not stop every hidden-tab timer.
6. Release on the VPS with rollback/health checks and monitoring. Preserve production-only reconciliation changes and the existing dirty Mini Store landing file; do not reset production to GitHub main or deploy to Vercel.

No live-wallet QA or production stress test is part of this change. Production backend/database infrastructure changes are pending access and validation, rather than silently assumed complete.
