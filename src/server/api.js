import { createOTP, getOTPRecord, verifyOTP, consumeOTP } from './otpStore.js';
import { checkServerRateLimit } from './rateLimiter.js';
import { sendOtpEmail, generateOtpEmailHtml } from './mailer.js';
import { updateUserPasswordServerSide, isFirebaseAdminAvailable } from './firebaseAdmin.js';

/**
 * Delicious Biryani Backend API Middleware
 * Handles authentication, server-side OTP lifecycle, and email dispatching.
 */

// Helper to send JSON response
function sendJson(res, statusCode, data) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(data));
}

// Helper to parse JSON request body
function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(err);
      }
    });
  });
}

/**
 * Main API middleware handler for Vite / Express
 */
export async function apiMiddleware(req, res, next) {
  const url = req.url ? req.url.split('?')[0] : '';

  // Only handle /api/* routes
  if (!url.startsWith('/api/')) {
    if (typeof next === 'function') return next();
    return;
  }

  // Health check endpoint
  if (url === '/api/health' && req.method === 'GET') {
    const adminReady = await isFirebaseAdminAvailable();
    return sendJson(res, 200, {
      status: 'ok',
      service: 'Delicious Biryani Middleware API',
      firebaseAdminReady: adminReady,
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  }

  // Live Email Template Visual Preview Endpoint
  if (url === '/api/preview/email' && req.method === 'GET') {
    const html = generateOtpEmailHtml('sarthakbagul40@gmail.com', '469255');
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(html);
    return;
  }

  // Auth: Send OTP
  if (url === '/api/auth/send-otp' && req.method === 'POST') {
    try {
      const { email } = await parseJsonBody(req);
      const cleanEmail = (email || '').trim().toLowerCase();

      if (!cleanEmail || !cleanEmail.includes('@')) {
        return sendJson(res, 400, {
          success: false,
          error: 'Please provide a valid registered email address.'
        });
      }

      // 1. Enforce Server-Side Rate Limiting
      const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
      const rateLimitCheck = checkServerRateLimit('OTP_REQUEST', `${cleanEmail}:${ip}`);
      if (!rateLimitCheck.allowed) {
        return sendJson(res, 429, {
          success: false,
          error: `Too many OTP requests. Please wait ${Math.ceil(rateLimitCheck.retryAfterSeconds / 60)} minutes before trying again.`,
          retryAfterSeconds: rateLimitCheck.retryAfterSeconds
        });
      }

      // 2. Generate cryptographically secure OTP with 10-minute auto-expiry
      const { otp, expiresAt } = createOTP(cleanEmail, 600);

      // 3. Dispatch Email via Nodemailer SMTP / Server fallback
      const dispatchResult = await sendOtpEmail(cleanEmail, otp);

      return sendJson(res, 200, {
        success: true,
        message: 'A 6-digit verification code has been dispatched to your email.',
        email: cleanEmail,
        expiresAt,
        deliveryMethod: dispatchResult.method
      });
    } catch (err) {
      console.error('[API Error /send-otp]:', err);
      return sendJson(res, 500, {
        success: false,
        error: 'Internal server error processing OTP request. Please try again.'
      });
    }
  }

  // Auth: Verify OTP
  if (url === '/api/auth/verify-otp' && req.method === 'POST') {
    try {
      const { email, otp } = await parseJsonBody(req);
      const cleanEmail = (email || '').trim().toLowerCase();
      const cleanOtp = (otp || '').trim();

      if (!cleanEmail || !cleanOtp) {
        return sendJson(res, 400, {
          success: false,
          error: 'Email and 6-digit verification code are required.'
        });
      }

      // 1. Rate Limiting on verification (prevents brute forcing)
      const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
      const rateLimitCheck = checkServerRateLimit('OTP_VERIFY', `${cleanEmail}:${ip}`);
      if (!rateLimitCheck.allowed) {
        return sendJson(res, 429, {
          success: false,
          error: `Too many verification attempts. Please wait ${Math.ceil(rateLimitCheck.retryAfterSeconds / 60)} minutes.`,
          retryAfterSeconds: rateLimitCheck.retryAfterSeconds
        });
      }

      // 2. Validate OTP
      const result = verifyOTP(cleanEmail, cleanOtp);
      if (!result.valid) {
        return sendJson(res, 400, {
          success: false,
          error: result.error,
          remainingAttempts: result.remainingAttempts
        });
      }

      return sendJson(res, 200, {
        success: true,
        message: 'Verification code verified successfully. You may now set your new password.'
      });
    } catch (err) {
      console.error('[API Error /verify-otp]:', err);
      return sendJson(res, 500, {
        success: false,
        error: 'Failed to verify code. Please try again.'
      });
    }
  }

  // Auth: Reset Password via Verified OTP
  if (url === '/api/auth/reset-password' && req.method === 'POST') {
    try {
      const { email, otp, newPassword } = await parseJsonBody(req);
      const cleanEmail = (email || '').trim().toLowerCase();
      const cleanOtp = (otp || '').trim();

      if (!cleanEmail || !newPassword || newPassword.length < 6) {
        return sendJson(res, 400, {
          success: false,
          error: 'Valid email and a password of at least 6 characters are required.'
        });
      }

      // 1. Verify OTP record from server store
      const otpRecord = getOTPRecord(cleanEmail);
      const isOtpValid = otpRecord && (otpRecord.verified || (cleanOtp && otpRecord.otp === cleanOtp));
      if (!isOtpValid) {
        return sendJson(res, 400, {
          success: false,
          error: 'Verification code has not been validated or has expired. Please enter and verify your 6-digit OTP code first.'
        });
      }

      // 2. Perform server-side password reset via Firebase Admin
      const updateRes = await updateUserPasswordServerSide(cleanEmail, newPassword);
      if (!updateRes.success) {
        if (updateRes.error === 'NO_ADMIN_CREDENTIALS') {
          return sendJson(res, 501, {
            success: false,
            code: 'NO_ADMIN_CREDENTIALS',
            error: 'Firebase Admin credentials (serviceAccountKey.json) not installed on server.'
          });
        }
        return sendJson(res, 500, {
          success: false,
          error: updateRes.message || 'Failed to update password in Firebase Authentication.'
        });
      }

      // 3. Consume OTP after successful password change
      consumeOTP(cleanEmail);

      return sendJson(res, 200, {
        success: true,
        message: 'Password has been successfully updated.'
      });
    } catch (err) {
      console.error('[API Error /reset-password]:', err);
      return sendJson(res, 500, {
        success: false,
        error: 'Internal server error processing password reset.'
      });
    }
  }

  // Auth: Invalidate/Consume OTP
  if (url === '/api/auth/consume-otp' && req.method === 'POST') {
    try {
      const { email } = await parseJsonBody(req);
      if (email) {
        consumeOTP(email);
      }
      return sendJson(res, 200, { success: true });
    } catch (err) {
      return sendJson(res, 500, { success: false });
    }
  }

  // Fallback for unknown /api routes
  return sendJson(res, 404, { error: 'API endpoint not found' });
}
