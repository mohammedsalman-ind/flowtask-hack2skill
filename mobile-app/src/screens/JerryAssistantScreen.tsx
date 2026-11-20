import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';

import {
  JerryBubble,
  JerryNextCard,
  JerryPlanCard,
  JerryTaskResultCard,
  JerryTyping,
  UserBubble,
} from '../components/feature/jerry-bubble';
import { AppText } from '../components/ui/app-text';
import { Chip } from '../components/ui/chip';
import { useTasks } from '../context/TasksContext';
import { Task } from '../types';
import { classifyJerryCommand, JerryInputMode } from '../services/jerryService';
import { useSafeBottomPadding } from '../hooks/useSafeBottomPadding';
import { isToday as isTodayDate, isOverdue as isTaskOverdue } from '../utils/dateUtils';
import { colors } from '../theme/colors';
import { radii, screenPadding, shadows, spacing } from '../theme/theme';

type ChatMessage =
  | { id: string; role: 'user'; text: string; timestamp: number }
  | { id: string; role: 'jerry'; text: string; timestamp: number }
  | { id: string; role: 'result'; kind: 'task'; task: Task; timestamp: number }
  | { id: string; role: 'result'; kind: 'plan'; blocks: Task[]; total: number; focusMinutes: number; timestamp: number }
  | { id: string; role: 'result'; kind: 'next'; task: Task; timestamp: number };

let _msgId = 0;
function nextMsgId() {
  return `msg-${++_msgId}-${Date.now()}`;
}

const QUICK_ACTIONS = [
  'Plan my day',
  'What should I work on next?',
  'What tasks are due today?',
  'Remind me to review notes at 5',
];

const suggestedPrompts = [
  'What tasks are due today?',
  'Do I have any overdue tasks?',
  'Kal DSA padhna hai Shaam 7 baje',
  'Aaj mere tasks kya hain?',
  'Isko high priority kar do',
];

function getGreetingMessage(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning! I'm Jerry, your FlowTask assistant. How can I help you flow today?";
  if (hour < 17) return "Good afternoon! I'm Jerry. What would you like to plan or organize?";
  return "Good evening! I'm Jerry. Ready to review today's accomplishments or plan ahead?";
}

