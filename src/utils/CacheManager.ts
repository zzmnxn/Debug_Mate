const cache = new Map<string, string>();
const MAX_CACHE_SIZE = 100;
const MAX_CACHE_VALUE_SIZE = 10000;

export function cacheGet(key: string) { return cache.get(key); }
export function cacheSet(key: string, value: string) {
  if (value.length > MAX_CACHE_VALUE_SIZE) return;
  if (cache.size >= MAX_CACHE_SIZE) cache.delete(cache.keys().next().value);
  cache.set(key, value);
}
