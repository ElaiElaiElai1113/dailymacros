type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

const memoryCache = new Map<string, CacheEntry<unknown>>();

export function getCache<T>(key: string): T | null {
  const now = Date.now();
  const mem = memoryCache.get(key) as CacheEntry<T> | undefined;
  if (mem && mem.expiresAt > now) {
    return mem.value;
  }

  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEntry<T>;
    if (parsed.expiresAt > now) {
      memoryCache.set(key, parsed);
      return parsed.value;
    }
    sessionStorage.removeItem(key);
  } catch {
    // ignore cache errors
  }
  return null;
}

export function setCache<T>(key: string, value: T, ttlMs: number) {
  const entry: CacheEntry<T> = {
    value,
    expiresAt: Date.now() + ttlMs,
  };
  memoryCache.set(key, entry);
  try {
    sessionStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // ignore cache errors
  }
}
