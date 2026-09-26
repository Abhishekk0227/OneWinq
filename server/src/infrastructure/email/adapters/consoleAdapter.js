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
      logger.warn(
        '[Email/Console] ConsoleAdapter is active in production. Real emails will not be sent until EMAIL_PROVIDER=smtp is configured in environment variables.',
      );
      return;
    }
    logger.warn('[Email/Console] Using console email adapter — emails are not sent.');
  }

  async send(message) {
    if (config.isProduction) {
      logger.warn('[Email/Console] Email dropped in production because EMAIL_PROVIDER=console', {
        to: message.to,
        subject: message.subject,
      });
      return { messageId: `dropped-${Date.now()}` };
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
