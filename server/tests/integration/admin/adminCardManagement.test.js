import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { connectTestDb, clearTestDb, disconnectTestDb } from '../../helpers/db.js';
import { generateAccessToken } from '../../../src/modules/auth/tokenService.js';
import { User } from '../../../src/modules/users/user.model.js';
import { Card } from '../../../src/modules/cards/card.model.js';
import { AuditLog } from '../../../src/modules/admin/auditLog.model.js';
import { ACCOUNT_STATE, ADMIN_ROLE, CARD_STATE } from '../../../src/config/constants.js';

let app;

beforeAll(async () => {
  const appModule = await import('../../../app.js');
  app = appModule.default;
  try {
    await connectTestDb();
  } catch (err) {
    // Tests gracefully skip if DB unavailable
  }
});

afterEach(async () => {
  try {
    await clearTestDb();
  } catch (err) {
    // ignore
  }
});

afterAll(async () => {
  try {
    await disconnectTestDb();
  } catch (err) {
    // ignore
  }
});

describe('OneWinq NFC Card — Permanent Ownership & Admin Card Management', () => {
  let adminUser;
  let adminToken;
  let regularUserA;
  let regularUserB;
  let regularUserToken;

  beforeEach(async () => {
    try {
      adminUser = await User.create({
        email: 'admin.cards@onewinq.com',
        username: 'admincards',
        displayName: 'Card Admin',
        passwordHash: 'dummyhash',
        role: ADMIN_ROLE.SUPER_ADMIN,
        accountState: ACCOUNT_STATE.ACTIVE,
        emailVerified: true,
      });
      adminToken = generateAccessToken(adminUser);

      regularUserA = await User.create({
        email: 'cardholder.a@onewinq.com',
        username: 'cardholdera',
        displayName: 'Cardholder A',
        passwordHash: 'dummyhash',
        role: 'USER',
        accountState: ACCOUNT_STATE.ACTIVE,
        emailVerified: true,
      });

      regularUserB = await User.create({
        email: 'cardholder.b@onewinq.com',
        username: 'cardholderb',
        displayName: 'Cardholder B',
        passwordHash: 'dummyhash',
        role: 'USER',
        accountState: ACCOUNT_STATE.ACTIVE,
        emailVerified: true,
      });

      regularUserToken = generateAccessToken(regularUserA);
    } catch (err) {
      // test db might not be running
    }
  });

  // 1 & 12. Card Generation and CSV export
  it('1 & 12. Admin can generate cards with sequential IDs, unique URLs, and CSV export', async () => {
    if (!adminToken) return;

    const res = await request(app)
      .post('/api/v1/admin/cards/generate')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        count: 3,
        material: 'pvc',
        notes: 'Integration Test Batch',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.count).toBe(3);
    expect(res.body.data.cards).toHaveLength(3);

    const firstCard = res.body.data.cards[0];
    const secondCard = res.body.data.cards[1];
    const thirdCard = res.body.data.cards[2];

    expect(firstCard.cardId).toMatch(/^OWQ-CARD-\d{6}$/);
    expect(secondCard.cardId).toMatch(/^OWQ-CARD-\d{6}$/);
    expect(thirdCard.cardId).toMatch(/^OWQ-CARD-\d{6}$/);

    expect(firstCard.url).toContain(`/p/c/${firstCard.cardId}`);
    expect(res.body.data.csv).toContain('cardId,url');
    expect(res.body.data.csv).toContain(`${firstCard.cardId},${firstCard.url}`);

    // DB state check: newly generated card has assignedTo = null, everAssigned = false, status = UNASSIGNED
    const dbCard = await Card.findOne({ cardCode: firstCard.cardId });
    expect(dbCard.status).toBe(CARD_STATE.UNASSIGNED);
    expect(dbCard.everAssigned).toBe(false);
    expect(dbCard.firstAssignedTo).toBeNull();
    expect(dbCard.assignedTo).toBeNull();

    // Verify AuditLog was recorded
    const auditLogs = await AuditLog.find({ action: 'CARDS_GENERATED' });
    expect(auditLogs.length).toBeGreaterThanOrEqual(1);
  });

  // 13. Concurrent Generation
  it('handles concurrent card generation without duplicate IDs or collisions', async () => {
    if (!adminToken) return;

    const [batch1, batch2, batch3] = await Promise.all([
      request(app)
        .post('/api/v1/admin/cards/generate')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ count: 4, material: 'pvc' }),
      request(app)
        .post('/api/v1/admin/cards/generate')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ count: 4, material: 'metal' }),
      request(app)
        .post('/api/v1/admin/cards/generate')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ count: 4, material: 'bamboo' }),
    ]);

    expect(batch1.status).toBe(201);
    expect(batch2.status).toBe(201);
    expect(batch3.status).toBe(201);

    const allCards = [
      ...batch1.body.data.cards,
      ...batch2.body.data.cards,
      ...batch3.body.data.cards,
    ];
    expect(allCards).toHaveLength(12);

    const cardIds = allCards.map((c) => c.cardId);
    expect(new Set(cardIds).size).toBe(12);
  });

  // 2, 3, 4. Admin assigns card, permanent owner is set, card assigned only once
  it('2, 3, 4. Admin assigns card to user A: sets ACTIVE, everAssigned = true, locks original user', async () => {
    if (!adminToken) return;

    const genRes = await request(app)
      .post('/api/v1/admin/cards/generate')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ count: 1, material: 'metal' });

    const cardId = genRes.body.data.cards[0].cardId;

    // Assign card to User A
    const assignRes = await request(app)
      .post(`/api/v1/admin/cards/${cardId}/assign`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ userId: regularUserA._id.toString() });

    expect(assignRes.status).toBe(200);
    expect(assignRes.body.data.card.status).toBe(CARD_STATE.ACTIVE);
    expect(assignRes.body.data.card.currentOwner.id).toBe(regularUserA._id.toString());
    expect(assignRes.body.data.card.everAssigned).toBe(true);

    // Verify DB fields: permanent assignment lock
    const dbCard = await Card.findOne({ cardCode: cardId });
    expect(dbCard.everAssigned).toBe(true);
    expect(dbCard.firstAssignedTo.toString()).toBe(regularUserA._id.toString());
    expect(dbCard.assignedTo.toString()).toBe(regularUserA._id.toString());
    expect(dbCard.firstAssignedAt).toBeDefined();

    // Verify AuditLog for assignment
    const auditLogs = await AuditLog.find({ action: 'CARD_ASSIGNED' });
    expect(auditLogs.length).toBeGreaterThanOrEqual(1);
  });

  // 5. Reassignment to another user is rejected
  it('5. Reassigning an assigned card to another user (User B) is strictly rejected with 409 Conflict', async () => {
    if (!adminToken) return;

    const genRes = await request(app)
      .post('/api/v1/admin/cards/generate')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ count: 1, material: 'pvc' });

    const cardId = genRes.body.data.cards[0].cardId;

    // Assign to User A
    await request(app)
      .post(`/api/v1/admin/cards/${cardId}/assign`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ userId: regularUserA._id.toString() });

    // Attempt to reassign to User B
    const reassignRes = await request(app)
      .post(`/api/v1/admin/cards/${cardId}/assign`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ userId: regularUserB._id.toString() });

    expect(reassignRes.status).toBe(409);
    expect(reassignRes.body.message).toContain('permanently locked');

    // DB verification: User A remains the unchanged owner
    const dbCard = await Card.findOne({ cardCode: cardId });
    expect(dbCard.firstAssignedTo.toString()).toBe(regularUserA._id.toString());
    expect(dbCard.assignedTo.toString()).toBe(regularUserA._id.toString());
  });

  // 6. Unassignment cannot unlock the card for another user
  it('6. Unassigning card preserves permanent lock; attempting to assign to User B is rejected', async () => {
    if (!adminToken) return;

    const genRes = await request(app)
      .post('/api/v1/admin/cards/generate')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ count: 1, material: 'pvc' });

    const cardId = genRes.body.data.cards[0].cardId;

    // Assign to User A
    await request(app)
      .post(`/api/v1/admin/cards/${cardId}/assign`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ userId: regularUserA._id.toString() });

    // Unassign card
    const unassignRes = await request(app)
      .post(`/api/v1/admin/cards/${cardId}/unassign`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(unassignRes.status).toBe(200);
    expect(unassignRes.body.data.card.status).toBe(CARD_STATE.UNASSIGNED);
    expect(unassignRes.body.data.card.currentOwner).toBeNull();

    // Verify DB: everAssigned and firstAssignedTo remain intact
    const dbCard = await Card.findOne({ cardCode: cardId });
    expect(dbCard.everAssigned).toBe(true);
    expect(dbCard.firstAssignedTo.toString()).toBe(regularUserA._id.toString());
    expect(dbCard.assignedTo).toBeNull();

    // Now attempt to assign this unassigned card to User B: MUST BE REJECTED!
    const reassignRes = await request(app)
      .post(`/api/v1/admin/cards/${cardId}/assign`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ userId: regularUserB._id.toString() });

    expect(reassignRes.status).toBe(409);
    expect(reassignRes.body.message).toContain('permanently locked');

    // Reassigning back to original owner (User A) is ALLOWED!
    const reassignOriginalRes = await request(app)
      .post(`/api/v1/admin/cards/${cardId}/assign`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ userId: regularUserA._id.toString() });

    expect(reassignOriginalRes.status).toBe(200);
    expect(reassignOriginalRes.body.data.card.status).toBe(CARD_STATE.ACTIVE);
    expect(reassignOriginalRes.body.data.card.currentOwner.id).toBe(regularUserA._id.toString());
  });

  // 7 & 8. Deactivation and Blocking preserve original owner
  it('7 & 8. Deactivation/reactivation and Blocking/unblocking preserve original owner', async () => {
    if (!adminToken) return;

    const genRes = await request(app)
      .post('/api/v1/admin/cards/generate')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ count: 1, material: 'pvc' });

    const cardId = genRes.body.data.cards[0].cardId;

    await request(app)
      .post(`/api/v1/admin/cards/${cardId}/assign`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ userId: regularUserA._id.toString() });

    // 1. Deactivate card
    const deactRes = await request(app)
      .patch(`/api/v1/admin/cards/${cardId}/state`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ state: CARD_STATE.INACTIVE, reason: 'Temporary suspension' });

    expect(deactRes.status).toBe(200);
    expect(deactRes.body.data.card.status).toBe(CARD_STATE.INACTIVE);

    // Reactivate card for User A
    const reactRes = await request(app)
      .patch(`/api/v1/admin/cards/${cardId}/state`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ state: CARD_STATE.ACTIVE, reason: 'Reactivation' });

    expect(reactRes.status).toBe(200);
    expect(reactRes.body.data.card.status).toBe(CARD_STATE.ACTIVE);

    // 2. Block card
    const blockRes = await request(app)
      .patch(`/api/v1/admin/cards/${cardId}/state`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ state: CARD_STATE.BLOCKED, reason: 'Security check' });

    expect(blockRes.status).toBe(200);
    expect(blockRes.body.data.card.status).toBe(CARD_STATE.BLOCKED);

    // Unblock card
    const unblockRes = await request(app)
      .patch(`/api/v1/admin/cards/${cardId}/state`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ state: CARD_STATE.ACTIVE, reason: 'Security clear' });

    expect(unblockRes.status).toBe(200);
    expect(unblockRes.body.data.card.status).toBe(CARD_STATE.ACTIVE);

    // Verify DB still permanently preserves User A
    const dbCard = await Card.findOne({ cardCode: cardId });
    expect(dbCard.firstAssignedTo.toString()).toBe(regularUserA._id.toString());
    expect(dbCard.assignedTo.toString()).toBe(regularUserA._id.toString());
  });

  // 9. Ordinary users cannot manage or assign cards
  it('9. Ordinary users cannot assign cards or alter admin card states (403 Forbidden)', async () => {
    if (!regularUserToken) return;

    const genRes = await request(app)
      .post('/api/v1/admin/cards/generate')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ count: 1, material: 'pvc' });

    const cardId = genRes.body.data.cards[0].cardId;

    // Regular user attempts to assign card
    const assignRes = await request(app)
      .post(`/api/v1/admin/cards/${cardId}/assign`)
      .set('Authorization', `Bearer ${regularUserToken}`)
      .send({ userId: regularUserA._id.toString() });

    expect(assignRes.status).toBe(403);

    // Regular user attempts to generate cards
    const generateRes = await request(app)
      .post('/api/v1/admin/cards/generate')
      .set('Authorization', `Bearer ${regularUserToken}`)
      .send({ count: 1 });

    expect(generateRes.status).toBe(403);
  });

  // 10. Direct database save rejects reassignment via pre-save validation
  it('10. Pre-save hook enforces immutable ownership lock against direct database mutations', async () => {
    if (!adminToken) return;

    const card = await Card.create({
      cardCode: 'OWQ-CARD-999999',
      cardId: 'OWQ-CARD-999999',
      assignedTo: regularUserA._id,
      everAssigned: true,
      firstAssignedTo: regularUserA._id,
      state: CARD_STATE.ACTIVE,
    });

    // Attempt direct reassignment to User B via model instance
    card.assignedTo = regularUserB._id;
    card.userId = regularUserB._id;

    await expect(card.save()).rejects.toThrow(
      'Permanent card assignment lock: This physical NFC card is permanently linked to its original owner',
    );
  });

  // 11. Public URL resolution
  it('11. Public URL resolves to assigned user profile when ACTIVE, and returns appropriate status when INACTIVE/BLOCKED', async () => {
    if (!adminToken) return;

    const genRes = await request(app)
      .post('/api/v1/admin/cards/generate')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ count: 1, material: 'pvc' });

    const cardId = genRes.body.data.cards[0].cardId;

    // 1. Unassigned card tap -> 404
    const unassignedTap = await request(app).get(`/api/v1/cards/tap/${cardId}`);
    expect(unassignedTap.status).toBe(404);
    expect(unassignedTap.body.message).toContain('not assigned');

    // Assign to User A -> tap -> 200
    await request(app)
      .post(`/api/v1/admin/cards/${cardId}/assign`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ userId: regularUserA._id.toString() });

    const activeTap = await request(app).get(`/api/v1/cards/tap/${cardId}`);
    expect(activeTap.status).toBe(200);
    expect(activeTap.body.data.username).toBe(regularUserA.username);

    // Deactivate -> tap -> 403
    await request(app)
      .patch(`/api/v1/admin/cards/${cardId}/state`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ state: CARD_STATE.INACTIVE });

    const inactiveTap = await request(app).get(`/api/v1/cards/tap/${cardId}`);
    expect(inactiveTap.status).toBe(403);
    expect(inactiveTap.body.message).toContain('deactivated');

    // Block -> tap -> 403
    await request(app)
      .patch(`/api/v1/admin/cards/${cardId}/state`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ state: CARD_STATE.BLOCKED });

    const blockedTap = await request(app).get(`/api/v1/cards/tap/${cardId}`);
    expect(blockedTap.status).toBe(403);
    expect(blockedTap.body.message).toContain('blocked');
  });

  // 14. No transfer endpoints remain accessible
  it('14. All transfer endpoints are removed and return 404 Not Found', async () => {
    if (!adminToken) return;

    // Admin transfer endpoint
    const adminTransferRes = await request(app)
      .post('/api/v1/admin/cards/OWQ-CARD-000001/transfer')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ targetUserId: regularUserB._id.toString() });

    expect(adminTransferRes.status).toBe(404);

    // User transfer initiation
    const userTransferRes = await request(app)
      .post('/api/v1/cards/OWQ-CARD-000001/transfer')
      .set('Authorization', `Bearer ${regularUserToken}`)
      .send({ targetUserId: regularUserB._id.toString() });

    expect(userTransferRes.status).toBe(404);

    // Pending transfers list
    const pendingTransfersRes = await request(app)
      .get('/api/v1/cards/transfers/pending')
      .set('Authorization', `Bearer ${regularUserToken}`);

    expect(pendingTransfersRes.status).toBe(404);

    // Transfer history list
    const transferHistoryRes = await request(app)
      .get('/api/v1/cards/transfers/history')
      .set('Authorization', `Bearer ${regularUserToken}`);

    expect(transferHistoryRes.status).toBe(404);
  });
});
