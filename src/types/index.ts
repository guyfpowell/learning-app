// ─── Auth ────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  role: 'DONOR' | 'VENDOR' | 'ADMIN' | 'RECIPIENT';
  walletBalance: number;
  active: boolean;
  createdAt: string;
}

export interface Paginated<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
}

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

export interface RecipientPublicProfile {
  id: string;
  displayName: string;
  status: 'ACTIVE' | 'SUSPENDED';
  totalRaisedPence: number;
  donorCount: number;
  recentActivity: { date: string; amountPence: number }[];
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

export interface RecipientTransaction {
  id: string;
  type: 'RECIPIENT_DONATION' | 'RECIPIENT_DEBIT';
  amount: number;
  createdAt: string;
  counterpartyLabel: string | null;
  lineItems: { name: string; quantity: number; subtotalPence: number }[];
}

// ─── Wallet & Transactions ────────────────────────────────────────────────────

export interface WalletBalance {
  walletBalance: number;
}

export interface Transaction {
  id: string;
  userId: string;
  amount: number;
  type: 'WALLET_TOPUP' | 'RECIPIENT_DONATION' | 'RECIPIENT_DEBIT';
  referenceId: string | null;
  createdAt: string;
}

// ─── Donations ────────────────────────────────────────────────────────────────

export interface DonationHistoryItem {
  id: string;
  amountPence: number;
  createdAt: string;
  recipientName: string | null;
  recipientId: string | null;
}

export interface SpendRedemption {
  vendorName: string;
  amountPence: number;
  date: string;
  partial: boolean;
}

export interface SpendBreakdown {
  donationId: string;
  recipientId: string;
  recipientName: string;
  totalPence: number;
  spentPence: number;
  remainingPence: number;
  redemptions: SpendRedemption[];
}
