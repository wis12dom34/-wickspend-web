type CacheEntry<T> = {
  value?: T;
  fetchedAt?: number;
  inflight?: Promise<T>;
};

export type CatalogCacheState = "HIT" | "MISS" | "STALE";

const globalCatalogCache = globalThis as typeof globalThis & {
  __wickspendCatalogCache?: Map<string, CacheEntry<unknown>>;
};

const store = globalCatalogCache.__wickspendCatalogCache ??= new Map();

export async function getCatalogCached<T>(
  key: string,
  fetcher: () => Promise<T>,
  freshMs = 90_000,
  staleMs = 300_000,
): Promise<{ value: T; state: CatalogCacheState; ageMs: number }> {
  const now = Date.now();
  const entry = (store.get(key) ?? {}) as CacheEntry<T>;
  const ageMs = entry.fetchedAt ? now - entry.fetchedAt : Number.POSITIVE_INFINITY;

  if (entry.value !== undefined && ageMs < freshMs) {
    return { value: entry.value, state: "HIT", ageMs };
  }

  const refresh = () => {
    if (entry.inflight) return entry.inflight;
    const promise = fetcher()
      .then((value) => {
        store.set(key, { value, fetchedAt: Date.now() });
        return value;
      })
      .finally(() => {
        const current = store.get(key) as CacheEntry<T> | undefined;
        if (current?.inflight === promise) current.inflight = undefined;
      });
    entry.inflight = promise;
    store.set(key, entry as CacheEntry<unknown>);
    return promise;
  };

  if (entry.value !== undefined && ageMs < staleMs) {
    void refresh().catch(() => undefined);
    return { value: entry.value, state: "STALE", ageMs };
  }

  const value = await refresh();
  return { value, state: "MISS", ageMs: 0 };
}
