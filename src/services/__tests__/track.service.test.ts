import { trackService } from '../track.service';

jest.mock('@/lib/api', () => ({
  __esModule: true,
  default: { post: jest.fn() },
}));

import api from '@/lib/api';

const mockApi = api as jest.Mocked<typeof api>;

describe('trackService skips send the picked reason (079c)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockApi.post.mockResolvedValue({ data: {} });
  });

  it.each([
    ['lesson', 'track', 's1', 'not_now', '/enrollments/track/s1/skip-lesson'],
    ['topic', 'custom', 'p1', 'already_know', '/enrollments/custom/p1/skip-topic'],
    ['level', 'track', 's1', 'not_for_me', '/enrollments/track/s1/skip-level'],
  ] as const)('a %s skip POSTs { reason } to its own route', async (scope, kind, id, reason, route) => {
    await trackService.skip({ kind, id, scope, reason });
    expect(mockApi.post).toHaveBeenCalledWith(route, { reason });
  });
});

describe('trackService.topicFeedback (079d)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockApi.post.mockResolvedValue({ data: {} });
  });

  it('POSTs the answer to the custom path route', async () => {
    const body = { stableKey: 'topic-a', dismissed: false, level: 'lost_me' } as const;
    await trackService.topicFeedback('p1', body);
    expect(mockApi.post).toHaveBeenCalledWith('/enrollments/custom/p1/topic-feedback', body);
  });

  it('POSTs a dismissal carrying nothing else', async () => {
    await trackService.topicFeedback('p1', { stableKey: 'topic-a', dismissed: true });
    expect(mockApi.post).toHaveBeenCalledWith('/enrollments/custom/p1/topic-feedback', { stableKey: 'topic-a', dismissed: true });
  });
});
