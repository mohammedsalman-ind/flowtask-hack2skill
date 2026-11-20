import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn } from 'react-native-reanimated';

import { SpaceDot } from '../components/feature/space-dot';
import { TaskRow } from '../components/feature/task-row';
import { AppText } from '../components/ui/app-text';
import { Chip } from '../components/ui/chip';
import { EmptyState } from '../components/ui/empty-state';
import { IconButton } from '../components/ui/icon-button';
import { useTasks } from '../context/TasksContext';
import { Task, TaskContext, TaskFilter, TaskSort } from '../types';
import { SPACES } from '../utils/spaces';
import { useSafeBottomPadding } from '../hooks/useSafeBottomPadding';
import { colors } from '../theme/colors';
import { radii, screenPadding, shadows, spacing } from '../theme/theme';

const filters: { label: string; value: TaskFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Done', value: 'completed' },
  { label: 'High', value: 'high' },
];

const sorts: { label: string; value: TaskSort; icon: keyof typeof Ionicons.glyphMap }[] = [
  { label: 'Due', value: 'due_asc', icon: 'calendar-outline' },
  { label: 'Newest', value: 'created_desc', icon: 'time-outline' },
  { label: 'Priority', value: 'priority', icon: 'flag-outline' },
];

function priorityRank(task: Task) {
  return task.priority === 'high' ? 0 : task.priority === 'medium' ? 1 : 2;
}

function applyFilter(task: Task, filter: TaskFilter) {
  if (filter === 'pending') return task.status !== 'done';
  if (filter === 'completed') return task.status === 'done';
  if (filter === 'high') return task.priority === 'high';
  return true;
}

