/**
 * FlowTask corner radius scale.
 *
 * Restrained rounded corners: cards get moderate radii, pills fully rounded.
 * xl is reserved for sheets and hero cards only.
 */

export const radii = {
  /** 4 — bubble corners, micro insets */
  xs: 4,
  /** 10 — small chips, inputs, subtle insets */
  sm: 10,
  /** 14 — standard card radius */
  md: 14,
  /** 18 — large cards, meeting cards */
  lg: 18,
  /** 24 — sheets, hero cards only */
  xl: 24,
  /** 999 — pills, circular buttons, full rounding */
  pill: 999,
  full: 999,
} as const;

export type RadiusToken = keyof typeof radii;
