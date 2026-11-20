import { Ionicons } from '@/components/ui/web-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeInDown, FadeIn } from '@/components/ui/web-motion';

import { SpaceDot } from '@/components/feature/space-dot';
import { TaskRow } from '@/components/feature/task-row';
import { AnimatedRing } from '@/components/ui/animated-ring';
import { AppText } from '@/components/ui/app-text';
import { EmptyState } from '@/components/ui/empty-state';
import { IconButton } from '@/components/ui/icon-button';
import {
  addTask,
  boardById,
  spaceName,
  subscribeToTasks,
  tasks,
  toggleTask,
} from '@/lib/store';
import type { Task } from '@/lib/store';
import { TaskEditor } from '../extra';
import { colors } from '@/theme/colors';
import { radii, screenPadding, shadows, spacing } from '@/theme/theme';

/**
 * Board detail — a stack route above the tabs: serif board title, SpaceDot
 * context, board ring, full task list between hairlines, pinned quick-add.
 */
export default function BoardDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const board = boardById(String(id));
  const [, bump] = useState(0);
  const [editing, setEditing] = useState<Task | null>(null);

  // Re-render on store changes (toggles and creates from anywhere)
  useEffect(() => subscribeToTasks(() => bump((n) => n + 1)), []);

  if (!board) {
    return (
      <View style={styles.screen}>
        <View style={styles.header}>
          <IconButton icon="chevron-back" label="Back" onPress={() => router.back()} />
        </View>
        <EmptyState title="Board not found." sub="It may have been removed." />
      </View>
    );
  }

  const list = tasks.filter((t) => t.boardId === board.id);
  const done = list.filter((t) => t.done).length;
  const pct = list.length ? done / list.length : 0;

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <IconButton icon="chevron-back" label="Back" onPress={() => router.back()} />
        <View style={styles.headerContext}>
          <SpaceDot spaceId={board.spaceId} size={7} />
          <AppText variant="caption" style={styles.headerContextLabel}>
            {spaceName(board.spaceId)}
          </AppText>
        </View>
        <AnimatedRing size={40} strokeWidth={4.5} progress={pct} animateOnMount={false}>
          <AppText variant="micro" style={styles.headerPct}>
            {Math.round(pct * 100)}%
          </AppText>
        </AnimatedRing>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.duration(400).springify().damping(16)}>
          <AppText variant="display" style={styles.title}>
            {board.name}
          </AppText>
          <AppText variant="bodySecondary">
            {done} of {list.length} complete
          </AppText>
        </Animated.View>

        <View style={styles.list}>
          {list.map((t, i) => (
            <Animated.View key={t.id} entering={FadeIn.duration(320).delay(140 + i * 55)}>
              <TaskRow task={t} compact onToggle={toggleTask} divider={i > 0} onEdit={setEditing} />
            </Animated.View>
          ))}
          {list.length === 0 ? (
            <EmptyState
              ringProgress={0}
              title={`Nothing in ${board.name} yet.`}
              sub="Add the first one below."
            />
          ) : null}
        </View>
      </ScrollView>
      <TaskEditor task={editing} onClose={() => setEditing(null)} />

      <View style={styles.quickAddWrap}>
        <QuickAdd boardId={board.id} />
      </View>
    </View>
  );
}

function QuickAdd({ boardId }: { boardId: string }) {
  const [title, setTitle] = useState('');

  const submit = () => {
    const trimmed = title.trim();
    if (!trimmed) return;
    const board = boardById(boardId);
    addTask({ title: trimmed, boardId, spaceId: board?.spaceId ?? 'personal' });
    setTitle('');
  };

  return (
    <View style={[styles.quickAdd, shadows.floating]}>
      <TextInput
        accessibilityLabel="Add to board"
        placeholder="Add to this board…"
        placeholderTextColor={colors.textSecondary}
        value={title}
        onChangeText={setTitle}
        onSubmitEditing={submit}
        returnKeyType="done"
        style={styles.quickAddInput}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Add task"
        onPress={submit}
        style={({ pressed }) => [styles.quickAddBtn, pressed ? styles.pressed : null]}>
        <Ionicons name="add" size={18} color={colors.derived.onAccent} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingHorizontal: screenPadding,
    paddingTop: 56,
  },
  headerContext: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    justifyContent: 'center',
  },
  headerContextLabel: {
    color: colors.textSecondary,
  },
  headerPct: {
    fontSize: 9,
    lineHeight: 11,
    color: colors.ink,
  },
  content: {
    paddingHorizontal: screenPadding,
    paddingTop: spacing.xl,
    paddingBottom: 140,
    gap: spacing.xl,
  },
  title: {
    color: colors.ink,
  },
  list: {
    gap: 0,
  },
  quickAddWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: screenPadding,
    paddingBottom: spacing.xl,
  },
  quickAdd: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingLeft: spacing.lg,
    paddingRight: 6,
    paddingVertical: 6,
  },
  quickAddInput: {
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
    color: colors.text,
    paddingVertical: 8,
  },
  quickAddBtn: {
    width: 38,
    height: 38,
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.85,
  },
});
