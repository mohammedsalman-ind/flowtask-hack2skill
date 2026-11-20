import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useAuthStore } from '../../store/authStore';
import { useTaskStore } from '../../store/taskStore';
import { analyzeTranscriptApi, createTasksFromMeetingApi, deleteMeetingApi, getMeetingsApi, saveTranscriptTasksApi } from '../../api/meetings';
import type { Context, Meeting, Priority } from '../../types';
import type { Task as UiTask } from '../lib/store';
import { AppText } from '@/components/ui/app-text';
import { Card } from '@/components/ui/card';
import { colors } from '@/theme/colors';
import { radii, screenPadding, spacing } from '@/theme/theme';

export function MeetingScreen() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const refresh = async () => {
    try { const r = await getMeetingsApi(); setMeetings(r.data?.meetings ?? []); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not load meetings.'); }
  };
  useEffect(() => { void refresh(); }, []);
  const analyze = async () => {
    if (!file || !title.trim() || busy) return;
    setBusy(true); setError('');
    try {
      const result = await analyzeTranscriptApi(title.trim(), file);
      const tasks = result.data?.tasks;
      if (!tasks) throw new Error(result.error || 'Meeting analysis failed.');
      await saveTranscriptTasksApi(title.trim(), file.name, tasks);
      setTitle(''); setFile(null); await refresh();
    } catch (e) { setError(e instanceof Error ? e.message : 'Meeting analysis failed.'); }
    finally { setBusy(false); }
  };
  const createTasks = async (meeting: Meeting) => {
    setBusy(true); setError('');
    try { await createTasksFromMeetingApi(meeting.id, meeting.action_items.map((_, i) => i)); await refresh(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not create meeting tasks.'); }
    finally { setBusy(false); }
  };
  const remove = async (meeting: Meeting) => {
    setBusy(true); setError('');
    try { await deleteMeetingApi(meeting.id); await refresh(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not delete meeting.'); }
    finally { setBusy(false); }
  };
  return <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
    <AppText variant="display" style={styles.title}>Meetings</AppText>
    <Card elevated={false} style={styles.form}>
      <AppText variant="heading">Analyze a transcript</AppText>
      <TextInput value={title} onChangeText={setTitle} placeholder="Meeting title" style={styles.input} />
      <input type="file" accept=".txt,.md,.docx,.pdf" onChange={(e) => setFile(e.currentTarget.files?.[0] ?? null)} />
      <Action label={busy ? 'Working…' : 'Analyze and save'} disabled={busy || !file || !title.trim()} onPress={() => void analyze()} />
    </Card>
    {error ? <AppText variant="caption" style={styles.error}>{error}</AppText> : null}
    {meetings.map((meeting) => <Card key={meeting.id} elevated={false} style={styles.meeting}>
      <AppText variant="heading">{meeting.title}</AppText>
      <AppText variant="caption">{new Date(meeting.created_at).toLocaleString()} · {meeting.action_items?.length ?? 0} action items</AppText>
      {meeting.summary ? <AppText variant="bodySecondary">{meeting.summary}</AppText> : null}
      {(meeting.action_items ?? []).map((item, index) => <AppText key={index} variant="bodySecondary">• {item.task} — {item.assignee || 'Unassigned'}</AppText>)}
      <View style={styles.actions}><Action label="Create tasks" disabled={busy || !meeting.action_items?.length} onPress={() => void createTasks(meeting)} /><Action label="Delete" disabled={busy} onPress={() => void remove(meeting)} /></View>
    </Card>)}
    {!meetings.length && !error ? <AppText variant="bodySecondary">No meetings yet.</AppText> : null}
  </ScrollView>;
}

export function ProfileScreen() {
  const { user, updateProfile, isLoading, error } = useAuthStore();
  const [name, setName] = useState(user?.name ?? '');
  const [message, setMessage] = useState('');
  useEffect(() => setName(user?.name ?? ''), [user?.name]);
  const save = async () => { setMessage(''); if (await updateProfile(name.trim())) setMessage('Profile saved.'); };
  return <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
    <AppText variant="display" style={styles.title}>Profile</AppText>
    <Card elevated={false} style={styles.form}>
      <AppText variant="caption">{user?.email ?? ''}</AppText>
      <TextInput value={name} onChangeText={setName} placeholder="Your name" style={styles.input} />
      <Action label={isLoading ? 'Saving…' : 'Save profile'} disabled={isLoading || !name.trim()} onPress={() => void save()} />
      {message ? <AppText variant="caption">{message}</AppText> : null}
      {error ? <AppText variant="caption" style={styles.error}>{error}</AppText> : null}
    </Card>
  </ScrollView>;
}

export function TaskEditor({ task, onClose }: { task: UiTask | null; onClose: () => void }) {
  const navigate = useNavigate();
  const [title, setTitle] = useState(task?.title ?? '');
  const [description, setDescription] = useState(task?.apiTask.description ?? '');
  const [priority, setPriority] = useState<Priority>(task?.apiTask.priority ?? 'medium');
  const [context, setContext] = useState<Context>(task?.apiTask.context ?? 'personal');
  const [dueDate, setDueDate] = useState(task?.apiTask.due_date ? new Date(task.apiTask.due_date).toISOString().slice(0, 16) : '');
  const [tags, setTags] = useState(task?.apiTask.tags?.join(', ') ?? '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const updateTask = useTaskStore((state) => state.updateTask);
  const deleteTask = useTaskStore((state) => state.deleteTask);
  useEffect(() => {
    setTitle(task?.title ?? ''); setDescription(task?.apiTask.description ?? '');
    setPriority(task?.apiTask.priority ?? 'medium'); setContext(task?.apiTask.context ?? 'personal');
    setDueDate(task?.apiTask.due_date ? new Date(task.apiTask.due_date).toISOString().slice(0, 16) : '');
    setTags(task?.apiTask.tags?.join(', ') ?? ''); setError('');
  }, [task?.id, task?.title, task?.apiTask]);
  const save = async () => {
    if (!task || !title.trim() || busy) return;
    setBusy(true); setError('');
    let due_date: string | null = null;
    try { due_date = dueDate ? new Date(dueDate).toISOString() : null; }
    catch { setBusy(false); setError('Enter a valid due date and time.'); return; }
    const updated = await updateTask(task.id, {
      title: title.trim(), description, priority, context,
      status: task.apiTask.status, recurrence: task.apiTask.recurrence,
      due_date, tags: tags.split(',').map((tag) => tag.trim()).filter(Boolean),
    });
    setBusy(false);
    if (updated) onClose(); else setError(useTaskStore.getState().error || 'Could not update task.');
  };
  const remove = async () => {
    if (!task || busy || !window.confirm(`Delete “${task.title}”?`)) return;
    setBusy(true); setError('');
    const deleted = await deleteTask(task.id);
    setBusy(false);
    if (deleted) onClose(); else setError(useTaskStore.getState().error || 'Could not delete task.');
  };
  if (task?.apiTask.organization_id) {
    const organization = task.apiTask.organization_id;
    return <Modal transparent visible animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}><View style={styles.modalCard}>
        <AppText variant="display" style={styles.title}>{task.title}</AppText>
        <AppText variant="bodySecondary">{task.apiTask.description || 'Assigned through an organization workspace.'}</AppText>
        <View style={styles.actions}>
          <Action label="Open workspace tasks" onPress={() => { onClose(); navigate(`/workspaces/${organization}/tasks`); }} />
          <Action label="Close" onPress={onClose} />
        </View>
      </View></View>
    </Modal>;
  }
  return <Modal transparent visible={!!task} animationType="fade" onRequestClose={onClose}>
    <View style={styles.modalBackdrop}><View style={styles.modalCard}>
      <AppText variant="display" style={styles.title}>Edit task</AppText>
      <TextInput value={title} onChangeText={setTitle} accessibilityLabel="Task title" style={styles.input} />
      <TextInput value={description} onChangeText={setDescription} accessibilityLabel="Task description" placeholder="Description" multiline style={[styles.input, styles.multiline]} />
      <AppText variant="micro">PRIORITY</AppText>
      <View style={styles.actions}>{(['high', 'medium', 'low'] as Priority[]).map((value) => <Action key={value} label={value} disabled={busy} onPress={() => setPriority(value)} />)}</View>
      <AppText variant="micro">AREA</AppText>
      <View style={styles.actions}>{(['work', 'personal', 'health', 'study'] as Context[]).map((value) => <Action key={value} label={value} disabled={busy} onPress={() => setContext(value)} />)}</View>
      <TextInput value={dueDate} onChangeText={setDueDate} accessibilityLabel="Due date and time" placeholder="Due date: YYYY-MM-DDTHH:mm" style={styles.input} />
      <TextInput value={tags} onChangeText={setTags} accessibilityLabel="Tags" placeholder="Tags, separated by commas" style={styles.input} />
      {error ? <AppText variant="caption" style={styles.error}>{error}</AppText> : null}
      <View style={styles.actions}>
        <Action label="Delete" disabled={busy} onPress={() => void remove()} />
        <Action label={busy ? 'Saving…' : 'Save'} disabled={busy || !title.trim()} onPress={() => void save()} />
        <Action label="Cancel" disabled={busy} onPress={onClose} />
      </View>
    </View></View>
  </Modal>;
}

function Action({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  return <Pressable disabled={disabled} onPress={onPress} style={[styles.button, disabled && styles.disabled]}><AppText variant="button" style={styles.buttonText}>{label}</AppText></Pressable>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background }, content: { padding: screenPadding, paddingTop: 48, paddingBottom: 100, gap: spacing.lg },
  title: { color: colors.ink }, form: { gap: spacing.md, borderRadius: radii.lg }, meeting: { gap: spacing.sm, borderRadius: radii.lg }, input: { minHeight: 48, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, color: colors.ink },
  button: { backgroundColor: colors.accent, borderRadius: radii.pill, paddingHorizontal: 16, paddingVertical: 11, alignSelf: 'flex-start' }, buttonText: { color: colors.derived.onAccent }, disabled: { opacity: 0.5 }, actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }, error: { color: '#B42318' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(25, 20, 20, 0.42)', justifyContent: 'center', alignItems: 'center', padding: 20 }, modalCard: { width: '100%', maxWidth: 520, maxHeight: '92%', gap: spacing.md, padding: 24, borderRadius: radii.xl, backgroundColor: colors.background }, multiline: { minHeight: 72, textAlignVertical: 'top' },
});
