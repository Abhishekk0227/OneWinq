import { User } from '../src/modules/users/user.model.js';
import { Session } from '../src/modules/auth/session.model.js';
import { OtpChallenge } from '../src/modules/auth/otpChallenge.model.js';
import { Profile } from '../src/modules/profiles/profile.model.js';
import { Connection } from '../src/modules/connections/connection.model.js';
import { Conversation } from '../src/modules/conversations/conversation.model.js';
import { Message } from '../src/modules/conversations/message.model.js';
import { Card } from '../src/modules/cards/card.model.js';
import { RawEvent } from '../src/modules/analytics/rawEvent.model.js';
import { ProfileAnalytics } from '../src/modules/analytics/profileAnalytics.model.js';
import { CardAnalytics } from '../src/modules/analytics/cardAnalytics.model.js';
import { Notification } from '../src/modules/notifications/notification.model.js';
import logger from '../src/utils/logger.js';

export const name = '001_initial_indexes';

export async function up() {
  logger.info(`[Migration:${name}] Syncing production indexes...`);

  const models = [
    User,
    Session,
    OtpChallenge,
    Profile,
    Connection,
    Conversation,
    Message,
    Card,
    RawEvent,
    ProfileAnalytics,
    CardAnalytics,
    Notification,
  ];

  for (const model of models) {
    try {
      await model.syncIndexes();
      logger.info(`[Migration:${name}] Synced indexes for ${model.modelName}`);
    } catch (err) {
      logger.error(`[Migration:${name}] Failed syncing indexes for ${model.modelName}`, {
        error: err.message,
      });
      throw err;
    }
  }

  logger.info(`[Migration:${name}] Initial indexes successfully applied.`);
}

export async function down() {
  logger.info(`[Migration:${name}] Rollback placeholder`);
}
