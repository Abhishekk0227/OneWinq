import EventEmitter from 'events';
import logger from '../utils/logger.js';

// ---------------------------------------------------------------------------
// Internal application event bus.
//
// Provides loose coupling between modules within the monolith.
// No external broker. Uses Node.js EventEmitter under the hood.
//
// Usage:
//   import { eventBus } from '../events/eventBus.js';
//   import { APP_EVENT } from '../config/constants.js';
//
//   // Publish
//   eventBus.emit(APP_EVENT.CONNECTION_ACCEPTED, { connectionId, userId, targetId });
//
//   // Subscribe (in module index / bootstrap)
//   eventBus.on(APP_EVENT.CONNECTION_ACCEPTED, notificationService.onConnectionAccepted);
// ---------------------------------------------------------------------------

class ApplicationEventBus extends EventEmitter {
  constructor() {
    super();
    // Increase listener limit for large event catalogs; warn at 50+
    this.setMaxListeners(50);
  }

  /**
   * Emit an event with structured payload.
   * Wraps EventEmitter.emit to add logging and catch listener errors.
   *
   * @param {string} event
   * @param {object} payload
   */
  publish(event, payload = {}) {
    logger.debug(`[EventBus] emit: ${event}`, { event, payloadKeys: Object.keys(payload) });
    try {
      this.emit(event, payload);
    } catch (err) {
      // A listener threw — log but don't crash the request
      logger.error(`[EventBus] listener error on event '${event}'`, {
        event,
        message: err.message,
      });
    }
  }

  /**
   * Subscribe to an event. Same as .on() but logged.
   *
   * @param {string} event
   * @param {function} listener
   */
  subscribe(event, listener) {
    logger.debug(`[EventBus] subscribe: ${event}`, { event, listener: listener.name });
    this.on(event, listener);
  }

  /**
   * Subscribe for one emission only.
   *
   * @param {string} event
   * @param {function} listener
   */
  subscribeOnce(event, listener) {
    this.once(event, listener);
  }
}

export const eventBus = new ApplicationEventBus();
