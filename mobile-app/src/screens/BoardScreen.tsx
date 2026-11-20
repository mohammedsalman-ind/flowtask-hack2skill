import React, { useCallback, useMemo } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { BoardSummary } from '../components/feature/board-summary';
import { AppText } from '../components/ui/app-text';
import { Card } from '../components/ui/card';
import { EmptyState } from '../components/ui/empty-state';
import { SectionHeader } from '../components/ui/section-header';
import { useTasks } from '../context/TasksContext';
import { useAuth } from '../context/AuthContext';
import { SPACES, SpaceInfo } from '../utils/spaces';
import { useSafeBottomPadding } from '../hooks/useSafeBottomPadding';
import { colors } from '../theme/colors';
import { screenPadding, spacing } from '../theme/theme';

export default function BoardScreen({ navigation }: any) {
  const { tasks, loadTasks, refreshTasks, refreshing } = useTasks();
  const { user } = useAuth();
  const preferredSpaces: string[] = user?.user_metadata?.flowtask_setup?.spaces ?? [];
  const orderedSpaces = [...SPACES].sort(
    (a, b) => Number(preferredSpaces.includes(b.id)) - Number(preferredSpaces.includes(a.id))
  );
  const paddingBottom = useSafeBottomPadding(120);

  useFocusEffect(
    useCallback(() => {
      loadTasks('all');
    }, [loadTasks])
  );

  const spaceTasks = useMemo(() => {
    return SPACES.reduce((acc, space) => {
      acc[space.id] = tasks.filter((t) => (t.context || 'work') === space.id);
      return acc;
    }, {} as Record<string, typeof tasks>);
  }, [tasks]);

  const openSpace = (space: SpaceInfo) => {
    navigation.navigate('Tasks', { context: space.id });
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingBottom }]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => refreshTasks('all')}
          tintColor={colors.accent}
        />
      }
      showsVerticalScrollIndicator={false}>
      {/* Header */}
      <Animated.View entering={FadeInDown.duration(400).springify().damping(16)} style={styles.header}>
        <AppText variant="micro" style={styles.eyebrow}>
          FLOWTASK SPACES
        </AppText>
        <AppText variant="display" style={styles.title}>
          Your spaces
        </AppText>
        <AppText variant="bodySecondary">
          Keep every kind of work organized in its own context.
        </AppText>
      </Animated.View>

      {/* Grid of BoardSummary cards */}
      <View style={styles.grid}>
        {orderedSpaces.map((space, i) => (
          <BoardSummary
            key={space.id}
            space={space}
            tasks={spaceTasks[space.id] || []}
            index={i}
            onPress={() => openSpace(space)}
          />
        ))}
      </View>

      {/* Flow Philosophy Card */}
      <Animated.View entering={FadeIn.duration(350).delay(250)} style={styles.philosophySection}>
        <SectionHeader title="How FlowTask thinks" />
        <Card elevated={false} style={styles.philosophyCard}>
          <FlowRule icon="mic-outline" text="Capture thoughts, voice or meetings instantly." />
          <FlowRule icon="sparkles-outline" text="Extract deadlines, priorities and next actions." />
          <FlowRule icon="checkmark-done-outline" text="Execute with calm, single-task focus." />
          <FlowRule icon="time-outline" text="Keep track of commitments and follow-ups." />
        </Card>
      </Animated.View>

      {tasks.length === 0 ? (
        <EmptyState
          ringProgress={0}
          title="Your spaces are ready."
          sub="Create your first task to start organizing your life areas."
        />
      ) : null}
    </ScrollView>
  );
}

function FlowRule({ icon, text }: { icon: any; text: string }) {
  return (
    <View style={styles.ruleRow}>
      <View style={styles.ruleIcon}>
        <AppText variant="caption" color={colors.accentDeep}>
          ✦
        </AppText>
      </View>
      <AppText variant="subtitle" style={styles.ruleText}>
        {text}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: screenPadding,
    paddingTop: 56,
    gap: spacing.xl,
  },
  header: {
    gap: spacing.xs,
  },
  eyebrow: {
    color: colors.accentDeep,
  },
  title: {
    color: colors.ink,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -spacing.sm,
  },
  philosophySection: {
    gap: spacing.xs,
  },
  philosophyCard: {
    gap: spacing.md,
    backgroundColor: colors.surface,
  },
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  ruleIcon: {
    width: 22,
    alignItems: 'center',
  },
  ruleText: {
    flex: 1,
    color: colors.text,
  },
});
