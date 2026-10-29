/** Upper-cases the first character, for text a person typed in lower case. */
export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
