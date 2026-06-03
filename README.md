# single-flight

Deduplicate concurrent async calls. While one call with a given key is in flight, all callers share the **same** underlying promise (single-flight). Optional short-lived (TTL) result cache. Zero dependencies.

Great for collapsing duplicate network requests — e.g. ten components asking for the same user at once should trigger **one** fetch.

- Zero dependencies, typed, ESM
- Per-key in-flight deduplication + optional `cacheMs`

## Install
```bash
npm install @suzukihayate/single-flight
```

## Usage
```js
import { singleFlight } from '@suzukihayate/single-flight';

const getUser = singleFlight(async (id) => {
  const res = await fetch(`/api/users/${id}`);
  return res.json();
});

// These three run a single fetch and all receive the same result:
const [a, b, c] = await Promise.all([getUser(1), getUser(1), getUser(1)]);

// Optionally cache resolved values for a short window:
const search = singleFlight(doSearch, { cacheMs: 2000 });

// Custom key:
const load = singleFlight(loader, { key: (opts) => opts.id });
```

## API
- `singleFlight(fn, { key?, cacheMs? })` → wrapped function
  - `key(...args)` — derive the dedup key (default `JSON.stringify(args)`)
  - `cacheMs` — also cache resolved values for this many ms (default 0)
- Wrapped function extras:
  - `.clear(key?)` — drop in-flight + cached entries (one key, or all)
  - `.inflight` — number of in-flight keys

Rejections are **not** cached, and the in-flight slot is released so the next call retries.

## Test
```bash
node --test
```

## License
MIT © 2026 Hayate Suzuki
