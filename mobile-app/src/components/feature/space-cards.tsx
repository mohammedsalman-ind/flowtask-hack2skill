import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { AppText } from '../ui/app-text';
import { colors } from '../../theme/colors';
import { radii, shadows, spacing } from '../../theme/theme';

export type SpaceCardData = {
  name: string;
  taskCount: number;
  icon: keyof typeof Ionicons.glyphMap;
  /** Slight rotation in degrees for the staggered paper feel */
  tilt?: number;
};

export type SpaceCardsProps = {
  spaces: SpaceCardData[];
  /** Columns (default 2) */
  columns?: number;
  /** Compact mode for in-app use (smaller, no tilt) */
  compact?: boolean;
};

/**
 * Real FlowTask space cards — Work, Personal, Health, Study — with icon
 * chips, task counts, and the tilted staggered paper composition from the
 * Organize story panel. Shared between onboarding and the Tasks screen.
 */
export function SpaceCards({ spaces, columns = 2, compact = false }: SpaceCardsProps) {
  return (
    <View style={styles.grid}>
      {spaces.map((s, i) => (
        <View
          key={s.name}
          style={[
            styles.cell,
            { width: `${100 / columns}%` as const },
            compact ? styles.cellCompact : null,
            !compact && i % 2 === 1 ? styles.cellOffset : null,
          ]}>
          <View
            style={[
              styles.card,
              shadows.card,
              !compact && s.tilt ? { transform: [{ rotate: `${s.tilt}deg` }] } : null,
            ]}>
            <View style={styles.iconChip}>
              <Ionicons name={s.icon} size={compact ? 16 : 20} color={colors.accentDeep} />
            </View>
            <AppText variant={compact ? 'subtitle' : 'heading'} style={styles.name}>
              {s.name}
            </AppText>
            <AppText variant="caption" style={styles.count}>
              {s.taskCount} tasks
            </AppText>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -spacing.sm,
  },
  cell: {
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.lg,
  },
  cellCompact: {
    marginBottom: spacing.md,
  },
  cellOffset: {
    transform: [{ translateY: 14 }],
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  iconChip: {
    width: 38,
    height: 38,
    borderRadius: radii.md,
    backgroundColor: colors.lavenderMist,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  name: {
    color: colors.ink,
  },
  count: {
    color: colors.textSecondary,
  },
});
