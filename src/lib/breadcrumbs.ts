import * as Sentry from '@sentry/react-native';

/** Where a breadcrumb comes from, as Sentry groups them. */
export const BREADCRUMB_CATEGORY = {
  albert: 'albert',
  auth: 'auth',
  iap: 'iap',
  lesson: 'lesson',
  paths: 'paths',
  push: 'push',
  settings: 'settings',
  splash: 'splash',
  ui: 'ui',
} as const;
export type BreadcrumbCategory = typeof BREADCRUMB_CATEGORY[keyof typeof BREADCRUMB_CATEGORY];

/** Logs a fail-soft failure (the path keeps its fallback). It carries the error only, never a body or the person's words. */
export function warnBreadcrumb(category: BreadcrumbCategory, message: string, err: unknown): void {
  Sentry.addBreadcrumb({ category, message, level: 'warning', data: { err: String(err) } });
}
