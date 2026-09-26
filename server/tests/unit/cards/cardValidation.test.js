import { describe, it, expect } from 'vitest';
import {
  activateCardSchema,
  updateCardSchema,
  updateCardStateSchema,
  createOrderSchema,
  initiateTransferSchema,
  transferActionSchema,
  validate,
} from '../../../src/modules/cards/card.validation.js';

describe('Card & Order Validation Schemas', () => {
  it('validates activateCardSchema and normalizes cardUid to uppercase', () => {
    const valid = validate(activateCardSchema, {
      cardUid: '  a1b2c3d4e5f6  ',
      activationCode: '  SECRET1234  ',
    });

    expect(valid.cardUid).toBe('A1B2C3D4E5F6');
    expect(valid.activationCode).toBe('SECRET1234');
  });

  it('rejects activateCardSchema when cardUid is too short', () => {
    expect(() =>
      validate(activateCardSchema, {
        cardUid: '123',
        activationCode: 'SECRET1234',
      }),
    ).toThrow();
  });

  it('validates updateCardSchema and normalizes customSlug to lowercase', () => {
    const valid = validate(updateCardSchema, {
      customSlug: ' My-Custom-Card_1 ',
      assignedIdentityId: '60c72b2f9b1d8b2bad000001',
    });

    expect(valid.customSlug).toBe('my-custom-card_1');
    expect(valid.assignedIdentityId).toBe('60c72b2f9b1d8b2bad000001');
  });

  it('rejects invalid customSlug characters', () => {
    expect(() =>
      validate(updateCardSchema, {
        customSlug: 'invalid slug!@#',
      }),
    ).toThrow();
  });

  it('validates updateCardStateSchema for allowed states', () => {
    expect(validate(updateCardStateSchema, { state: 'ACTIVE' }).state).toBe('ACTIVE');
    expect(validate(updateCardStateSchema, { state: 'BLOCKED' }).state).toBe('BLOCKED');
    expect(validate(updateCardStateSchema, { state: 'LOST' }).state).toBe('LOST');
    expect(() => validate(updateCardStateSchema, { state: 'DELETED' })).toThrow();
  });

  it('validates createOrderSchema with items and shipping address', () => {
    const valid = validate(createOrderSchema, {
      items: [
        { cardType: 'metal', quantity: 2 },
        { cardType: 'pvc', quantity: 1 },
      ],
      shippingAddress: {
        recipientName: 'Alice Smith',
        addressLine1: '123 Main St',
        city: 'Metropolis',
        state: 'NY',
        postalCode: '10001',
        country: 'USA',
      },
    });

    expect(valid.items).toHaveLength(2);
    expect(valid.shippingAddress.recipientName).toBe('Alice Smith');
  });

  it('rejects order with empty items list', () => {
    expect(() =>
      validate(createOrderSchema, {
        items: [],
        shippingAddress: {
          recipientName: 'Alice',
          addressLine1: '123 Main St',
          city: 'Metropolis',
          state: 'NY',
          postalCode: '10001',
          country: 'USA',
        },
      }),
    ).toThrow();
  });

  it('validates activateCardSchema with OneWinq cardCode and optional nickname', () => {
    const valid = validate(activateCardSchema, {
      cardCode: '  owq-pvc-0009482  ',
      activationCode: '  583921  ',
      nickname: 'Work Card',
    });

    expect(valid.cardCode).toBe('OWQ-PVC-0009482');
    expect(valid.cardUid).toBe('OWQ-PVC-0009482');
    expect(valid.activationCode).toBe('583921');
    expect(valid.nickname).toBe('Work Card');
  });

  it('validates initiateTransferSchema', () => {
    const valid = validate(initiateTransferSchema, {
      recipient: '  rahul_sharma  ',
      note: 'One-time transfer',
    });

    expect(valid.recipient).toBe('rahul_sharma');
    expect(valid.note).toBe('One-time transfer');
  });

  it('rejects initiateTransferSchema when recipient is missing or too short', () => {
    expect(() =>
      validate(initiateTransferSchema, {
        recipient: 'a',
      }),
    ).toThrow();
  });

  it('validates transferActionSchema with optional reason', () => {
    const valid = validate(transferActionSchema, {
      reason: 'Recipient rejected handover',
    });
    expect(valid.reason).toBe('Recipient rejected handover');
  });
});
