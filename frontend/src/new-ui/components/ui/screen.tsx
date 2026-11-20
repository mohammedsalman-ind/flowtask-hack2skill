import { StyleSheet, View, ViewProps } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { colors } from '@/theme/colors';
import { screenPadding, spacing } from '@/theme/theme';

export type ScreenProps = ViewProps & {
  /** Large title at the top of the screen */
  title?: string;
  /** Supporting line under the title */
  subtitle?: string;
  /** Custom content rendered instead of title/subtitle in the header */
  header?: React.ReactNode;
};

/**
 * Base screen surface: warm off-white background, consistent horizontal
 * padding, and an optional title/subtitle header. Screens compose their
 * content inside.
 */
export function Screen({ title, subtitle, header, style, children, ...rest }: ScreenProps) {
  return (
    <View style={[styles.screen, style]} {...rest}>
      <View style={styles.header}>
        {header}
        {header ? null : (
          <>
            {title ? <AppText variant="title">{title}</AppText> : null}
            {subtitle ? <AppText variant="bodySecondary">{subtitle}</AppText> : null}
          </>
        )}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: screenPadding,
  },
  header: {
    gap: spacing.xs,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.lg,
  },
});
