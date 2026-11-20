/**
 * FlowTask theme — single import surface for the design system.
 */

import { TextStyle } from 'react-native';

import { colors } from './colors';
import { radii } from './radii';
import { screenPadding, spacing } from './spacing';
import { typography, TypographyVariant, fontFamilies } from './typography';

/* ------------------------------------------------------------------ */
/* Elevation — two tiers only                                         */
/* ------------------------------------------------------------------ */

export const shadows = {
  /** Resting cards */
  card: {
    shadowColor: colors.derived.shadow,
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 10,
    elevation: 1,
  },
  /** Floating elements: FAB, tilted hero cards, stacked chips */
  floating: {
    shadowColor: colors.derived.shadow,
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 28,
    elevation: 6,
  },
  /** Tactile button shadow */
  button: {
    shadowColor: colors.derived.shadow,
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 3,
  },
} as const;

export type ShadowTier = keyof typeof shadows;

export const theme = {
  colors,
  typography,
  spacing,
  radii,
  screenPadding,
  shadows,
  fontFamilies,
} as const;

/**
 * Very soft legacy shadow — kept for existing components.
 */
export const softShadow = {
  shadowColor: colors.derived.shadow,
  shadowOpacity: 0.06,
  shadowOffset: { width: 0, height: 4 },
  shadowRadius: 16,
  elevation: 2,
} satisfies TextStyle;

export { colors, radii, screenPadding, spacing, typography, fontFamilies };
export type { TypographyVariant };
