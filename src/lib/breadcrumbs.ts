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

/** What a breadcrumb may carry beside the error: ids and flags, never a body or the person's words. */
export type BreadcrumbData = Record<string, string | number | boolean>;

/** Logs a fail-soft failure (the path keeps its fallback). It carries the error and `data` only. */
export function warnBreadcrumb(category: BreadcrumbCategory, message: string, err: unknown, data: BreadcrumbData = {}): void {
  Sentry.addBreadcrumb({ category, message, level: 'warning', data: { ...data, err: String(err) } });
}

/** Runs a load and logs a failure before rethrowing it, so the query that called it keeps its error state. */
export async function loggedLoad<T>(category: BreadcrumbCategory, message: string, load: () => Promise<T>, data: BreadcrumbData = {}): Promise<T> {
  try {
    return await load();
  } catch (err) {
    warnBreadcrumb(category, message, err, data);
    throw err;
  }
}
