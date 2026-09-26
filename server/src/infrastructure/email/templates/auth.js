// ---------------------------------------------------------------------------
// Auth email templates.
// Returns both HTML and plain-text versions for each email type.
// OTP values are passed in — never hardcoded or logged here.
// ---------------------------------------------------------------------------

const BRAND = 'OneWinq';
const SUPPORT_EMAIL = 'support@onewinq.com';

function baseHtml(title, bodyHtml) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f5f5; margin: 0; padding: 0; }
    .wrapper { max-width: 560px; margin: 40px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .header { background: #0f172a; padding: 28px 32px; }
    .header h1 { color: #ffffff; margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.5px; }
    .body { padding: 32px; color: #1e293b; }
    .otp-box { background: #f1f5f9; border-radius: 10px; padding: 20px; text-align: center; margin: 24px 0; }
    .otp-code { font-size: 40px; font-weight: 800; letter-spacing: 12px; color: #0f172a; font-family: monospace; }
    .otp-expiry { font-size: 13px; color: #64748b; margin-top: 8px; }
    .warning { background: #fff7ed; border-left: 4px solid #f97316; padding: 14px 16px; border-radius: 4px; margin: 20px 0; font-size: 14px; color: #9a3412; }
    .footer { padding: 20px 32px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; }
    p { line-height: 1.7; margin: 0 0 16px; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header"><h1>${BRAND}</h1></div>
    <div class="body">${bodyHtml}</div>
    <div class="footer">
      © ${new Date().getFullYear()} ${BRAND}. If you need help, contact us at <a href="mailto:${SUPPORT_EMAIL}" style="color:#64748b">${SUPPORT_EMAIL}</a>.
    </div>
  </div>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Email verification OTP
// ---------------------------------------------------------------------------
export function emailVerificationTemplate({ otp, expiresMinutes, displayName }) {
  const subject = `Verify your ${BRAND} email address`;

  const html = baseHtml(subject, `
    <p>Hi ${displayName || 'there'},</p>
    <p>Welcome to ${BRAND}! Use the code below to verify your email address.</p>
    <div class="otp-box">
      <div class="otp-code">${otp}</div>
      <div class="otp-expiry">Expires in ${expiresMinutes} minutes</div>
    </div>
    <div class="warning">
      Never share this code with anyone. ${BRAND} will never ask for it.
    </div>
    <p>If you did not create a ${BRAND} account, you can safely ignore this email.</p>
  `);

  const text = `Hi ${displayName || 'there'},

Welcome to ${BRAND}!

Your email verification code is: ${otp}

This code expires in ${expiresMinutes} minutes.

Never share this code with anyone. ${BRAND} will never ask for it.

If you did not create a ${BRAND} account, you can safely ignore this email.`;

  return { subject, html, text };
}

// ---------------------------------------------------------------------------
// Password reset OTP
// ---------------------------------------------------------------------------
export function passwordResetTemplate({ otp, expiresMinutes }) {
  const subject = `Reset your ${BRAND} password`;

  const html = baseHtml(subject, `
    <p>We received a request to reset the password on your ${BRAND} account.</p>
    <p>Use the code below to complete the password reset.</p>
    <div class="otp-box">
      <div class="otp-code">${otp}</div>
      <div class="otp-expiry">Expires in ${expiresMinutes} minutes</div>
    </div>
    <div class="warning">
      Never share this code with anyone. ${BRAND} will never ask for it.
    </div>
    <p>If you did not request a password reset, please ignore this email. Your password has not been changed.</p>
  `);

  const text = `You requested a password reset for your ${BRAND} account.

Your password reset code is: ${otp}

This code expires in ${expiresMinutes} minutes.

Never share this code with anyone.

If you did not request this, please ignore this email.`;

  return { subject, html, text };
}

// ---------------------------------------------------------------------------
// New login security notification
// ---------------------------------------------------------------------------
export function newLoginNotificationTemplate({ deviceName, ipAddress, loginAt }) {
  const subject = `New login to your ${BRAND} account`;
  const formattedTime = new Date(loginAt).toUTCString();

  const html = baseHtml(subject, `
    <p>We noticed a new login to your ${BRAND} account.</p>
    <table style="width:100%; border-collapse:collapse; margin:20px 0; font-size:14px;">
      <tr><td style="padding:8px 0; color:#64748b; width:120px;">Device</td><td style="padding:8px 0; font-weight:600;">${deviceName}</td></tr>
      <tr><td style="padding:8px 0; color:#64748b;">IP Address</td><td style="padding:8px 0; font-weight:600;">${ipAddress}</td></tr>
      <tr><td style="padding:8px 0; color:#64748b;">Time</td><td style="padding:8px 0; font-weight:600;">${formattedTime}</td></tr>
    </table>
    <div class="warning">
      If this wasn't you, please <a href="mailto:${SUPPORT_EMAIL}" style="color:#9a3412">contact support</a> immediately and change your password.
    </div>
  `);

  const text = `New login to your ${BRAND} account.

Device: ${deviceName}
IP:     ${ipAddress}
Time:   ${formattedTime}

If this wasn't you, contact support immediately and change your password.`;

  return { subject, html, text };
}

// ---------------------------------------------------------------------------
// Password changed notification
// ---------------------------------------------------------------------------
export function passwordChangedTemplate({ deviceName, changedAt }) {
  const subject = `Your ${BRAND} password was changed`;
  const formattedTime = new Date(changedAt).toUTCString();

  const html = baseHtml(subject, `
    <p>Your ${BRAND} password was successfully changed.</p>
    <table style="width:100%; border-collapse:collapse; margin:20px 0; font-size:14px;">
      <tr><td style="padding:8px 0; color:#64748b; width:120px;">Device</td><td style="padding:8px 0; font-weight:600;">${deviceName}</td></tr>
      <tr><td style="padding:8px 0; color:#64748b;">Time</td><td style="padding:8px 0; font-weight:600;">${formattedTime}</td></tr>
    </table>
    <div class="warning">
      If you did not change your password, please <a href="mailto:${SUPPORT_EMAIL}" style="color:#9a3412">contact support</a> immediately.
    </div>
    <p>All other sessions have been signed out for your security.</p>
  `);

  const text = `Your ${BRAND} password was changed.

Device: ${deviceName}
Time:   ${formattedTime}

If you did not do this, contact support immediately.
All other sessions have been signed out.`;

  return { subject, html, text };
}

// ---------------------------------------------------------------------------
// Account deletion OTP
// ---------------------------------------------------------------------------
export function accountDeletionTemplate({ otp, expiresMinutes }) {
  const subject = `Confirm account deletion — ${BRAND}`;

  const html = baseHtml(subject, `
    <p>We received a request to permanently delete your ${BRAND} account.</p>
    <p>Use the code below to confirm this action. <strong>This cannot be undone.</strong></p>
    <div class="otp-box">
      <div class="otp-code">${otp}</div>
      <div class="otp-expiry">Expires in ${expiresMinutes} minutes</div>
    </div>
    <div class="warning">
      If you did not request account deletion, change your password immediately and contact support.
    </div>
  `);

  const text = `Account deletion confirmation — ${BRAND}

Your account deletion code is: ${otp}

This code expires in ${expiresMinutes} minutes.

This action is permanent and cannot be undone.

If you did not request this, change your password immediately.`;

  return { subject, html, text };
}

// ---------------------------------------------------------------------------
// Email change OTP (sent to new email)
// ---------------------------------------------------------------------------
export function emailChangeOtpTemplate({ otp, expiresMinutes }) {
  const subject = `Confirm your new email address for ${BRAND}`;

  const html = baseHtml(subject, `
    <p>Hi,</p>
    <p>We received a request to update the email address for your ${BRAND} account to this address.</p>
    <div class="otp-box">
      <div class="otp-code">${otp}</div>
      <div class="otp-expiry">Expires in ${expiresMinutes} minutes</div>
    </div>
    <div class="warning">
      If you did not request this email change, please ignore this email.
    </div>
  `);

  const text = `Your ${BRAND} email confirmation code is: ${otp}. It expires in ${expiresMinutes} minutes.`;
  return { subject, html, text };
}

// ---------------------------------------------------------------------------
// Email changed security alert (sent to old email)
// ---------------------------------------------------------------------------
export function emailChangedNotificationTemplate({ oldEmail, newEmail, changedAt }) {
  const subject = `Security Alert: Your ${BRAND} email address was changed`;

  const html = baseHtml(subject, `
    <p>Hi,</p>
    <p>The primary login email address for your ${BRAND} account was recently changed from <strong>${oldEmail}</strong> to <strong>${newEmail}</strong>.</p>
    <div class="warning">
      If you did not authorize this change, your account may be compromised. Please contact support immediately at ${SUPPORT_EMAIL}.
    </div>
    <p>Time of change: ${new Date(changedAt).toUTCString()}</p>
  `);

  const text = `Your ${BRAND} login email address was changed to ${newEmail} on ${new Date(changedAt).toUTCString()}. If you did not do this, contact support immediately at ${SUPPORT_EMAIL}.`;
  return { subject, html, text };
}
