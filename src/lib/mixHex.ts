/** Mixes two "#RRGGBB" colours: `t` is how far from `a` toward `b`, 0 to 1. */
export function mixHex(a: string, b: string, t: number): string {
  const channels = (hex: string) => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
  const from = channels(a);
  const to = channels(b);
  return `#${from.map((v, i) => Math.round(v + (to[i] - v) * t).toString(16).padStart(2, '0')).join('')}`;
}
