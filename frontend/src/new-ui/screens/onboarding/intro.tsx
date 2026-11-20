import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Pressable,
  StyleSheet,

  View,
} from 'react-native';
import { Ionicons } from '@/components/ui/web-icons';

import { AppText } from '@/components/ui/app-text';
import { DotProgress } from '@/components/ui/dot-progress';
import { IconButton } from '@/components/ui/icon-button';
import { MiniSchedule } from '@/components/feature/mini-schedule';
import { SpaceCards } from '@/components/feature/space-cards';
import { JerryBubble, UserBubble } from '@/components/feature/jerry-bubble';
import { colors } from '@/theme/colors';
import { radii, screenPadding, shadows, spacing } from '@/theme/theme';

const DEMO_TASKS = [
  { time: '09:00', title: 'Strategy Sync', done: true },
  { time: '11:00', title: 'Review Product Design', done: true },
  { time: '14:30', title: 'Focus Sprint', done: false },
  { time: '16:00', title: 'Client Follow-up', done: false },
];

const DEMO_SPACES = [
  { name: 'Work', taskCount: 8, icon: 'briefcase-outline' as const, tilt: -2 },
  { name: 'Personal', taskCount: 4, icon: 'home-outline' as const, tilt: 1 },
  { name: 'Health', taskCount: 3, icon: 'heart-outline' as const, tilt: 2 },
  { name: 'Study', taskCount: 5, icon: 'school-outline' as const, tilt: -1 },
];

export default function IntroScreen() {
  const navigate = useNavigate();
  const [index, setIndex] = useState(0);

  const goNext = () => {
    if (index < 2) {
      setIndex(index + 1);
    } else {
      navigate('/register');
    }
  };

  return (
    <View style={styles.screen}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <IconButton
          icon="chevron-back"
          label="Previous"
          tone="plain"
          onPress={() => index === 0 ? navigate('/welcome') : setIndex(index - 1)}
        />
        <View style={styles.pillLabel}>
          <AppText variant="caption" style={styles.pillText}>
            {['PLAN', 'ORGANIZE', 'JERRY AI'][index]}
          </AppText>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => navigate('/register')}
        >
          <AppText variant="subtitle" style={styles.skip}>
            Skip
          </AppText>
        </Pressable>
      </View>

      {/* Narrative Pager */}
      <View style={styles.pager}>
        {/* Panel 1: Plan */}
        {index === 0 && <View style={styles.panel}>
          <View style={styles.panelHead}>
            <AppText variant="display" style={styles.panelTitle}>
              Your day, planned{'\n'}in minutes.
            </AppText>
            <AppText variant="bodySecondary" style={styles.panelSub}>
              A continuous timeline rail, focus sessions, and automatic progress rings keep you in flow.
            </AppText>
          </View>
          <View style={styles.visualWrap}>
            <MiniSchedule tasks={DEMO_TASKS} />
          </View>
        </View>}

        {/* Panel 2: Organize */}
        {index === 1 && <View style={styles.panel}>
          <View style={styles.panelHead}>
            <AppText variant="display" style={styles.panelTitle}>
              Everything in its{'\n'}right space.
            </AppText>
            <AppText variant="bodySecondary" style={styles.panelSub}>
              Work, personal, health, and study separated neatly with dedicated color accents and boards.
            </AppText>
          </View>
          <View style={styles.visualWrap}>
            <SpaceCards spaces={DEMO_SPACES} />
          </View>
        </View>}

        {/* Panel 3: Jerry */}
        {index === 2 && <View style={styles.panel}>
          <View style={styles.panelHead}>
            <AppText variant="display" style={styles.panelTitle}>
              Speak your mind.{'\n'}Jerry handles it.
            </AppText>
            <AppText variant="bodySecondary" style={styles.panelSub}>
              Ask Jerry to turn your plans into scheduled tasks.
            </AppText>
          </View>
          <View style={styles.jerryDemoWrap}>
            <UserBubble text="Jerry, remind me to send sprint report tomorrow at 10am" />
            <JerryBubble text="Got it! Scheduled 'Send sprint report' for tomorrow at 10:00 AM in Work space." />
          </View>
        </View>}
      </View>

      {/* Footer Controls */}
      <View style={styles.footer}>
        <DotProgress total={3} index={index} onPress={setIndex} />
        <Pressable
          accessibilityRole="button"
          onPress={goNext}
          style={({ pressed }) => [styles.cta, pressed ? styles.pressed : null]}
        >
          <AppText variant="button" style={styles.ctaLabel}>
            {index === 2 ? 'Get Started' : 'Next'}
          </AppText>
          <Ionicons name="arrow-forward" size={18} color={colors.derived.onAccent} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: 54,
    paddingBottom: 36,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: screenPadding,
    marginBottom: spacing.md,
  },
  pillLabel: {
    backgroundColor: colors.lavenderMist,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: radii.pill,
  },
  pillText: {
    color: colors.accentDeep,
    fontWeight: '700',
    letterSpacing: 1,
    fontSize: 11,
  },
  skip: {
    color: colors.textSecondary,
    fontWeight: '600',
  },
  pager: {
    flex: 1,
  },
  panel: {
    paddingHorizontal: screenPadding,
    justifyContent: 'space-between',
    paddingBottom: spacing.lg,
  },
  panelHead: {
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  panelTitle: {
    fontWeight: '700',
    fontSize: 32,
    lineHeight: 40,
    color: colors.ink,
  },
  panelSub: {
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 4,
  },
  visualWrap: {
    alignItems: 'center',
    marginVertical: spacing.md,
  },
  jerryDemoWrap: {
    gap: spacing.md,
    marginVertical: spacing.md,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: screenPadding,
    paddingTop: spacing.md,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.accent,
    borderRadius: radii.pill,
    paddingHorizontal: 24,
    paddingVertical: 14,
    ...shadows.floating,
  },
  ctaLabel: {
    color: colors.derived.onAccent,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
});
