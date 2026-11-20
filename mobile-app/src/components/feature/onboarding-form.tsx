import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { AppText } from '@/components/ui/app-text';
import { DotProgress } from '@/components/ui/dot-progress';
import { IconButton } from '@/components/ui/icon-button';
import { colors } from '@/theme/colors';
import { radii, screenPadding, shadows, spacing } from '@/theme/theme';

export type OnboardingFormProps = {
  /** Position in the setup flow (0-based) */
  step: number;
  totalSteps: number;
  eyebrow: string;
  /** Serif question — the emotional statement */
  title: React.ReactNode;
  children: React.ReactNode;
  /** CTA label */
  cta: string;
  /** Enabled state of the CTA */
  canContinue: boolean;
  onNext: () => void;
  onBack: () => void;
};

/**
 * Shared shell for Phase 3 setup steps: progress dots, back chevron, serif
 * question, scrollable body, pinned pill CTA. Keyboard-aware.
 */
export function OnboardingForm({
  step,
  totalSteps,
  eyebrow,
  title,
  children,
  cta,
  canContinue,
  onNext,
  onBack,
}: OnboardingFormProps) {
  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.topBar}>
        <IconButton icon="chevron-back" label="Back" tone="plain" onPress={onBack} />
        <View style={styles.dotsWrap}>
          <AppText variant="micro" style={styles.eyebrow}>
            {eyebrow}
          </AppText>
          <DotProgress total={totalSteps} index={step} />
        </View>
        <View style={styles.backSlot} />
      </View>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.duration(450).springify().damping(16)} style={styles.head}>
          <AppText variant="display" style={styles.title}>
            {title}
          </AppText>
        </Animated.View>
        <Animated.View entering={FadeIn.duration(350).delay(120)}>{children}</Animated.View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          accessibilityRole="button"
          disabled={!canContinue}
          onPress={onNext}
          style={({ pressed }) => [
            styles.cta,
            canContinue ? null : styles.ctaDisabled,
            pressed && canContinue ? styles.pressed : null,
          ]}>
          <AppText variant="button" style={styles.ctaLabel}>
            {cta}
          </AppText>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: screenPadding,
    paddingTop: 56,
  },
  backSlot: {
    width: 40,
  },
  dotsWrap: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  eyebrow: {
    color: colors.textSecondary,
  },
  body: {
    paddingHorizontal: screenPadding,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.huge,
    gap: spacing.xl,
  },
  head: {
    gap: spacing.sm,
  },
  title: {
    color: colors.ink,
  },
  footer: {
    paddingHorizontal: screenPadding,
    paddingBottom: 36,
  },
  cta: {
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: radii.pill,
    paddingVertical: 16,
    ...shadows.floating,
  },
  ctaDisabled: {
    backgroundColor: colors.lavenderLight,
  },
  ctaLabel: {
    color: colors.derived.onAccent,
  },
  pressed: {
    opacity: 0.9,
  },
});
