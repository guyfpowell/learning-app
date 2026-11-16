import { QueryClient } from '@tanstack/react-query';
import { QUERY_CLIENT_DEFAULTS } from '@/lib/offlineWrites';

/**
 * The app's one query client. Its own module, with no registry import, so `api.ts` can clear it on
 * sign-out without a cycle through the provider and the write registry.
 */
export const queryClient = new QueryClient({ defaultOptions: QUERY_CLIENT_DEFAULTS });
