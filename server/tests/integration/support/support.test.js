import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { connectTestDb, clearTestDb, disconnectTestDb } from '../../helpers/db.js';
import { generateAccessToken } from '../../../src/modules/auth/tokenService.js';
import { User } from '../../../src/modules/users/user.model.js';
import { Ticket } from '../../../src/modules/support/ticket.model.js';
import {
  ACCOUNT_STATE,
  TICKET_CATEGORY,
  TICKET_PRIORITY,
  TICKET_STATE,
} from '../../../src/config/constants.js';
import logger from '../../../src/utils/logger.js';

let app;
let mongoose;

const BASE = '/api/v1/support';

beforeAll(async () => {
  const appModule = await import('../../../app.js');
  app = appModule.default;

  try {
    mongoose = await connectTestDb();
  } catch (err) {
    logger.warn('Failed to connect test db in support.test.js', { error: err.message });
  }
});

afterEach(async () => {
  await clearTestDb();
});

afterAll(async () => {
  await disconnectTestDb();
});

function skipIfNoDb() {
  return !mongoose || mongoose.connection.readyState !== 1;
}

describe('Support Ticketing Lifecycle', () => {
  let userA;
  let userB;
  let tokenA;
  let tokenB;

  beforeEach(async () => {
    if (skipIfNoDb()) {
      return;
    }

    userA = await User.create({
      email: 'ticket.user.a@onewinq.com',
      passwordHash: 'dummy',
      username: 'ticket-usera',
      displayName: 'Ticket User A',
      accountState: ACCOUNT_STATE.ACTIVE,
      emailVerified: true,
    });

    userB = await User.create({
      email: 'ticket.user.b@onewinq.com',
      passwordHash: 'dummy',
      username: 'ticket-userb',
      displayName: 'Ticket User B',
      accountState: ACCOUNT_STATE.ACTIVE,
      emailVerified: true,
    });

    tokenA = generateAccessToken({ userId: userA._id.toString() });
    tokenB = generateAccessToken({ userId: userB._id.toString() });
  });

  describe('POST /api/v1/support/tickets', () => {
    it('requires authentication', async () => {
      const res = await request(app).post(`${BASE}/tickets`).send({
        subject: 'Hardware card inquiry',
        message: 'Where is my NFC card?',
      });
      expect(res.status).toBe(401);
    });

    it('creates a new support ticket with initial message', async () => {
      if (skipIfNoDb()) {
        return;
      }

      const res = await request(app)
        .post(`${BASE}/tickets`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          subject: 'Hardware card inquiry',
          category: TICKET_CATEGORY.NFC_HARDWARE,
          priority: TICKET_PRIORITY.HIGH,
          message: 'I ordered a Bamboo NFC card last week. Can I get tracking info?',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.ticket.ticketNumber).toMatch(/^TICK-\d{4}-\d{5}$/);
      expect(res.body.data.ticket.status).toBe(TICKET_STATE.OPEN);
      expect(res.body.data.ticket.messages.length).toBe(1);
      expect(res.body.data.ticket.messages[0].senderRole).toBe('USER');
    });
  });

  describe('Ticket Conversation and Resolution Lifecycle', () => {
    it('allows owner to view, reply, and close their ticket', async () => {
      if (skipIfNoDb()) {
        return;
      }

      // 1. Create ticket
      const createRes = await request(app)
        .post(`${BASE}/tickets`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          subject: 'Need help with custom vanity URL',
          message: 'How do I set up a custom slug for my card?',
        });

      const ticketId = createRes.body.data.ticket._id;

      // 2. View ticket as owner (userA) -> 200
      const getRes = await request(app)
        .get(`${BASE}/tickets/${ticketId}`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(getRes.status).toBe(200);
      expect(getRes.body.data.ticket._id).toBe(ticketId);

      // 3. UserB attempts to view UserA ticket -> 403 Forbidden
      const unauthorizedRes = await request(app)
        .get(`${BASE}/tickets/${ticketId}`)
        .set('Authorization', `Bearer ${tokenB}`);

      expect(unauthorizedRes.status).toBe(403);

      // 4. Reply to ticket
      const replyRes = await request(app)
        .post(`${BASE}/tickets/${ticketId}/reply`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          text: 'Nevermind, I found the setting under Cards!',
        });

      expect(replyRes.status).toBe(200);
      expect(replyRes.body.data.ticket.messages.length).toBe(2);

      // 5. Close ticket
      const closeRes = await request(app)
        .post(`${BASE}/tickets/${ticketId}/close`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({});

      expect(closeRes.status).toBe(200);
      expect(closeRes.body.data.ticket.status).toBe(TICKET_STATE.CLOSED);

      // 6. Attempting to reply to a closed ticket returns 400
      const replyClosedRes = await request(app)
        .post(`${BASE}/tickets/${ticketId}/reply`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          text: 'Wait, one more question!',
        });

      expect(replyClosedRes.status).toBe(400);
    });

    it('lists tickets belonging to user', async () => {
      if (skipIfNoDb()) {
        return;
      }

      await Ticket.create({
        ticketNumber: 'TICK-2026-99991',
        userId: userA._id,
        subject: 'Test Subject 1',
        category: TICKET_CATEGORY.TECHNICAL_ISSUE,
        status: TICKET_STATE.OPEN,
        messages: [{ sender: userA._id, text: 'Initial message' }],
      });

      const res = await request(app)
        .get(`${BASE}/tickets`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.tickets.length).toBe(1);
      expect(res.body.data.tickets[0].ticketNumber).toBe('TICK-2026-99991');
    });
  });
});
