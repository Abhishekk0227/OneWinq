import mongoose from 'mongoose';
import { PLAN_TIER, DEFAULT_PLAN_LIMITS } from '../../config/constants.js';

const planSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      enum: Object.values(PLAN_TIER),
      uppercase: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    pricing: {
      monthly: {
        amount: { type: Number, required: true, default: 0 },
        currency: { type: String, default: 'INR', uppercase: true },
      },
      yearly: {
        amount: { type: Number, required: true, default: 0 },
        currency: { type: String, default: 'INR', uppercase: true },
        discountPercent: { type: Number, default: 0 },
      },
    },
    limits: {
      maxProfiles: { type: Number, required: true, default: 1 },
      maxCards: { type: Number, required: true, default: 1 },
      analyticsRetentionDays: { type: Number, required: true, default: 7 },
    },
    features: [
      {
        type: String,
        trim: true,
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
    isPublic: {
      type: Boolean,
      default: true,
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

planSchema.statics.getDefaultPlans = function () {
  return [
    {
      code: PLAN_TIER.FREE,
      name: 'Free',
      description: 'Essential digital identity for individuals starting out.',
      pricing: {
        monthly: { amount: 0, currency: 'INR' },
        yearly: { amount: 0, currency: 'INR', discountPercent: 0 },
      },
      limits: DEFAULT_PLAN_LIMITS.FREE,
      features: DEFAULT_PLAN_LIMITS.FREE.features,
      sortOrder: 1,
    },
    {
      code: PLAN_TIER.PRO,
      name: 'Pro',
      description: 'Advanced features, 3 profiles, and smart card management for professionals.',
      pricing: {
        monthly: { amount: 299, currency: 'INR' },
        yearly: { amount: 2999, currency: 'INR', discountPercent: 16 },
      },
      limits: DEFAULT_PLAN_LIMITS.PRO,
      features: DEFAULT_PLAN_LIMITS.PRO.features,
      sortOrder: 2,
    },
    {
      code: PLAN_TIER.BUSINESS,
      name: 'Business',
      description: 'Unlimited profiles, team collaboration, full analytics, and custom themes.',
      pricing: {
        monthly: { amount: 799, currency: 'INR' },
        yearly: { amount: 7999, currency: 'INR', discountPercent: 16 },
      },
      limits: DEFAULT_PLAN_LIMITS.BUSINESS,
      features: DEFAULT_PLAN_LIMITS.BUSINESS.features,
      sortOrder: 3,
    },
    {
      code: PLAN_TIER.ENTERPRISE,
      name: 'Enterprise',
      description: 'Dedicated account manager, custom SLAs, bulk card management, and SSO.',
      pricing: {
        monthly: { amount: 2499, currency: 'INR' },
        yearly: { amount: 24999, currency: 'INR', discountPercent: 16 },
      },
      limits: DEFAULT_PLAN_LIMITS.ENTERPRISE,
      features: DEFAULT_PLAN_LIMITS.ENTERPRISE.features,
      sortOrder: 4,
    },
  ];
};

export const Plan = mongoose.model('Plan', planSchema);
