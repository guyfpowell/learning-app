import type { SafeUser, TransactionListItem } from '@pocketchange/shared';

// ─── Shared response types (source of truth: @pocketchange/shared) ───────────
export type {
  Paginated,
  WalletBalance,
  DonationHistoryItem,
  SpendRedemption,
  SpendBreakdown,
  RecipientPublicProfile,
  SafeUser,
  TransactionListItem,
} from '@pocketchange/shared';

// ─── Auth ────────────────────────────────────────────────────────────────────

export type User = SafeUser;

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

// ─── Recipient ────────────────────────────────────────────────────────────────

export interface HomelessRecipient {
  id: string;
  firstName: string;
  lastName: string;
  nickname: string | null;
  qrToken: string;
  shortCode: string;
  status: 'ACTIVE' | 'SUSPENDED';
  balance: number;
  createdByVendorId: string | null;
  dateOfBirth: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Recipient Self-Service ───────────────────────────────────────────────────

export interface RecipientSelfProfile {
  id: string;
  firstName: string;
  lastName: string;
  nickname: string | null;
  shortCode: string;
  qrToken: string;
  status: 'ACTIVE' | 'SUSPENDED';
  balance: number;
}

// NOTE: Shared RecipientPublicInfo has qrToken? (optional). Self-profile
// endpoint always returns qrToken. Kept locally to avoid forcing optional
// chaining on qrToken in lanyard screen. Drift flagged in pc-047.

export interface RecipientTransaction {
  id: string;
  type: 'RECIPIENT_DONATION' | 'RECIPIENT_DEBIT';
  amount: number;
  createdAt: string;
  counterpartyLabel: string | null;
  lineItems: { name: string; quantity: number; subtotalPence: number }[];
}

// ─── Wallet & Transactions ────────────────────────────────────────────────────

export type Transaction = TransactionListItem;
