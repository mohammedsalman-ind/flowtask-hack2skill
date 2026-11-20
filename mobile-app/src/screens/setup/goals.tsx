import type { SetupStepProps } from '../SetupScreen';
import { StyleSheet, View } from 'react-native';

import { AnimatedRing } from '@/components/ui/animated-ring';
import { AppText } from '@/components/ui/app-text';
import { Chip } from '@/components/ui/chip';
import { OnboardingForm } from '@/components/feature/onboarding-form';
import { spacing } from '@/theme/theme';

const GOALS = [
  'Deep work',
  'Study consistently',
  'Move daily',
  'Read more',
  'Inbox zero',
  'Sleep earlier',
  'Plan ahead',
  'Less scrolling',
];
const TARGET = 5;

/**
 * Goals — "What does a good day look like?" Selectable chips with a small
 * ring ticking up per selection (n of 5).
 */
export default function Goals({ preferences, update, onBack, onNext }: SetupStepProps) {
  const selected = preferences.goals;

  const toggle = (g: string) =>
    update({ goals: selected.includes(g) ? selected.filter((goal) => goal !== g) : [...selected, g] });

  return (
    <OnboardingForm
      step={1}
      totalSteps={6}
      eyebrow="Set up 2 of 6"
      title={
        <>
          What does a good{'\n'}day look like?
        </>
      }
      cta={`Continue${selected.length ? ` · ${selected.length}` : ''}`}
      canContinue={selected.length > 0}
      onBack={onBack}
      onNext={onNext}>
      <View style={styles.ringRow}>
        <AnimatedRing size={56} strokeWidth={6} progress={Math.min(1, selected.length / TARGET)}>
          <AppText variant="subtitle" style={styles.ringLabel}>
            {selected.length}/{TARGET}
          </AppText>
        </AnimatedRing>
        <AppText variant="bodySecondary" style={styles.ringHint}>
          Pick up to {TARGET} goals —{'\n'}your rings will follow them.
        </AppText>
      </View>

      <View style={styles.chipWrap}>
        {GOALS.map((g) => (
          <Chip key={g} label={g} selected={selected.includes(g)} onPress={() => toggle(g)} />
        ))}
      </View>
    </OnboardingForm>
  );
}

const styles = StyleSheet.create({
  ringRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  ringLabel: {
    fontSize: 13,
    lineHeight: 16,
  },
  ringHint: {
    flex: 1,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
});
