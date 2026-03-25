import api from '@/lib/api';
import type { DonationHistoryItem, SpendBreakdown } from '@/types';

export interface DonationResult {
  donationId: string;
}

export interface DonationHistoryResponse {
  donations: DonationHistoryItem[];
  total: number;
  page: number;
  limit: number;
}

export const donationService = {
  /**
   * Donate to a recipient using the raw QR token from a camera scan.
   * Calls the existing POST /recipients/scan endpoint.
   * Returns the new donationId for navigating to the spend breakdown.
   */
  async donateByToken(
    token: string,
    amountPence: number,
    idempotencyKey: string
  ): Promise<DonationResult> {
    const { data } = await api.post<DonationResult>(
      '/recipients/scan',
      { token, amount: amountPence },
      { headers: { 'Idempotency-Key': idempotencyKey } }
    );
    return data;
  },

  /**
   * Donate to a recipient using their ID (for short-code initiated donations).
   * Requires backend endpoint: POST /recipients/:id/donate { amount }
   */
  async donateById(
    recipientId: string,
    amountPence: number,
    idempotencyKey: string
  ): Promise<DonationResult> {
    const { data } = await api.post<DonationResult>(
      `/recipients/${recipientId}/donate`,
      { amount: amountPence },
      { headers: { 'Idempotency-Key': idempotencyKey } }
    );
    return data;
  },

  /**
   * Fetch paginated donation history for the signed-in donor.
   * Backend endpoint: GET /users/me/donations?page=&limit=
   */
  async getDonationHistory(
    page = 1,
    limit = 20
  ): Promise<DonationHistoryResponse> {
    const { data } = await api.get<DonationHistoryResponse>(
      `/users/me/donations?page=${page}&limit=${limit}`
    );
    return data;
  },

  /**
   * Fetch the spend breakdown for a single donation.
   * Backend endpoint: GET /donations/:id/spend-breakdown  (new endpoint required)
   */
  async getSpendBreakdown(donationId: string): Promise<SpendBreakdown> {
    const { data } = await api.get<SpendBreakdown>(
      `/donations/${donationId}/spend-breakdown`
    );
    return data;
  },
};
