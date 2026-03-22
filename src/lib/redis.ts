import Redis from 'ioredis';

// In-memory store used when USE_MEMORY_STORE=true (e.g. local dev without Redis)
class MemoryStore {
  private store = new Map<string, { value: string; expiresAt: number | null }>();

  async get(key: string): Promise<string | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt !== null && Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  async set(key: string, value: string, mode?: string, ttl?: number): Promise<string> {
    const expiresAt = mode === 'EX' && ttl ? Date.now() + ttl * 1000 : null;
    this.store.set(key, { value, expiresAt });
    return 'OK';
  }

  async del(key: string): Promise<number> {
    return this.store.delete(key) ? 1 : 0;
  }

  on(_event: string, _handler: (...args: any[]) => void) { return this; }
}

let redisClient: Redis | MemoryStore;

if (process.env.USE_MEMORY_STORE === 'true' || !process.env.REDIS_URL) {
  console.log('Using in-memory store (no Redis)');
  redisClient = new MemoryStore();
} else {
  const redisUrl = process.env.REDIS_URL;
  const client = new Redis(redisUrl, {
    lazyConnect: true,
    retryStrategy: (times) => Math.min(times * 50, 2000),
  });
  client.on('error', (err) => {
    console.error('Redis connection error:', err);
  });
  redisClient = client;
}

export const redis = redisClient;
export default redis;
