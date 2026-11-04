export const queryKey = params => JSON.stringify(Object.entries(params)
  .filter(([, value]) => value !== '' && value != null)
  .sort(([a], [b]) => a.localeCompare(b)));

// Only public data may use storageKey; account data stays in memory.
export function createReadCache({ ttl, storageKey, limit = 32, validate = data => data != null }) {
  let entries;
  const pending = new Map();
  let generation = 0;

  function values() {
    if (!entries) {
      try {
        const saved = storageKey && JSON.parse(sessionStorage.getItem(storageKey));
        entries = new Map(Array.isArray(saved) ? saved.filter(row =>
          Array.isArray(row) && typeof row[0] === 'string' && row[1]?.expiresAt > Date.now()
          && validate(row[1].data)).slice(-limit) : []);
      } catch { entries = new Map(); }
    }
    return entries;
  }

  function peek(key) {
    const entry = values().get(key);
    if (entry?.expiresAt > Date.now()) return entry.data;
    values().delete(key);
    return null;
  }

  function save() {
    for (const [key, entry] of values()) {
      if (entry.expiresAt <= Date.now()) entries.delete(key);
    }
    while (entries.size > limit) entries.delete(entries.keys().next().value);
    if (storageKey) {
      try { sessionStorage.setItem(storageKey, JSON.stringify([...entries])); }
      catch { /* Full or disabled storage: navigation still uses memory. */ }
    }
  }

  function load(key, fetchData, { force = false, signal } = {}) {
    if (signal?.aborted) return Promise.reject(signal.reason);
    const cached = force ? null : peek(key);
    let request = pending.get(key);
    if (cached != null) request = Promise.resolve(cached);
    else if (!request) {
      const version = generation;
      request = (async () => {
        const data = await fetchData();
        if (validate(data) && version === generation) {
          values().delete(key);
          values().set(key, { expiresAt: Date.now() + ttl, data });
          save();
        }
        return data;
      })().finally(() => {
        if (pending.get(key) === request) pending.delete(key);
      });
      pending.set(key, request);
    }
    if (!signal) return request;
    // Cancelling one consumer must not cancel a request used by another page.
    return new Promise((resolve, reject) => {
      const abort = () => reject(signal.reason);
      signal.addEventListener('abort', abort, { once: true });
      request.then(resolve, reject).finally(() => signal.removeEventListener('abort', abort));
    });
  }

  return {
    peek, load,
    clear() {
      generation++;
      values().clear();
      pending.clear();
      if (storageKey) {
        try { sessionStorage.removeItem(storageKey); } catch { /* Storage unavailable. */ }
      }
    },
  };
}
