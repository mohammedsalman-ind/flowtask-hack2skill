import { Ionicons } from '@/components/ui/web-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { BoardSummary } from '@/components/feature/board-summary';
import { SpaceDot } from '@/components/feature/space-dot';
import { TaskRow } from '@/components/feature/task-row';
import { AppText } from '@/components/ui/app-text';
import { EmptyState } from '@/components/ui/empty-state';
import { SectionHeader } from '@/components/ui/section-header';
import {
  Board,
  boardsForSpace,
  tasksForBoard,
  spaces,
  toggleTask,
  subscribeToTasks,
} from '@/lib/store';
import type { Task } from '@/lib/store';
import { TaskEditor } from '../extra';
import { colors } from '@/theme/colors';
import { radii, screenPadding, spacing } from '@/theme/theme';

/**
 * Tasks — Spaces hold Boards. Space strip scopes everything; "All" shows
 * tilted BoardSummary cards; a Space view lists boards as serif-named
 * sections with tasks beneath. Boards drill into /board/[id].
 */
export default function Tasks() {
  const router = useRouter();
  const [spaceId, setSpaceId] = useState<string | 'all'>('all');
  const [editing, setEditing] = useState<Task | null>(null);
  const [, refresh] = useState(0);
  useEffect(() => subscribeToTasks(() => refresh((n) => n + 1)), []);
  const boardsList = useMemo(() => boardsForSpace(spaceId), [spaceId]);

  const openBoard = (b: Board) => router.push(`/board/${b.id}` as never);

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <AppText variant="display" style={styles.title}>
          Tasks
        </AppText>
        <AppText variant="bodySecondary">What do I need to manage?</AppText>
      </View>

      {/* Space strip */}
      <View style={styles.strip}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.stripInner}>
          <SpacePill label="All" active={spaceId === 'all'} onPress={() => setSpaceId('all')} />
          {spaces.map((s) => (
            <SpacePill
              key={s.id}
              label={s.name}
              dot={s.id}
              active={spaceId === s.id}
              onPress={() => setSpaceId(s.id)}
            />
          ))}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="New space"
            style={styles.addSpace}>
            <Ionicons name="add" size={16} color={colors.accentDeep} />
          </Pressable>
        </ScrollView>
      </View>

      {/* Board content */}
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {spaceId === 'all' ? (
          <View style={styles.grid}>
            {boardsList.map((b, i) => (
              <BoardSummary key={b.id} board={b} index={i} onPress={() => openBoard(b)} />
            ))}
          </View>
        ) : (
          boardsList.map((b) => {
            const list = tasksForBoard(b.id);
            return (
              <View key={b.id}>
                <SectionHeader
                  title={b.name}
                  actionLabel={`${list.length} tasks`}
                  onAction={() => openBoard(b)}
                />
                <View style={styles.boardRows}>
                  {list.map((t, i) => (
                    <TaskRow key={t.id} task={t} onToggle={toggleTask} divider={i > 0} onEdit={setEditing} />
                  ))}
                  {list.length === 0 ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Open ${b.name}`}
                      onPress={() => openBoard(b)}>
                      <AppText variant="caption" style={styles.boardEmpty}>
                        Nothing here yet — add the first one.
                      </AppText>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            );
          })
        )}
        {boardsList.length === 0 ? (
          <EmptyState ringProgress={0} title="A quiet space." sub="Start with one task." />
        ) : null}
        <View style={styles.spacer} />
      </ScrollView>
      <TaskEditor task={editing} onClose={() => setEditing(null)} />
    </View>
  );
}

function SpacePill({
  label,
  dot,
  active,
  onPress,
}: {
  label: string;
  dot?: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={active ? { selected: true } : {}}
      onPress={onPress}
      style={({ pressed }) => [
        styles.spacePill,
        active ? styles.spacePillOn : null,
        pressed ? styles.pressed : null,
      ]}>
      {dot ? <SpaceDot spaceId={dot} size={7} /> : null}
      <AppText variant="subtitle" style={active ? styles.spacePillLabelOn : styles.spacePillLabel}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: screenPadding,
    paddingTop: 64,
    gap: spacing.xs,
  },
  title: {
    color: colors.ink,
  },
  strip: {
    paddingTop: spacing.lg,
  },
  stripInner: {
    paddingHorizontal: screenPadding,
    gap: spacing.sm,
  },
  spacePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: 9,
  },
  spacePillOn: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  spacePillLabel: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 18,
  },
  spacePillLabelOn: {
    color: colors.derived.onAccent,
    fontSize: 14,
    lineHeight: 18,
  },
  addSpace: {
    width: 36,
    height: 36,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.mauve,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    paddingHorizontal: screenPadding,
    paddingTop: spacing.xl,
    gap: spacing.xl,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -spacing.sm,
    gap: 0,
  },
  boardRows: {
    marginTop: spacing.sm,
  },
  boardEmpty: {
    color: colors.textSecondary,
    fontStyle: 'italic',
    paddingVertical: spacing.md,
  },
  spacer: {
    height: 120,
  },
  pressed: {
    opacity: 0.9,
  },
});
