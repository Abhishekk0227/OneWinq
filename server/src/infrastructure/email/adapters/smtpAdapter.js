import nodemailer from 'nodemailer';
import { EmailProviderAdapter } from '../emailProviderAdapter.js';
import { config } from '../../../config/env.js';
import logger from '../../../utils/logger.js';

export class SmtpAdapter extends EmailProviderAdapter {
  constructor() {
    super();
    this.transporter = null;
  }

  validate() {
    const host = config.email.smtp.host || 'smtp.gmail.com';
    const user = config.email.smtp.user;
    const pass = config.email.smtp.pass;

    if (!user || !pass) {
      throw new Error(
        'SMTP configuration missing: SMTP_USER and SMTP_PASS (Google App Password) are required when EMAIL_PROVIDER=smtp',
      );
    }

    const port = config.email.smtp.port || 465;
    const secure = port === 465;

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass,
      },
    });

    logger.info('[Email/SMTP] Initialized SMTP email transport', {
      host,
      port,
      user: user ? user.replace(/(?<=.).(?=.*@)/g, '*') : undefined,
    });
  }

  async send(message) {
    if (!this.transporter) {
      this.validate();
    }

    const fromAddress = config.email.from.address || config.email.smtp.user;
    const fromName = config.email.from.name || 'OneWinq';

    const mailOptions = {
      from: `"${fromName}" <${fromAddress}>`,
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
    };

    const info = await this.transporter.sendMail(mailOptions);
    logger.info('[Email/SMTP] Email sent successfully', {
      to: message.to,
      subject: message.subject,
      messageId: info.messageId,
    });

    return { messageId: info.messageId };
  }
}
