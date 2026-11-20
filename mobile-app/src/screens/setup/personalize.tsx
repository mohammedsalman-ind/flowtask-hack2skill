import type { SetupStepProps } from '../SetupScreen';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppText } from '@/components/ui/app-text';
import { Card } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { OnboardingForm } from '@/components/feature/onboarding-form';
import { colors } from '@/theme/colors';
import { radii, spacing } from '@/theme/theme';

const PURPOSES = [
  { id: 'study', label: 'Study', icon: 'school-outline' as const, hint: 'Classes, exams, assignments' },
  { id: 'work', label: 'Work', icon: 'briefcase-outline' as const, hint: 'Projects and meetings' },
  { id: 'personal', label: 'Personal life', icon: 'home-outline' as const, hint: 'Errands and routines' },
  { id: 'everything', label: 'A bit of everything', icon: 'sparkles-outline' as const, hint: 'All of it, in one place' },
];

/**
 * Personalize — what will you mainly use FlowTask for? One primary purpose
 * shapes the starter spaces and Today's focus. Live greeting preview keeps
 * the product responding to you.
 */
export default function Personalize({ preferences, update, onBack, onNext }: SetupStepProps) {
  const { name, purpose, wake } = preferences;

  const greeting =
    wake < 12 ? 'Good morning' : wake < 18 ? 'Good afternoon' : 'Good evening';

  const purposeLabel = PURPOSES.find((p) => p.id === purpose)?.label;

  return (
    <OnboardingForm
      step={0}
      totalSteps={6}
      eyebrow="Set up 1 of 6"
      title={
        <>
          Let&apos;s personalize{'\n'}your flow.
        </>
      }
      cta="Continue"
      canContinue={name.trim().length > 0 && purpose !== null}
      onBack={onBack}
      onNext={onNext}>
      <Field label="Your name" value={name} onChangeText={(name) => update({ name })} placeholder="Ana" maxLength={100} />

      <View style={styles.purposeBlock}>
        <AppText variant="heading">What will you mainly use it for?</AppText>
        <View style={styles.purposeGrid}>
          {PURPOSES.map((p) => {
            const on = purpose === p.id;
            return (
              <Pressable
                key={p.id}
                accessibilityRole="radio"
                accessibilityState={on ? { selected: true } : {}}
                accessibilityLabel={p.label}
                onPress={() => update({ purpose: p.id })}
                style={({ pressed }) => [
                  styles.purposeCard,
                  on ? styles.purposeOn : null,
                  pressed ? styles.pressed : null,
                ]}>
                <View style={[styles.purposeIcon, on ? styles.purposeIconOn : null]}>
                  <Ionicons
                    name={p.icon}
                    size={18}
                    color={on ? colors.derived.onAccent : colors.accentDeep}
                  />
                </View>
                <AppText variant="subtitle" style={on ? styles.purposeLabelOn : styles.purposeLabel}>
                  {p.label}
                </AppText>
                <AppText variant="micro" style={styles.purposeHint}>
                  {p.hint}
                </AppText>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.wakeBlock}>
        <AppText variant="heading">I usually wake up around</AppText>
        <View style={styles.stepper}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Earlier wake time"
            onPress={() => update({ wake: Math.max(4, wake - 1) })}
            style={styles.stepBtn}>
            <Ionicons name="remove" size={18} color={colors.text} />
          </Pressable>
          <AppText variant="title" style={styles.wakeValue}>
            {String(wake).padStart(2, '0')}:00
          </AppText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Later wake time"
            onPress={() => update({ wake: Math.min(11, wake + 1) })}
            style={styles.stepBtn}>
            <Ionicons name="add" size={18} color={colors.text} />
          </Pressable>
        </View>
      </View>

      {/* Live preview — Today's greeting responds as you type */}
      <Card elevated={false} style={styles.preview}>
        <AppText variant="micro" style={styles.previewLabel}>
          Preview
        </AppText>
        <View style={styles.previewRow}>
          <View style={styles.previewDot} />
          <View style={styles.previewText}>
            <AppText variant="title" style={styles.previewGreeting}>
              {greeting}, {name.trim() || 'friend'}.
            </AppText>
            <AppText variant="caption" style={styles.previewSub}>
              {purposeLabel ? `Ready for a ${purposeLabel.toLowerCase()} day` : 'Monday, 15 September'}
            </AppText>
          </View>
        </View>
      </Card>
    </OnboardingForm>
  );
}

const styles = StyleSheet.create({
  purposeBlock: {
    gap: spacing.md,
  },
  purposeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  purposeCard: {
    width: '47%',
    flexGrow: 1,
    alignItems: 'flex-start',
    gap: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  purposeOn: {
    borderColor: colors.accent,
    backgroundColor: colors.lavenderMist,
  },
  purposeIcon: {
    width: 34,
    height: 34,
    borderRadius: radii.md,
    backgroundColor: colors.lavenderMist,
    alignItems: 'center',
    justifyContent: 'center',
  },
  purposeIconOn: {
    backgroundColor: colors.accent,
  },
  purposeLabel: {
    color: colors.ink,
  },
  purposeLabelOn: {
    color: colors.accentDeep,
    fontWeight: '600',
  },
  purposeHint: {
    color: colors.textSecondary,
    textTransform: 'none',
    letterSpacing: 0,
    fontWeight: '400',
  },
  wakeBlock: {
    gap: spacing.md,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xl,
  },
  stepBtn: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wakeValue: {
    color: colors.ink,
    fontVariant: ['tabular-nums'],
    minWidth: 72,
    textAlign: 'center',
  },
  preview: {
    backgroundColor: colors.lavenderMist,
    gap: spacing.sm,
  },
  previewLabel: {
    color: colors.textSecondary,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  previewDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.accent,
  },
  previewText: {
    flex: 1,
  },
  previewGreeting: {
    color: colors.ink,
  },
  previewSub: {
    color: colors.textSecondary,
  },
  pressed: {
    opacity: 0.9,
  },
});
