import nodemailer from 'nodemailer';

/**
 * Enterprise Email Dispatcher for Delicious Biryani
 * Supports Nodemailer (Gmail / SMTP / Custom domain), Resend API, and FormSubmit fallback.
 */

// Dynamically create or retrieve SMTP transporter
function getTransporter() {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '465', 10);
  const user = process.env.SMTP_USER || process.env.GMAIL_USER || '';
  const pass = (process.env.SMTP_PASS || process.env.GMAIL_APP_PASS || '').replace(/\s+/g, '');

  if (host && user && pass) {
    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass }
    });
  }
  return null;
}

/**
 * Generate Instagram-Style Minimalist & Clean HTML Email Template
 */
export function generateOtpEmailHtml(email, otpCode) {
  // Format code with a clean center space like Instagram (e.g. "469 255")
  const formattedCode = otpCode && otpCode.length === 6 
    ? `${otpCode.slice(0, 3)} ${otpCode.slice(3)}` 
    : otpCode;
  
  const username = email ? email.split('@')[0] : 'Valued Patron';
  const cleanEmail = (email || '').trim().toLowerCase();
  const resetLink = `http://localhost:5173/auth?email=${encodeURIComponent(cleanEmail)}&otp=${encodeURIComponent(otpCode)}&action=reset`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${otpCode} is your Delicious Biryani security code</title>
</head>
<body style="margin: 0; padding: 0; background-color: #fafafa; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #fafafa; padding: 48px 16px;">
    <tr>
      <td align="center">
        <!-- Main Card (Instagram Style) -->
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 480px; background-color: #ffffff; border-radius: 16px; border: 1px solid #e5e7eb; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);">
          
          <!-- Top Accent Bar -->
          <tr>
            <td style="height: 4px; background: linear-gradient(90deg, #ec6d13 0%, #f4c430 100%);"></td>
          </tr>

          <!-- Header with Brand Emblem -->
          <tr>
            <td align="center" style="padding: 40px 36px 20px 36px;">
              <!-- Handi / Flame Logo Icon -->
              <div style="width: 56px; height: 56px; background: linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%); border-radius: 18px; border: 1px solid #fed7aa; display: inline-block; line-height: 56px; text-align: center; font-size: 26px;">
                🍲
              </div>
              <h1 style="margin: 16px 0 0 0; color: #111827; font-size: 20px; font-weight: 800; letter-spacing: -0.3px; text-transform: uppercase;">
                DELICIOUS BIRYANI
              </h1>
              <p style="margin: 4px 0 0 0; color: #9ca3af; font-size: 11px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase;">
                Account Security
              </p>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding: 0 36px;">
              <hr style="border: none; border-top: 1px solid #f3f4f6; margin: 0;">
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td style="padding: 32px 36px 36px 36px;">
              <p style="margin: 0 0 16px 0; color: #111827; font-size: 15px; font-weight: 600; line-height: 1.5;">
                Hi <span style="color: #ec6d13;">${username}</span>,
              </p>
              
              <p style="margin: 0 0 24px 0; color: #4b5563; font-size: 14px; line-height: 1.6;">
                Someone requested a password reset for your Delicious Biryani account. You can use your 6-digit verification code or tap the 1-click button below:
              </p>

              <!-- Option 1: Instagram-Style Monospace Code Box -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 20px;">
                <tr>
                  <td align="center" style="background-color: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 14px; padding: 20px 16px;">
                    <div style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 34px; font-weight: 800; color: #0f172a; letter-spacing: 8px; margin-left: 8px; text-align: center;">
                      ${formattedCode}
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Option 2: 1-Click Instant Reset Button (Combined Option A + B) -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 28px;">
                <tr>
                  <td align="center">
                    <p style="margin: 0 0 12px 0; color: #9ca3af; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">
                      — OR TAP TO RESET INSTANTLY —
                    </p>
                    <a href="${resetLink}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #ec6d13 0%, #f4c430 100%); color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; font-weight: 800; text-decoration: none; padding: 13px 26px; border-radius: 12px; box-shadow: 0 4px 15px rgba(236, 109, 19, 0.25); text-transform: uppercase; letter-spacing: 0.5px;">
                      ⚡ Reset Password in 1-Click &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Expiry & Safety Notices -->
              <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 13px; line-height: 1.5; text-align: center;">
                ⏱️ This code & link are valid for <strong>10 minutes</strong>.
              </p>

              <p style="margin: 0; color: #9ca3af; font-size: 12px; line-height: 1.5; text-align: center;">
                If you didn't request this code, you can safely ignore this email. Someone may have entered your email by mistake.
              </p>
            </td>
          </tr>

          <!-- Clean Footer (Instagram Style) -->
          <tr>
            <td style="background-color: #fafafa; border-top: 1px solid #f3f4f6; padding: 24px 36px; text-align: center;">
              <p style="margin: 0 0 4px 0; color: #6b7280; font-size: 11px; font-weight: 600;">
                from Delicious Biryani
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 11px;">
                Palava City Phase 2 & Crown Taloja • Direct Dum Kitchen
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Dispatch OTP email to recipient
 * @param {string} email 
 * @param {string} otpCode 
 * @returns {Promise<{ success: boolean, method: string }>}
 */
export async function sendOtpEmail(email, otpCode) {
  const cleanEmail = email.trim().toLowerCase();
  const htmlContent = generateOtpEmailHtml(cleanEmail, otpCode);

  // ALWAYS log clearly to server terminal for instant local testing
  console.log(`\n======================================================`);
  console.log(`🔑 [AUTH OTP DISPATCH]`);
  console.log(`   Recipient : ${cleanEmail}`);
  console.log(`   OTP Code  : >>> ${otpCode} <<<`);
  console.log(`   Valid For : 10 minutes`);
  console.log(`======================================================\n`);

  // Method 1: Resend API (Fast, pure HTML, 100% private)
  const resendApiKey = process.env.RESEND_API_KEY || '';
  if (resendApiKey) {
    try {
      const resendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: process.env.RESEND_FROM || 'Delicious Biryani Security <onboarding@resend.dev>',
          to: [cleanEmail],
          subject: `${otpCode} is your Delicious Biryani security code`,
          html: htmlContent
        })
      });

      if (resendRes.ok) {
        console.log(`[Mailer] ✅ Successfully dispatched Instagram-style email to ${cleanEmail} via Resend API`);
        return { success: true, method: 'resend' };
      } else {
        const errJson = await resendRes.json().catch(() => ({}));
        console.log('[Mailer] Resend sandbox notice (recipient restricted to owner email), transitioning to SMTP transport...');
      }
    } catch (resendErr) {
      console.warn('[Mailer] Resend dispatch attempt failed:', resendErr.message);
    }
  }

  // Method 2: Nodemailer with Gmail SMTP / Custom SMTP
  const transporter = getTransporter();
  const smtpFrom = process.env.SMTP_FROM || process.env.GMAIL_USER || '"Delicious Biryani Security" <security@deliciousbiryani.com>';

  if (transporter) {
    try {
      await transporter.sendMail({
        from: smtpFrom,
        to: cleanEmail,
        subject: `${otpCode} is your Delicious Biryani security code`,
        html: htmlContent,
        text: `Your Delicious Biryani verification code is ${otpCode}. It expires in 10 minutes.`
      });
      console.log(`[Mailer] ✅ Successfully sent Instagram-style OTP to ${cleanEmail} via SMTP`);
      return { success: true, method: 'smtp' };
    } catch (err) {
      console.error('[Mailer] SMTP dispatch failed, attempting FormSubmit fallback:', err.message);
    }
  }

  // Method 3: Server-to-Server FormSubmit Fallback
  // Notice: FormSubmit is a contact form handler; it automatically strips HTML and displays a table.
  // To get the exact Instagram HTML email, configure SMTP or Resend in .env.local!
  try {
    const fsRes = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(cleanEmail)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Origin': 'http://localhost:5173',
        'Referer': 'http://localhost:5173/'
      },
      body: JSON.stringify({
        _subject: `${otpCode} is your Delicious Biryani security code`,
        _template: 'box',
        _captcha: 'false',
        Security_Code: `${otpCode}`,
        Valid_For: '10 Minutes',
        Notice: 'Enter this 6-digit verification code to complete your password reset on Delicious Biryani. If you did not request this, you can safely ignore this message.'
      })
    });
    const result = await fsRes.json();
    console.log('[Mailer] FormSubmit server response:', result);
    return { success: true, method: 'formsubmit' };
  } catch (fsErr) {
    console.error('[Mailer] FormSubmit fallback dispatch failed:', fsErr.message);
    return { success: false, error: fsErr.message, method: 'none' };
  }
}
