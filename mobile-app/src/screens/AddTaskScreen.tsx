import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppText } from '../components/ui/app-text';
import { AppButton } from '../components/ui';
import { Field } from '../components/ui/field';
import { IconButton } from '../components/ui/icon-button';
import { SpaceDot } from '../components/feature/space-dot';
import { useTasks } from '../context/TasksContext';
import { useTheme } from '../context/ThemeContext';
import { useSafeBottomPadding } from '../hooks/useSafeBottomPadding';
import { colors } from '../theme/colors';
import { radii, screenPadding, shadows, spacing } from '../theme/theme';
import { RecurrenceType, TaskContext, TaskPriority, TaskStatus } from '../types';
import { spaceAccent, spaceName } from '../utils/spaces';

const priorities: { label: string; value: TaskPriority; color: string }[] = [
  { label: 'Low', value: 'low', color: '#10B981' },
  { label: 'Medium', value: 'medium', color: '#F59E0B' },
  { label: 'High', value: 'high', color: '#EF4444' },
];

const recurrenceOptions: { label: string; value: RecurrenceType }[] = [
  { label: 'Does not repeat', value: 'none' },
  { label: 'Every day', value: 'daily' },
  { label: 'Every weekday', value: 'weekdays' },
  { label: 'Every week', value: 'weekly' },
  { label: 'Every month', value: 'monthly' },
];

const reminderOptions: { label: string; value: number | null }[] = [
  { label: 'None', value: null },
  { label: 'At due time', value: 0 },
  { label: '5 min before', value: 5 },
  { label: '15 min before', value: 15 },
  { label: '30 min before', value: 30 },
  { label: '1 hour before', value: 60 },
  { label: '1 day before', value: 1440 },
];

function parseDueDateTime(dateValue: string, timeValue: string) {
  if (!dateValue.trim()) return null;
  const dateMatch = dateValue.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!dateMatch) {
    const parsed = new Date(dateValue);
    if (Number.isNaN(parsed.getTime())) {
      throw new Error('Use a due date like 2026-07-15 or July 15, 2026.');
    }
    return parsed.toISOString();
  }
  const [, year, month, day] = dateMatch;
  let hours = 12;
  let minutes = 0;
  const timeMatch = timeValue.trim().match(/^(\d{1,2}):?(\d{2})?\s*(AM|PM)?$/i);
  if (timeMatch) {
    hours = Number(timeMatch[1]);
    minutes = Number(timeMatch[2] || '0');
    const suffix = timeMatch[3];
    if (suffix) {
      const isPM = suffix.toUpperCase() === 'PM';
      if (hours === 12) hours = isPM ? 12 : 0;
      else hours = isPM ? hours + 12 : hours;
    }
  }
  const d = new Date(Number(year), Number(month) - 1, Number(day), hours, minutes);
  return d.toISOString();
}

