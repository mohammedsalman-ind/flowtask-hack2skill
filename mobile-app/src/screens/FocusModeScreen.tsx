import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown, ZoomIn } from 'react-native-reanimated';

import { AnimatedRing } from '../components/ui/animated-ring';
import { AppText } from '../components/ui/app-text';
import { useTasks } from '../context/TasksContext';
import { useTheme } from '../context/ThemeContext';
import { Task } from '../types';
import { colors } from '../theme/colors';
import { radii, spacing } from '../theme/theme';

export type FocusState = 'idle' | 'running' | 'paused' | 'completed';

export const DURATION_OPTIONS = [
  { minutes: 15, label: '15m' },
  { minutes: 25, label: '25m' },
  { minutes: 45, label: '45m' },
  { minutes: 60, label: '60m' },
];

export const DEFAULT_MINUTES = 25;

// Module-level persistence across component unmount
let _persistedEndTimestamp: number | null = null;
let _persistedState: FocusState = 'idle';
let _persistedSelectedMinutes: number = DEFAULT_MINUTES;
let _persistedRemaining: number = DEFAULT_MINUTES * 60;

export default function FocusModeScreen({ navigation, route }: any) {
  const { theme } = useTheme();
  const { tasks, toggleTask, refreshTasks } = useTasks();
  const taskId = route?.params?.taskId as string | undefined;
  const task = tasks.find((t) => t.id === taskId) || null;
  const taskName = task ? task.title : 'Free focus session';

  const initialFocusState =
    _persistedEndTimestamp && _persistedState === 'running'
      ? Date.now() < _persistedEndTimestamp
        ? 'running'
        : 'completed'
      : _persistedState;

  const initialRemaining =
    _persistedEndTimestamp && initialFocusState === 'running'
      ? Math.max(0, Math.ceil((_persistedEndTimestamp - Date.now()) / 1000))
      : _persistedRemaining;

  const [focusState, setFocusState] = useState<FocusState>(initialFocusState);
  const [selectedMinutes, setSelectedMinutes] = useState(_persistedSelectedMinutes);
  const [remainingSeconds, setRemainingSeconds] = useState(initialRemaining);

  const totalSeconds = selectedMinutes * 60;
  const endTimestampRef = useRef<number | null>(_persistedEndTimestamp);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const remainingOnPauseRef = useRef<number>(_persistedRemaining);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const startTimerFrom = useCallback((seconds: number) => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setRemainingSeconds(seconds);
    const end = Date.now() + seconds * 1000;
    endTimestampRef.current = end;
    _persistedEndTimestamp = end;
    _persistedState = 'running';
    setFocusState('running');

    intervalRef.current = setInterval(() => {
      if (!endTimestampRef.current) return;
      const now = Date.now();
      const remaining = Math.max(0, Math.ceil((endTimestampRef.current - now) / 1000));
      setRemainingSeconds(remaining);
      if (remaining <= 0) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        endTimestampRef.current = null;
        _persistedEndTimestamp = null;
        _persistedState = 'completed';
        setFocusState('completed');
      }
    }, 200);
  }, []);

  const pauseTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    remainingOnPauseRef.current = remainingSeconds;
    endTimestampRef.current = null;
    _persistedEndTimestamp = null;
    _persistedState = 'paused';
    setFocusState('paused');
  }, [remainingSeconds]);

  const resumeTimer = useCallback(() => {
    const secs = remainingOnPauseRef.current || remainingSeconds || totalSeconds;
    startTimerFrom(secs);
  }, [remainingSeconds, totalSeconds, startTimerFrom]);

  const resetTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    endTimestampRef.current = null;
    _persistedEndTimestamp = null;
    _persistedState = 'idle';
    _persistedRemaining = totalSeconds;
    setRemainingSeconds(totalSeconds);
    setFocusState('idle');
  }, [totalSeconds]);

  const addFiveMinutes = useCallback(() => {
    const next = remainingSeconds + 5 * 60;
    setRemainingSeconds(next);
    if (focusState === 'running') {
      startTimerFrom(next);
    } else {
      remainingOnPauseRef.current = next;
    }
  }, [focusState, remainingSeconds, startTimerFrom]);

  // Keep module-level state synced
  useEffect(() => {
    _persistedRemaining = remainingSeconds;
    _persistedSelectedMinutes = selectedMinutes;
  }, [remainingSeconds, selectedMinutes]);

  // Sync state if already running on mount
  useEffect(() => {
    if (initialFocusState === 'running' && endTimestampRef.current) {
      intervalRef.current = setInterval(() => {
        if (!endTimestampRef.current) return;
        const now = Date.now();
        const rem = Math.max(0, Math.ceil((endTimestampRef.current - now) / 1000));
        setRemainingSeconds(rem);
        if (rem <= 0) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          endTimestampRef.current = null;
          _persistedEndTimestamp = null;
          _persistedState = 'completed';
          setFocusState('completed');
        }
      }, 200);
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [initialFocusState]);

  const progress = totalSeconds > 0 ? Math.max(0, Math.min(1, 1 - remainingSeconds / totalSeconds)) : 0;
  const isCompleted = focusState === 'completed';

  const handleMarkComplete = () => {
    if (task) {
      toggleTask(task);
      refreshTasks('all');
      Alert.alert('Task completed!', `"${task.title}" has been marked complete.`);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <Animated.View entering={FadeInDown.duration(400)} style={styles.content}>
        {/* Top bar with back navigation */}
        <View style={styles.topBar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() => navigation.goBack()}
            style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color={theme.text} />
          </Pressable>
          <View style={styles.headerTitles}>
            <AppText variant="subtitle" style={[styles.screenTitle, { color: theme.text }]}>
              Focus Mode
            </AppText>
            <AppText variant="caption" style={[styles.screenSub, { color: theme.muted }]}>
              Focus Time
            </AppText>
          </View>
          <View style={{ width: 40 }} />
        </View>

        {/* Task Name Display */}
        <View style={styles.taskBanner}>
          <Ionicons name="ribbon-outline" size={16} color={theme.primary} />
          <AppText variant="caption" style={[styles.taskLabel, { color: theme.text }]}>
            {task ? `${task.title}` : 'Free focus session'}
          </AppText>
        </View>

        {/* Motivational text */}
        <AppText variant="caption" style={[styles.motivationText, { color: theme.muted }]}>
          Stay focused on the present moment.
        </AppText>

        {/* 260pt glowing ring with rotation indicator */}
        <Animated.View entering={ZoomIn.duration(400).springify().damping(14)} style={styles.ringWrap}>
          <View style={[styles.progressRing, { transform: [{ rotate: `${progress * 360}deg` }] }]} />
          <AnimatedRing
            size={260}
            strokeWidth={16}
            progress={progress}
            accentColor={isCompleted ? colors.mauve : theme.primary}
            animateOnChange>
            <View style={styles.center}>
              {isCompleted ? (
                <Animated.View entering={FadeIn.duration(300)} style={styles.completeWrap}>
                  <AppText variant="display" style={styles.completeText}>
                    Complete ♡
                  </AppText>
                  <AppText variant="caption" style={styles.completeSub}>
                    Great momentum. Take a breath.
                  </AppText>
                </Animated.View>
              ) : (
                <>
                  <Text style={[styles.timer, { color: theme.text }]}>
                    {formatTime(remainingSeconds)}
                  </Text>
                  <AppText variant="caption" style={[styles.timerSub, { color: theme.muted }]}>
                    {focusState === 'running'
                      ? 'staying in flow'
                      : focusState === 'paused'
                        ? 'session paused'
                        : 'ready to begin'}
                  </AppText>
                </>
              )}
            </View>
          </AnimatedRing>
        </Animated.View>

        {/* Duration selector when idle */}
        {focusState === 'idle' && (
          <View style={styles.presetsRow}>
            {DURATION_OPTIONS.map((p) => {
              const active = selectedMinutes === p.minutes;
              return (
                <Pressable
                  key={p.minutes}
                  onPress={() => {
                    setSelectedMinutes(p.minutes);
                    setRemainingSeconds(p.minutes * 60);
                  }}
                  style={[styles.presetChip, active && styles.presetChipActive]}>
                  <AppText
                    variant="caption"
                    style={active ? styles.presetTextActive : styles.presetText}>
                    {p.label}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        )}

        {/* Controls */}
        <View style={styles.controls}>
          {focusState === 'running' ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Pause"
              onPress={pauseTimer}
              style={[styles.control, styles.controlPrimary, { backgroundColor: theme.primary }]}>
              <Ionicons name="pause" size={20} color={colors.derived.onAccent} />
              <AppText variant="subtitle" style={styles.controlTextWhite}>Pause</AppText>
            </Pressable>
          ) : focusState === 'paused' ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Resume"
              onPress={resumeTimer}
              style={[styles.control, styles.controlPrimary, { backgroundColor: theme.primary }]}>
              <Ionicons name="play" size={20} color={colors.derived.onAccent} />
              <AppText variant="subtitle" style={styles.controlTextWhite}>Resume</AppText>
            </Pressable>
          ) : isCompleted ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Start Another"
              onPress={resetTimer}
              style={[styles.control, styles.controlPrimary, { backgroundColor: theme.primary }]}>
              <Ionicons name="refresh" size={20} color={colors.derived.onAccent} />
              <AppText variant="subtitle" style={styles.controlTextWhite}>Start Another</AppText>
            </Pressable>
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Start Focus"
              onPress={() => startTimerFrom(remainingSeconds)}
              style={[styles.control, styles.controlPrimary, { backgroundColor: theme.primary }]}>
              <Ionicons name="play" size={20} color={colors.derived.onAccent} />
              <AppText variant="subtitle" style={styles.controlTextWhite}>Start Focus</AppText>
            </Pressable>
          )}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Reset"
            onPress={resetTimer}
            style={styles.controlOutline}>
            <Ionicons name="stop" size={18} color={theme.text} />
            <AppText variant="subtitle" style={[styles.controlText, { color: theme.text }]}>Reset</AppText>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add five minutes"
            onPress={addFiveMinutes}
            style={styles.controlOutline}>
            <AppText variant="subtitle" style={[styles.controlText, { color: theme.text }]}>
              +5 min
            </AppText>
          </Pressable>
        </View>

        {/* Task completion button */}
        {task && task.status !== 'done' && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Mark Task Complete"
            onPress={handleMarkComplete}
            style={styles.completeTaskBtn}>
            <Ionicons name="checkmark-circle-outline" size={18} color={theme.primary} />
            <AppText variant="caption" style={[styles.completeTaskLabel, { color: theme.primary }]}>
              Mark Task Complete
            </AppText>
          </Pressable>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  content: {
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
  },
  topBar: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitles: {
    alignItems: 'center',
  },
  screenTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  screenSub: {
    fontSize: 12,
    marginTop: 2,
  },
  taskBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.full,
    backgroundColor: colors.surface,
    marginBottom: 6,
  },
  taskLabel: {
    fontWeight: '600',
  },
  motivationText: {
    fontStyle: 'italic',
    marginBottom: spacing.lg,
  },
  ringWrap: {
    marginVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  progressRing: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    opacity: 0,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  timer: {
    fontFamily: 'serif',
    fontSize: 48,
    fontWeight: '300',
    letterSpacing: -1,
  },
  timerSub: {
    marginTop: spacing.xs,
    textTransform: 'lowercase',
  },
  completeWrap: {
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  completeText: {
    fontFamily: 'serif',
    fontSize: 26,
    color: colors.mauve,
    textAlign: 'center',
  },
  completeSub: {
    color: colors.textSecondary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  presetsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  presetChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.surface,
  },
  presetChipActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accent,
  },
  presetText: {
    color: colors.textSecondary,
    fontWeight: '600',
  },
  presetTextActive: {
    color: colors.derived.onAccent,
    fontWeight: '700',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  control: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    borderRadius: radii.full,
  },
  controlPrimary: {
    backgroundColor: colors.accent,
  },
  controlOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.surface,
  },
  controlTextWhite: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  controlText: {
    fontWeight: '600',
  },
  completeTaskBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.lg,
    paddingVertical: spacing.xs,
  },
  completeTaskLabel: {
    fontWeight: '700',
  },
});
