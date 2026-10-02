import { useState, useEffect } from 'react';

/**
 * Universal Security Rate Limiter
 * Provides client-side and session-persistent brute force protection, 
 * credential stuffing defense, and API flood control across all authentication touchpoints.
 */

export const RATE_LIMIT_CONFIG = {
  LOGIN: {
    maxAttempts: 5,
    windowMs: 5 * 60 * 1000, // 5 minutes
    lockoutMs: 5 * 60 * 1000, // 5 minutes lockout
    actionName: 'Sign In'
  },
  SIGNUP: {
    maxAttempts: 3,
    windowMs: 10 * 60 * 1000, // 10 minutes
    lockoutMs: 10 * 60 * 1000, // 10 minutes lockout
    actionName: 'Account Registration'
  },
  GOOGLE_LOGIN: {
    maxAttempts: 5,
    windowMs: 2 * 60 * 1000, // 2 minutes
    lockoutMs: 3 * 60 * 1000, // 3 minutes lockout
    actionName: 'Google Authentication'
  },
  PASSWORD_RESET_REQUEST: {
    maxAttempts: 3,
    windowMs: 10 * 60 * 1000, // 10 minutes
    lockoutMs: 10 * 60 * 1000, // 10 minutes lockout
    actionName: 'Reset Code Request'
  },
  OTP_VERIFY: {
    maxAttempts: 5,
    windowMs: 10 * 60 * 1000, // 10 minutes
    lockoutMs: 15 * 60 * 1000, // 15 minutes lockout
    actionName: 'OTP Verification'
  },
  OLD_PASSWORD_CHANGE: {
    maxAttempts: 5,
    windowMs: 5 * 60 * 1000, // 5 minutes
    lockoutMs: 5 * 60 * 1000, // 5 minutes lockout
    actionName: 'Password Change'
  }
};

const getStorageKey = (actionKey, identifier) => {
  const safeId = (identifier || 'client').toLowerCase().trim().replace(/[^a-z0-9@._-]/g, '_');
  return `rl_${actionKey}_${safeId}`;
};

const getStoredState = (key) => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return { attempts: [], lockedUntil: null };
    return JSON.parse(raw);
  } catch (_) {
    return { attempts: [], lockedUntil: null };
  }
};

const saveState = (key, state) => {
  try {
    localStorage.setItem(key, JSON.stringify(state));
  } catch (_) {}
};

/**
 * Format seconds into a clean human readable string.
 * @param {number} seconds
 * @returns {string}
 */
export const formatTimeRemaining = (seconds) => {
  if (seconds <= 0) return '0s';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins > 0) {
    return `${mins}m ${secs < 10 ? '0' : ''}${secs}s`;
  }
  return `${secs}s`;
};

/**
 * Check if an action is currently rate limited.
 * @param {string} actionKey - One of RATE_LIMIT_CONFIG keys
 * @param {string} identifier - User email or device id
 * @returns {{allowed: boolean, remainingAttempts: number, retryAfterSeconds: number, error: string|null}}
 */
export const checkRateLimit = (actionKey, identifier = 'client') => {
  const config = RATE_LIMIT_CONFIG[actionKey] || RATE_LIMIT_CONFIG.LOGIN;
  const key = getStorageKey(actionKey, identifier);
  const now = Date.now();
  const state = getStoredState(key);

  // 1. Check if currently in a lockout
  if (state.lockedUntil) {
    if (state.lockedUntil > now) {
      const retryAfterSeconds = Math.ceil((state.lockedUntil - now) / 1000);
      return {
        allowed: false,
        remainingAttempts: 0,
        retryAfterSeconds,
        error: `Security Lockout: Too many ${config.actionName} attempts. Please wait ${formatTimeRemaining(retryAfterSeconds)} before trying again.`
      };
    } else {
      // Lockout has elapsed - reset state cleanly
      saveState(key, { attempts: [], lockedUntil: null });
      return {
        allowed: true,
        remainingAttempts: config.maxAttempts,
        retryAfterSeconds: 0,
        error: null
      };
    }
  }

  // 2. Clean expired attempts outside the active window
  const validAttempts = (state.attempts || []).filter(ts => (now - ts) < config.windowMs);

  // 3. Check if attempt threshold reached
  if (validAttempts.length >= config.maxAttempts) {
    const lockedUntil = now + config.lockoutMs;
    saveState(key, { attempts: validAttempts, lockedUntil });
    const retryAfterSeconds = Math.ceil(config.lockoutMs / 1000);
    return {
      allowed: false,
      remainingAttempts: 0,
      retryAfterSeconds,
      error: `Security Lockout: Too many ${config.actionName} attempts. Access is paused for ${formatTimeRemaining(retryAfterSeconds)}.`
    };
  }

  return {
    allowed: true,
    remainingAttempts: config.maxAttempts - validAttempts.length,
    retryAfterSeconds: 0,
    error: null
  };
};

/**
 * Record an attempt. On success, clears failures for re-auth and login.
 * On failure, registers the attempt and triggers lockouts if thresholds are crossed.
 * @param {string} actionKey
 * @param {string} identifier
 * @param {boolean} success
 */
export const recordRateLimitAttempt = (actionKey, identifier = 'client', success = false) => {
  const config = RATE_LIMIT_CONFIG[actionKey] || RATE_LIMIT_CONFIG.LOGIN;
  const key = getStorageKey(actionKey, identifier);
  const now = Date.now();

  if (success) {
    // Clear failure attempts upon successful authentication
    try {
      localStorage.removeItem(key);
    } catch (_) {}
    return;
  }

  const state = getStoredState(key);
  const validAttempts = (state.attempts || []).filter(ts => (now - ts) < config.windowMs);
  validAttempts.push(now);

  let lockedUntil = null;
  if (validAttempts.length >= config.maxAttempts) {
    lockedUntil = now + config.lockoutMs;
  }

  saveState(key, { attempts: validAttempts, lockedUntil });
};

/**
 * Asserts rate limit. Throws Error if limit is exceeded.
 * @param {string} actionKey 
 * @param {string} identifier 
 */
export const assertRateLimit = (actionKey, identifier = 'client') => {
  const check = checkRateLimit(actionKey, identifier);
  if (!check.allowed) {
    const err = new Error(check.error);
    err.code = 'RATE_LIMIT_EXCEEDED';
    err.retryAfterSeconds = check.retryAfterSeconds;
    throw err;
  }
};

/**
 * Get active remaining lockout seconds (0 if not locked).
 * @param {string} actionKey 
 * @param {string} identifier 
 * @returns {number}
 */
export const getActiveLockoutSeconds = (actionKey, identifier = 'client') => {
  const check = checkRateLimit(actionKey, identifier);
  return check.allowed ? 0 : check.retryAfterSeconds;
};

/**
 * React hook to reactively track lockout state and countdown in real time.
 * @param {string} actionKey 
 * @param {string} identifier 
 */
export const useRateLimitCountdown = (actionKey, identifier = 'client') => {
  const [secondsLeft, setSecondsLeft] = useState(() => getActiveLockoutSeconds(actionKey, identifier));

  useEffect(() => {
    const update = () => {
      const remaining = getActiveLockoutSeconds(actionKey, identifier);
      setSecondsLeft(remaining);
      return remaining;
    };

    update();
    const interval = setInterval(() => {
      const remaining = update();
      if (remaining <= 0) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [actionKey, identifier]);

  return {
    isLocked: secondsLeft > 0,
    secondsLeft,
    formatted: formatTimeRemaining(secondsLeft)
  };
};
