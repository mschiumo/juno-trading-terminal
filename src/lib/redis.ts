/**
 * Redis Client
 * Uses in-memory storage for serverless environments
 */

// Use a simple in-memory store for now since we don't have Upstash configured
const memoryStorage = new Map<string, string>();
const hashStorage = new Map<string, Map<string, string>>();

export interface RedisClient {
  get: (key: string) => Promise<string | null>;
  set: (key: string, value: string) => Promise<void>;
  del: (key: string) => Promise<void>;
  keys: (pattern: string) => Promise<string[]>;
  hGetAll: (key: string) => Promise<Record<string, string>>;
  hSet: (key: string, value: Record<string, string>) => Promise<void>;
  hgetall: (key: string) => Promise<Record<string, string>>;
  hset: (key: string, value: Record<string, string>) => Promise<void>;
}

/**
 * Get Redis client (uses in-memory storage as fallback)
 */
export function getRedisClient(): RedisClient {
  return {
    async get(key: string): Promise<string | null> {
      return memoryStorage.get(key) || null;
    },
    async set(key: string, value: string): Promise<void> {
      memoryStorage.set(key, value);
    },
    async del(key: string): Promise<void> {
      memoryStorage.delete(key);
      hashStorage.delete(key);
    },
    async keys(pattern: string): Promise<string[]> {
      const keys: string[] = [];
      const prefix = pattern.replace('*', '');
      for (const key of memoryStorage.keys()) {
        if (key.startsWith(prefix)) {
          keys.push(key);
        }
      }
      for (const key of hashStorage.keys()) {
        if (key.startsWith(prefix)) {
          keys.push(key);
        }
      }
      return keys;
    },
    async hGetAll(key: string): Promise<Record<string, string>> {
      const hash = hashStorage.get(key);
      if (!hash) return {};
      return Object.fromEntries(hash);
    },
    async hSet(key: string, value: Record<string, string>): Promise<void> {
      if (!hashStorage.has(key)) {
        hashStorage.set(key, new Map());
      }
      const hash = hashStorage.get(key)!;
      for (const [field, val] of Object.entries(value)) {
        hash.set(field, val);
      }
    },
    async hgetall(key: string): Promise<Record<string, string>> {
      return this.hGetAll(key);
    },
    async hset(key: string, value: Record<string, string>): Promise<void> {
      return this.hSet(key, value);
    },
  };
}

/**
 * Get mock Redis client (same as getRedisClient for compatibility)
 */
export function getMockRedisClient(): RedisClient {
  return getRedisClient();
}

/**
 * Get Redis client or mock if not configured
 */
export function getRedisOrMock(): RedisClient {
  return getRedisClient();
}
