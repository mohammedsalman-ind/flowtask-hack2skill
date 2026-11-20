import { StyleSheet, View, ViewProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AnimatedRing } from './animated-ring';
import { AppText } from './app-text';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/theme';

export type EmptyStateProps = ViewProps & {
  /** Serif statement, e.g. "A clear day." */
  title: string;
  sub?: string;
  message?: string;
  /** Optional ring shown above the statement (0–1) */
  ringProgress?: number;
  icon?: keyof typeof Ionicons.glyphMap;
};

/**
 * Quiet empty composition — ring/icon (optional), serif statement, sub-line.
 * Backward compatible with both legacy and new designs.
 */
export function EmptyState({ title, sub, message, ringProgress, icon, style, ...rest }: EmptyStateProps) {
  const subtitle = sub || message;
  return (
    <View style={[styles.wrap, style]} {...rest}>
      {typeof ringProgress === 'number' ? (
        <AnimatedRing size={84} strokeWidth={8} progress={ringProgress}>
          <AppText variant="heading" style={styles.ringPct}>
            {Math.round(ringProgress * 100)}%
          </AppText>
        </AnimatedRing>
      ) : icon ? (
        <Ionicons name={icon} size={36} color={colors.lavender} style={styles.icon} />
      ) : null}
      <AppText variant="sectionSerif" style={styles.title}>
        {title}
      </AppText>
      {subtitle ? (
        <AppText variant="caption" style={styles.sub}>
          {subtitle}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xl,
  },
  icon: {
    marginBottom: spacing.xs,
  },
  ringPct: {
    color: colors.ink,
  },
  title: {
    textAlign: 'center',
  },
  sub: {
    textAlign: 'center',
    color: colors.textSecondary,
    maxWidth: 280,
    lineHeight: 18,
  },
});
