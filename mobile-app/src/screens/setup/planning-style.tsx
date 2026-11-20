import type { SetupStepProps, PlanningStyle } from '../SetupScreen';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { AppText } from '@/components/ui/app-text';
import { OnboardingForm } from '@/components/feature/onboarding-form';
import { colors } from '@/theme/colors';
import { radii, shadows, spacing } from '@/theme/theme';

type StyleId = PlanningStyle;

const STYLES: { id: StyleId; name: string; hint: string }[] = [
  { id: 'structured', name: 'Structured', hint: 'Every hour has a job' },
  { id: 'flexible', name: 'Flexible', hint: 'A calm list, no time pressure' },
  { id: 'both', name: 'Both', hint: 'Blocks for the big things, list for the rest' },
];

const DETAIL: Record<StyleId, string> = {
  structured: 'Today shows tasks due today in chronological order.',
  flexible: 'Today shows tasks due today alongside open tasks without a deadline.',
  both: 'Today shows scheduled tasks first. If your schedule is clear, it shows your task list.',
};

/**
 * Planning Style — Structured / Flexible / Both. Selecting a style updates
 * a preview of the selected planning style.
 */
export default function PlanningStyleStep({ preferences, update, onBack, onNext }: SetupStepProps) {
  const style = preferences.planningStyle;

  return (
    <OnboardingForm
      step={3}
      totalSteps={6}
      eyebrow="Set up 4 of 6"
      title={
        <>
          How do you like{'\n'}to plan?
        </>
      }
      cta="Continue"
      canContinue={style !== null}
      onBack={onBack}
      onNext={onNext}>
      <View style={styles.stack}>
        {STYLES.map((s) => {
          const on = style === s.id;
          return (
            <Pressable
              key={s.id}
              accessibilityRole="radio"
              accessibilityState={on ? { selected: true } : {}}
              accessibilityLabel={s.name}
              onPress={() => update({ planningStyle: s.id })}
              style={({ pressed }) => [
                styles.card,
                on ? styles.cardOn : null,
                pressed ? styles.pressed : null,
              ]}>
              <View style={styles.mock}>{mockFor(s.id, on)}</View>
              <View style={styles.cardText}>
                <AppText variant="heading" style={on ? styles.nameOn : styles.name}>
                  {s.name}
                </AppText>
                <AppText variant="caption" style={styles.hint}>
                  {s.hint}
                </AppText>
              </View>
              <View style={[styles.check, on ? styles.checkOn : null]}>
                {on ? <Ionicons name="checkmark" size={14} color={colors.derived.onAccent} /> : null}
              </View>
            </Pressable>
          );
        })}
      </View>

      {/* Live preview — how Today looks with this planning style */}
      {style ? (
        <Animated.View entering={FadeInDown.duration(350).springify().damping(16)}>
          <View style={styles.previewCard}>
            <AppText variant="micro" style={styles.previewLabel}>
              Your Today will look like
            </AppText>
            <TodayPreview style={style} />
            <AppText variant="caption" style={styles.previewDetail}>
              {DETAIL[style]}
            </AppText>
          </View>
        </Animated.View>
      ) : null}
    </OnboardingForm>
  );
}

