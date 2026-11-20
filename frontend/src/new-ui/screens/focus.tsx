import { Ionicons } from '@/components/ui/web-icons';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, ZoomIn } from '@/components/ui/web-motion';

import { AnimatedRing } from '@/components/ui/animated-ring';
import { AppText } from '@/components/ui/app-text';
import { IconButton } from '@/components/ui/icon-button';
import { colors } from '@/theme/colors';
import { radii, spacing } from '@/theme/theme';

const TOTAL = 25 * 60; // 25 minutes

/**
 * Focus Mode — transparent full-screen modal over the tabs. Large ring
 * timer, pause / +5 / end. Ring bursts accent on completion.
 */
export default function Focus() {
  const router = useRouter();
  const [remaining, setRemaining] = useState(TOTAL);
  const [running, setRunning] = useState(true);
  const interval = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (running) {
      interval.current = setInterval(() => {
        setRemaining((r) => {
          if (r <= 1) {
            setRunning(false);
            return 0;
          }
          return r - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval.current) clearInterval(interval.current);
    };
  }, [running]);

  const mm = String(Math.floor(remaining / 60)).padStart(2, '0');
  const ss = String(remaining % 60).padStart(2, '0');
  const complete = remaining === 0;

  return (
    <View style={styles.root}>
      <Animated.View entering={FadeIn.duration(250)} style={StyleSheet.absoluteFill}>
        <Pressable
          accessibilityLabel="Close focus"
          onPress={() => router.back()}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      <View style={styles.glowWrap} pointerEvents="none">
        <View style={styles.glow} />
      </View>

      <Animated.View entering={FadeInDown.duration(400).springify().damping(18)} style={styles.card}>
        <View style={styles.topRow}>
          <AppText variant="micro" style={styles.eyebrow}>
            Focus session
          </AppText>
          <IconButton icon="close" label="End focus" tone="plain" onPress={() => router.back()} />
        </View>

        <AppText variant="subtitle" style={styles.taskLabel}>
          DB Assignment · deep work
        </AppText>

        <Animated.View entering={ZoomIn.duration(400).springify().damping(14)} style={styles.ringWrap}>
          <AnimatedRing
            size={272}
            strokeWidth={16}
            progress={1 - remaining / TOTAL}
            accentColor={complete ? colors.mauve : colors.accent}
            animateOnChange>
            <View style={styles.center}>
              {complete ? (
                <AppText variant="display" style={styles.completeText}>
                  Complete ♡
                </AppText>
              ) : (
                <>
                  <Text style={styles.timer}>
                    {mm}:{ss}
                  </Text>
                  <AppText variant="caption" style={styles.timerSub}>
                    {running ? 'staying in flow' : 'paused'}
                  </AppText>
                </>
              )}
            </View>
          </AnimatedRing>
        </Animated.View>

        <View style={styles.controls}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={running ? 'Pause' : 'Resume'}
            onPress={() => setRunning((r) => !r)}
            style={[styles.control, styles.controlPrimary]}>
            <Ionicons
              name={running ? 'pause' : 'play'}
              size={22}
              color={colors.derived.onAccent}
            />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add five minutes"
            onPress={() => setRemaining((r) => r + 300)}
            style={styles.control}>
            <AppText variant="subtitle" style={styles.controlLabel}>
              +5 min
            </AppText>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="End session"
            onPress={() => router.back()}
            style={styles.control}>
            <Ionicons name="stop" size={20} color={colors.text} />
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: 'rgba(248, 244, 245, 0.96)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    width: 360,
    height: 360,
    borderRadius: 999,
    backgroundColor: colors.blushMist,
    opacity: 0.7,
  },
  card: {
    alignItems: 'center',
    gap: spacing.xl,
    width: '100%',
    paddingHorizontal: 32,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  eyebrow: {
    color: colors.textSecondary,
  },
  taskLabel: {
    color: colors.ink,
  },
  ringWrap: {
    alignItems: 'center',
  },
  center: {
    alignItems: 'center',
  },
  timer: {
    fontSize: 56,
    lineHeight: 64,
    fontWeight: '300',
    color: colors.ink,
    fontVariant: ['tabular-nums'],
    letterSpacing: 1,
  },
  timerSub: {
    color: colors.textSecondary,
  },
  completeText: {
    color: colors.accentDeep,
    fontSize: 26,
    lineHeight: 32,
    textAlign: 'center',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  control: {
    width: 56,
    height: 56,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlPrimary: {
    width: 64,
    height: 64,
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  controlLabel: {
    color: colors.ink,
    fontSize: 13,
    lineHeight: 16,
  },
});
