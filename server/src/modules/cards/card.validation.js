import { z } from 'zod';
import { ValidationError } from '../../shared/errors.js';

export const activateCardSchema = z
  .object({
    cardCode: z
      .string()
      .min(6, 'Card code must be at least 6 characters')
      .max(64, 'Card code cannot exceed 64 characters')
      .transform((val) => val.trim().toUpperCase())
      .optional(),
    cardUid: z
      .string()
      .min(6, 'Card code must be at least 6 characters')
      .max(64, 'Card code cannot exceed 64 characters')
      .transform((val) => val.trim().toUpperCase())
      .optional(),
    activationCode: z
      .string({ required_error: 'activationCode is required' })
      .min(6, 'activationCode must be at least 6 characters')
      .max(64, 'activationCode cannot exceed 64 characters')
      .transform((val) => val.trim()),
    nickname: z.string().max(100).optional(),
    label: z.string().max(100).optional(),
  })
  .refine((data) => data.cardCode || data.cardUid, {
    message: 'Either cardCode or cardUid is required',
    path: ['cardCode'],
  })
  .transform((data) => ({
    ...data,
    cardCode: data.cardCode || data.cardUid,
    cardUid: data.cardUid || data.cardCode,
    nickname: data.nickname || data.label || null,
  }));


export const updateCardSchema = z.object({
  assignedIdentityId: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid identity ID format')
    .nullable()
    .optional(),
  customSlug: z
    .preprocess((val) => (typeof val === 'string' ? val.trim().toLowerCase() : val), z.string())
    .pipe(
      z
        .string()
        .min(3, 'customSlug must be at least 3 characters')
        .max(30, 'customSlug cannot exceed 30 characters')
        .regex(/^[a-z0-9_-]+$/, 'customSlug may only contain letters, numbers, hyphens, and underscores'),
    )
    .nullable()
    .optional(),
});

export const updateCardStateSchema = z.object({
  state: z.enum(['ACTIVE', 'BLOCKED', 'LOST'], {
    required_error: 'Valid state is required (ACTIVE, BLOCKED, or LOST)',
  }),
});

export const createOrderSchema = z
  .object({
    currency: z.string().optional(),
    designTier: z.string().optional(),
    items: z
      .array(
        z.object({
          cardType: z.string().min(1, 'cardType is required').transform((v) => v.toLowerCase()),
          quantity: z.number().int().min(1).max(100).default(1),
          customDesignUrl: z.string().url().nullable().optional(),
        }),
      )
      .optional(),
    cardType: z.string().optional(),
    quantity: z.number().int().min(1).max(100).optional(),
    customDesignUrl: z.string().nullable().optional(),
    shippingAddress: z
      .object({
        recipientName: z.string().optional(),
        fullName: z.string().optional(),
        addressLine1: z.string().optional(),
        line1: z.string().optional(),
        addressLine2: z.string().optional().default(''),
        line2: z.string().optional().default(''),
        city: z.string().min(1, 'City is required').max(100),
        state: z.string().optional(),
        stateName: z.string().optional(),
        postalCode: z.string().min(1, 'Postal code is required').max(20),
        country: z.string().min(1, 'Country is required').max(100),
        phone: z.string().max(30).optional().default(''),
      })
      .transform((addr) => ({
        recipientName: addr.recipientName || addr.fullName || 'Recipient',
        addressLine1: addr.addressLine1 || addr.line1 || 'Address',
        addressLine2: addr.addressLine2 || addr.line2 || '',
        city: addr.city,
        state: addr.state || addr.stateName || '',
        postalCode: addr.postalCode,
        country: addr.country,
        phone: addr.phone || '',
      })),
  })
  .transform((data) => {
    let finalItems = data.items;
    if (!finalItems || finalItems.length === 0) {
      if (data.cardType || data.designTier) {
        finalItems = [
          {
            cardType: (data.cardType || data.designTier || 'pvc').toLowerCase(),
            quantity: data.quantity || 1,
            customDesignUrl: data.customDesignUrl || null,
          },
        ];
      }
    }
    return {
      currency: data.currency,
      designTier: data.designTier,
      items: finalItems || [{ cardType: 'pvc', quantity: 1, customDesignUrl: null }],
      shippingAddress: data.shippingAddress,
    };
  })
  .refine((data) => data.items && data.items.length > 0, {
    message: 'Order must contain at least one item',
  });

export const initiateTransferSchema = z.object({
  recipient: z.string().trim().min(3).max(100),
  note: z.string().trim().max(300).optional().default(''),
});

export const transferActionSchema = z.object({
  reason: z.string().trim().max(300).optional(),
});

export function validate(schema, data) {
  const result = schema.safeParse(data);
  if (!result.success) {
    const details = result.error.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    throw new ValidationError('Validation failed', details);
  }
  return result.data;
}
