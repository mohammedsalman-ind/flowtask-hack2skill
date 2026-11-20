/**
 * FlowTask type scale.
 *
 * HARD SPLIT RULE:
 * - Serif (Playfair Display) ONLY for hero headlines and emotional/product
 *   statements — the `display*` variants below.
 * - System sans for everything functional: task titles, metadata, buttons,
 *   navigation, forms, lists.
 */

import { TextStyle } from 'react-native';

import { colors } from './colors';

/** Font family names as loaded in the root layout via useFonts */
export const fontFamilies = {
  serif: 'PlayfairDisplay_600SemiBold',
  serifItalic: 'PlayfairDisplay_600SemiBold_Italic',
  serifBold: 'PlayfairDisplay_700Bold',
} as const;

const base: TextStyle = {
  color: colors.text,
  fontSize: 15,
  lineHeight: 22,
};

/* ------------------------------------------------------------------ */
/* Serif — hero headlines and emotional statements ONLY               */
/* ------------------------------------------------------------------ */

export const typography = {
  /** Welcome hero — 40/46 serif */
  displayXL: {
    ...base,
    color: colors.ink,
    fontFamily: fontFamilies.serif,
    fontSize: 40,
    lineHeight: 46,
    letterSpacing: -0.5,
  },
  /** Screen/onboarding hero — 32/38 serif */
  display: {
    ...base,
    color: colors.ink,
    fontFamily: fontFamilies.serif,
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: -0.3,
  },
  /** Display italic — one emphasized word per hero ("flow", "Jerry") */
  displayItalic: {
    ...base,
    color: colors.ink,
    fontFamily: fontFamilies.serifItalic,
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: -0.3,
  },
  /** Display XL italic — Welcome hero emphasis */
  displayXLItalic: {
    ...base,
    color: colors.ink,
    fontFamily: fontFamilies.serifItalic,
    fontSize: 40,
    lineHeight: 46,
    letterSpacing: -0.5,
  },

  /* ---------------------------------------------------------------- */
  /* Sans — functional UI                                             */
  /* ---------------------------------------------------------------- */

  /** Screen titles — 24/30 */
  title: {
    ...base,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '600' as const,
    letterSpacing: -0.3,
  },
  /** Section headings — 18/24 */
  heading: {
    ...base,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600' as const,
    letterSpacing: -0.2,
  },
  /** Serif section titles — "Up next", space names (editorial, rare) */
  sectionSerif: {
    ...base,
    color: colors.ink,
    fontFamily: fontFamilies.serif,
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: -0.2,
  },
  /** Card titles — 16/22 */
  subtitle: {
    ...base,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '500' as const,
  },
  /** Default body */
  body: { ...base },
  /** De-emphasized body */
  bodySecondary: {
    ...base,
    color: colors.textSecondary,
  },
  /** Meta text — 13/18 */
  caption: {
    ...base,
    fontSize: 13,
    lineHeight: 18,
  },
  /** Micro caps eyebrow — 11/14 ("PLAN", "ORGANIZE", "JERRY") */
  micro: {
    ...base,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700' as const,
    letterSpacing: 1.2,
    textTransform: 'uppercase' as const,
  },
  /** Small caps label — 12/16 */
  label: {
    ...base,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600' as const,
    letterSpacing: 0.5,
    textTransform: 'uppercase' as const,
  },
  /** Buttons — 16/22 */
  button: {
    ...base,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600' as const,
  },
  /** Timer numerals — Focus (sans, tabular feel) */
  timer: {
    ...base,
    color: colors.ink,
    fontSize: 44,
    lineHeight: 52,
    fontWeight: '300' as const,
    letterSpacing: 1,
    fontVariant: ['tabular-nums'] as TextStyle['fontVariant'],
  },
} as const;

export type TypographyVariant = keyof typeof typography;
