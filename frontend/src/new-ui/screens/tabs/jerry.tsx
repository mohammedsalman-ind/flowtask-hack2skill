import { useRef, useState } from 'react';
import { Ionicons } from '@/components/ui/web-icons';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import apiClient from '../../../api/client';
import { useTaskStore } from '../../../store/taskStore';
import { AppText } from '@/components/ui/app-text';
import { colors } from '@/theme/colors';
import { radii, screenPadding, spacing } from '@/theme/theme';

type Message = { role: 'user' | 'jerry'; text: string };
export default function Jerry() {
  const [thread, setThread] = useState<Message[]>([{ role: 'jerry', text: 'Hi, I’m Jerry. I can help create or update tasks, plan your day, and answer questions about your tasks.' }]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const scroll = useRef<ScrollView>(null);
  const send = async (raw: string) => {
    const text = raw.trim(); if (!text || busy) return;
    setDraft(''); setError(''); setBusy(true);
    setThread((items) => [...items, { role: 'user', text }]);
    try {
      const { data } = await apiClient.post<{ reply?: string; detail?: string }>('/api/ai/parse', { text });
      setThread((items) => [...items, { role: 'jerry', text: data.reply || data.detail || 'The request was processed.' }]);
      await useTaskStore.getState().fetchTasks();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Jerry is unavailable.');
    } finally { setBusy(false); requestAnimationFrame(() => scroll.current?.scrollToEnd({ animated: true })); }
  };
  return <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <View style={styles.header}><View style={styles.avatar}><Ionicons name="sparkles" size={20} color={colors.accentDeep} /></View><View><AppText variant="display" style={styles.title}>Jerry</AppText><AppText variant="caption">Connected to your FlowTask account</AppText></View></View>
    <ScrollView ref={scroll} contentContainerStyle={styles.thread} onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })}>
      {thread.map((message, index) => <View key={index} style={[styles.bubble, message.role === 'user' ? styles.userBubble : styles.jerryBubble]}><AppText variant="bodySecondary" style={message.role === 'user' ? styles.userText : undefined}>{message.text}</AppText></View>)}
      {busy ? <AppText variant="caption">Jerry is thinking…</AppText> : null}
      {error ? <AppText variant="caption" style={styles.error}>{error}</AppText> : null}
    </ScrollView>
    <View style={styles.composer}><TextInput value={draft} onChangeText={setDraft} placeholder="Ask Jerry to create a task or plan your day…" placeholderTextColor={colors.textSecondary} accessibilityLabel="Message Jerry" onSubmitEditing={() => void send(draft)} style={styles.input} /><Pressable accessibilityRole="button" accessibilityLabel="Send message" disabled={!draft.trim() || busy} onPress={() => void send(draft)} style={[styles.send, (!draft.trim() || busy) && styles.muted]}><Ionicons name="arrow-up" size={18} color={colors.derived.onAccent} /></Pressable></View>
  </KeyboardAvoidingView>;
}

const styles = StyleSheet.create({ screen: { flex: 1, backgroundColor: colors.background }, header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: screenPadding, paddingTop: 40 }, avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.lavenderMist }, title: { color: colors.ink }, thread: { paddingHorizontal: screenPadding, paddingBottom: spacing.lg, gap: spacing.md, flexGrow: 1 }, bubble: { padding: 14, borderRadius: radii.lg, maxWidth: '85%' }, jerryBubble: { alignSelf: 'flex-start', backgroundColor: colors.surface }, userBubble: { alignSelf: 'flex-end', backgroundColor: colors.accent }, userText: { color: colors.derived.onAccent }, composer: { margin: screenPadding, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: 7, paddingLeft: 15, borderRadius: radii.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface }, input: { flex: 1, minHeight: 40, color: colors.ink }, send: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 19, backgroundColor: colors.accent }, muted: { opacity: 0.5 }, error: { color: '#B42318' } });
