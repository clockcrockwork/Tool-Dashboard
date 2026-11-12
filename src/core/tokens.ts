/** Semantic names remain stable while themes can change values. */
export const requiredTokens = [
  '--td-color-surface',
  '--td-color-text',
  '--td-color-accent',
  '--td-color-error',
  '--td-space-2',
  '--td-radius-card',
] as const;

export type SemanticToken = typeof requiredTokens[number];
export const neutralTheme = {
  '--td-color-surface': '#1a1c24',
  '--td-color-text': '#f5f6f8',
  '--td-color-accent': '#96aefa',
  '--td-color-error': '#ffb8b8',
  '--td-space-2': '0.5rem',
  '--td-radius-card': '1rem',
} satisfies Readonly<Record<SemanticToken, string>>;
