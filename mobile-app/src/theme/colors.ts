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
    /** Muted white for disabled buttons */
    onAccentMuted: 'rgba(255, 255, 255, 0.7)',
    /** Soft shadow base color */
    shadow: 'rgba(31, 27, 30, 1)',
  },
} as const;

export type FlowTaskColor = keyof typeof colors;

export type ThemeMode = 'light' | 'dark';

export type AppTheme = {
  mode: ThemeMode;
  background: string;
  surface: string;
  surfaceAlt: string;
  text: string;
  muted: string;
  border: string;
  primary: string;
  primarySoft: string;
  success: string;
  warning: string;
  danger: string;
  blue: string;
  shadow: string;
};

export const themes: Record<ThemeMode, AppTheme> = {
  light: {
    mode: 'light',
    background: '#F8F4F5',
    surface: '#FFFFFF',
    surfaceAlt: '#EEE8F0',
    text: '#252326',
    muted: '#777278',
    border: '#E8E2E6',
    primary: '#C982AD',
    primarySoft: '#F3EEF6',
    success: '#7FA98C',
    warning: '#C9A26A',
    danger: '#C96A6A',
    blue: '#B9A8D1',
    shadow: 'rgba(31, 27, 30, 0.08)',
  },
  dark: {
    mode: 'dark',
    background: '#181517',
    surface: '#231F22',
    surfaceAlt: '#2E292D',
    text: '#FAF6F8',
    muted: '#A9A2A8',
    border: '#3B353A',
    primary: '#D897BF',
    primarySoft: '#3F2B37',
    success: '#8EBD9C',
    warning: '#D6B079',
    danger: '#D67979',
    blue: '#C8B9DD',
    shadow: '#000000',
  },
};
