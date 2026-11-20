import type { SetupStepProps } from '../SetupScreen';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppText } from '@/components/ui/app-text';
import { OnboardingForm } from '@/components/feature/onboarding-form';
import { colors } from '@/theme/colors';
import { radii, shadows, spacing } from '@/theme/theme';
import { SPACES } from '@/utils/spaces';

export default function Spaces({ preferences, update, onBack, onNext }: SetupStepProps) {
  const selected = preferences.spaces;

  const toggle = (id: string) =>
    update({ spaces: selected.includes(id) ? selected.filter((space) => space !== id) : [...selected, id] });

  return (
    <OnboardingForm
      step={2}
      totalSteps={6}
      eyebrow="Set up 3 of 6"
      title={
        <>
          Where does your{'\n'}life happen?
        </>
      }
      cta={`Continue${selected.length ? ` · ${selected.length}` : ''}`}
      canContinue={selected.length > 0}
      onBack={onBack}
      onNext={onNext}>
      <AppText variant="bodySecondary" style={styles.explainer}>
        Choose the spaces you want to see first on your board.
      </AppText>

      <View style={styles.stack}>
        {SPACES.map((s) => {
          const on = selected.includes(s.id);
          return (
            <Pressable
              key={s.id}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              accessibilityLabel={`${s.name} space`}
              onPress={() => toggle(s.id)}
              style={({ pressed }) => [
                styles.card,
                on ? styles.cardOn : null,
                pressed ? styles.pressed : null,
              ]}>
              <View style={styles.cardTop}>
                <View style={[styles.iconChip, on ? styles.iconChipOn : null]}>
                  <Ionicons
                    name={s.icon as keyof typeof Ionicons.glyphMap}
                    size={20}
                    color={on ? colors.derived.onAccent : colors.accentDeep}
                  />
                </View>
                <View style={styles.cardText}>
                  <AppText variant="heading" style={on ? styles.nameOn : styles.name}>
                    {s.name}
                  </AppText>
                  <AppText variant="caption" style={styles.boardsLabel}>
                    {s.description}
                  </AppText>
                </View>
                <View style={[styles.check, on ? styles.checkOn : null]}>
                  {on ? <Ionicons name="checkmark" size={14} color={colors.derived.onAccent} /> : null}
                </View>
              </View>
            </Pressable>
          );
        })}
      </View>

    </OnboardingForm>
  );
}

const styles = StyleSheet.create({
  explainer: {
    marginTop: -spacing.md,
  },
  stack: {
    gap: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadows.card,
  },
  cardOn: {
    borderColor: colors.accent,
    backgroundColor: colors.lavenderMist,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  iconChip: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    backgroundColor: colors.lavenderMist,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconChipOn: {
    backgroundColor: colors.accent,
  },
  cardText: {
    flex: 1,
    gap: 2,
  },
  name: {
    color: colors.ink,
  },
  nameOn: {
    color: colors.accentDeep,
  },
  boardsLabel: {
    color: colors.textSecondary,
  },
  check: {
    width: 24,
    height: 24,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOn: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  pressed: {
    opacity: 0.9,
  },
});
