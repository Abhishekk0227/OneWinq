// ---------------------------------------------------------------------------
// Premium Auth & Notification Email Templates — OneWinq
// Modern, responsive HTML email design with robust inline styles & text fallbacks
// ---------------------------------------------------------------------------

const BRAND = 'OneWinq';
const SUPPORT_EMAIL = 'support@onewinq.com';
const WEBSITE_URL = process.env.APP_URL || 'https://one-winq.vercel.app';
const LOGO_URL = process.env.EMAIL_LOGO_URL || `${WEBSITE_URL}/logo-white.png`;

function baseHtml(title, bodyHtml, subtitle = 'Secure Account Notification') {
  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${title}</title>
  <style>
    /* Reset & Base Styles */
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
    body { margin: 0 !important; padding: 0 !important; width: 100% !important; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    
    /* Responsive breakpoints */
    @media screen and (max-width: 600px) {
      .email-container { width: 100% !important; margin: 0 auto !important; border-radius: 0 !important; }
      .content-padding { padding: 24px 20px !important; }
      .otp-code { font-size: 32px !important; letter-spacing: 8px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; -webkit-font-smoothing: antialiased;">
  <!-- Main Background Table -->
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f1f5f9; table-layout: fixed;">
    <tr>
      <td align="center" style="padding: 40px 10px 40px 10px;">
        <!-- Email Container Card -->
        <table border="0" cellpadding="0" cellspacing="0" width="100%" class="email-container" style="max-width: 580px; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 30px -5px rgba(15, 23, 42, 0.08); border: 1px solid #e2e8f0;">
          
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 32px 36px 28px 36px; text-align: left;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td>
                    <!-- OneWinq Brand Logo -->
                    <a href="${WEBSITE_URL}" target="_blank" style="text-decoration: none; display: inline-block;">
                      <img src="${LOGO_URL}" alt="${BRAND}" height="32" style="height: 32px; max-width: 140px; width: auto; border: 0; display: block; color: #ffffff; font-size: 22px; font-weight: 800; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; letter-spacing: -0.5px; -ms-interpolation-mode: bicubic;" />
                    </a>
                  </td>
                </tr>
                <tr>
                  <td style="padding-top: 14px; color: #94a3b8; font-size: 13px; font-weight: 500; text-transform: uppercase; letter-spacing: 1px;">
                    ${subtitle}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Gradient Accent Divider Line -->
          <tr>
            <td style="height: 4px; background: linear-gradient(90deg, #6366f1 0%, #3b82f6 50%, #06b6d4 100%); font-size: 0; line-height: 0;">&nbsp;</td>
          </tr>

          <!-- Main Content Body -->
          <tr>
            <td class="content-padding" style="padding: 36px 36px 32px 36px; color: #334155; font-size: 15px; line-height: 1.6;">
              ${bodyHtml}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 24px 36px; border-top: 1px solid #f1f5f9; color: #64748b; font-size: 12px; line-height: 1.6; text-align: center;">
              <p style="margin: 0 0 8px 0; font-weight: 500;">
                © ${new Date().getFullYear()} ${BRAND} Technologies Inc. All rights reserved.
              </p>
              <p style="margin: 0;">
                Need help or have questions? Contact us at 
                <a href="mailto:${SUPPORT_EMAIL}" style="color: #4f46e5; text-decoration: none; font-weight: 600;">${SUPPORT_EMAIL}</a>
                &nbsp;•&nbsp;
                <a href="${WEBSITE_URL}" style="color: #4f46e5; text-decoration: none; font-weight: 600;">Visit ${BRAND}</a>
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

// ---------------------------------------------------------------------------
// Email Verification OTP
// ---------------------------------------------------------------------------
export function emailVerificationTemplate({ otp, expiresMinutes, displayName }) {
  const subject = `Verify your ${BRAND} email address`;
  const name = displayName ? displayName.split(' ')[0] : 'there';

  const html = baseHtml(
    subject,
    `
    <h2 style="margin: 0 0 16px 0; color: #0f172a; font-size: 20px; font-weight: 700; letter-spacing: -0.3px;">
      Welcome to ${BRAND}, ${name}! 👋
    </h2>
    <p style="margin: 0 0 20px 0; color: #475569; font-size: 15px; line-height: 1.6;">
      Thank you for starting your account setup. Use the verification code below to confirm your email address and get started.
    </p>

    <!-- OTP Card Container -->
    <div style="background-color: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 16px; padding: 24px 16px; text-align: center; margin: 28px 0;">
      <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #64748b; margin-bottom: 8px;">
        Your One-Time Verification Code
      </div>
      <div class="otp-code" style="font-family: 'Courier New', Courier, monospace; font-size: 42px; font-weight: 800; letter-spacing: 14px; color: #4f46e5; margin: 6px 0 10px 14px;">
        ${otp}
      </div>
      <div style="display: inline-block; background-color: #e0e7ff; color: #3730a3; font-size: 12px; font-weight: 600; padding: 4px 12px; border-radius: 20px;">
        ⏱️ Valid for ${expiresMinutes} minutes
      </div>
    </div>

    <!-- Security Alert Box -->
    <div style="background-color: #fff7ed; border-left: 4px solid #f97316; border-radius: 8px; padding: 14px 16px; margin: 24px 0;">
      <table border="0" cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <td width="24" valign="top" style="padding-right: 10px; font-size: 16px;">🛡️</td>
          <td style="color: #9a3412; font-size: 13px; line-height: 1.5; font-weight: 500;">
            <strong>Security Notice:</strong> Never share this code with anyone. OneWinq employees will never ask for your verification code.
          </td>
        </tr>
      </table>
    </div>

    <p style="margin: 20px 0 0 0; color: #64748b; font-size: 13px; line-height: 1.5;">
      If you did not create a ${BRAND} account, please ignore this email or reach out to support.
    </p>
  `,
    'Email Verification'
  );

  const text = `Hi ${name},

Welcome to ${BRAND}!

Your email verification code is: ${otp}

This code expires in ${expiresMinutes} minutes.

Security Notice: Never share this code with anyone. ${BRAND} will never ask for it.

If you did not create a ${BRAND} account, you can safely ignore this email.`;

  return { subject, html, text };
}

// ---------------------------------------------------------------------------
// Password Reset OTP
// ---------------------------------------------------------------------------
export function passwordResetTemplate({ otp, expiresMinutes }) {
  const subject = `Reset your ${BRAND} account password`;

  const html = baseHtml(
    subject,
    `
    <h2 style="margin: 0 0 16px 0; color: #0f172a; font-size: 20px; font-weight: 700; letter-spacing: -0.3px;">
      Password Reset Request 🔐
    </h2>
    <p style="margin: 0 0 20px 0; color: #475569; font-size: 15px; line-height: 1.6;">
      We received a request to reset the password for your ${BRAND} account. Enter the authorization code below to reset your password.
    </p>

    <!-- OTP Card Container -->
    <div style="background-color: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 16px; padding: 24px 16px; text-align: center; margin: 28px 0;">
      <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #64748b; margin-bottom: 8px;">
        Password Reset Security Code
      </div>
      <div class="otp-code" style="font-family: 'Courier New', Courier, monospace; font-size: 42px; font-weight: 800; letter-spacing: 14px; color: #4f46e5; margin: 6px 0 10px 14px;">
        ${otp}
      </div>
      <div style="display: inline-block; background-color: #e0e7ff; color: #3730a3; font-size: 12px; font-weight: 600; padding: 4px 12px; border-radius: 20px;">
        ⏱️ Expires in ${expiresMinutes} minutes
      </div>
    </div>

    <!-- Security Warning Box -->
    <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; border-radius: 8px; padding: 14px 16px; margin: 24px 0;">
      <table border="0" cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <td width="24" valign="top" style="padding-right: 10px; font-size: 16px;">⚠️</td>
          <td style="color: #991b1b; font-size: 13px; line-height: 1.5; font-weight: 500;">
            <strong>Important:</strong> If you did not request a password reset, please change your password immediately or contact support. Your account remains secure.
          </td>
        </tr>
      </table>
    </div>
  `,
    'Password Reset Security'
  );

  const text = `You requested a password reset for your ${BRAND} account.

Your password reset code is: ${otp}

This code expires in ${expiresMinutes} minutes.

If you did not request this, please ignore this email. Your password has not been changed.`;

  return { subject, html, text };
}

// ---------------------------------------------------------------------------
// New Login Security Notification
// ---------------------------------------------------------------------------
export function newLoginNotificationTemplate({ deviceName, ipAddress, loginAt }) {
  const subject = `New login detected on your ${BRAND} account`;
  const formattedTime = new Date(loginAt).toUTCString();

  const html = baseHtml(
    subject,
    `
    <h2 style="margin: 0 0 16px 0; color: #0f172a; font-size: 20px; font-weight: 700; letter-spacing: -0.3px;">
      New Login Alert 🔔
    </h2>
    <p style="margin: 0 0 20px 0; color: #475569; font-size: 15px; line-height: 1.6;">
      We noticed a new sign-in to your ${BRAND} account. Here are the details of the session:
    </p>

    <!-- Session Details Table -->
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px 20px; margin: 24px 0;">
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="font-size: 14px; color: #334155;">
        <tr>
          <td style="padding: 8px 0; color: #64748b; font-weight: 500; width: 110px;">Device</td>
          <td style="padding: 8px 0; font-weight: 700; color: #0f172a;">${deviceName || 'Unknown Device'}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #64748b; font-weight: 500; border-top: 1px solid #e2e8f0;">IP Address</td>
          <td style="padding: 8px 0; font-weight: 700; color: #0f172a; border-top: 1px solid #e2e8f0;">${ipAddress || 'Unknown IP'}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #64748b; font-weight: 500; border-top: 1px solid #e2e8f0;">Date & Time</td>
          <td style="padding: 8px 0; font-weight: 700; color: #0f172a; border-top: 1px solid #e2e8f0;">${formattedTime}</td>
        </tr>
      </table>
    </div>

    <!-- Security Action Callout -->
    <div style="background-color: #fff7ed; border-left: 4px solid #f97316; border-radius: 8px; padding: 14px 16px; margin: 24px 0;">
      <table border="0" cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <td width="24" valign="top" style="padding-right: 10px; font-size: 16px;">🚨</td>
          <td style="color: #9a3412; font-size: 13px; line-height: 1.5; font-weight: 500;">
            If this was you, no action is needed. If you don't recognize this activity, please <a href="mailto:${SUPPORT_EMAIL}" style="color: #c2410c; text-decoration: underline; font-weight: 700;">contact support</a> immediately.
          </td>
        </tr>
      </table>
    </div>
  `,
    'Account Activity Alert'
  );

  const text = `New login detected on your ${BRAND} account.

Device: ${deviceName || 'Unknown Device'}
IP:     ${ipAddress || 'Unknown IP'}
Time:   ${formattedTime}

If this wasn't you, contact support immediately at ${SUPPORT_EMAIL}.`;

  return { subject, html, text };
}

// ---------------------------------------------------------------------------
// Password Changed Notification
// ---------------------------------------------------------------------------
export function passwordChangedTemplate({ deviceName, changedAt }) {
  const subject = `Your ${BRAND} password was updated`;
  const formattedTime = new Date(changedAt).toUTCString();

  const html = baseHtml(
    subject,
    `
    <h2 style="margin: 0 0 16px 0; color: #0f172a; font-size: 20px; font-weight: 700; letter-spacing: -0.3px;">
      Password Successfully Changed ✅
    </h2>
    <p style="margin: 0 0 20px 0; color: #475569; font-size: 15px; line-height: 1.6;">
      The password for your ${BRAND} account was updated successfully. All other active sessions have been automatically signed out for your protection.
    </p>

    <!-- Audit Details Card -->
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px 20px; margin: 24px 0;">
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="font-size: 14px; color: #334155;">
        <tr>
          <td style="padding: 8px 0; color: #64748b; font-weight: 500; width: 110px;">Device</td>
          <td style="padding: 8px 0; font-weight: 700; color: #0f172a;">${deviceName || 'Web App'}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #64748b; font-weight: 500; border-top: 1px solid #e2e8f0;">Updated At</td>
          <td style="padding: 8px 0; font-weight: 700; color: #0f172a; border-top: 1px solid #e2e8f0;">${formattedTime}</td>
        </tr>
      </table>
    </div>

    <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; border-radius: 8px; padding: 14px 16px; margin: 24px 0;">
      <table border="0" cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <td width="24" valign="top" style="padding-right: 10px; font-size: 16px;">🛑</td>
          <td style="color: #991b1b; font-size: 13px; line-height: 1.5; font-weight: 500;">
            Did not make this change? Please contact <a href="mailto:${SUPPORT_EMAIL}" style="color: #b91c1c; text-decoration: underline; font-weight: 700;">${SUPPORT_EMAIL}</a> right away.
          </td>
        </tr>
      </table>
    </div>
  `,
    'Security Settings Updated'
  );

  const text = `Your ${BRAND} password was changed.

Device: ${deviceName || 'Web App'}
Time:   ${formattedTime}

If you did not do this, contact support immediately at ${SUPPORT_EMAIL}.`;

  return { subject, html, text };
}

// ---------------------------------------------------------------------------
// Account Deletion OTP
// ---------------------------------------------------------------------------
export function accountDeletionTemplate({ otp, expiresMinutes }) {
  const subject = `Action Required: Confirm Account Deletion — ${BRAND}`;

  const html = baseHtml(
    subject,
    `
    <h2 style="margin: 0 0 16px 0; color: #dc2626; font-size: 20px; font-weight: 700; letter-spacing: -0.3px;">
      Account Deletion Confirmation ⚠️
    </h2>
    <p style="margin: 0 0 20px 0; color: #475569; font-size: 15px; line-height: 1.6;">
      We received a request to permanently delete your ${BRAND} account and all associated profile data.
    </p>

    <!-- OTP Card Container -->
    <div style="background-color: #fef2f2; border: 2px dashed #fca5a5; border-radius: 16px; padding: 24px 16px; text-align: center; margin: 28px 0;">
      <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #991b1b; margin-bottom: 8px;">
        Deletion Authorization Code
      </div>
      <div class="otp-code" style="font-family: 'Courier New', Courier, monospace; font-size: 42px; font-weight: 800; letter-spacing: 14px; color: #dc2626; margin: 6px 0 10px 14px;">
        ${otp}
      </div>
      <div style="display: inline-block; background-color: #fee2e2; color: #991b1b; font-size: 12px; font-weight: 600; padding: 4px 12px; border-radius: 20px;">
        ⏱️ Code expires in ${expiresMinutes} minutes
      </div>
    </div>

    <div style="background-color: #fff7ed; border-left: 4px solid #f97316; border-radius: 8px; padding: 14px 16px; margin: 24px 0;">
      <table border="0" cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <td width="24" valign="top" style="padding-right: 10px; font-size: 16px;">⚠️</td>
          <td style="color: #9a3412; font-size: 13px; line-height: 1.5; font-weight: 500;">
            <strong>Warning:</strong> This action is permanent and cannot be reversed. If you did not request deletion, please change your password immediately.
          </td>
        </tr>
      </table>
    </div>
  `,
    'Critical Security Action'
  );

  const text = `Account Deletion Request — ${BRAND}

Your authorization code is: ${otp}

This code expires in ${expiresMinutes} minutes.

This action is permanent and cannot be undone.`;

  return { subject, html, text };
}

// ---------------------------------------------------------------------------
// Email Change OTP (Sent to new email address)
// ---------------------------------------------------------------------------
export function emailChangeOtpTemplate({ otp, expiresMinutes }) {
  const subject = `Confirm your new email address for ${BRAND}`;

  const html = baseHtml(
    subject,
    `
    <h2 style="margin: 0 0 16px 0; color: #0f172a; font-size: 20px; font-weight: 700; letter-spacing: -0.3px;">
      Confirm New Email Address ✉️
    </h2>
    <p style="margin: 0 0 20px 0; color: #475569; font-size: 15px; line-height: 1.6;">
      We received a request to update the primary email address on your ${BRAND} account to this address.
    </p>

    <!-- OTP Card Container -->
    <div style="background-color: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 16px; padding: 24px 16px; text-align: center; margin: 28px 0;">
      <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #64748b; margin-bottom: 8px;">
        Confirmation Code
      </div>
      <div class="otp-code" style="font-family: 'Courier New', Courier, monospace; font-size: 42px; font-weight: 800; letter-spacing: 14px; color: #4f46e5; margin: 6px 0 10px 14px;">
        ${otp}
      </div>
      <div style="display: inline-block; background-color: #e0e7ff; color: #3730a3; font-size: 12px; font-weight: 600; padding: 4px 12px; border-radius: 20px;">
        ⏱️ Valid for ${expiresMinutes} minutes
      </div>
    </div>
  `,
    'Email Address Update'
  );

  const text = `Confirm your new email for ${BRAND}. Confirmation code: ${otp} (expires in ${expiresMinutes} mins).`;
  return { subject, html, text };
}

// ---------------------------------------------------------------------------
// Email Changed Alert (Sent to old email address)
// ---------------------------------------------------------------------------
export function emailChangedNotificationTemplate({ oldEmail, newEmail, changedAt }) {
  const subject = `Security Alert: Your ${BRAND} email address was changed`;
  const formattedTime = new Date(changedAt).toUTCString();

  const html = baseHtml(
    subject,
    `
    <h2 style="margin: 0 0 16px 0; color: #0f172a; font-size: 20px; font-weight: 700; letter-spacing: -0.3px;">
      Primary Email Changed 🛡️
    </h2>
    <p style="margin: 0 0 20px 0; color: #475569; font-size: 15px; line-height: 1.6;">
      The primary login email address for your ${BRAND} account was updated from <strong>${oldEmail}</strong> to <strong>${newEmail}</strong> on ${formattedTime}.
    </p>

    <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; border-radius: 8px; padding: 14px 16px; margin: 24px 0;">
      <table border="0" cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <td width="24" valign="top" style="padding-right: 10px; font-size: 16px;">🚨</td>
          <td style="color: #991b1b; font-size: 13px; line-height: 1.5; font-weight: 500;">
            <strong>Security Warning:</strong> If you did not make this change, your account may be compromised. Contact support immediately at <a href="mailto:${SUPPORT_EMAIL}" style="color: #b91c1c; text-decoration: underline; font-weight: 700;">${SUPPORT_EMAIL}</a>.
          </td>
        </tr>
      </table>
    </div>
  `,
    'Security Notification'
  );

  const text = `Your ${BRAND} login email was updated to ${newEmail} on ${formattedTime}. If you did not authorize this, contact ${SUPPORT_EMAIL} immediately.`;
  return { subject, html, text };
}