export default function TasksScreen({ navigation, route }: any) {
  const listPaddingBottom = useSafeBottomPadding(40);
  const { tasks, refreshing, loadTasks, refreshTasks, toggleTask, removeTask, duplicateTask, archiveTask } = useTasks();

  const [filter, setFilter] = useState<TaskFilter>(route?.params?.filter || 'all');
  const [context, setContext] = useState<TaskContext | 'all'>(route?.params?.context || 'all');
  const [sort, setSort] = useState<TaskSort>('due_asc');
  const [query, setQuery] = useState('');

  useFocusEffect(
    useCallback(() => {
      loadTasks('all');
    }, [loadTasks])
  );

  const visibleTasks = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return tasks
      .filter((task) => applyFilter(task, filter))
      .filter((task) => context === 'all' || (task.context || 'work') === context)
      .filter((task) => {
        if (!normalized) return true;
        return `${task.title} ${task.description || ''} ${(task.tags || []).join(' ')}`.toLowerCase().includes(normalized);
      })
      .sort((a, b) => {
        if (sort === 'priority') return priorityRank(a) - priorityRank(b);
        if (sort === 'created_desc') return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
        const aDate = a.due_date ? new Date(a.due_date).getTime() : Number.MAX_SAFE_INTEGER;
        const bDate = b.due_date ? new Date(b.due_date).getTime() : Number.MAX_SAFE_INTEGER;
        return sort === 'due_desc' ? bDate - aDate : aDate - bDate;
      });
  }, [context, filter, query, sort, tasks]);

  const openActionMenu = (task: Task) => {
    Alert.alert(task.title, 'Choose an action', [
      {
        text: task.status === 'done' ? 'Mark pending' : 'Mark complete',
        onPress: () => toggleTask(task),
      },
      { text: 'Duplicate', onPress: () => duplicateTask(task) },
      { text: 'Archive', onPress: () => archiveTask(task) },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => removeTask(task.id),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <IconButton icon="chevron-back" label="Back" onPress={() => navigation.goBack()} />
        <View style={styles.headerTitleWrap}>
          <AppText variant="display" style={styles.title}>
            Tasks
          </AppText>
          <AppText variant="caption" style={styles.subtitle}>
            {visibleTasks.length} {visibleTasks.length === 1 ? 'task' : 'tasks'}
          </AppText>
        </View>
        <IconButton
          icon="add"
          label="Add task"
          tone="plain"
          style={styles.addBtn}
          onPress={() => navigation.navigate('AddTask', { context: context === 'all' ? 'work' : context })}
        />
      </View>

      {/* Search Input */}
      <View style={styles.searchWrap}>
        <View style={[styles.searchBox, shadows.card]}>
          <Ionicons name="search-outline" size={17} color={colors.textSecondary} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search tasks, descriptions, tags…"
            placeholderTextColor={colors.textSecondary}
            style={styles.searchInput}
            clearButtonMode="while-editing"
          />
          {query.length > 0 ? (
            <Pressable onPress={() => setQuery('')}>
              <Ionicons name="close-circle" size={16} color={colors.textSecondary} />
            </Pressable>
          ) : null}
        </View>
      </View>

      {/* Space Pills Strip */}
      <View style={styles.stripWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.stripInner}>
          <Pressable
            onPress={() => setContext('all')}
            style={[styles.spacePill, context === 'all' ? styles.spacePillActive : null]}>
            <AppText
              variant="subtitle"
              style={context === 'all' ? styles.spacePillTextActive : styles.spacePillText}>
              All spaces
            </AppText>
          </Pressable>
          {SPACES.map((s) => {
            const active = context === s.id;
            return (
              <Pressable
                key={s.id}
                onPress={() => setContext(s.id as TaskContext)}
                style={[styles.spacePill, active ? styles.spacePillActive : null]}>
                <SpaceDot spaceId={s.id} size={7} />
                <AppText
                  variant="subtitle"
                  style={active ? styles.spacePillTextActive : styles.spacePillText}>
                  {s.name}
                </AppText>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Filter and Sort bar */}
      <View style={styles.controlsRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersInner}>
          {filters.map((item) => (
            <Chip
              key={item.value}
              label={item.label}
              selected={filter === item.value}
              onPress={() => setFilter(item.value)}
            />
          ))}
          <View style={styles.sortDivider} />
          {sorts.map((item) => {
            const active = sort === item.value;
            return (
              <Chip
                key={item.value}
                label={item.label}
                selected={active}
                onPress={() => setSort(item.value)}
              />
            );
          })}
        </ScrollView>
      </View>

      {/* Task List */}
      <FlatList
        data={visibleTasks}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.listContent, { paddingBottom: listPaddingBottom }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => refreshTasks('all')}
            tintColor={colors.accent}
          />
        }
        renderItem={({ item, index }) => (
          <TouchableOpacity
            activeOpacity={0.85}
            onLongPress={() => openActionMenu(item)}
            delayLongPress={350}>
            <TaskRow
              task={item}
              divider={index > 0}
              onToggle={() => toggleTask(item)}
              onPress={() => navigation.navigate('TaskDetail', { taskId: item.id })}
            />
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Animated.View entering={FadeIn.duration(300)}>
            <EmptyState
              title={query ? 'No matching tasks' : 'All clear.'}
              sub={query ? 'Try a different search term.' : 'No tasks found in this space.'}
            />
          </Animated.View>
        }
      />
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
    paddingHorizontal: screenPadding,
    paddingTop: 54,
    paddingBottom: spacing.sm,
  },
  headerTitleWrap: {
    flex: 1,
    marginLeft: spacing.md,
  },
  title: {
    color: colors.ink,
    fontSize: 28,
  },
  subtitle: {
    color: colors.textSecondary,
  },
  addBtn: {
    backgroundColor: colors.accent,
    borderRadius: radii.pill,
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchWrap: {
    paddingHorizontal: screenPadding,
    marginTop: spacing.xs,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.ink,
    padding: 0,
  },
  stripWrap: {
    paddingTop: spacing.md,
  },
  stripInner: {
    paddingHorizontal: screenPadding,
    gap: spacing.sm,
  },
  spacePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: colors.surface,
    paddingVertical: 7,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  spacePillActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  spacePillText: {
    color: colors.text,
    fontSize: 14,
  },
  spacePillTextActive: {
    color: colors.derived.onAccent,
    fontWeight: '600',
    fontSize: 14,
  },
  controlsRow: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  filtersInner: {
    paddingHorizontal: screenPadding,
    gap: spacing.xs,
    alignItems: 'center',
  },
  sortDivider: {
    width: 1,
    height: 18,
    backgroundColor: colors.border,
    marginHorizontal: spacing.xs,
  },
  listContent: {
    paddingHorizontal: screenPadding,
    paddingTop: spacing.sm,
  },
});
