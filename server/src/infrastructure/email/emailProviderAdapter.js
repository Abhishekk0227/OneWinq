// ---------------------------------------------------------------------------
// EmailProviderAdapter — interface contract for all email provider adapters.
//
// Every adapter must implement the `send(message)` method.
// This base class documents the contract; adapters extend or duck-type it.
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} EmailMessage
 * @property {string}   to           — Recipient email address
 * @property {string}   subject      — Email subject line
 * @property {string}   html         — HTML body
 * @property {string}   text         — Plain-text fallback body
 * @property {string}   [category]   — EMAIL_CATEGORY constant
 * @property {string}   [idempotencyKey] — For idempotent delivery
 */

export class EmailProviderAdapter {
  /**
   * Send an email message.
   *
   * @param {EmailMessage} message
   * @returns {Promise<{ messageId?: string }>}
   */
  // eslint-disable-next-line no-unused-vars
  async send(message) {
    throw new Error(`${this.constructor.name} must implement send(message)`);
  }

  /**
   * Check whether this adapter is properly configured.
   * Called at startup if provider is selected.
   */
  validate() {
    // Optional — override in concrete adapters
  }
}
