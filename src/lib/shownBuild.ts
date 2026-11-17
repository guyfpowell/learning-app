/**
 * The build the build screen is showing right now. A push for it is not displayed (ADR-020 Decision 7),
 * and the push handler runs outside any component, so the id lives here and not in state.
 */
let shownBuildId: string | null = null;

export function setShownBuildId(buildId: string | null): void {
  shownBuildId = buildId;
}

export function isShownBuild(buildId: string): boolean {
  return shownBuildId === buildId;
}