export default function JerryAssistantScreen({ navigation }: any) {
  const { tasks, createTask, toggleTask, refreshTasks } = useTasks();
  const paddingBottom = useSafeBottomPadding(28);
  const scrollRef = useRef<ScrollView>(null);

  const [listening, setListening] = useState(false);
  const [working, setWorking] = useState(false);
  const [textCommand, setTextCommand] = useState('');
  const [interim, setInterim] = useState('');
  const [error, setError] = useState('');
  const [speechLanguage, setSpeechLanguage] = useState<'en-IN' | 'hi-IN'>('en-IN');
  const [inputMode, setInputMode] = useState<JerryInputMode>('text');

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'jerry',
      text: getGreetingMessage(),
      timestamp: Date.now(),
    },
  ]);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, working, interim]);

  // Speech recognition handlers
  useSpeechRecognitionEvent('start', () => {
    setListening(true);
  });
  useSpeechRecognitionEvent('end', () => {
    setListening(false);
    setInterim('');
  });
  useSpeechRecognitionEvent('result', (event: any) => {
    const text = event.results?.[0]?.transcript?.trim() || '';
    if (event.isFinal) {
      setInterim('');
      if (text) {
        setTextCommand(text);
        setInputMode('voice');
        // No auto-send after voice: user can tap Send to submit and prevent unintended task creation
      }
    } else {
      setInterim(text);
      if (text) {
        setTextCommand(text);
        setInputMode('voice');
      }
    }
  });
  useSpeechRecognitionEvent('error', (event: any) => {
    if (event.error !== 'aborted') {
      const message =
        event.error === 'not-allowed'
          ? 'Microphone permission was denied. Please allow microphone access in your device/browser settings.'
          : event.error === 'no-speech'
          ? 'No speech detected. Please tap the microphone and try speaking again.'
          : event.message || `Speech recognition error: ${event.error}`;
      Alert.alert('Voice input error', message);
    }
    setListening(false);
    setInterim('');
  });

  useEffect(() => {
    return () => {
      Speech.stop();
      try {
        ExpoSpeechRecognitionModule.abort();
      } catch {
        // ignore
      }
    };
  }, []);

  const addJerryMessage = useCallback((text: string, speak = true) => {
    setMessages((prev) => [...prev, { id: nextMsgId(), role: 'jerry', text, timestamp: Date.now() }]);
    if (speak) {
      Speech.stop();
      Speech.speak(text, { rate: 0.95, pitch: 1.0 });
    }
  }, []);

  const startListening = async () => {
    try {
      if (typeof ExpoSpeechRecognitionModule.isRecognitionAvailable === 'function') {
        const available = await Promise.resolve(ExpoSpeechRecognitionModule.isRecognitionAvailable());
        if (!available) {
          Alert.alert(
            'Speech recognition unavailable',
            Platform.OS === 'web'
              ? 'Voice recognition is not supported in this browser. Please use Google Chrome, Microsoft Edge, or standard text input.'
              : 'Speech recognition is not available on this device.'
          );
          return;
        }
      }
      const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Microphone permission required',
          'FlowTask needs microphone access to convert your speech to text for Jerry. Please enable microphone permissions in your settings.'
        );
        return;
      }
      setInterim('');
      ExpoSpeechRecognitionModule.start({ lang: speechLanguage, interimResults: true, continuous: false });
    } catch (err: any) {
      Alert.alert('Voice error', err instanceof Error ? err.message : 'Unable to start speech recognition.');
      setListening(false);
    }
  };

  const stopListening = () => {
    try {
      ExpoSpeechRecognitionModule.stop();
    } catch {
      // ignore
    }
    setListening(false);
  };

  const executeCommand = async (rawInput: string) => {
    const command = rawInput.trim();
    if (!command) return;

    // Add user bubble
    setMessages((prev) => [...prev, { id: nextMsgId(), role: 'user', text: command, timestamp: Date.now() }]);
    setTextCommand('');
    setInterim('');
    setWorking(true);

    try {
      const lower = command.toLowerCase();

      // Check client-side direct matches for instant rich cards
      if (/\b(plan|organize)\b.*\bday\b/.test(lower) || lower === 'plan my day') {
        const todayItems = tasks.filter((t) => isTodayDate(t.due_date));
        const focusItems = todayItems.filter((t) => t.status !== 'done');
        const focusMinutes = focusItems.length * 25;

        addJerryMessage(
          focusItems.length
            ? `Here's your day: ${focusItems.length} focus blocks lined up.`
            : 'Your day is currently clear. Would you like to schedule a new task?',
          true
        );

        if (focusItems.length > 0) {
          setMessages((prev) => [
            ...prev,
            {
              id: nextMsgId(),
              role: 'result',
              kind: 'plan',
              blocks: focusItems,
              total: focusItems.length,
              focusMinutes,
              timestamp: Date.now(),
            },
          ]);
        }
        setWorking(false);
        return;
      }

      if (/\b(next|what.*work.*on|now)\b/.test(lower)) {
        const nextTask = tasks.find((t) => t.status !== 'done');
        if (nextTask) {
          addJerryMessage(`I recommend focusing on "${nextTask.title}" next.`, true);
          setMessages((prev) => [
            ...prev,
            { id: nextMsgId(), role: 'result', kind: 'next', task: nextTask, timestamp: Date.now() },
          ]);
        } else {
          addJerryMessage("You're all caught up! No pending tasks right now.", true);
        }
        setWorking(false);
        return;
      }

      // Delegate to backend Jerry service
      const classified = await classifyJerryCommand(command, inputMode);

      if (classified.intent === 'task_create') {
        if (classified.result?.duplicate || classified.result?.reason === 'duplicate') {
          addJerryMessage(classified.reply || 'A task with that title already exists.', true);
          setWorking(false);
          return;
        }

        if (classified.result?.success === false || classified.result?.error || classified.result?.reason === 'error' || classified.result?.reason === 'missing_title') {
          addJerryMessage(classified.reply || "I couldn't create that task due to an error. Please try again.", false);
          setWorking(false);
          return;
        }

        let newTask: Task;
        if (classified.result?.task) {
          newTask = classified.result.task;
          refreshTasks().catch(() => {});
        } else {
          newTask = await createTask({
            title: classified.action?.title || classified.title || command,
            description: '',
            due_date: classified.action?.due_date || classified.due_date || new Date().toISOString(),
            priority: (classified.action?.priority as any) || classified.priority || 'medium',
            status: 'todo',
            tags: classified.tags || [],
            context: (classified.action?.context as any) || classified.context || 'work',
          });
        }

        addJerryMessage(classified.reply || `Done! I've added '${newTask.title}' to your tasks.`, true);
        setMessages((prev) => [
          ...prev,
          { id: nextMsgId(), role: 'result', kind: 'task', task: newTask, timestamp: Date.now() },
        ]);
      } else if (classified.intent === 'task_query') {
        refreshTasks().catch(() => {});
        const dueToday = tasks.filter((t) => isTodayDate(t.due_date) && t.status !== 'done').length;
        const overdue = tasks.filter(isTaskOverdue).length;
        const pending = tasks.filter((t) => t.status !== 'done').length;

        const reply =
          classified.reply ||
          `You have ${dueToday} tasks due today, ${pending} open tasks in total${overdue > 0 ? `, and ${overdue} overdue` : ''}.`;
        addJerryMessage(reply, true);
      } else if (classified.intent === 'task_complete' || classified.intent === 'task_delete') {
        refreshTasks().catch(() => {});
        addJerryMessage(classified.reply || "Got it. I've updated your FlowTask plan.", true);
      } else {
        addJerryMessage(classified.reply || "Got it. I've updated your FlowTask plan.", true);
      }
    } catch (err: any) {
      const msg = err instanceof Error ? err.message : String(err || '');
      if (msg.includes('timeout') || msg.includes('Timeout')) {
        setError('Request timed out. Please check network.');
      } else if (msg.includes('Network') || msg.includes('network')) {
        setError('Network error connecting to Jerry.');
      } else if (msg.includes('401') || msg.toLowerCase().includes('session')) {
        setError('Authentication session expired.');
      } else if (msg.includes('500') || msg.includes('AI service')) {
        setError('AI service error. Please try again later.');
      } else {
        setError(msg || 'Unable to process command.');
      }
      addJerryMessage(msg || "Sorry, I had trouble processing that. Please try again or create the task manually.", false);
    } finally {
      setWorking(false);
    }
  };

  const submit = () => executeCommand(textCommand);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.screen}>
      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.avatarWrap}>
            <Ionicons name="sparkles" size={18} color={colors.accentDeep} />
          </View>
          <View>
            <AppText variant="heading" style={styles.title}>
              Jerry
            </AppText>
            <AppText variant="caption" style={styles.statusText}>
              Productivity Assistant
            </AppText>
          </View>
        </View>

        {/* Language switcher */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Switch language"
          onPress={() => setSpeechLanguage((prev) => (prev === 'en-IN' ? 'hi-IN' : 'en-IN'))}
          style={styles.langPill}>
          <AppText variant="caption" style={styles.langText}>
            {speechLanguage === 'en-IN' ? 'English (IN)' : 'Hinglish (IN)'}
          </AppText>
        </Pressable>
      </View>

      {/* Messages Thread */}
      <ScrollView
        ref={scrollRef}
        style={styles.thread}
        contentContainerStyle={styles.threadContent}
        showsVerticalScrollIndicator={false}>
        {messages.map((m) => {
          if (m.role === 'user') {
            return <UserBubble key={m.id} text={m.text} />;
          }
          if (m.role === 'jerry') {
            return <JerryBubble key={m.id} text={m.text} />;
          }
          if (m.role === 'result') {
            if (m.kind === 'task') {
              return (
                <JerryTaskResultCard
                  key={m.id}
                  task={m.task}
                  onToggle={() => toggleTask(m.task)}
                  onPress={() => navigation.navigate('TaskDetail', { taskId: m.task.id })}
                />
              );
            }
            if (m.kind === 'plan') {
              return (
                <JerryPlanCard
                  key={m.id}
                  blocks={m.blocks}
                  total={m.total}
                  focusMinutes={m.focusMinutes}
                />
              );
            }
            if (m.kind === 'next') {
              return (
                <JerryNextCard
                  key={m.id}
                  task={m.task}
                  onPress={() => navigation.navigate('TaskDetail', { taskId: m.task.id })}
                />
              );
            }
          }
          return null;
        })}

        {/* Animated typing dots and thinking indicator when assistant is working */}
        {working && (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 8, paddingHorizontal: 12 }}>
            <ActivityIndicator size="small" color={colors.accentDeep} />
            <AppText variant="caption" style={{ color: colors.textSecondary, marginLeft: 8 }}>
              Jerry is thinking…
            </AppText>
          </View>
        )}

        {/* Live speech interim result */}
        {interim ? (
          <View style={styles.interimRow}>
            <Ionicons name="mic" size={14} color={colors.accentDeep} />
            <AppText variant="caption" style={styles.interimText}>
              &quot;{interim}&quot;
            </AppText>
          </View>
        ) : null}
      </ScrollView>

      {/* Suggested quick chips */}
      <View style={styles.chipsRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsContent}>
          {QUICK_ACTIONS.map((action) => (
            <Pressable
              key={action}
              onPress={() => executeCommand(action)}
              style={styles.chip}>
              <AppText variant="caption" style={styles.chipText}>
                {action}
              </AppText>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* Suggestions prompt line */}
      <View style={{ paddingHorizontal: screenPadding, paddingVertical: 4 }}>
        <AppText variant="caption" style={{ color: colors.textSecondary, fontSize: 11 }}>
          Try saying: &quot;What tasks are due today?&quot; or &quot;Kal DSA padhna hai Shaam 7 baje&quot; or &quot;Isko high priority kar do&quot;
        </AppText>
      </View>

      {/* Composer Dock */}
      <View style={[styles.composerWrap, { paddingBottom }]}>
        <View style={[styles.composerBox, shadows.card]}>
          <TextInput
            value={textCommand}
            onChangeText={(t) => {
              setTextCommand(t);
              setInputMode('text');
            }}
            placeholder={listening ? 'Listening to your voice…' : 'Ask Jerry anything or speak a task…'}
            placeholderTextColor={listening ? colors.accentDeep : colors.textSecondary}
            style={styles.composerInput}
            returnKeyType="send"
            onSubmitEditing={submit}
          />

          {/* Voice Input Microphone Button */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={listening ? 'Stop recording voice input' : 'Start voice input'}
            accessibilityHint="Converts spoken words to text in the composer"
            disabled={working}
            onPress={listening ? stopListening : startListening}
            style={[styles.micBtn, listening ? styles.micBtnListening : null]}>
            <Ionicons
              name={listening ? 'stop' : 'mic'}
              size={18}
              color={listening ? colors.derived.onAccent : colors.accentDeep}
            />
          </Pressable>

          {/* Send Button */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Send"
            disabled={working || textCommand.trim().length === 0}
            onPress={submit}
            style={[
              styles.sendBtn,
              shadows.card,
              (working || textCommand.trim().length === 0) && styles.sendBtnDisabled,
            ]}>
            <Ionicons
              name="arrow-up"
              size={18}
              color={
                textCommand.trim().length > 0 && !working
                  ? colors.derived.onAccent
                  : colors.textSecondary
              }
            />
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
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
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatarWrap: {
    width: 36,
    height: 36,
    borderRadius: radii.pill,
    backgroundColor: colors.lavenderMist,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: colors.ink,
    fontSize: 18,
  },
  statusText: {
    color: colors.textSecondary,
    fontSize: 11,
  },
  langPill: {
    backgroundColor: colors.lavenderMist,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  langText: {
    color: colors.accentDeep,
    fontSize: 11,
    fontWeight: '600',
  },
  thread: {
    flex: 1,
  },
  threadContent: {
    paddingHorizontal: screenPadding,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  interimRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginLeft: 40,
    marginTop: spacing.xs,
  },
  interimText: {
    color: colors.accentDeep,
    fontStyle: 'italic',
  },
  chipsRow: {
    paddingVertical: spacing.xs,
  },
  chipsContent: {
    paddingHorizontal: screenPadding,
    gap: spacing.xs,
  },
  chip: {
    backgroundColor: colors.surface,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipText: {
    color: colors.text,
    fontSize: 12,
  },
  composerWrap: {
    paddingLeft: screenPadding,
    paddingRight: screenPadding + 58,
    paddingTop: spacing.xs,
    backgroundColor: colors.background,
  },
  composerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
  },
  composerInput: {
    flex: 1,
    fontSize: 15,
    color: colors.ink,
    paddingVertical: 8,
  },
  sendBtn: {
    width: 34,
    height: 34,
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.xs,
  },
  sendBtnDisabled: {
    backgroundColor: colors.lavenderMist,
    opacity: 0.6,
  },
  micBtn: {
    width: 34,
    height: 34,
    borderRadius: radii.pill,
    backgroundColor: colors.lavenderMist,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.xs,
  },
  micBtnListening: {
    backgroundColor: colors.danger,
  },
});
