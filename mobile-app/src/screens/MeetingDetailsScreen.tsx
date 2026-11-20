import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import { AppText } from '../components/ui/app-text';
import { Card } from '../components/ui/card';
import { IconButton } from '../components/ui/icon-button';
import { useTasks } from '../context/TasksContext';
import { useTheme } from '../context/ThemeContext';
import { useSafeBottomPadding } from '../hooks/useSafeBottomPadding';
import {
  fetchMeeting,
  createMeetingTasks,
  assignMeetingTask,
  deleteMeeting,
} from '../services/meetingService';
import { colors } from '../theme/colors';
import { radii, screenPadding, shadows, spacing } from '../theme/theme';
import { MeetingRecord } from '../types';

function formatDate(value: string) {
  try {
    return new Date(value).toLocaleString(undefined, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return value;
  }
}

export default function MeetingDetailsScreen({ navigation, route }: any) {
  const { theme } = useTheme();
  const paddingBottom = useSafeBottomPadding(40);
  const { refreshTasks } = useTasks();
  const meetingId = route?.params?.meetingId as string;

  const [meeting, setMeeting] = useState<MeetingRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showTranscript, setShowTranscript] = useState(false);
  const [addedIndices, setAddedIndices] = useState<Set<number>>(new Set());
  const [savingIndex, setSavingIndex] = useState<number | null>(null);
  const [savingAll, setSavingAll] = useState(false);
  const [assigningIndex, setAssigningIndex] = useState<number | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!meetingId) {
        setError('No meeting ID provided.');
        setLoading(false);
        return;
      }
      let active = true;
      setLoading(true);
      setError('');
      fetchMeeting(meetingId)
        .then((m) => {
          if (active) setMeeting(m);
        })
        .catch((err) => {
          if (active) setError(err instanceof Error ? err.message : 'Could not load meeting.');
        })
        .finally(() => {
          if (active) setLoading(false);
        });
      return () => {
        active = false;
      };
    }, [meetingId])
  );

  const handleAddTask = async (index: number) => {
    if (!meeting) return;
    setSavingIndex(index);
    try {
      await createMeetingTasks(meeting.id, [index]);
      await refreshTasks('all');
      setAddedIndices((prev) => new Set(prev).add(index));
      Alert.alert('Task added', 'The action item was added to your task list.');
    } catch (err) {
      Alert.alert('Could not add task', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setSavingIndex(null);
    }
  };

  const handleAddAll = async () => {
    if (!meeting) return;
    const unadded = meeting.action_items
      .map((_, i) => i)
      .filter((i) => !addedIndices.has(i));
    if (!unadded.length) return;
    setSavingAll(true);
    try {
      await createMeetingTasks(meeting.id, unadded);
      await refreshTasks('all');
      const newSet = new Set(addedIndices);
      unadded.forEach((i) => newSet.add(i));
      setAddedIndices(newSet);
      Alert.alert(
        'Tasks added',
        `${unadded.length} action item${unadded.length === 1 ? '' : 's'} added to your task list.`
      );
    } catch (err) {
      Alert.alert('Could not add tasks', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setSavingAll(false);
    }
  };

  const handleAssignTask = async (index: number) => {
    if (!meeting) return;
    const item = meeting.action_items[index];
    if (!item || !item.assignee || item.assignee === 'Unassigned') return;
    setAssigningIndex(index);
    try {
      const result = await assignMeetingTask(meeting.id, index, item.assignee);
      await refreshTasks('all');
      setAddedIndices((prev) => new Set(prev).add(index));
      Alert.alert('Assigned', result.message || `Task assigned to ${item.assignee}.`);
    } catch (err) {
      Alert.alert('Could not assign', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setAssigningIndex(null);
    }
  };

  const handleDelete = () => {
    if (!meeting) return;
    Alert.alert('Delete meeting?', 'This meeting and its analysis will be permanently removed.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteMeeting(meeting.id);
            Alert.alert('Deleted', 'Meeting deleted.');
            navigation.goBack();
          } catch (err) {
            Alert.alert('Could not delete', err instanceof Error ? err.message : 'Please try again.');
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator color={colors.accent} size="large" />
        <AppText variant="caption" style={{ color: theme.muted, marginTop: 12 }}>
          Loading meeting details…
        </AppText>
      </View>
    );
  }

  if (error || !meeting) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <AppText variant="title" style={{ color: theme.text }}>
          Meeting not found
        </AppText>
        <AppText variant="bodySecondary" style={{ color: theme.muted, marginTop: 8 }}>
          {error || 'This meeting may have been deleted.'}
        </AppText>
        <Pressable
          onPress={() => navigation.goBack()}
          style={[styles.backPill, { borderColor: theme.border }]}
        >
          <AppText variant="subtitle" style={{ color: colors.accentDeep }}>
            Go back
          </AppText>
        </Pressable>
      </View>
    );
  }

  const participants = Array.isArray(meeting.participants) ? meeting.participants : [];

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: theme.background }]}
      contentContainerStyle={[styles.content, { paddingBottom }]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {/* Top Header */}
      <View style={styles.topBar}>
        <IconButton
          icon="chevron-back"
          label="Back"
          tone="plain"
          onPress={() => navigation.goBack()}
        />
        <AppText variant="caption" style={{ color: theme.muted, textTransform: 'uppercase', letterSpacing: 1 }}>
          Meeting Record
        </AppText>
        <IconButton
          icon="trash-outline"
          label="Delete meeting"
          tone="plain"
          onPress={handleDelete}
        />
      </View>

      {/* Main Title Card */}
      <Card style={styles.heroCard}>
        <View style={styles.badgeRow}>
          {meeting.input_type === 'recording' ? (
            <View style={[styles.badge, { backgroundColor: colors.lavenderMist }]}>
              <Ionicons name="mic" size={13} color={colors.accentDeep} />
              <AppText variant="caption" style={{ color: colors.accentDeep, fontWeight: '700' }}>
                Audio Recording
              </AppText>
            </View>
          ) : (
            <View style={[styles.badge, { backgroundColor: colors.blushMist }]}>
              <Ionicons name="document-text" size={13} color={colors.mauve} />
              <AppText variant="caption" style={{ color: colors.mauve, fontWeight: '700' }}>
                Transcript File
              </AppText>
            </View>
          )}
        </View>

        <AppText variant="title" style={[styles.meetingTitle, { color: theme.text }]}>
          {meeting.title}
        </AppText>
        <AppText variant="caption" style={{ color: theme.muted }}>
          {formatDate(meeting.created_at)}
        </AppText>
      </Card>

      {/* Summary */}
      {meeting.summary ? (
        <Card style={styles.sectionCard}>
          <AppText variant="micro" style={{ color: colors.accentDeep, marginBottom: 4 }}>
            EXECUTIVE SUMMARY
          </AppText>
          <AppText variant="body" style={{ color: theme.text, lineHeight: 22 }}>
            {meeting.summary}
          </AppText>
        </Card>
      ) : null}

      {/* Participants */}
      {participants.length > 0 && (
        <Card style={styles.sectionCard}>
          <AppText variant="micro" style={{ color: theme.muted, marginBottom: 8 }}>
            PARTICIPANTS
          </AppText>
          <View style={styles.participantsRow}>
            {participants.map((name, i) => (
              <View key={`${name}-${i}`} style={[styles.participantChip, { backgroundColor: colors.lavenderMist }]}>
                <Ionicons name="person" size={12} color={colors.accentDeep} />
                <AppText variant="caption" style={{ color: colors.accentDeep, fontWeight: '700' }}>
                  {name}
                </AppText>
              </View>
            ))}
          </View>
        </Card>
      )}

      {/* Key Notes */}
      {meeting.key_notes && meeting.key_notes.length > 0 && (
        <Card style={styles.sectionCard}>
          <AppText variant="micro" style={{ color: colors.accentDeep, marginBottom: 8 }}>
            KEY TAKEAWAYS & DECISIONS
          </AppText>
          {meeting.key_notes.map((note, i) => {
            const isDecision = note.category === 'decision';
            const isBlocker = note.category === 'blocker';
            const dotColor = isDecision ? '#10B981' : isBlocker ? '#EF4444' : colors.accent;
            return (
              <View key={`${note.point}-${i}`} style={styles.pointRow}>
                <View style={[styles.categoryDot, { backgroundColor: dotColor }]} />
                <View style={{ flex: 1 }}>
                  <AppText variant="bodySecondary" style={{ color: theme.text, lineHeight: 20 }}>
                    {note.point}
                  </AppText>
                  <AppText variant="micro" style={{ color: theme.muted, textTransform: 'capitalize', marginTop: 2 }}>
                    {note.category}
                  </AppText>
                </View>
              </View>
            );
          })}
        </Card>
      )}

      {/* Action Items */}
      {meeting.action_items && meeting.action_items.length > 0 && (
        <Card style={styles.sectionCard}>
          <View style={styles.actionHeaderRow}>
            <View style={{ flex: 1 }}>
              <AppText variant="micro" style={{ color: colors.accentDeep }}>
                TASKS
              </AppText>
              <AppText variant="title" style={{ color: theme.text, fontSize: 18 }}>
                Action Items ({meeting.action_items.length})
              </AppText>
            </View>

            {addedIndices.size < meeting.action_items.length && (
              <Pressable
                accessibilityRole="button"
                disabled={savingAll}
                onPress={handleAddAll}
                style={[styles.smallPill, { backgroundColor: colors.accent }]}
              >
                <AppText variant="caption" style={{ color: colors.derived.onAccent, fontWeight: '700' }}>
                  {savingAll ? 'Adding…' : 'Add All'}
                </AppText>
              </Pressable>
            )}
          </View>

          {meeting.action_items.map((item, i) => {
            const hasAssignee = item.assignee && item.assignee !== 'Unassigned';
            const added = addedIndices.has(i);
            return (
              <View
                key={`${item.task}-${i}`}
                style={[
                  styles.actionItemRow,
                  i > 0 ? [styles.actionDivider, { borderTopColor: theme.border }] : null,
                ]}
              >
                <View style={{ flex: 1 }}>
                  <AppText variant="subtitle" style={{ color: theme.text }}>
                    {item.task}
                  </AppText>
                  <AppText variant="caption" style={{ color: theme.muted, marginTop: 3 }}>
                    {hasAssignee ? `${item.assignee} · ` : ''}
                    Priority: {item.priority || 'medium'}
                    {item.due ? ` · Due: ${item.due}` : ''}
                  </AppText>
                </View>

                <View style={styles.actionButtonsRow}>
                  <Pressable
                    disabled={added || savingIndex === i || savingAll}
                    onPress={() => handleAddTask(i)}
                    style={[
                      styles.itemActionBtn,
                      added ? { backgroundColor: theme.surfaceAlt } : { backgroundColor: colors.accent },
                    ]}
                  >
                    <AppText
                      variant="caption"
                      style={{
                        color: added ? theme.muted : colors.derived.onAccent,
                        fontWeight: '700',
                      }}
                    >
                      {added ? 'Added ✓' : 'Add'}
                    </AppText>
                  </Pressable>

                  {hasAssignee && !added && (
                    <Pressable
                      disabled={assigningIndex === i || savingAll}
                      onPress={() => handleAssignTask(i)}
                      style={[
                        styles.itemActionBtn,
                        { backgroundColor: colors.lavenderMist },
                      ]}
                    >
                      <AppText variant="caption" style={{ color: colors.accentDeep, fontWeight: '700' }}>
                        {assigningIndex === i ? '…' : `→ ${item.assignee}`}
                      </AppText>
                    </Pressable>
                  )}
                </View>
              </View>
            );
          })}
        </Card>
      )}

      {/* Transcript Accordion */}
      <Card style={styles.sectionCard}>
        <Pressable
          accessibilityRole="button"
          onPress={() => setShowTranscript(!showTranscript)}
          style={styles.transcriptToggle}
        >
          <Ionicons
            name={showTranscript ? 'chevron-down' : 'chevron-forward'}
            size={18}
            color={colors.accentDeep}
          />
          <AppText variant="subtitle" style={{ color: theme.text, flex: 1 }}>
            {meeting.input_type === 'recording' ? 'Recorded Audio Transcript' : 'Full Transcript'}
          </AppText>
          <AppText variant="caption" style={{ color: theme.muted }}>
            {showTranscript ? 'Hide' : 'View'}
          </AppText>
        </Pressable>

        {showTranscript && (
          <View style={[styles.transcriptBox, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}>
            <AppText variant="caption" style={{ color: theme.text, lineHeight: 20 }} selectable>
              {meeting.raw_transcript || 'No transcript available.'}
            </AppText>
          </View>
        )}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    paddingHorizontal: screenPadding,
    paddingTop: 54,
    gap: spacing.lg,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: screenPadding,
  },
  backPill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: 16,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroCard: {
    gap: spacing.sm,
  },
  badgeRow: {
    flexDirection: 'row',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.pill,
  },
  meetingTitle: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 24,
    lineHeight: 30,
  },
  sectionCard: {
    gap: spacing.sm,
  },
  participantsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  participantChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.pill,
  },
  pointRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 8,
  },
  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: radii.pill,
    marginTop: 6,
  },
  actionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  smallPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.pill,
  },
  actionItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: 12,
  },
  actionDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  itemActionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.pill,
  },
  transcriptToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  transcriptBox: {
    marginTop: 12,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
  },
});
