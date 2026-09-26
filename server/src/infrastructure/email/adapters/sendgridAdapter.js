import { EmailProviderAdapter } from '../emailProviderAdapter.js';
import { config } from '../../../config/env.js';
import { ExternalServiceError } from '../../../shared/errors.js';

// ---------------------------------------------------------------------------
// SendGrid adapter stub.
// Wire up the real SendGrid SDK when this provider is selected.
// ---------------------------------------------------------------------------

export class SendgridAdapter extends EmailProviderAdapter {
  validate() {
    if (!config.email.sendgrid.apiKey) {
      throw new Error('SENDGRID_API_KEY is required when EMAIL_PROVIDER=sendgrid');
    }
  }

  async send(_message) {
    // TODO Phase 2+: install @sendgrid/mail and implement
    // import sgMail from '@sendgrid/mail';
    // sgMail.setApiKey(config.email.sendgrid.apiKey);
    // const result = await sgMail.send({
    //   to: message.to,
    //   from: { email: config.email.from.address, name: config.email.from.name },
    //   subject: message.subject,
    //   html: message.html,
    //   text: message.text,
    // });
    // return { messageId: result[0]?.headers?.['x-message-id'] };
    throw new ExternalServiceError('SendGrid adapter is not yet implemented. Set EMAIL_PROVIDER=console for development.');
  }
}
