import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { PlaceholderScreen } from '@/components/ui/placeholder-screen';
import { colors } from '@/theme/colors';
import { screenPadding, spacing } from '@/theme/theme';

export type OnboardingStepProps = {
  title: string;
  note: string;
  /** Route to advance to when Continue is tapped */
  next: string;
  nextLabel?: string;
};

/**
 * Temporary shell for onboarding steps whose final design hasn't been built.
 * Provides only the routing skeleton: a quiet placeholder body and a Continue
 * action that advances the flow.
 */
export function OnboardingStep({ title, note, next, nextLabel = 'Continue' }: OnboardingStepProps) {
  const router = useRouter();

  return (
    <View style={styles.screen}>
      <PlaceholderScreen title={title} note={note} style={styles.body} />
      <View style={styles.footer}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.replace(next as never)}
          style={({ pressed }) => [styles.continueButton, pressed ? styles.pressed : null]}>
          <AppText variant="button" style={styles.continueLabel}>
            {nextLabel}
          </AppText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  body: {
    flex: 1,
  },
  footer: {
    paddingHorizontal: screenPadding,
    paddingBottom: spacing.xxl,
  },
  continueButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
    borderRadius: 999,
    paddingVertical: spacing.md,
  },
  pressed: {
    opacity: 0.85,
  },
  continueLabel: {
    color: colors.derived.onAccent,
  },
});
