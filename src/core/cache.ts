type CacheEntry<T> = {
  data: T;
  timestamp: number;
};

class Cache {
  private store: Map<string, CacheEntry<any>> = new Map();

  get<T>(key: string, ttlMs: number): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > ttlMs) {
      this.store.delete(key);
      return null;
    }
    return entry.data as T;
  }

  set<T>(key: string, data: T): void {
    this.store.set(key, { data, timestamp: Date.now() });
  }

  clear(): void {
    this.store.clear();
  }
}

export const cache = new Cache();
