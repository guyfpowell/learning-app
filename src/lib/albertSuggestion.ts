import type { UserPath } from '@learning/shared';

/** True when any custom path has a suggestion from Albert waiting for the person to review. */
export function hasAlbertSuggestion(paths: UserPath[] | undefined): boolean {
  return !!paths?.some(p => p.kind === 'custom' && p.hasProposal);
}
