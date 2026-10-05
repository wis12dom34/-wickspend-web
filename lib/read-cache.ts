type Entry = { value: unknown; expires: number };
type Pending = { promise: Promise<unknown>; fresh: boolean };

// Completed reads are bounded. Pending reads stay separate so eviction cannot
// start duplicate requests. Identity checks keep invalidated responses out.
export class ReadCache {
  private values = new Map<string, Entry>();
  private pending = new Map<string, Pending>();

  constructor(private readonly limit = 128, private readonly now = Date.now) {}

  invalidate(matches: (key: string) => boolean) {
    for (const key of this.values.keys()) if (matches(key)) this.values.delete(key);
    for (const key of this.pending.keys()) if (matches(key)) this.pending.delete(key);
  }

  get<T>(key: string, fetcher: () => Promise<T>, ttlMs: number, fresh = false): Promise<T> {
    const now = this.now();
    for (const [cachedKey, entry] of this.values) {
      if (entry.expires <= now) this.values.delete(cachedKey);
    }
    const active = this.pending.get(key);
    if (fresh) {
      this.values.delete(key);
      if (active?.fresh) return active.promise as Promise<T>;
    } else {
      const cached = this.values.get(key);
      if (cached) {
        this.values.delete(key);
        this.values.set(key, cached);
        return Promise.resolve(cached.value as T);
      }
      if (active) return active.promise as Promise<T>;
    }
    const request: Pending = {
      fresh,
      promise: Promise.resolve().then(fetcher).then(value => {
        if (this.pending.get(key) === request && ttlMs > 0) {
          this.values.delete(key);
          this.values.set(key, { value, expires: this.now() + ttlMs });
          while (this.values.size > this.limit) {
            this.values.delete(this.values.keys().next().value!);
          }
        }
        return value;
      }).finally(() => {
        if (this.pending.get(key) === request) this.pending.delete(key);
      }),
    };
    this.pending.set(key, request);
    return request.promise as Promise<T>;
  }
}
