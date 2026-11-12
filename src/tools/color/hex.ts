/** Pure browser/server-safe transformation: accepts exactly #RRGGBB. */
export type RgbColor = Readonly<{ hex: string; r: number; g: number; b: number }>;

export function hexToRgb(value: string): RgbColor {
  if (!/^#[0-9a-fA-F]{6}$/.test(value)) throw new Error('INVALID_HEX');
  const hex = value.toUpperCase();
  return {
    hex,
    r: Number.parseInt(hex.slice(1, 3), 16),
    g: Number.parseInt(hex.slice(3, 5), 16),
    b: Number.parseInt(hex.slice(5, 7), 16),
  };
}
