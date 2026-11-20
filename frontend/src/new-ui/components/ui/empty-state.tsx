import { StyleSheet, View, ViewProps } from 'react-native';

import { AnimatedRing } from '@/components/ui/animated-ring';
import { AppText } from '@/components/ui/app-text';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/theme';

export type EmptyStateProps = ViewProps & {
  /** Serif statement, e.g. "A clear day." */
  title: string;
  sub?: string;
  /** Optional ring shown above the statement (0–1) */
  ringProgress?: number;
};

/**
 * Quiet empty composition — ring (optional), serif statement, sub-line.
 * Never a lonely placeholder card.
 */
export function EmptyState({ title, sub, ringProgress, style, ...rest }: EmptyStateProps) {
  return (
    <View style={[styles.wrap, style]} {...rest}>
      {typeof ringProgress === 'number' ? (
        <AnimatedRing size={84} strokeWidth={8} progress={ringProgress}>
          <AppText variant="heading" style={styles.ringPct}>
            {Math.round(ringProgress * 100)}%
          </AppText>
        </AnimatedRing>
      ) : null}
      <AppText variant="sectionSerif" style={styles.title}>
        {title}
      </AppText>
      {sub ? (
        <AppText variant="caption" style={styles.sub}>
          {sub}
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
  ringPct: {
    color: colors.ink,
  },
  title: {
    textAlign: 'center',
  },
  sub: {
    textAlign: 'center',
  },
});
