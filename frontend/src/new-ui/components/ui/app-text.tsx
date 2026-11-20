import { Text, TextProps } from 'react-native';

import { theme, TypographyVariant } from '@/theme/theme';

export type AppTextProps = TextProps & {
  /** Typography variant from the FlowTask type scale (defaults to body) */
  variant?: TypographyVariant;
  /** Override text color (defaults to the variant's color) */
  color?: string;
};

/**
 * The single text component for FlowTask. All text should use AppText with a
 * variant so hierarchy stays consistent. Serif `display*` variants are for
 * hero headlines and emotional statements ONLY — see typography.ts.
 */
export function AppText({ variant = 'body', color, style, ...rest }: AppTextProps) {
  return <Text style={[theme.typography[variant], color ? { color } : null, style]} {...rest} />;
}
