import api from '@/lib/api';

export interface DonationResult {
  donationId: string;
}

export const donationService = {
  /**
   * Donate to a recipient using the raw QR token from a camera scan.
   * Calls the existing POST /recipients/scan endpoint.
   * Returns the new donationId for navigating to the spend breakdown.
   */
  async donateByToken(
    token: string,
    amountPence: number
  ): Promise<DonationResult> {
    const { data } = await api.post<DonationResult>('/recipients/scan', {
      token,
      amount: amountPence,
    });
    return data;
  },

  /**
   * Donate to a recipient using their ID (for short-code initiated donations).
   * Requires backend endpoint: POST /recipients/:id/donate { amount }
   */
  async donateById(
    recipientId: string,
    amountPence: number
  ): Promise<DonationResult> {
    const { data } = await api.post<DonationResult>(
      `/recipients/${recipientId}/donate`,
      { amount: amountPence }
    );
    return data;
  },
};