function mockFor(id: StyleId, on: boolean) {
  const fill = on ? colors.accent : colors.mauve;
  const soft = on ? colors.lavenderMist : colors.background;
  if (id === 'structured') {
    return (
      <View style={styles.mockBody}>
        <View style={[styles.mockBlock, { backgroundColor: fill, width: '70%' }]} />
        <View style={[styles.mockBlock, { backgroundColor: soft, width: '45%' }]} />
        <View style={[styles.mockBlock, { backgroundColor: fill, width: '60%', opacity: 0.6 }]} />
      </View>
    );
  }
  if (id === 'flexible') {
    return (
      <View style={styles.mockBody}>
        <View style={styles.mockRow}>
          <View style={[styles.mockDot, { backgroundColor: fill }]} />
          <View style={[styles.mockLine, { width: '55%' }]} />
        </View>
        <View style={styles.mockRow}>
          <View style={[styles.mockDot, { backgroundColor: soft, borderWidth: 1, borderColor: colors.border }]} />
          <View style={[styles.mockLine, { width: '40%' }]} />
        </View>
        <View style={styles.mockRow}>
          <View style={[styles.mockDot, { backgroundColor: soft, borderWidth: 1, borderColor: colors.border }]} />
          <View style={[styles.mockLine, { width: '48%' }]} />
        </View>
      </View>
    );
  }
  return (
    <View style={styles.mockBody}>
      <View style={[styles.mockBlock, { backgroundColor: fill, width: '50%' }]} />
      <View style={styles.mockRow}>
        <View style={[styles.mockDot, { backgroundColor: soft, borderWidth: 1, borderColor: colors.border }]} />
        <View style={[styles.mockLine, { width: '45%' }]} />
      </View>
      <View style={[styles.mockBlock, { backgroundColor: soft, width: '65%' }]} />
    </View>
  );
}

/** Miniature Today rendering per planning style. */
function TodayPreview({ style }: { style: StyleId }) {
  return (
    <View style={styles.tvCard}>
      <View style={styles.tvHeader}>
        <View style={styles.tvDot} />
        <View style={[styles.tvLine, { width: '42%' }]} />
      </View>
      {style === 'structured' ? (
        <View style={styles.tvBody}>
          <View style={styles.tvRow}>
            <AppText variant="micro" style={styles.tvTime}>09:00</AppText>
            <View style={[styles.tvBlock, { backgroundColor: colors.blushLight }]} />
          </View>
          <View style={styles.tvRow}>
            <AppText variant="micro" style={styles.tvTime}>11:30</AppText>
            <View style={[styles.tvBlock, { backgroundColor: colors.lavenderLight }]} />
          </View>
          <View style={styles.tvRow}>
            <AppText variant="micro" style={styles.tvTime}>14:00</AppText>
            <View style={[styles.tvBlock, { backgroundColor: colors.blushMist }]} />
          </View>
        </View>
      ) : style === 'flexible' ? (
        <View style={styles.tvBody}>
          {(['60%', '44%', '52%', '38%'] as const).map((w, i) => (
            <View key={i} style={styles.tvRow}>
              <View style={[styles.tvTick, i === 0 ? styles.tvTickDone : null]} />
              <View style={[styles.tvLine, { width: w }]} />
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.tvBody}>
          <View style={styles.tvRow}>
            <AppText variant="micro" style={styles.tvTime}>09:00</AppText>
            <View style={[styles.tvBlock, { backgroundColor: colors.blushLight, width: '56%' }]} />
          </View>
          {(['52%', '40%'] as const).map((w, i) => (
            <View key={i} style={styles.tvRow}>
              <View style={styles.tvTick} />
              <View style={[styles.tvLine, { width: w }]} />
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: spacing.md,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    ...shadows.card,
  },
  cardOn: {
    borderColor: colors.accent,
    backgroundColor: colors.lavenderMist,
  },
  mock: {
    width: 84,
    height: 64,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  mockBody: {
    gap: 6,
  },
  mockBlock: {
    height: 8,
    borderRadius: 4,
  },
  mockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  mockDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  mockLine: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.lavenderLight,
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
  hint: {
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
  previewCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadows.card,
  },
  previewLabel: {
    color: colors.textSecondary,
  },
  previewDetail: {
    color: colors.textSecondary,
  },
  tvCard: {
    backgroundColor: colors.background,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  tvHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  tvDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
  },
  tvBody: {
    gap: spacing.sm,
  },
  tvRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  tvTime: {
    width: 34,
    color: colors.textSecondary,
    textTransform: 'none',
    letterSpacing: 0,
    fontWeight: '400',
  },
  tvBlock: {
    height: 22,
    flex: 1,
    borderRadius: 6,
  },
  tvTick: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.4,
    borderColor: colors.mauve,
  },
  tvTickDone: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  tvLine: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.lavenderLight,
  },
  pressed: {
    opacity: 0.9,
  },
});
