import { useNavigate } from 'react-router-dom';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@/components/ui/web-icons';
import Animated, { FadeIn, FadeInDown } from '@/components/ui/web-motion';

import { AppText } from '@/components/ui/app-text';
import { MiniSchedule } from '@/components/feature/mini-schedule';
import { colors } from '@/theme/colors';
import { radii, screenPadding, shadows, spacing } from '@/theme/theme';

const DEMO_TASKS = [
  { time: '09:00', title: 'Product Review', done: true },
  { time: '11:30', title: 'Team Sync & Notes', done: true },
  { time: '14:00', title: 'Deep Work Focus', done: false },
  { time: '17:00', title: 'Workout & Health', done: false },
];

export default function WelcomeScreen() {
  const navigate = useNavigate();

  return (
    <View style={styles.screen}>
      <View style={styles.hero}>
        <Animated.View entering={FadeInDown.duration(500).springify().damping(16)}>
          <AppText variant="displayXL" style={styles.headline}>
            Your day,{'\n'}finally in{' '}
            <AppText variant="displayXLItalic" style={styles.accent}>
              flow.
            </AppText>
          </AppText>
        </Animated.View>
        <Animated.View entering={FadeIn.duration(400).delay(150)}>
          <AppText variant="bodySecondary" style={styles.support}>
            Plan tasks, manage time, and keep everything that matters in one place.
          </AppText>
        </Animated.View>
      </View>

      <Animated.View
        entering={FadeInDown.duration(500).delay(250).springify().damping(16)}
        style={styles.heroCard}
      >
        <View style={styles.tilt}>
          <MiniSchedule tasks={DEMO_TASKS} />
        </View>
      </Animated.View>

      <Animated.View entering={FadeIn.duration(400).delay(400)} style={styles.footer}>
        <Pressable
          accessibilityRole="button"
          onPress={() => navigate('/intro')}
          style={({ pressed }) => [styles.cta, pressed ? styles.pressed : null]}
        >
          <AppText variant="button" style={styles.ctaLabel}>
            Get started
          </AppText>
          <Ionicons name="arrow-forward" size={18} color={colors.derived.onAccent} />
        </Pressable>

        <Pressable
          accessibilityRole="link"
          onPress={() => navigate('/login')}
          style={styles.loginRow}
        >
          <AppText variant="caption" style={styles.loginText}>
            Already have an account?{' '}
            <AppText variant="caption" style={styles.loginLink}>
              Log in
            </AppText>
          </AppText>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: screenPadding,
    paddingTop: 68,
    paddingBottom: 40,
    justifyContent: 'space-between',
  },
  hero: {
    gap: spacing.sm,
  },
  headline: {
    fontWeight: '700',
    fontSize: 38,
    lineHeight: 46,
    color: colors.ink,
  },
  accent: {
    color: colors.accent,
  },
  support: {
    color: colors.textSecondary,
    fontSize: 16,
    lineHeight: 22,
  },
  heroCard: {
    alignItems: 'center',
    marginVertical: spacing.lg,
  },
  tilt: {
    width: '100%',
    maxWidth: 340,
    transform: [{ rotate: '-1.5deg' }],
  },
  footer: {
    gap: spacing.md,
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
    fontWeight: '700',
  },
  loginRow: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  loginText: {
    color: colors.textSecondary,
  },
  loginLink: {
    color: colors.accentDeep,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
});
