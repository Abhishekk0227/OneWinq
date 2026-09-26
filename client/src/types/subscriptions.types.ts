import type { PlanTier } from '@/constants/app.constants'

export interface PlanFeature {
  key: string
  name: string
  included: boolean
  limit?: number | string
}

export interface SubscriptionPlan {
  _id?: string
  id: string
  tier: PlanTier
  name: string
  description: string
  monthlyPrice: number
  yearlyPrice: number
  currency: string
  features: string[]
  isPopular?: boolean
}

export interface UserSubscription {
  status: 'ACTIVE' | 'CANCELLED' | 'PAST_DUE' | 'TRIALING' | 'INCOMPLETE'
  tier: PlanTier
  billingCycle: 'MONTHLY' | 'YEARLY'
  currentPeriodEnd?: string
  cancelAtPeriodEnd?: boolean
  entitlements: string[]
}