function parseTags(value: string) {
  return value
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export default function AddTaskScreen({ navigation, route }: any) {
  const { theme } = useTheme();
  const paddingBottom = useSafeBottomPadding(40);
  const { tasks, createTask, updateTask } = useTasks();
  const editingTask = tasks.find((task) => task.id === route?.params?.taskId);

  const [title, setTitle] = useState(editingTask?.title || '');
  const [description, setDescription] = useState(editingTask?.description || '');
  const [dueDate, setDueDate] = useState(editingTask?.due_date ? editingTask.due_date.slice(0, 10) : '');
  const [dueTime, setDueTime] = useState(() => {
    if (editingTask?.due_date) {
      const d = new Date(editingTask.due_date);
      const h = d.getUTCHours();
      const m = d.getUTCMinutes();
      return h === 12 && m === 0 ? '' : `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }
    return '';
  });
  const [priority, setPriority] = useState<TaskPriority>(editingTask?.priority || 'medium');
  const [status, setStatus] = useState<TaskStatus>(editingTask?.status || 'todo');
  const [tags, setTags] = useState(editingTask?.tags.join(', ') || '');
  const [context, setContext] = useState<TaskContext>(editingTask?.context || route?.params?.context || 'work');
  const [assignee, setAssignee] = useState(editingTask?.assignee || '');
  const [recurrence, setRecurrence] = useState<RecurrenceType>(editingTask?.recurrence || 'none');
  const [recurrenceEndDate, setRecurrenceEndDate] = useState(
    editingTask?.recurrence_end_date ? editingTask.recurrence_end_date.slice(0, 10) : ''
  );
  const [reminderMinutes, setReminderMinutes] = useState<number | null>(
    editingTask?.reminder_minutes ?? (route?.params?.reminder ? 15 : null)
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!title.trim()) {
      setError('Task title is required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        due_date: parseDueDateTime(dueDate, dueTime),
        priority,
        status,
        tags: parseTags(tags),
        context,
        assignee: assignee.trim() || null,
        recurrence,
        recurrence_end_date:
          recurrence !== 'none' && recurrenceEndDate.trim()
            ? parseDueDateTime(recurrenceEndDate, '')
            : null,
        reminder_minutes: reminderMinutes,
      };
      if (editingTask) {
        await updateTask(editingTask.id, payload);
        Alert.alert('Task updated', 'Your changes were saved.');
        navigation.goBack();
      } else {
        await createTask(payload);
        Alert.alert('Task saved', 'Your task was added to FlowTask.');
        navigation.goBack();
      }
    } catch (err: any) {
      const apiMsg = err?.response?.data?.error || err?.response?.data?.details?.[0]?.message;
      setError(apiMsg || (err instanceof Error ? err.message : 'Unable to save task.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.screen, { backgroundColor: theme.background }]}
    >
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <IconButton
            icon="chevron-back"
            label="Back"
            tone="plain"
            onPress={() => navigation.goBack()}
          />
          <AppText variant="title" style={[styles.screenTitle, { color: theme.text }]}>
            {editingTask ? 'Edit Task' : 'New Task'}
          </AppText>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.form}>
          <Field
            label="Title"
            value={title}
            onChangeText={setTitle}
            placeholder="What needs to get done?"
            autoFocus={!editingTask}
          />

          <Field
            label="Notes & details"
            value={description}
            onChangeText={setDescription}
            placeholder="Add any extra context..."
            multiline
            numberOfLines={3}
            style={styles.textArea}
            textAlignVertical="top"
          />

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Field
                label="Due Date"
                value={dueDate}
                onChangeText={setDueDate}
                placeholder="2026-07-15"
              />
            </View>
            <View style={{ width: 12 }} />
            <View style={{ width: 110 }}>
              <Field
                label="Time (opt)"
                value={dueTime}
                onChangeText={setDueTime}
                placeholder="17:00"
                autoCapitalize="none"
              />
            </View>
          </View>

          {/* Space Picker */}
          <View style={styles.section}>
            <AppText variant="micro" style={[styles.sectionLabel, { color: theme.muted }]}>
              SPACE
            </AppText>
            <View style={styles.pillsRow}>
              {(['work', 'personal', 'health', 'study'] as TaskContext[]).map((c) => {
                const active = context === c;
                const dotColor = spaceAccent(c);
                return (
                  <Pressable
                    key={c}
                    accessibilityRole="radio"
                    accessibilityState={active ? { selected: true } : {}}
                    onPress={() => setContext(c)}
                    style={({ pressed }) => [
                      styles.pill,
                      { backgroundColor: active ? colors.lavenderMist : theme.surface, borderColor: active ? colors.accent : theme.border },
                      pressed ? styles.pressed : null,
                    ]}
                  >
                    <SpaceDot spaceId={c} size={8} />
                    <AppText
                      variant="subtitle"
                      style={[styles.pillText, { color: active ? colors.accentDeep : theme.text }]}
                    >
                      {spaceName(c)}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Priority Picker */}
          <View style={styles.section}>
            <AppText variant="micro" style={[styles.sectionLabel, { color: theme.muted }]}>
              PRIORITY
            </AppText>
            <View style={styles.pillsRow}>
              {priorities.map((p) => {
                const active = priority === p.value;
                return (
                  <Pressable
                    key={p.value}
                    accessibilityRole="radio"
                    accessibilityState={active ? { selected: true } : {}}
                    onPress={() => setPriority(p.value)}
                    style={({ pressed }) => [
                      styles.pill,
                      { backgroundColor: active ? colors.lavenderMist : theme.surface, borderColor: active ? p.color : theme.border },
                      pressed ? styles.pressed : null,
                    ]}
                  >
                    <View style={[styles.dotIndicator, { backgroundColor: p.color }]} />
                    <AppText
                      variant="subtitle"
                      style={[styles.pillText, { color: active ? colors.accentDeep : theme.text }]}
                    >
                      {p.label}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Recurrence */}
          <View style={styles.section}>
            <AppText variant="micro" style={[styles.sectionLabel, { color: theme.muted }]}>
              Repeat
            </AppText>
            <View style={styles.pillsRow}>
              {recurrenceOptions.map((r) => {
                const active = recurrence === r.value;
                return (
                  <Pressable
                    key={r.value}
                    onPress={() => setRecurrence(r.value)}
                    style={({ pressed }) => [
                      styles.pill,
                      { backgroundColor: active ? colors.lavenderMist : theme.surface, borderColor: active ? colors.accent : theme.border },
                      pressed ? styles.pressed : null,
                    ]}
                  >
                    <AppText
                      variant="caption"
                      style={{ color: active ? colors.accentDeep : theme.text, fontWeight: active ? '700' : '500' }}
                    >
                      {r.label}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
            {recurrence !== 'none' && (
              <View style={{ marginTop: 10 }}>
                <Field
                  label="Ends (optional)"
                  value={recurrenceEndDate}
                  onChangeText={setRecurrenceEndDate}
                  placeholder="2026-12-31"
                />
              </View>
            )}
          </View>

          {/* Reminder */}
          <View style={styles.section}>
            <AppText variant="micro" style={[styles.sectionLabel, { color: theme.muted }]}>
              REMINDER
            </AppText>
            <View style={styles.pillsRow}>
              {reminderOptions.map((rem) => {
                const active = reminderMinutes === rem.value;
                return (
                  <Pressable
                    key={rem.value ?? 'none'}
                    onPress={() => setReminderMinutes(rem.value)}
                    style={({ pressed }) => [
                      styles.pill,
                      { backgroundColor: active ? colors.lavenderMist : theme.surface, borderColor: active ? colors.accent : theme.border },
                      pressed ? styles.pressed : null,
                    ]}
                  >
                    <AppText
                      variant="caption"
                      style={{ color: active ? colors.accentDeep : theme.text, fontWeight: active ? '700' : '500' }}
                    >
                      {rem.label}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Tags & Assignee */}
          <Field
            label="Tags (comma separated)"
            value={tags}
            onChangeText={setTags}
            placeholder="design, sprint, urgent"
          />

          <Field
            label="Assignee (email or name)"
            value={assignee}
            onChangeText={setAssignee}
            placeholder="colleague@example.com"
            autoCapitalize="none"
          />

          {error ? (
            <AppText variant="caption" style={[styles.errorText, { color: theme.danger }]}>
              {error}
            </AppText>
          ) : null}

          {/* Save Button */}
          <View style={{ marginTop: spacing.md }}>
            <AppButton
              label={saving ? 'Saving…' : editingTask ? 'Save Changes' : 'Create Task'}
              disabled={saving}
              loading={saving}
              onPress={handleSave}
            />
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    paddingHorizontal: screenPadding,
    paddingTop: 54,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
  },
  screenTitle: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 22,
  },
  form: {
    gap: spacing.lg,
  },
  textArea: {
    minHeight: 88,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  section: {
    gap: spacing.xs,
  },
  sectionLabel: {
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  pillText: {
    fontSize: 13,
  },
  dotIndicator: {
    width: 8,
    height: 8,
    borderRadius: radii.pill,
  },
  cta: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
    borderRadius: radii.pill,
    paddingVertical: 15,
    marginTop: spacing.md,
    ...shadows.button,
  },
  ctaDisabled: {
    backgroundColor: colors.lavenderLight,
    shadowOpacity: 0,
    elevation: 0,
  },
  ctaLabel: {
    color: colors.derived.onAccent,
    fontWeight: '700',
  },
  ctaLabelMuted: {
    color: colors.derived.onAccentMuted,
  },
  errorText: {
    textAlign: 'center',
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
});
