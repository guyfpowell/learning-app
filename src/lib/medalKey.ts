/** The app's achievement keys are kebab-case ("clean-sheet"); the medal artwork is keyed in camelCase ("cleanSheet"). */
export function medalKeyOf(achievementKey: string): string {
  return achievementKey.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());
}
