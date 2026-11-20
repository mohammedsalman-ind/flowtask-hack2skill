/**
 * FlowTask theme — single import surface for the design system.
 *
 * Usage:
 *   import { theme } from '@/theme';
 *   theme.colors.accent
 *   theme.typography.display
 */

import { colors } from './colors';
import { radii } from './radii';
import { screenPadding, spacing } from './spacing';
import { typography } from './typography';
import type { TextStyle } from 'react-native';
import type { TypographyVariant } from './typography';

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
} as const;

export type ShadowTier = keyof typeof shadows;

export const theme = {
  colors,
  typography,
  spacing,
  radii,
  screenPadding,
  shadows,
} as const;

/**
 * Very soft legacy shadow — kept for the existing components that use it.
 */
export const softShadow = {
  shadowColor: colors.derived.shadow,
  shadowOpacity: 0.06,
  shadowOffset: { width: 0, height: 4 },
  shadowRadius: 16,
  elevation: 2,
} satisfies TextStyle;

export { colors, radii, screenPadding, spacing, typography };
export type { TypographyVariant };
