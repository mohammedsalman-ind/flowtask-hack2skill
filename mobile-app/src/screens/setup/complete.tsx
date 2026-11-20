import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeIn, FadeInUp } from 'react-native-reanimated';

import { AnimatedRing } from '@/components/ui/animated-ring';
import { AppText } from '@/components/ui/app-text';
import { IconButton } from '@/components/ui/icon-button';
import { colors } from '@/theme/colors';
import { radii, screenPadding, shadows, spacing } from '@/theme/theme';

export default function Ready({ onFinish, onBack, saving, error }: {
  onFinish: () => void;
  onBack: () => void;
  saving: boolean;
  error: string;
}) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const draw = setTimeout(() => setProgress(1), 350);
    return () => clearTimeout(draw);
  }, []);

  return (
    <View style={styles.screen}>
      <IconButton icon="chevron-back" label="Back" tone="plain" onPress={onBack} disabled={saving} style={styles.back} />
      {/* drifting tint circles — decorative, behind content */}
      <View style={styles.confetti} pointerEvents="none">
        {[...Array(6)].map((_, i) => (
          <Animated.View
            key={i}
            entering={FadeInUp.duration(700).delay(200 + i * 120)}
            style={[
              styles.circle,
              { backgroundColor: i % 2 ? colors.blushMist : colors.lavenderMist },
              circlePos[i],
            ]}
          />
        ))}
      </View>

      <Animated.View entering={FadeInDown.duration(500).springify().damping(16)} style={styles.center}>
        <AppText variant="display" style={styles.title}>
          You&apos;re ready.
        </AppText>
        <AnimatedRing size={200} strokeWidth={14} progress={progress} animateOnMount>
          <View style={styles.ringCenter}>
            <AppText variant="display" style={styles.dayLabel}>
              Day 1
            </AppText>
            <AppText variant="caption" style={styles.daySub}>
              of your flow
            </AppText>
          </View>
        </AnimatedRing>
        <Animated.View entering={FadeIn.duration(400).delay(900)}>
          <AppText variant="bodySecondary" style={styles.sub}>
            Save your preferences to make FlowTask yours.
          </AppText>
        </Animated.View>
      </Animated.View>

      <Animated.View entering={FadeIn.duration(350).delay(600)} style={styles.footer}>
        {!!error && <AppText accessibilityRole="alert" variant="bodySecondary">{error}</AppText>}
        <Pressable
          accessibilityRole="button"
          onPress={onFinish}
          disabled={saving}
          style={({ pressed }) => [styles.cta, pressed || saving ? styles.pressed : null]}>
          <AppText variant="button" style={styles.ctaLabel}>
            {saving ? 'Saving…' : 'Save and open FlowTask'}
          </AppText>
          <Ionicons name="arrow-forward" size={18} color={colors.derived.onAccent} />
        </Pressable>
      </Animated.View>
    </View>
  );
}

const circlePos: ViewStyle[] = [
  { top: '12%', left: '10%', width: 28, height: 28 },
  { top: '22%', right: '12%', width: 18, height: 18 },
  { top: '40%', left: '6%', width: 14, height: 14 },
  { top: '55%', right: '8%', width: 24, height: 24 },
  { bottom: '28%', left: '14%', width: 16, height: 16 },
  { bottom: '24%', right: '16%', width: 20, height: 20 },
];

const styles = StyleSheet.create({
  back: {
    position: 'absolute',
    top: 56,
    left: screenPadding,
    zIndex: 1,
  },
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: screenPadding,
  },
  confetti: {
    ...StyleSheet.absoluteFillObject,
  },
  circle: {
    position: 'absolute',
    borderRadius: radii.pill,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xl,
  },
  title: {
    color: colors.ink,
    fontSize: 36,
    lineHeight: 42,
  },
  ringCenter: {
    alignItems: 'center',
  },
  dayLabel: {
    color: colors.ink,
    fontSize: 28,
    lineHeight: 34,
  },
  daySub: {
    color: colors.textSecondary,
  },
  sub: {
    textAlign: 'center',
  },
  footer: {
    paddingBottom: 40,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.accent,
    borderRadius: radii.pill,
    paddingVertical: 16,
    ...shadows.floating,
  },
  ctaLabel: {
    color: colors.derived.onAccent,
  },
  pressed: {
    opacity: 0.9,
  },
});
