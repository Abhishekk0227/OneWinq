import { config } from '../../config/env.js';
import { EMAIL_CATEGORY } from '../../config/constants.js';
import { ConsoleAdapter } from './adapters/consoleAdapter.js';
import { SendgridAdapter } from './adapters/sendgridAdapter.js';
import logger from '../../utils/logger.js';
import {
  emailVerificationTemplate,
  passwordResetTemplate,
  newLoginNotificationTemplate,
  passwordChangedTemplate,
  accountDeletionTemplate,
  emailChangeOtpTemplate,
  emailChangedNotificationTemplate,
} from './templates/auth.js';

// ---------------------------------------------------------------------------
// EmailService — central email sending service.
//
// Responsibilities:
//   - Select and initialise the correct provider adapter
//   - Provide typed methods for each email category
//   - Enforce that security-critical emails cannot be skipped
//   - Retry transactional failures
//   - Never log OTP values in production-facing logs
// ---------------------------------------------------------------------------

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1_000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function selectAdapter() {
  if (config.isProduction) {
    if (!config.email.provider || config.email.provider === 'console') {
      throw new Error(
        'CRITICAL CONFIGURATION ERROR: EMAIL_PROVIDER="console" is strictly forbidden in production. Set EMAIL_PROVIDER=sendgrid, ses, or smtp with valid credentials in .env.',
      );
    }
  }

  switch (config.email.provider) {
    case 'sendgrid':
      return new SendgridAdapter();
    case 'ses':
      // TODO: implement SES adapter
      throw new Error('SES email adapter is not yet implemented.');
    case 'smtp':
      // TODO: implement SMTP adapter
      throw new Error('SMTP email adapter is not yet implemented.');
    case 'console':
    default:
      if (config.isProduction) {
        throw new Error('ConsoleAdapter is forbidden in production.');
      }
      return new ConsoleAdapter();
  }
}

class EmailService {
  constructor() {
    this._adapter = selectAdapter();
    this._adapter.validate();
  }

  /**
   * Send via adapter with retry logic.
   * Security emails (SECURITY category) are always attempted — never silently swallowed.
   *
   * @param {import('./emailProviderAdapter.js').EmailMessage} message
   * @param {boolean} [critical=false] — If true, errors are re-thrown after exhausting retries
   */
  async _send(message, critical = false) {
    let lastError;
    for (let attempt = 1; attempt <= MAX_RETRIES + 1; attempt++) {
      try {
        const result = await this._adapter.send(message);
        logger.info('[EmailService] sent', {
          to: message.to,
          subject: message.subject,
          category: message.category,
          messageId: result?.messageId,
          attempt,
        });
        return result;
      } catch (err) {
        lastError = err;
        logger.warn('[EmailService] send attempt failed', {
          to: message.to,
          subject: message.subject,
          attempt,
          error: err.message,
        });
        if (attempt <= MAX_RETRIES) {
          await sleep(RETRY_DELAY_MS * attempt);
        }
      }
    }

    logger.error('[EmailService] all send attempts exhausted', {
      to: message.to,
      subject: message.subject,
      error: lastError?.message,
    });

    if (critical) {
      throw lastError;
    }
    // Non-critical: log and continue
  }

  // ---------------------------------------------------------------------------
  // Typed methods — one per email type
  // ---------------------------------------------------------------------------

  /**
   * Send email verification OTP.
   * Critical — must be delivered for account creation to complete.
   */
  async sendEmailVerification({ to, otp, expiresMinutes, displayName }) {
    const template = emailVerificationTemplate({ otp, expiresMinutes, displayName });
    await this._send(
      { to, ...template, category: EMAIL_CATEGORY.TRANSACTIONAL },
      true,
    );
  }

  /**
   * Send password reset OTP.
   * Critical security email.
   */
  async sendPasswordReset({ to, otp, expiresMinutes }) {
    const template = passwordResetTemplate({ otp, expiresMinutes });
    await this._send(
      { to, ...template, category: EMAIL_CATEGORY.SECURITY },
      true,
    );
  }

  /**
   * Send new login notification.
   * Security-critical — users must be notified of new logins.
   */
  async sendNewLoginNotification({ to, deviceName, ipAddress, loginAt }) {
    const template = newLoginNotificationTemplate({ deviceName, ipAddress, loginAt });
    await this._send(
      { to, ...template, category: EMAIL_CATEGORY.SECURITY },
      false, // Non-critical: login should not fail if notification fails
    );
  }

  /**
   * Send password changed notification.
   */
  async sendPasswordChanged({ to, deviceName, changedAt }) {
    const template = passwordChangedTemplate({ deviceName, changedAt });
    await this._send(
      { to, ...template, category: EMAIL_CATEGORY.SECURITY },
      false,
    );
  }

  /**
   * Send account deletion confirmation OTP.
   */
  async sendAccountDeletionOtp({ to, otp, expiresMinutes }) {
    const template = accountDeletionTemplate({ otp, expiresMinutes });
    await this._send(
      { to, ...template, category: EMAIL_CATEGORY.SECURITY },
      true,
    );
  }

  /**
   * Send email change confirmation OTP to new email address.
   */
  async sendEmailChangeOtp({ to, otp, expiresMinutes }) {
    const template = emailChangeOtpTemplate({ otp, expiresMinutes });
    await this._send(
      { to, ...template, category: EMAIL_CATEGORY.SECURITY },
      true,
    );
  }

  /**
   * Send email changed notification alert to old email address.
   */
  async sendEmailChangedNotification({ to, oldEmail, newEmail, changedAt }) {
    const template = emailChangedNotificationTemplate({ oldEmail, newEmail, changedAt });
    await this._send(
      { to, ...template, category: EMAIL_CATEGORY.SECURITY },
      false,
    );
  }

  /**
   * Send generic notification email.
   */
  async sendNotificationEmail({ to, subject, text, html }) {
    await this._send(
      {
        to,
        subject,
        text,
        html: html || `<p>${text}</p>`,
        category: EMAIL_CATEGORY.TRANSACTIONAL,
      },
      false,
    );
  }
}

// Singleton — one adapter instance per process
export const emailService = new EmailService();
