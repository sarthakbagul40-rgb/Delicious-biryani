/**
 * Server-Side Rate Limiter
 * Enforces un-bypassable request limits on IP addresses and email accounts.
 */

const limits = new Map();

// Rules: [maxRequests, windowSeconds]
const RULES = {
  OTP_REQUEST: { maxRequests: 3, windowSeconds: 600 },  // 3 OTP requests in 10 mins
  OTP_VERIFY: { maxRequests: 5, windowSeconds: 900 },   // 5 verify attempts in 15 mins
  GLOBAL_API: { maxRequests: 60, windowSeconds: 60 }    // 60 requests per minute
};

// Cleanup stale rate limit records every 5 minutes (unref prevents blocking process exit)
const cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [key, record] of limits.entries()) {
    if (record.resetAt < now) {
      limits.delete(key);
    }
  }
}, 5 * 60 * 1000);
if (cleanupTimer.unref) cleanupTimer.unref();

/**
 * Check and record a rate limit attempt.
 * @param {'OTP_REQUEST'|'OTP_VERIFY'|'GLOBAL_API'} ruleName 
 * @param {string} identifier (IP address or email)
 * @returns {{ allowed: boolean, remaining: number, retryAfterSeconds: number }}
 */
export function checkServerRateLimit(ruleName, identifier) {
  const rule = RULES[ruleName] || RULES.GLOBAL_API;
  const key = `${ruleName}:${(identifier || 'unknown').toLowerCase().trim()}`;
  const now = Date.now();

  let record = limits.get(key);

  if (!record || record.resetAt <= now) {
    record = {
      count: 1,
      resetAt: now + rule.windowSeconds * 1000
    };
    limits.set(key, record);
    return {
      allowed: true,
      remaining: rule.maxRequests - 1,
      retryAfterSeconds: 0
    };
  }

  if (record.count >= rule.maxRequests) {
    const retryAfterSeconds = Math.ceil((record.resetAt - now) / 1000);
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, retryAfterSeconds)
    };
  }

  record.count += 1;
  return {
    allowed: true,
    remaining: rule.maxRequests - record.count,
    retryAfterSeconds: 0
  };
}
