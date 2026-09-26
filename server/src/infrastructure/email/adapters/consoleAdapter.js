import { EmailProviderAdapter } from '../emailProviderAdapter.js';
import { config } from '../../../config/env.js';
import logger from '../../../utils/logger.js';

// ---------------------------------------------------------------------------
// Console adapter — development only.
// Logs email details to stdout so developers can see OTPs and verify flows
// without a real email provider configured.
//
// NEVER use this adapter in production.
// ---------------------------------------------------------------------------

export class ConsoleAdapter extends EmailProviderAdapter {
  validate() {
    if (config.isProduction) {
      throw new Error(
        'FATAL SECURITY VIOLATION: ConsoleAdapter cannot be used in production environment. Configure SENDGRID, SES, or SMTP in EMAIL_PROVIDER.',
      );
    }
    logger.warn('[Email/Console] Using console email adapter — emails are not sent.');
  }

  async send(message) {
    if (config.isProduction) {
      throw new Error('FATAL SECURITY VIOLATION: Attempted to log email/OTP to console in production.');
    }

    if (config.isDevelopment || config.isTest) {
      const otpMatch = message.text?.match(/\b\d{6}\b/);
      console.log('\n╔══════════════════════════════════════════════════════════╗');
      console.log(`║ 📬 DEV EMAIL: ${message.subject}`);
      console.log(`║ 👤 TO:      ${message.to}`);
      if (otpMatch) {
        console.log(`║ 🔑 OTP CODE: >>> ${otpMatch[0]} <<<`);
      }
      console.log('╚══════════════════════════════════════════════════════════╝\n');
    }

    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.info('[Email/Console] DEV EMAIL (not actually sent)');
    logger.info(`  To:      ${message.to}`);
    logger.info(`  Subject: ${message.subject}`);
    logger.info(`  Body:\n${message.text}`);
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    return { messageId: `console-${Date.now()}` };
  }
}
