// single-flight — Deduplicate concurrent async calls. Calls with the same key
// while one is in flight share a single underlying promise (single-flight).
// Optional short-lived result cache (TTL). Zero dependencies.

/**
 * Wrap an async function so concurrent calls with the same key share one promise.
 * @template {(...args: any[]) => Promise<any>} F
 * @param {F} fn
 * @param {{ key?: (...args: Parameters<F>) => string, cacheMs?: number }} [opts]
 *   key: derive a dedup key from args (default: JSON.stringify(args)).
 *   cacheMs: also cache resolved values for this many ms (default 0 = no cache).
 * @returns {F & { clear(key?: string): void, readonly inflight: number }}
 */
export function singleFlight(fn, opts = {}) {
  const keyOf = opts.key || ((...args) => JSON.stringify(args));
  const cacheMs = opts.cacheMs || 0;

  /** @type {Map<string, Promise<any>>} */
  const inflight = new Map();
  /** @type {Map<string, { value: any, expires: number }>} */
  const cache = new Map();

  const wrapped = function (...args) {
    const key = keyOf(...args);

    if (cacheMs > 0) {
      const hit = cache.get(key);
      if (hit && hit.expires > Date.now()) return Promise.resolve(hit.value);
    }

    const existing = inflight.get(key);
    if (existing) return existing;

    const p = Promise.resolve()
      .then(() => fn(...args))
      .then((value) => {
        if (cacheMs > 0) cache.set(key, { value, expires: Date.now() + cacheMs });
        return value;
      })
      .finally(() => { inflight.delete(key); });

    inflight.set(key, p);
    return p;
  };

  /** Clear in-flight + cached entries (a single key, or everything). */
  wrapped.clear = (key) => {
    if (key === undefined) { inflight.clear(); cache.clear(); }
    else { inflight.delete(key); cache.delete(key); }
  };

  Object.defineProperty(wrapped, 'inflight', { get: () => inflight.size });

  return /** @type {any} */ (wrapped);
}

export default singleFlight;
