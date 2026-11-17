import * as Sentry from '@sentry/react-native';
import { BREADCRUMB_CATEGORY, warnBreadcrumb } from '../breadcrumbs';

describe('warnBreadcrumb', () => {
  beforeEach(() => jest.clearAllMocks());

  it('logs a warning carrying the error', () => {
    warnBreadcrumb(BREADCRUMB_CATEGORY.lesson, 'Lesson load failed', new Error('offline'));
    expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
      category: BREADCRUMB_CATEGORY.lesson, message: 'Lesson load failed', level: 'warning', data: { err: 'Error: offline' },
    });
  });

  it('carries the ids and flags it is given beside the error', () => {
    warnBreadcrumb(BREADCRUMB_CATEGORY.lesson, 'Save toggle failed; reverted', new Error('offline'), { lessonId: 'L1', saved: true });
    expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(expect.objectContaining({
      data: { lessonId: 'L1', saved: true, err: 'Error: offline' },
    }));
  });
});
