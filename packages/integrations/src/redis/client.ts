import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';

type Shim = {
  get<T>(k: string): Promise<T | null>;
  set(k: string, v: unknown, opts?: { ex?: number }): Promise<'OK'>;
  del(k: string): Promise<number>;
  incr(k: string): Promise<number>;
  expire(k: string, s: number): Promise<number>;
};

function memoryShim(): Shim {
  const store = new Map<string, { v: any; exp?: number }>();
  const alive = (k: string) => {
    const e = store.get(k);
    if (!e) return null;
    if (e.exp && Date.now() > e.exp) {
      store.delete(k);
      return null;
    }
    return e;
  };
  return {
    async get<T>(k: string) { return (alive(k)?.v ?? null) as T | null; },
    async set(k, v, opts) {
      store.set(k, { v, exp: opts?.ex ? Date.now() + opts.ex * 1000 : undefined });
      return 'OK';
    },
    async del(k) { return store.delete(k) ? 1 : 0; },
    async incr(k) {
      const e = alive(k);
      const next = (e?.v ?? 0) + 1;
      store.set(k, { v: next, exp: e?.exp });
      return next;
    },
    async expire(k, s) {
      const e = alive(k);
      if (!e) return 0;
      store.set(k, { v: e.v, exp: Date.now() + s * 1000 });
      return 1;
    },
  };
}

let _redis: Redis | Shim | null = null;
export function redis(): Redis | Shim {
  if (_redis) return _redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    if (typeof window === 'undefined') {
      console.warn('[homeease] Upstash Redis env missing — using in-memory shim');
    }
    _redis = memoryShim();
  } else {
    _redis = new Redis({ url, token });
  }
  return _redis;
}

let _otpLimit: Ratelimit | null = null;
export function otpRateLimit() {
  const r = redis();
  if (!(r instanceof Redis)) return null;
  _otpLimit ??= new Ratelimit({
    redis: r,
    limiter: Ratelimit.slidingWindow(5, '15 m'),
    prefix: 'rl:otp',
  });
  return _otpLimit;
}
