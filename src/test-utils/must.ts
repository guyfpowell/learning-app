// Narrows a value a test expects to exist. A missing one fails with its name,
// not a TypeError at the use site.
export function must<T>(value: T | null | undefined, name: string): T {
  if (value === null || value === undefined) {
    throw new Error(`Expected ${name} to be set, but it was ${value}`);
  }
  return value;
}
