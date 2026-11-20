import React, { useMemo, useState } from 'react';
import {
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

import { AppText } from '../components/ui/app-text';
import { Card } from '../components/ui/card';
import { Field } from '../components/ui/field';
import { IconButton } from '../components/ui/icon-button';
import { SpaceDot } from '../components/feature/space-dot';
import { useTasks } from '../context/TasksContext';
import { useTheme } from '../context/ThemeContext';
import { useSafeBottomPadding } from '../hooks/useSafeBottomPadding';
import {
  assignTask,
  cancelAssignment,
  fetchSentAssignments,
  retryAssignmentEmail,
  isValidEmail,
} from '../services/assignmentService';
import { colors } from '../theme/colors';
import { radii, screenPadding, shadows, spacing } from '../theme/theme';
import { TaskAssignment } from '../types';
import { spaceName } from '../utils/spaces';

function formatDate(value: string | null) {
  if (!value) return 'No due date';
  return new Date(value).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function TaskDetailScreen({ navigation, route }: any) {
  const { theme } = useTheme();
  const paddingBottom = useSafeBottomPadding(40);
  const { tasks, toggleTask, duplicateTask, removeTask } = useTasks();
  const [busy, setBusy] = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const [assignEmail, setAssignEmail] = useState('');
  const [assignBusy, setAssignBusy] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [sentAssignments, setSentAssignments] = useState<TaskAssignment[]>([]);
  const [retryingEmail, setRetryingEmail] = useState<string | null>(null);

  const task = useMemo(
    () => tasks.find((item) => item.id === route.params?.taskId),
    [route.params?.taskId, tasks]
  );

  const loadAssignments = async () => {
    try {
      const all = await fetchSentAssignments();
      setSentAssignments(all.filter((a) => a.task_id === task?.id));
    } catch {
      /* silent */
    }
  };

  if (!task) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <AppText variant="title" style={{ color: theme.text }}>
          Task not found
        </AppText>
        <AppText variant="bodySecondary" style={{ color: theme.muted, marginTop: 8 }}>
          This task may have been removed or completed.
        </AppText>
        <Pressable
          onPress={() => navigation.goBack()}
          style={[styles.backBtn, { borderColor: theme.border }]}
        >
          <AppText variant="subtitle" style={{ color: colors.accentDeep }}>
            Go back
          </AppText>
        </Pressable>
      </View>
    );
  }

  const run = async (action: () => Promise<unknown>, successMessage?: string) => {
    setBusy(true);
    try {
      await action();
      if (successMessage) Alert.alert('Done', successMessage);
    } catch (err) {
      Alert.alert('Action failed', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = () => {
    Alert.alert('Delete task?', 'This task will be permanently removed.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () =>
          run(async () => {
            await removeTask(task.id);
            navigation.goBack();
          }, 'Task deleted.'),
      },
    ]);
  };

  const handleAssign = async () => {
    const email = assignEmail.trim().toLowerCase();
    if (!isValidEmail(email)) {
      Alert.alert('Invalid email', 'Please enter a valid email address.');
      return;
    }
    setShowConfirm(true);
  };

  const confirmSend = async () => {
    const email = assignEmail.trim().toLowerCase();
    setAssignBusy(true);
    setShowConfirm(false);
    try {
      const result = await assignTask({ taskId: task.id, recipientEmail: email });
      let detailMsg = result.message;
      if (!result.recipient_is_user) {
        detailMsg += '\n\nThey will need to create a FlowTask account to see this task.';
      }
      Alert.alert('Task assigned', detailMsg);
      setAssignEmail('');
      setShowAssign(false);
      loadAssignments();
    } catch (err) {
      Alert.alert('Could not send task', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setAssignBusy(false);
    }
  };

  const handleCancelAssignment = async (assignmentId: string) => {
    Alert.alert('Cancel assignment?', 'The recipient will no longer see this assignment.', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, cancel',
        style: 'destructive',
        onPress: async () => {
          try {
            await cancelAssignment(assignmentId);
            Alert.alert('Cancelled', 'The assignment has been cancelled.');
            loadAssignments();
          } catch (err) {
            Alert.alert('Could not cancel', err instanceof Error ? err.message : 'Please try again.');
          }
        },
      },
    ]);
  };

  const priorityColor =
    task.priority === 'high' ? '#EF4444' : task.priority === 'medium' ? '#F59E0B' : '#10B981';

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
        {/* Top Header */}
        <View style={styles.topBar}>
          <IconButton
            icon="chevron-back"
            label="Back"
            tone="plain"
            onPress={() => navigation.goBack()}
          />
          <AppText variant="caption" style={{ color: theme.muted, textTransform: 'uppercase', letterSpacing: 1 }}>
            Task Details
          </AppText>
          <IconButton
            icon="create-outline"
            label={task.organization_id ? 'Open organization workspace' : 'Edit'}
            tone="plain"
            onPress={() => task.organization_id
              ? navigation.navigate('Workspaces', { org: task.organization_id })
              : navigation.navigate('AddTask', { taskId: task.id })}
          />
        </View>

        {/* Task Title & Status Hero */}
        <Card style={styles.heroCard}>
          <View style={styles.badgeRow}>
            <View style={[styles.badge, { backgroundColor: colors.lavenderMist }]}>
              <SpaceDot spaceId={task.context} size={7} />
              <AppText variant="caption" style={{ color: colors.accentDeep, fontWeight: '700' }}>
                {spaceName(task.context)}
              </AppText>
            </View>
            <View style={[styles.badge, { borderColor: priorityColor, borderWidth: 1 }]}>
              <View style={[styles.priorityDot, { backgroundColor: priorityColor }]} />
              <AppText variant="caption" style={{ color: priorityColor, fontWeight: '700', textTransform: 'capitalize' }}>
                {task.priority}
              </AppText>
            </View>
          </View>

          <AppText
            variant="title"
            style={[
              styles.taskTitle,
              { color: theme.text },
              task.status === 'done' ? styles.completedText : null,
            ]}
          >
            {task.title}
          </AppText>

          {task.description ? (
            <AppText variant="bodySecondary" style={[styles.taskDesc, { color: theme.muted }]}>
              {task.description}
            </AppText>
          ) : null}
        </Card>

        {/* Info Grid Card */}
        <Card style={styles.metaCard}>
          <View style={styles.metaRow}>
            <View style={styles.metaIconWrap}>
              <Ionicons name="calendar-outline" size={17} color={colors.accentDeep} />
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="micro" style={{ color: theme.muted }}>DUE DATE</AppText>
              <AppText variant="subtitle" style={{ color: theme.text }}>{formatDate(task.due_date)}</AppText>
            </View>
          </View>

          <View style={[styles.metaDivider, { borderTopColor: theme.border }]} />

          <View style={styles.metaRow}>
            <View style={styles.metaIconWrap}>
              <Ionicons name="checkmark-circle-outline" size={17} color={colors.accentDeep} />
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="micro" style={{ color: theme.muted }}>STATUS</AppText>
              <AppText variant="subtitle" style={{ color: theme.text, textTransform: 'capitalize' }}>
                {task.status === 'done' ? 'Completed' : 'Pending'}
              </AppText>
            </View>
          </View>

          {task.tags && task.tags.length > 0 ? (
            <>
              <View style={[styles.metaDivider, { borderTopColor: theme.border }]} />
              <View style={styles.metaRow}>
                <View style={styles.metaIconWrap}>
                  <Ionicons name="pricetags-outline" size={17} color={colors.accentDeep} />
                </View>
                <View style={{ flex: 1 }}>
                  <AppText variant="micro" style={{ color: theme.muted }}>TAGS</AppText>
                  <AppText variant="subtitle" style={{ color: theme.text }}>{task.tags.join(', ')}</AppText>
                </View>
              </View>
            </>
          ) : null}

          {task.assignee ? (
            <>
              <View style={[styles.metaDivider, { borderTopColor: theme.border }]} />
              <View style={styles.metaRow}>
                <View style={styles.metaIconWrap}>
                  <Ionicons name="person-outline" size={17} color={colors.accentDeep} />
                </View>
                <View style={{ flex: 1 }}>
                  <AppText variant="micro" style={{ color: theme.muted }}>ASSIGNEE</AppText>
                  <AppText variant="subtitle" style={{ color: theme.text }}>{task.assignee}</AppText>
                </View>
              </View>
            </>
          ) : null}
        </Card>

        {/* Primary Action Buttons */}
        <View style={styles.actionStack}>
          {/* Complete / Uncomplete */}
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={() =>
              run(
                () => toggleTask(task),
                task.status === 'done' ? 'Task marked pending.' : 'Task completed!'
              )
            }
            style={({ pressed }) => [
              styles.primaryBtn,
              task.status === 'done' ? styles.secondaryBtn : null,
              pressed ? styles.pressed : null,
            ]}
          >
            <Ionicons
              name={task.status === 'done' ? 'arrow-undo-outline' : 'checkmark-done'}
              size={18}
              color={task.status === 'done' ? colors.accentDeep : colors.derived.onAccent}
            />
            <AppText
              variant="button"
              style={{
                color: task.status === 'done' ? colors.accentDeep : colors.derived.onAccent,
              }}
            >
              {task.status === 'done' ? 'Mark Incomplete' : 'Mark Complete'}
            </AppText>
          </Pressable>

          {/* Start Focus Session */}
          {task.status !== 'done' && (
            <Pressable
              accessibilityRole="button"
              onPress={() => navigation.navigate('FocusMode', { taskId: task.id })}
              style={({ pressed }) => [
                styles.actionPillBtn,
                { backgroundColor: theme.surface, borderColor: theme.border },
                pressed ? styles.pressed : null,
              ]}
            >
              <Ionicons name="timer-outline" size={18} color={colors.accentDeep} />
              <AppText variant="subtitle" style={{ color: theme.text }}>
                Start Focus Session
              </AppText>
            </Pressable>
          )}

          {/* Assign Task */}
          {!task.organization_id && <Pressable
            accessibilityRole="button"
            onPress={() => {
              setShowAssign(!showAssign);
              if (!showAssign) loadAssignments();
            }}
            style={({ pressed }) => [
              styles.actionPillBtn,
              { backgroundColor: theme.surface, borderColor: theme.border },
              pressed ? styles.pressed : null,
            ]}
          >
            <Ionicons name="paper-plane-outline" size={18} color={colors.accentDeep} />
            <AppText variant="subtitle" style={{ color: theme.text }}>
              Assign Task
            </AppText>
          </Pressable>}

          {!task.organization_id && <View style={styles.rowActions}>
            {/* Duplicate */}
            <Pressable
              accessibilityRole="button"
              onPress={() => run(() => duplicateTask(task), 'Task duplicated.')}
              disabled={busy}
              style={({ pressed }) => [
                styles.halfBtn,
                { backgroundColor: theme.surface, borderColor: theme.border },
                pressed ? styles.pressed : null,
              ]}
            >
              <Ionicons name="copy-outline" size={16} color={theme.text} />
              <AppText variant="caption" style={{ color: theme.text, fontWeight: '700' }}>
                Duplicate
              </AppText>
            </Pressable>

            {/* Share */}
            <Pressable
              accessibilityRole="button"
              onPress={() =>
                Share.share({
                  message: `${task.title}\n${task.description || ''}\nDue: ${formatDate(task.due_date)}`,
                })
              }
              style={({ pressed }) => [
                styles.halfBtn,
                { backgroundColor: theme.surface, borderColor: theme.border },
                pressed ? styles.pressed : null,
              ]}
            >
              <Ionicons name="share-outline" size={16} color={theme.text} />
              <AppText variant="caption" style={{ color: theme.text, fontWeight: '700' }}>
                Share
              </AppText>
            </Pressable>
          </View>}
        </View>

        {/* Email Assignment Drawer */}
        {showAssign && (
          <Card style={styles.assignCard}>
            <AppText variant="title" style={{ color: theme.text, fontSize: 18 }}>
              Delegate Task
            </AppText>
            <AppText variant="caption" style={{ color: theme.muted, marginBottom: 12 }}>
              Send this task to any colleague or teammate by email.
            </AppText>

            <Field
              label="Recipient email"
              value={assignEmail}
              onChangeText={setAssignEmail}
              placeholder="teammate@example.com"
              autoCapitalize="none"
              keyboardType="email-address"
              autoCorrect={false}
            />

            <Pressable
              accessibilityRole="button"
              disabled={assignBusy || !assignEmail.trim()}
              onPress={handleAssign}
              style={({ pressed }) => [
                styles.primaryBtn,
                !assignEmail.trim() ? styles.ctaDisabled : null,
                pressed ? styles.pressed : null,
                { marginTop: 12 },
              ]}
            >
              <AppText variant="button" style={{ color: colors.derived.onAccent }}>
                {assignBusy ? 'Sending…' : 'Send Task'}
              </AppText>
            </Pressable>

            {showConfirm && (
              <View style={[styles.confirmBox, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}>
                <AppText variant="subtitle" style={{ color: theme.text, textAlign: 'center' }}>
                  Send "{task.title}" to:
                </AppText>
                <AppText variant="subtitle" style={{ color: colors.accentDeep, textAlign: 'center', marginTop: 2 }}>
                  {assignEmail.trim().toLowerCase()}
                </AppText>
                <View style={styles.confirmRow}>
                  <Pressable
                    onPress={() => setShowConfirm(false)}
                    style={[styles.confirmBtn, { borderColor: theme.border }]}
                  >
                    <AppText variant="caption" style={{ color: theme.muted }}>
                      Cancel
                    </AppText>
                  </Pressable>
                  <Pressable
                    onPress={confirmSend}
                    style={[styles.confirmBtn, { backgroundColor: colors.accent }]}
                  >
                    <AppText variant="caption" style={{ color: colors.derived.onAccent, fontWeight: '700' }}>
                      Confirm & Send
                    </AppText>
                  </Pressable>
                </View>
              </View>
            )}

            {/* Past assignment history */}
            {sentAssignments.length > 0 && (
              <View style={{ marginTop: 16 }}>
                <AppText variant="micro" style={{ color: theme.muted, marginBottom: 6 }}>
                  ASSIGNMENT HISTORY
                </AppText>
                {sentAssignments.map((a) => (
                  <View key={a.id} style={[styles.assignRow, { borderTopColor: theme.border }]}>
                    <View style={{ flex: 1 }}>
                      <AppText variant="caption" style={{ color: theme.text, fontWeight: '700' }}>
                        {a.recipient_email}
                      </AppText>
                      <AppText variant="micro" style={{ color: theme.muted, textTransform: 'capitalize' }}>
                        Status: {a.status}
                      </AppText>
                    </View>
                    {a.email_status === 'failed' && (
                      <Pressable
                        onPress={async () => {
                          setRetryingEmail(a.id);
                          try {
                            await retryAssignmentEmail(a.id);
                            Alert.alert('Retry queued', 'Email retry has been sent.');
                          } catch {
                            Alert.alert('Retry failed', 'Could not retry email.');
                          } finally {
                            setRetryingEmail(null);
                            loadAssignments();
                          }
                        }}
                        disabled={retryingEmail === a.id}
                      >
                        <AppText variant="caption" style={{ color: '#F59E0B', fontWeight: '700' }}>
                          Retry
                        </AppText>
                      </Pressable>
                    )}
                    {a.status === 'sent' && (
                      <Pressable onPress={() => handleCancelAssignment(a.id)}>
                        <AppText variant="caption" style={{ color: theme.danger, fontWeight: '700', marginLeft: 12 }}>
                          Cancel
                        </AppText>
                      </Pressable>
                    )}
                  </View>
                ))}
              </View>
            )}
          </Card>
        )}

        {/* Delete Task */}
        {!task.organization_id && <Pressable
          accessibilityRole="button"
          onPress={confirmDelete}
          disabled={busy}
          style={({ pressed }) => [
            styles.deleteBtn,
            { borderColor: theme.border },
            pressed ? styles.pressed : null,
          ]}
        >
          <Ionicons name="trash-outline" size={17} color={theme.danger} />
          <AppText variant="subtitle" style={{ color: theme.danger }}>
            Delete Task
          </AppText>
        </Pressable>}
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
    gap: spacing.lg,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: screenPadding,
  },
  backBtn: {
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
    gap: spacing.md,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.pill,
  },
  priorityDot: {
    width: 6,
    height: 6,
    borderRadius: radii.pill,
  },
  taskTitle: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 24,
    lineHeight: 30,
  },
  completedText: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
  taskDesc: {
    lineHeight: 22,
  },
  metaCard: {
    gap: spacing.md,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  metaIconWrap: {
    width: 32,
    height: 32,
    borderRadius: radii.md,
    backgroundColor: colors.lavenderMist,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  actionStack: {
    gap: spacing.md,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.accent,
    borderRadius: radii.pill,
    paddingVertical: 15,
    ...shadows.button,
  },
  secondaryBtn: {
    backgroundColor: colors.lavenderMist,
    shadowOpacity: 0,
    elevation: 0,
  },
  actionPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 13,
  },
  rowActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  halfBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 12,
  },
  assignCard: {
    gap: spacing.xs,
  },
  confirmBox: {
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  confirmRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  confirmBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  assignRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 13,
    marginTop: spacing.xs,
  },
  ctaDisabled: {
    backgroundColor: colors.lavenderLight,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
});
