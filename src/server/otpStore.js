import crypto from 'crypto';

/**
 * Server-Side In-Memory OTP Store with Auto-TTL Expiration
 * Provides high-performance, self-cleaning OTP lifecycle management.
 */

// Key: normalized email -> Value: { otp, expiresAt, attempts, verified, createdAt }
const otpStore = new Map();

// Automatic garbage collection every 2 minutes
setInterval(() => {
  const now = Date.now();
  for (const [email, record] of otpStore.entries()) {
    if (record.expiresAt < now) {
      otpStore.delete(email);
    }
  }
}, 2 * 60 * 1000);

/**
 * Generate and store a secure 6-digit OTP code for an email.
 * @param {string} email 
 * @param {number} ttlSeconds Default: 600 (10 minutes)
 * @returns {{ otp: string, expiresAt: number }}
 */
export function createOTP(email, ttlSeconds = 600) {
  const cleanEmail = email.trim().toLowerCase();
  
  // Cryptographically secure 6-digit number (100000 - 999999)
  const otp = crypto.randomInt(100000, 1000000).toString();
  const now = Date.now();
  const expiresAt = now + ttlSeconds * 1000;

  otpStore.set(cleanEmail, {
    otp,
    expiresAt,
    attempts: 0,
    verified: false,
    createdAt: now
  });

  return { otp, expiresAt };
}

/**
 * Get active OTP record for an email.
 * @param {string} email 
 * @returns {object|null}
 */
export function getOTPRecord(email) {
  const cleanEmail = email.trim().toLowerCase();
  const record = otpStore.get(cleanEmail);
  if (!record) return null;

  if (record.expiresAt < Date.now()) {
    otpStore.delete(cleanEmail);
    return null;
  }

  return record;
}

/**
 * Verify OTP entered by customer.
 * @param {string} email 
 * @param {string} inputOtp 
 * @returns {{ valid: boolean, error?: string, remainingAttempts?: number }}
 */
export function verifyOTP(email, inputOtp) {
  const cleanEmail = email.trim().toLowerCase();
  const cleanOtp = (inputOtp || '').trim();
  const record = getOTPRecord(cleanEmail);

  if (!record) {
    return { 
      valid: false, 
      error: 'Verification code has expired or was not requested. Please request a new code.' 
    };
  }

  // Prevent brute force: Max 5 attempts
  record.attempts += 1;
  const maxAttempts = 5;

  if (record.attempts > maxAttempts) {
    otpStore.delete(cleanEmail);
    return {
      valid: false,
      error: 'Too many incorrect attempts. This code has been invalidated for your security. Please request a new code.'
    };
  }

  if (record.otp !== cleanOtp) {
    const remaining = maxAttempts - record.attempts;
    return {
      valid: false,
      error: `Invalid verification code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`,
      remainingAttempts: remaining
    };
  }

  // Mark as verified
  record.verified = true;
  return { valid: true };
}

/**
 * Invalidate / consume the OTP so it can never be reused.
 * @param {string} email 
 */
export function consumeOTP(email) {
  const cleanEmail = email.trim().toLowerCase();
  otpStore.delete(cleanEmail);
}
