/**
 * FlowTask spacing scale.
 *
 * Generous whitespace is a core design rule — prefer the larger steps.
 * Scale: 4pt base grid.
 */

export const spacing = {
  /** 4 — icon-to-label, tight inline gaps */
  xs: 4,
  /** 8 — inline element gaps */
  sm: 8,
  /** 12 — related content gaps, chip padding */
  md: 12,
  /** 16 — default gap between cards/sections */
  lg: 16,
  /** 20 — card internal padding */
  xl: 20,
  /** 24 — section separation */
  xxl: 24,
  /** 32 — screen top/bottom breathing room */
  xxxl: 32,
  /** 40 — hero sections, major separations */
  huge: 40,
} as const;

/** Horizontal screen padding for main content */
export const screenPadding = 20;

export type SpacingToken = keyof typeof spacing;
