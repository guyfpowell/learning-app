import { donationService } from '../donation.service';

jest.mock('@/lib/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

import api from '@/lib/api';

const mockApi = api as jest.Mocked<typeof api>;

describe('donationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('donateByToken', () => {
    it('calls POST /recipients/scan with token, amount, and Idempotency-Key header', async () => {
      mockApi.post.mockResolvedValueOnce({ data: { donationId: 'don-1' } });

      const result = await donationService.donateByToken('qr-token-abc', 500, 'idem-key-1');

      expect(mockApi.post).toHaveBeenCalledWith(
        '/recipients/scan',
        { token: 'qr-token-abc', amount: 500 },
        { headers: { 'Idempotency-Key': 'idem-key-1' } }
      );
      expect(result.donationId).toBe('don-1');
    });
  });

  describe('donateById', () => {
    it('calls POST /recipients/:id/donate with amount and Idempotency-Key header', async () => {
      mockApi.post.mockResolvedValueOnce({ data: { donationId: 'don-2' } });

      const result = await donationService.donateById('recipient-99', 250, 'idem-key-2');

      expect(mockApi.post).toHaveBeenCalledWith(
        '/recipients/recipient-99/donate',
        { amount: 250 },
        { headers: { 'Idempotency-Key': 'idem-key-2' } }
      );
      expect(result.donationId).toBe('don-2');
    });
  });

  describe('getDonationHistory', () => {
    it('calls GET /users/me/donations with default pagination', async () => {
      const mockData = { donations: [], total: 0, page: 1, limit: 20 };
      mockApi.get.mockResolvedValueOnce({ data: mockData });

      const result = await donationService.getDonationHistory();

      expect(mockApi.get).toHaveBeenCalledWith('/users/me/donations?page=1&limit=20');
      expect(result).toEqual(mockData);
    });

    it('calls with custom page and limit', async () => {
      mockApi.get.mockResolvedValueOnce({ data: { donations: [], total: 50, page: 3, limit: 10 } });

      await donationService.getDonationHistory(3, 10);

      expect(mockApi.get).toHaveBeenCalledWith('/users/me/donations?page=3&limit=10');
    });
  });

  describe('getSpendBreakdown', () => {
    it('calls GET /donations/:id/spend-breakdown', async () => {
      const mockBreakdown = {
        donationId: 'don-1',
        totalPence: 500,
        spentPence: 300,
        remainingPence: 200,
        redemptions: [],
      };
      mockApi.get.mockResolvedValueOnce({ data: mockBreakdown });

      const result = await donationService.getSpendBreakdown('don-1');

      expect(mockApi.get).toHaveBeenCalledWith('/donations/don-1/spend-breakdown');
      expect(result).toEqual(mockBreakdown);
    });
  });
});
