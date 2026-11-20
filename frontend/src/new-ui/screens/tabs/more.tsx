import { Ionicons } from '@/components/ui/web-icons';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { colors } from '@/theme/colors';
import { radii, screenPadding, spacing } from '@/theme/theme';

const GROUPS: {
  title: string;
  items: { label: string; icon: keyof typeof Ionicons.glyphMap; route?: string; hint?: string }[];
}[] = [
  {
    title: 'Flow',
    items: [
      { label: 'Focus Mode', icon: 'timer-outline', route: '/focus', hint: 'Deep work sessions' },
      { label: 'Insights', icon: 'pie-chart-outline', route: '/insights', hint: 'Your circular stats' },
      { label: 'Inbox', icon: 'trail-sign-outline', route: '/tasks', hint: 'Your open tasks' },
    ],
  },
  {
    title: 'Organize',
    items: [
      { label: 'Spaces', icon: 'grid-outline', route: '/tasks', hint: 'Tasks by area' },
      { label: 'Reminders', icon: 'notifications-outline', route: '/tasks', hint: 'Reminder tasks' },
      { label: 'Meetings', icon: 'people-outline', route: '/meetings', hint: 'Meeting notes and actions' },
    ],
  },
  {
    title: 'Account',
    items: [
      { label: 'Profile', icon: 'person-outline', route: '/profile' },
    ],
  },
];

/**
 * More — three labeled groups (Flow / Organize / Account), not a dumping
 * ground. Focus + Insights are the featured entries with hints.
 */
export default function More() {
  const router = useRouter();

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <AppText variant="display" style={styles.title}>
          More
        </AppText>
      </View>

      {GROUPS.map((g) => (
        <View key={g.title} style={styles.group}>
          <AppText variant="micro" style={styles.groupTitle}>
            {g.title}
          </AppText>
          <View style={styles.groupCard}>
            {g.items.map((item, i) => (
              <Pressable
                key={item.label}
                accessibilityRole="button"
                onPress={() => item.route && router.push(item.route as never)}
                style={({ pressed }) => [
                  styles.row,
                  i > 0 ? styles.rowDivider : null,
                  pressed ? styles.pressed : null,
                ]}>
                <View style={styles.iconChip}>
                  <Ionicons name={item.icon} size={18} color={colors.accentDeep} />
                </View>
                <View style={styles.rowText}>
                  <AppText variant="subtitle" style={styles.rowLabel}>
                    {item.label}
                  </AppText>
                  {item.hint ? (
                    <AppText variant="caption" style={styles.rowHint}>
                      {item.hint}
                    </AppText>
                  ) : null}
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
              </Pressable>
            ))}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: screenPadding,
    paddingTop: 64,
    paddingBottom: 120,
    gap: spacing.xl,
  },
  header: {
    gap: spacing.xs,
  },
  title: {
    color: colors.ink,
  },
  group: {
    gap: spacing.md,
  },
  groupTitle: {
    color: colors.textSecondary,
    paddingHorizontal: spacing.xs,
  },
  groupCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
    paddingHorizontal: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    paddingVertical: 14,
  },
  rowDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.hairline,
  },
  iconChip: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    backgroundColor: colors.lavenderMist,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
  },
  rowLabel: {
    color: colors.ink,
  },
  rowHint: {
    color: colors.textSecondary,
  },
  pressed: {
    opacity: 0.85,
  },
});
