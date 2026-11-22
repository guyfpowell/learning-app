import type { IAPOffering } from '@/services/iap.service';

/** A plan the paywall offers: one of the offering's packages. */
export type PlanKey = keyof IAPOffering;

interface PlanOption {
  key: PlanKey;
  label: string;
  period: string;
  badge?: string;
}

/** The plan cards, in the order shown. */
export const PLAN_OPTIONS: readonly PlanOption[] = [
  { key: 'annual', label: 'Annual', period: 'per year', badge: 'Best value' },
  { key: 'monthly', label: 'Monthly', period: 'per month' },
];

/** Selected when the paywall opens: best value for the user and for us. */
export const DEFAULT_PLAN: PlanKey = 'annual';

/** The price shown when the store has no package for a plan (Expo Go, or the SDK unavailable). */
export const PRICE_UNAVAILABLE = 'n/a';
