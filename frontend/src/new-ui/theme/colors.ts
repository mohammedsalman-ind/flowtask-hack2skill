/**
 * FlowTask color palette.
 *
 * Soft blush pink + very light lavender + warm off-white.
 * Pink/lavender are accents on warm neutrals — never full-screen color.
 */

export const colors = {
  /** Primary app background — warm off-white */
  background: '#F8F4F5',
  /** Card / elevated surface */
  surface: '#FFFFFF',

  /** Very light lavender — subtle fills, pressed states */
  lavenderLight: '#EEE8F0',
  /** Soft blush — subtle fills, tint cards */
  blushLight: '#E9D6E2',
  /** Dusty mauve — secondary accent */
  mauve: '#C98EAD',
  /** Soft lavender — secondary accent */
  lavender: '#B9A8D1',
  /** Primary accent — actions, active states, progress */
  accent: '#C982AD',
  /** Pressed/deep accent */
  accentDeep: '#B06A94',

  /** Main text */
  text: '#252326',
  /** Display headline ink — slightly deeper than text */
  ink: '#1F1B1E',
  /** Secondary text */
  textSecondary: '#777278',

  /** Hairlines and card borders */
  border: '#E8E2E6',
  /** Hairline for cards sitting on white */
  hairline: 'rgba(31, 27, 30, 0.08)',

  /** Tint fills — 40%-strength lavender/blush washes */
  lavenderMist: '#F3EEF6',
  blushMist: '#F7EDF3',
  /** Progress-ring track on white surfaces */
  ringTrack: '#EFE7EE',

  /** Sheet/modal scrim */
  overlay: 'rgba(37, 35, 38, 0.35)',

  /** Status colors — muted, never neon */
  success: '#7FA98C',
  warning: '#C9A26A',
  danger: '#C96A6A',

  /**
   * Derived pairings used consistently so components never hardcode colors.
   */
  derived: {
    /** White, for text/icon on accent fills */
    onAccent: '#FFFFFF',
    /** Soft shadow base color */
    shadow: 'rgba(31, 27, 30, 1)',
  },
} as const;

export type FlowTaskColor = keyof typeof colors;
