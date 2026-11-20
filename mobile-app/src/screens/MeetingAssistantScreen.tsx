import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as DocumentPicker from 'expo-document-picker';
import { Audio } from 'expo-av';
import { useFocusEffect } from '@react-navigation/native';

import { AppText } from '../components/ui/app-text';
import { Card } from '../components/ui/card';
import { Field } from '../components/ui/field';
import { IconButton } from '../components/ui/icon-button';
import { useTasks } from '../context/TasksContext';
import { useTheme } from '../context/ThemeContext';
import { useSafeBottomPadding } from '../hooks/useSafeBottomPadding';
import {
  analyzeMeeting,
  analyzeTranscriptFile,
  createMeetingTasks,
  fetchRecentMeetings,
  saveMeetingSummary,
} from '../services/meetingService';
import { colors } from '../theme/colors';
import { radii, screenPadding, shadows, spacing } from '../theme/theme';
import { MeetingActionItem, MeetingRecord, MeetingSummary, TaskPriority } from '../types';

function normalizePriority(priority?: string): TaskPriority {
  return priority === 'high' || priority === 'low' || priority === 'medium' ? priority : 'medium';
}

function dueToIso(due?: string | null) {
  if (!due) return null;
  const parsed = new Date(due);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

export default function MeetingAssistantScreen({ navigation }: any) {
  const { theme } = useTheme();
  const paddingBottom = useSafeBottomPadding(40);
  const { createTask, refreshTasks } = useTasks();

  const [notes, setNotes] = useState('');
  const [meetingTitle, setMeetingTitle] = useState('');
  const [result, setResult] = useState<MeetingSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [savingAll, setSavingAll] = useState(false);
  const [savingMeeting, setSavingMeeting] = useState(false);
  const [savingIndex, setSavingIndex] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [recentMeetings, setRecentMeetings] = useState<MeetingRecord[]>([]);
  const [meetingsLoading, setMeetingsLoading] = useState(false);
  const [savedMeetingId, setSavedMeetingId] = useState<string | null>(null);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      let active = true;
      setMeetingsLoading(true);
      fetchRecentMeetings(10)
        .then((items) => {
          if (active) setRecentMeetings(items);
        })
        .catch(() => {
          if (active) setRecentMeetings([]);
        })
        .finally(() => {
          if (active) setMeetingsLoading(false);
        });
      return () => {
        active = false;
      };
    }, [])
  );

  const remainingItems = useMemo(
    () => result?.action_items.filter((item) => !item.added) || [],
    [result]
  );

  const startRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission required', 'Microphone access is needed to record meetings.');
        return;
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(newRecording);
      setIsRecording(true);
    } catch (err) {
      Alert.alert('Recording failed', err instanceof Error ? err.message : 'Could not start recording.');
    }
  };

  const stopRecording = async () => {
    if (!recording) return;
    try {
      await recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      const uri = recording.getURI();
      setRecording(null);
      setIsRecording(false);
      if (uri) {
        setTranscribing(true);
        setError('');
        try {
          const { api } = await import('../services/api');
          const formData = new FormData();
          formData.append('file', {
            uri,
            name: 'meeting-recording.m4a',
            type: 'audio/m4a',
          } as any);
          const { data } = await api.post('/api/ai/transcribe', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            timeout: 120000,
          });
          if (data?.text) {
            setNotes(data.text);
            Alert.alert(
              'Transcription complete',
              'Meeting audio transcribed successfully. Tap "Analyze Meeting" to extract action items.'
            );
          } else {
            setError(data?.error || 'Transcription produced no text. You can paste meeting notes manually.');
          }
        } catch (err: any) {
          const detail = err?.response?.data?.detail || err?.message || '';
          setError(detail || 'Could not transcribe the recording. You can paste meeting notes manually.');
        } finally {
          setTranscribing(false);
        }
      }
    } catch (err) {
      setRecording(null);
      setIsRecording(false);
      Alert.alert('Recording failed', err instanceof Error ? err.message : 'Could not stop recording.');
    }
  };

  const handleUpload = async () => {
    setError('');
    const picked = await DocumentPicker.getDocumentAsync({
      type: ['text/plain', 'application/pdf'],
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (picked.canceled || !picked.assets?.[0]) return;
    const file = picked.assets[0];
    setLoading(true);
    try {
      const summary = await analyzeTranscriptFile(
        file.uri,
        file.name,
        file.mimeType,
        meetingTitle || file.name
      );
      setMeetingTitle(meetingTitle || file.name.replace(/\.(txt|pdf)$/i, ''));
      setNotes(`Uploaded transcript: ${file.name}`);
      setResult(summary);
      setSavedMeetingId(null);
      Alert.alert(
        'Transcript analyzed',
        `${summary.action_items.length} action item${summary.action_items.length === 1 ? '' : 's'} found.`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to analyze the transcript file.');
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = async () => {
    if (!notes.trim()) {
      setError('Paste meeting notes or a transcript first.');
      return;
    }
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const summary = await analyzeMeeting(notes.trim(), meetingTitle);
      setResult(summary);
      setSavedMeetingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI service failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const ensureMeetingSaved = async () => {
    if (savedMeetingId || !result) return savedMeetingId;
    const saved = await saveMeetingSummary(meetingTitle || 'Untitled meeting', notes, result);
    setSavedMeetingId(saved.id);
    return saved.id;
  };

  const markAdded = (index: number) => {
    setResult((current) => {
      if (!current) return current;
      return {
        ...current,
        action_items: current.action_items.map((item, itemIndex) =>
          itemIndex === index ? { ...item, added: true } : item
        ),
      };
    });
  };

  const addActionItem = async (item: MeetingActionItem, index: number, showSuccess = true) => {
    setSavingIndex(index);
    try {
      const meetingId = await ensureMeetingSaved();
      if (meetingId) {
        await createMeetingTasks(meetingId, [index]);
        await refreshTasks('all');
      } else {
        await createTask({
          title: item.task,
          description:
            item.assignee && item.assignee !== 'Unassigned'
              ? `Assigned to ${item.assignee}`
              : 'Created from AI meeting assistant.',
          due_date: dueToIso(item.due),
          priority: normalizePriority(item.priority),
          status: 'todo',
          tags: ['meeting', 'ai-action'],
          assignee: item.assignee && item.assignee !== 'Unassigned' ? item.assignee : null,
        });
      }
      markAdded(index);
      if (showSuccess) Alert.alert('Task added', 'Action item converted into a task.');
      return true;
    } catch (err) {
      Alert.alert('Could not add task', err instanceof Error ? err.message : 'Please try again.');
      return false;
    } finally {
      setSavingIndex(null);
    }
  };

  const addAll = async () => {
    if (!result) return;
    setSavingAll(true);
    try {
      const indices = result.action_items
        .map((item, index) => (item.added ? -1 : index))
        .filter((index) => index >= 0);
      if (!indices.length) return;
      const meetingId = await ensureMeetingSaved();
      if (meetingId) {
        await createMeetingTasks(meetingId, indices);
        await refreshTasks('all');
        setResult((current) =>
          current
            ? {
                ...current,
                action_items: current.action_items.map((item, index) =>
                  indices.includes(index) ? { ...item, added: true } : item
                ),
              }
            : current
        );
      } else {
        for (const index of indices) await addActionItem(result.action_items[index], index, false);
      }
      Alert.alert(
        'Tasks added',
        `${indices.length} action item${indices.length === 1 ? '' : 's'} added to your task list.`
      );
    } catch (err) {
      Alert.alert('Could not add tasks', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setSavingAll(false);
    }
  };

  const handleSaveMeeting = async () => {
    if (!result) return;
    setSavingMeeting(true);
    try {
      const saved = await saveMeetingSummary(meetingTitle || 'Untitled meeting', notes, result);
      setSavedMeetingId(saved.id);
      Alert.alert('Meeting saved', 'The summary and action items were saved.');
    } catch (err) {
      Alert.alert('Could not save meeting', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setSavingMeeting(false);
    }
  };

  const resultText = result
    ? `${meetingTitle || 'Meeting'}\n${new Date().toLocaleString()}\n\nSummary\n${result.summary}\n\nAction items\n${result.action_items.map((item) => `- ${item.task}`).join('\n')}`
    : '';

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
        {/* Header */}
        <View style={styles.topBar}>
          <View style={{ flex: 1 }}>
            <AppText variant="micro" style={styles.eyebrow}>
              AI INTELLIGENCE
            </AppText>
            <AppText variant="display" style={[styles.screenTitle, { color: theme.text }]}>
              Meetings
            </AppText>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setResult(null);
              setNotes('');
              setMeetingTitle('');
              setError('');
              setSavedMeetingId(null);
            }}
            style={[styles.newBtn, { backgroundColor: colors.accent }]}
          >
            <Ionicons name="add" size={16} color={colors.derived.onAccent} />
            <AppText variant="caption" style={{ color: colors.derived.onAccent, fontWeight: '700' }}>
              New
            </AppText>
          </Pressable>
        </View>

        {/* Recent Meetings Card */}
        {recentMeetings.length > 0 && (
          <Card style={styles.historyCard}>
            <AppText variant="subtitle" style={{ color: theme.text, marginBottom: 8 }}>
              Past Meetings
            </AppText>
            {recentMeetings.slice(0, 4).map((meeting, idx) => (
              <Pressable
                key={meeting.id}
                accessibilityRole="button"
                onPress={() => navigation.navigate('MeetingDetails', { meetingId: meeting.id })}
                style={({ pressed }) => [
                  styles.meetingRow,
                  idx > 0 ? [styles.rowDivider, { borderTopColor: theme.border }] : null,
                  pressed ? styles.pressed : null,
                ]}
              >
                <View style={styles.meetingIcon}>
                  <Ionicons name="document-text-outline" size={18} color={colors.accentDeep} />
                </View>
                <View style={{ flex: 1 }}>
                  <AppText variant="subtitle" style={{ color: theme.text }} numberOfLines={1}>
                    {meeting.title}
                  </AppText>
                  {meeting.summary ? (
                    <AppText variant="caption" style={{ color: theme.muted, marginTop: 2 }} numberOfLines={2}>
                      {meeting.summary}
                    </AppText>
                  ) : null}
                  <AppText variant="caption" style={{ color: theme.muted, marginTop: 2 }}>
                    {new Date(meeting.created_at).toLocaleDateString()} · {meeting.action_items.length} action items
                    {Array.isArray(meeting.participants) && meeting.participants.length > 0
                      ? ` · ${meeting.participants.length} participants`
                      : ''}
                  </AppText>
                </View>
                <Ionicons name="chevron-forward" size={16} color={theme.muted} />
              </Pressable>
            ))}
          </Card>
        )}

        {/* Input Form */}
        <View style={styles.form}>
          <Field
            label="Meeting Title (optional)"
            value={meetingTitle}
            onChangeText={setMeetingTitle}
            placeholder="Product Sync, Sprint Planning…"
          />

          {/* Audio & File Buttons */}
          <View style={styles.captureRow}>
            <Pressable
              accessibilityRole="button"
              disabled={loading || transcribing}
              onPress={isRecording ? stopRecording : startRecording}
              style={({ pressed }) => [
                styles.captureBtn,
                isRecording ? styles.recordingBtn : { backgroundColor: theme.surface, borderColor: theme.border },
                pressed ? styles.pressed : null,
              ]}
            >
              {transcribing ? (
                <ActivityIndicator size="small" color={colors.accent} />
              ) : (
                <Ionicons
                  name={isRecording ? 'stop-circle' : 'mic-outline'}
                  size={19}
                  color={isRecording ? '#FFFFFF' : colors.accentDeep}
                />
              )}
              <AppText
                variant="subtitle"
                style={{ color: isRecording ? '#FFFFFF' : theme.text, fontSize: 13 }}
              >
                {transcribing ? 'Transcribing…' : isRecording ? 'Stop Recording' : 'Record Audio'}
              </AppText>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              disabled={loading || isRecording}
              onPress={handleUpload}
              style={({ pressed }) => [
                styles.captureBtn,
                { backgroundColor: theme.surface, borderColor: theme.border },
                pressed ? styles.pressed : null,
              ]}
            >
              <Ionicons name="cloud-upload-outline" size={19} color={colors.accentDeep} />
              <AppText variant="subtitle" style={{ color: theme.text, fontSize: 13 }}>
                Upload File
              </AppText>
            </Pressable>
          </View>

          <Field
            label="Transcript or notes"
            value={notes}
            onChangeText={setNotes}
            placeholder="Paste discussion notes, transcript excerpts, or bullet points..."
            multiline
            numberOfLines={5}
            style={styles.textArea}
            textAlignVertical="top"
          />

          {error ? (
            <AppText variant="caption" style={[styles.errorText, { color: theme.danger }]}>
              {error}
            </AppText>
          ) : null}

          {/* Analyze CTA */}
          <Pressable
            accessibilityRole="button"
            disabled={loading || !notes.trim()}
            onPress={handleAnalyze}
            style={({ pressed }) => [
              styles.analyzeBtn,
              !notes.trim() ? styles.ctaDisabled : null,
              pressed && notes.trim() ? styles.pressed : null,
            ]}
          >
            {loading ? (
              <ActivityIndicator color={colors.derived.onAccent} />
            ) : (
              <>
                <Ionicons name="sparkles" size={18} color={colors.derived.onAccent} />
                <AppText variant="button" style={{ color: colors.derived.onAccent }}>
                  Analyze Meeting
                </AppText>
              </>
            )}
          </Pressable>
        </View>

        {/* Results Presentation */}
        {result ? (
          <View style={styles.resultsStack}>
            {/* Overview Card */}
            <Card style={styles.resultCard}>
              <View style={styles.resultHeader}>
                <View style={{ flex: 1 }}>
                  <AppText variant="title" style={{ color: theme.text }}>
                    {meetingTitle || 'Meeting Overview'}
                  </AppText>
                  <AppText variant="caption" style={{ color: theme.muted }}>
                    Analyzed {new Date().toLocaleTimeString()}
                  </AppText>
                </View>

                <View style={styles.headerActions}>
                  <IconButton
                    icon="copy-outline"
                    label="Copy notes"
                    tone="plain"
                    onPress={() => {
                      Clipboard.setStringAsync(resultText);
                      Alert.alert('Copied', 'Summary copied to clipboard.');
                    }}
                  />
                  <IconButton
                    icon="share-outline"
                    label="Share notes"
                    tone="plain"
                    onPress={() => Share.share({ message: resultText })}
                  />
                  <IconButton
                    icon="bookmark-outline"
                    label="Save meeting"
                    tone="plain"
                    onPress={handleSaveMeeting}
                    disabled={savingMeeting}
                  />
                </View>
              </View>

              <View style={[styles.metaDivider, { borderTopColor: theme.border }]} />

              <AppText variant="micro" style={{ color: colors.accentDeep }}>
                SUMMARY
              </AppText>
              <AppText variant="body" style={{ color: theme.text, lineHeight: 22 }}>
                {result.summary}
              </AppText>
            </Card>

            {/* Key Notes */}
            {result.key_notes && result.key_notes.length > 0 && (
              <Card style={styles.resultCard}>
                <AppText variant="micro" style={{ color: colors.accentDeep, marginBottom: 8 }}>
                  KEY TAKEAWAYS
                </AppText>
                {result.key_notes.map((note, idx) => (
                  <View key={idx} style={styles.bulletRow}>
                    <Ionicons name="checkmark-circle" size={16} color={colors.accent} style={{ marginTop: 2 }} />
                    <AppText variant="bodySecondary" style={{ color: theme.text, flex: 1, lineHeight: 20 }}>
                      {note.point}
                    </AppText>
                  </View>
                ))}
              </Card>
            )}

            {/* Action Items to Tasks */}
            <View style={styles.actionItemsHeader}>
              <View style={{ flex: 1 }}>
                <AppText variant="micro" style={{ color: theme.muted }}>
                  DETECTED ACTIONS
                </AppText>
                <AppText variant="title" style={{ color: theme.text, fontSize: 20 }}>
                  Action Items ({result.action_items.length})
                </AppText>
              </View>
              {remainingItems.length > 0 && (
                <Pressable
                  accessibilityRole="button"
                  disabled={savingAll}
                  onPress={addAll}
                  style={[styles.addAllBtn, { backgroundColor: colors.lavenderMist }]}
                >
                  <AppText variant="caption" style={{ color: colors.accentDeep, fontWeight: '700' }}>
                    {savingAll ? 'Adding…' : 'Add All to Tasks'}
                  </AppText>
                </Pressable>
              )}
            </View>

            {result.action_items.map((item, index) => (
              <Card key={index} style={styles.actionItemCard}>
                <View style={{ flex: 1 }}>
                  <AppText variant="subtitle" style={{ color: theme.text }}>
                    {item.task}
                  </AppText>
                  <AppText variant="caption" style={{ color: theme.muted, marginTop: 4 }}>
                    {item.assignee && item.assignee !== 'Unassigned' ? `Assigned: ${item.assignee} · ` : ''}
                    Priority: {item.priority || 'medium'}
                    {item.due ? ` · Due: ${item.due}` : ''}
                  </AppText>
                </View>

                <Pressable
                  accessibilityRole="button"
                  disabled={item.added || savingIndex === index || savingAll}
                  onPress={() => addActionItem(item, index)}
                  style={[
                    styles.itemAddBtn,
                    item.added
                      ? { backgroundColor: theme.surfaceAlt }
                      : { backgroundColor: colors.accent },
                  ]}
                >
                  <AppText
                    variant="caption"
                    style={{
                      color: item.added ? theme.muted : colors.derived.onAccent,
                      fontWeight: '700',
                    }}
                  >
                    {item.added ? 'Added ✓' : 'Add Task'}
                  </AppText>
                </Pressable>
              </Card>
            ))}
          </View>
        ) : null}
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
    gap: spacing.xl,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  eyebrow: {
    color: colors.accentDeep,
    letterSpacing: 1.2,
  },
  screenTitle: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 30,
  },
  newBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radii.pill,
  },
  historyCard: {
    gap: spacing.xs,
  },
  meetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: 12,
  },
  rowDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  meetingIcon: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    backgroundColor: colors.lavenderMist,
    alignItems: 'center',
    justifyContent: 'center',
  },
  form: {
    gap: spacing.lg,
  },
  captureRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  captureBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 13,
  },
  recordingBtn: {
    backgroundColor: '#EF4444',
    borderWidth: 0,
  },
  textArea: {
    minHeight: 120,
  },
  errorText: {
    textAlign: 'center',
    fontWeight: '600',
  },
  analyzeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.accent,
    borderRadius: radii.pill,
    paddingVertical: 15,
    ...shadows.button,
  },
  ctaDisabled: {
    backgroundColor: colors.lavenderLight,
    shadowOpacity: 0,
    elevation: 0,
  },
  resultsStack: {
    gap: spacing.lg,
    marginTop: spacing.md,
  },
  resultCard: {
    gap: spacing.sm,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 4,
  },
  metaDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    marginVertical: 4,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 6,
  },
  actionItemsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  addAllBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radii.pill,
  },
  actionItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  itemAddBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radii.pill,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
});
