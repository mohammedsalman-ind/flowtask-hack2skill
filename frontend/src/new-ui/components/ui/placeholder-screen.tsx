import { StyleSheet, View, ViewProps } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { colors } from '@/theme/colors';
import { radii, screenPadding, spacing } from '@/theme/theme';

export type PlaceholderScreenProps = ViewProps & {
  /** Screen name */
  title: string;
  /** One-line note about what this screen will become */
  note: string;
};

/**
 * Temporary shell content for screens whose final design hasn't been built
 * yet. It establishes routing without inventing product UI.
 */
export function PlaceholderScreen({ title, note, style, ...rest }: PlaceholderScreenProps) {
  return (
    <View style={[styles.container, style]} {...rest}>
      <View style={styles.card}>
        <AppText variant="subtitle">{title}</AppText>
        <AppText variant="bodySecondary">{note}</AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: screenPadding,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.xl,
    gap: spacing.xs,
    maxWidth: 320,
  },
});
