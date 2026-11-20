import type { SetupStepProps } from '../SetupScreen';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { AppText } from '@/components/ui/app-text';
import { Toggle } from '@/components/ui/toggle';
import { OnboardingForm } from '@/components/feature/onboarding-form';
import { colors } from '@/theme/colors';
import { radii, shadows, spacing } from '@/theme/theme';

const OPTIONS = [
  { id: 'plan', icon: 'sunny-outline' as const, name: 'Daily plan', hint: 'A gentle nudge each morning' },
  { id: 'reminders', icon: 'notifications-outline' as const, name: 'Task reminders', hint: 'Alerts for scheduled tasks' },
] as const;

export default function Notifications({ preferences, update, onBack, onNext }: SetupStepProps) {
  const on = preferences.notifications;

  return (
    <OnboardingForm
      step={4}
      totalSteps={6}
      eyebrow="Set up 5 of 6"
      title={
        <>
          Stay gently{'\n'}on track.
        </>
      }
      cta="Continue"
      canContinue
      onBack={onBack}
      onNext={onNext}>
      {/* Why — show the actual nudges before requesting anything */}
      <Animated.View entering={FadeInDown.duration(400).springify().damping(16)}>
        <View style={styles.previewWrap}>
          <View style={styles.previewHeader}>
            <AppText variant="micro" style={styles.previewLabel}>
              Here&apos;s what you&apos;ll see
            </AppText>
          </View>
          <View style={styles.nudgeCard}>
            <View style={styles.nudgeTop}>
              <View style={styles.nudgeIcon}>
                <Ionicons name="sunny-outline" size={13} color={colors.accentDeep} />
              </View>
              <AppText variant="micro" style={styles.nudgeApp}>
                FLOWTASK · NOW
              </AppText>
            </View>
            <AppText variant="subtitle" style={styles.nudgeTitle}>
              Your day is planned ✨
            </AppText>
            <AppText variant="caption" style={styles.nudgeBody}>
              3 tasks today — DB Assignment at 09:00 comes first.
            </AppText>
          </View>
          <View style={[styles.nudgeCard, styles.nudgeCardDim]}>
            <View style={styles.nudgeTop}>
              <View style={[styles.nudgeIcon, styles.nudgeIconBlush]}>
                <Ionicons name="notifications-outline" size={13} color={colors.accentDeep} />
              </View>
              <AppText variant="micro" style={styles.nudgeApp}>
                FLOWTASK · 20 MIN
              </AppText>
            </View>
            <AppText variant="subtitle" style={styles.nudgeTitle}>
              Team Meeting starts soon
            </AppText>
            <AppText variant="caption" style={styles.nudgeBody}>
              11:30 · with the design team
            </AppText>
          </View>
        </View>
      </Animated.View>

      <AppText variant="bodySecondary" style={styles.explainer}>
        Choose a morning agenda reminder, alerts before task deadlines, or both.
      </AppText>

      <View style={styles.stack}>
        {OPTIONS.map((o) => (
          <View key={o.id} style={styles.row}>
            <View style={styles.iconChip}>
              <Ionicons name={o.icon} size={18} color={colors.accentDeep} />
            </View>
            <View style={styles.rowText}>
              <AppText variant="heading">{o.name}</AppText>
              <AppText variant="caption" style={styles.hint}>
                {o.hint}
              </AppText>
            </View>
            <Toggle
              value={!!on[o.id]}
              onValueChange={(value) => update({ notifications: { ...on, [o.id]: value } })}
              label={o.name}
            />
          </View>
        ))}
      </View>
      <AppText variant="caption" style={styles.note}>
        You can change these anytime in Settings.
      </AppText>
    </OnboardingForm>
  );
}

const styles = StyleSheet.create({
  previewWrap: {
    gap: spacing.sm,
  },
  previewHeader: {
    alignItems: 'center',
  },
  previewLabel: {
    color: colors.textSecondary,
  },
  nudgeCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
    padding: spacing.lg,
    gap: 4,
    ...shadows.card,
  },
  nudgeCardDim: {
    opacity: 0.85,
  },
  nudgeTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: 2,
  },
  nudgeIcon: {
    width: 22,
    height: 22,
    borderRadius: 7,
    backgroundColor: colors.lavenderMist,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nudgeIconBlush: {
    backgroundColor: colors.blushMist,
  },
  nudgeApp: {
    color: colors.textSecondary,
    letterSpacing: 1,
  },
  nudgeTitle: {
    color: colors.ink,
  },
  nudgeBody: {
    color: colors.textSecondary,
  },
  explainer: {
    marginTop: -spacing.sm,
  },
  stack: {
    gap: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
    padding: spacing.lg,
  },
  iconChip: {
    width: 38,
    height: 38,
    borderRadius: radii.md,
    backgroundColor: colors.lavenderMist,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  hint: {
    color: colors.textSecondary,
  },
  note: {
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
