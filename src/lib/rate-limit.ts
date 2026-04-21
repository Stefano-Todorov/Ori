interface Bucket {
  tokens: number
  lastRefill: number
}

export interface RateLimitConfig {
  maxTokens: number
  refillRate: number // tokens per second
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  retryAfterMs: number
}

const buckets = new Map<string, Bucket>()
let lastCleanup = Date.now()
const CLEANUP_INTERVAL_MS = 120_000

function cleanup(configs: Map<string, RateLimitConfig>) {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return
  lastCleanup = now

  for (const [key, bucket] of buckets) {
    // Remove stale entries (no activity for 2x the longest window)
    if (now - bucket.lastRefill > CLEANUP_INTERVAL_MS) {
      buckets.delete(key)
    }
  }
}

const configRegistry = new Map<string, RateLimitConfig>()

export function checkRateLimit(key: string, config: RateLimitConfig): RateLimitResult {
  configRegistry.set(key, config)
  cleanup(configRegistry)

  const now = Date.now()
  let bucket = buckets.get(key)

  if (!bucket) {
    bucket = { tokens: config.maxTokens, lastRefill: now }
    buckets.set(key, bucket)
  }

  // Refill tokens based on elapsed time
  const elapsed = (now - bucket.lastRefill) / 1000
  bucket.tokens = Math.min(config.maxTokens, bucket.tokens + elapsed * config.refillRate)
  bucket.lastRefill = now

  if (bucket.tokens >= 1) {
    bucket.tokens -= 1
    return { allowed: true, remaining: Math.floor(bucket.tokens), retryAfterMs: 0 }
  }

  // Calculate when next token will be available
  const deficit = 1 - bucket.tokens
  const retryAfterMs = Math.ceil((deficit / config.refillRate) * 1000)

  return { allowed: false, remaining: 0, retryAfterMs }
}

export const RATE_LIMITS = {
  'extension-context':        { maxTokens: 30, refillRate: 30 / 60 },
  'extension-save':           { maxTokens: 20, refillRate: 20 / 60 },
  'extension-ingest':         { maxTokens: 5,  refillRate: 5 / 60 },
  'extension-ideas':          { maxTokens: 10, refillRate: 10 / 60 },
  'extension-sync-tags':      { maxTokens: 15, refillRate: 15 / 60 },
  'extension-sync-my-videos': { maxTokens: 3,  refillRate: 3 / 60 },
  'extension-persist-thumb':  { maxTokens: 60, refillRate: 60 / 60 },
  'share-mobile':             { maxTokens: 20, refillRate: 20 / 60 },
  // AI routes — burst protection (monthly limits in usage.ts handle the cap)
  'coach':                    { maxTokens: 5,  refillRate: 5 / 60 },
  'script-generate':          { maxTokens: 5,  refillRate: 5 / 60 },
  'idea-generate':            { maxTokens: 3,  refillRate: 3 / 60 },
  'competitor-analyze':       { maxTokens: 3,  refillRate: 3 / 60 },
  'competitor-ideas':         { maxTokens: 3,  refillRate: 3 / 60 },
  'post-eval':                { maxTokens: 5,  refillRate: 5 / 60 },
  'download':                 { maxTokens: 5,  refillRate: 5 / 60 },
} as const satisfies Record<string, RateLimitConfig>

export type RateLimitKey = keyof typeof RATE_LIMITS
