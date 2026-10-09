// Tiny request cache: shares one in-flight request between callers and keeps the
// result for `ttlMs` (a "staleTime"). Failed requests are never cached.
interface Entry<T> { at: number; promise: Promise<T> }
const store = new Map<string, Entry<unknown>>();

export function cachedRequest<T>(key: string, ttlMs: number, fetcher: () => Promise<T>): Promise<T> {
  const hit = store.get(key) as Entry<T> | undefined;
  if (hit && Date.now() - hit.at < ttlMs) return hit.promise;
  const promise = fetcher();
  const entry: Entry<T> = { at: Date.now(), promise };
  store.set(key, entry as Entry<unknown>);
  promise.catch(() => { if (store.get(key) === (entry as Entry<unknown>)) store.delete(key); });
  return promise;
}

/** Drop every cached entry whose key starts with `prefix` (call after a mutation). */
export function invalidateCache(prefix: string) {
  for (const k of Array.from(store.keys())) if (k.startsWith(prefix)) store.delete(k);
}
