import { DEFAULT_RECAP_TIME, formatPreferredTime, type NotificationPreference } from '@learning/shared';

/** A complete notification preference row, recap switch and time included; `overrides` replace any field. */
export function makeNotificationPreference(overrides: Partial<NotificationPreference> = {}): NotificationPreference {
  return {
    id:                    'np1',
    userId:                'u1',
    enableDailyReminder:   false,
    enableStreak:          true,
    enableLessonAvailable: true,
    enableTopicFeedback:   true,
    enableSuggestions:     true,
    enableWeeklyRecap:     true,
    weeklyRecapTime:       formatPreferredTime(DEFAULT_RECAP_TIME),
    createdAt:             new Date().toISOString(),
    updatedAt:             new Date().toISOString(),
    ...overrides,
  };
}
