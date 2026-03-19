// ─── Auth ────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  role: 'DONOR' | 'VENDOR' | 'ADMIN';
  walletBalance: number;
  active: boolean;
  createdAt: string;
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
  totalPence: number;
  spentPence: number;
  remainingPence: number;
  redemptions: SpendRedemption[];
}
