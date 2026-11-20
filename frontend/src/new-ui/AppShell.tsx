import { Ionicons } from '@/components/ui/web-icons';
import { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Modal, Pressable, ScrollView, StyleSheet, TextInput, useWindowDimensions, View } from 'react-native';
import { AppText } from '@/components/ui/app-text';
import { colors } from '@/theme/colors';
import { radii, shadows } from '@/theme/theme';
import { addTask } from '@/lib/store';
import type { TaskType } from '@/lib/store';
import { useAuthStore } from '../store/authStore';

const LINKS: { path: string; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { path: '/today', label: 'Today', icon: 'sunny-outline' },
  { path: '/tasks', label: 'Tasks', icon: 'checkmark-circle-outline' },
  { path: '/calendar', label: 'Calendar', icon: 'calendar-outline' },
  { path: '/jerry', label: 'Jerry', icon: 'sparkles-outline' },
  { path: '/more', label: 'More', icon: 'ellipsis-horizontal-circle-outline' },
];

const TYPES: { value: TaskType; label: string }[] = [
  { value: 'task', label: 'Task' },
  { value: 'reminder', label: 'Reminder' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'note', label: 'Note' },
];

export function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { width } = useWindowDimensions();
  const compact = width < 760;
  const [createOpen, setCreateOpen] = useState(false);
  const [taskType, setTaskType] = useState<TaskType>('task');
  const [title, setTitle] = useState('');
  const [context, setContext] = useState<'work' | 'personal' | 'health' | 'study'>('personal');
  const [dueDate, setDueDate] = useState('');
  const [saving, setSaving] = useState(false);

  const create = async () => {
    if (!title.trim() || saving) return;
    setSaving(true);
    try {
      await addTask({
        title: title.trim(),
        type: taskType,
        spaceId: context,
        boardId: context,
        ...(dueDate ? { time: dueDate.split('T')[1]?.slice(0, 5) || '09:00', date: dueDate } : {}),
      });
      setTitle('');
      setDueDate('');
      setCreateOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const navigateLink = (path: string) => navigate(path);

  return (
    <View style={styles.root}>
      {!compact && (
        <View style={styles.sidebar}>
          <View style={styles.brand}>
            <View style={styles.brandMark}><Ionicons name="flash" size={19} color={colors.derived.onAccent} /></View>
            <AppText variant="heading" style={styles.brandName}>FlowTask</AppText>
          </View>
          <AppText variant="micro" style={styles.navLabel}>YOUR DAY</AppText>
          <View style={styles.navList}>
            {LINKS.map((item) => {
              const active = location.pathname === item.path || (item.path === '/tasks' && location.pathname.startsWith('/board/'));
              return (
                <Pressable key={item.path} onPress={() => navigateLink(item.path)} style={[styles.navItem, active && styles.navItemActive]}>
                  <Ionicons name={item.icon} size={19} color={active ? colors.accentDeep : colors.textSecondary} />
                  <AppText variant="subtitle" style={[styles.navText, active && styles.navTextActive]}>{item.label}</AppText>
                </Pressable>
              );
            })}
          </View>
          <View style={styles.sidebarBottom}>
            <Pressable accessibilityRole="link" onPress={() => navigate('/workspaces')} style={styles.navItem}>
              <Ionicons name="people-outline" size={19} color={colors.accentDeep} />
              <AppText variant="subtitle" style={styles.navText}>Organization workspaces</AppText>
            </Pressable>
            <View style={styles.userChip}>
              <View style={styles.avatar}><AppText variant="caption" style={styles.avatarText}>{(user?.name || user?.email || 'F').slice(0, 1).toUpperCase()}</AppText></View>
              <View style={styles.userText}>
                <AppText variant="subtitle" style={styles.userName} numberOfLines={1}>{user?.name || 'FlowTask user'}</AppText>
                <AppText variant="caption" style={styles.userEmail} numberOfLines={1}>{user?.email || ''}</AppText>
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel="Sign out" onPress={() => void logout()}>
                <Ionicons name="log-out-outline" size={18} color={colors.textSecondary} />
              </Pressable>
            </View>
          </View>
        </View>
      )}

      <View style={styles.main}>
        {compact && (
          <View style={styles.mobileHeader}>
            <View style={styles.brandMark}><Ionicons name="flash" size={17} color={colors.derived.onAccent} /></View>
            <AppText variant="heading" style={styles.brandName}>FlowTask</AppText>
            <Pressable accessibilityRole="link" accessibilityLabel="Organization workspaces" onPress={() => navigate('/workspaces')}>
              <Ionicons name="people-outline" size={21} color={colors.accentDeep} />
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Sign out" style={styles.mobileLogout} onPress={() => void logout()}>
              <Ionicons name="log-out-outline" size={19} color={colors.textSecondary} />
            </Pressable>
          </View>
        )}
        <View style={styles.page}><Outlet /></View>
      </View>

      <Pressable accessibilityRole="button" accessibilityLabel="Create a task" onPress={() => setCreateOpen(true)} style={[styles.fab, compact && styles.fabCompact]}>
        <Ionicons name="add" size={24} color={colors.derived.onAccent} />
      </Pressable>

      {compact && (
        <View style={styles.bottomNav}>
          {LINKS.map((item) => {
            const active = location.pathname === item.path;
            return <Pressable key={item.path} onPress={() => navigateLink(item.path)} style={styles.bottomItem}>
              <Ionicons name={item.icon} size={21} color={active ? colors.accentDeep : colors.textSecondary} />
              <AppText variant="micro" style={[styles.bottomLabel, active && styles.navTextActive]}>{item.label}</AppText>
            </Pressable>;
          })}
        </View>
      )}

      <Modal transparent visible={createOpen} animationType="fade" onRequestClose={() => setCreateOpen(false)}>
        <View style={styles.modalScrim}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setCreateOpen(false)} accessibilityLabel="Close create dialog" />
          <View style={styles.modal}>
            <View style={styles.modalHead}>
              <View><AppText variant="micro" style={styles.modalEyebrow}>QUICK CAPTURE</AppText><AppText variant="display" style={styles.modalTitle}>A thought to keep.</AppText></View>
              <Pressable onPress={() => setCreateOpen(false)} accessibilityLabel="Close"><Ionicons name="close" size={22} color={colors.textSecondary} /></Pressable>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.typeRow}>
              {TYPES.map((item) => <Pressable key={item.value} onPress={() => setTaskType(item.value)} style={[styles.typePill, taskType === item.value && styles.typePillActive]}><AppText variant="caption" style={[styles.typeText, taskType === item.value && styles.typeTextActive]}>{item.label}</AppText></Pressable>)}
            </ScrollView>
            <TextInput value={title} onChangeText={setTitle} placeholder="What needs doing?" placeholderTextColor={colors.textSecondary} style={styles.input} autoFocus />
            <View style={styles.fieldRow}>
              <View style={styles.fieldGroup}><AppText variant="micro" style={styles.fieldLabel}>SPACE</AppText><View style={styles.contextRow}>{(['personal', 'work', 'health', 'study'] as const).map((value) => <Pressable key={value} onPress={() => setContext(value)} style={[styles.contextPill, context === value && styles.contextPillActive]}><AppText variant="caption" style={[styles.typeText, context === value && styles.typeTextActive]}>{value}</AppText></Pressable>)}</View></View>
              <View style={styles.fieldGroup}><AppText variant="micro" style={styles.fieldLabel}>DUE</AppText><TextInput value={dueDate} onChangeText={setDueDate} style={styles.dateInput} placeholder="YYYY-MM-DDTHH:mm" placeholderTextColor={colors.textSecondary} /></View>
            </View>
            <Pressable disabled={!title.trim() || saving} onPress={() => void create()} style={[styles.createButton, (!title.trim() || saving) && styles.createDisabled]}><AppText variant="button" style={styles.createLabel}>{saving ? 'Saving…' : 'Add to my day'}</AppText></Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, flexDirection: 'row', backgroundColor: colors.background, minHeight: '100%' },
  sidebar: { width: 244, padding: 22, borderRightWidth: 1, borderRightColor: colors.border, backgroundColor: colors.surface, justifyContent: 'space-between' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 42 },
  brandMark: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accent, borderRadius: 11 },
  brandName: { color: colors.ink },
  navLabel: { color: colors.textSecondary, marginBottom: 12 },
  navList: { gap: 6, flex: 1 },
  navItem: { flexDirection: 'row', alignItems: 'center', gap: 13, paddingHorizontal: 12, paddingVertical: 12, borderRadius: radii.md },
  navItemActive: { backgroundColor: colors.blushMist },
  navText: { color: colors.textSecondary },
  navTextActive: { color: colors.accentDeep, fontWeight: '700' },
  sidebarBottom: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 16 },
  userChip: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.lavenderMist, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.accentDeep, fontWeight: '700' },
  userText: { flex: 1, minWidth: 0 },
  userName: { color: colors.ink },
  userEmail: { color: colors.textSecondary },
  main: { flex: 1, minWidth: 0, minHeight: 0 },
  page: { flex: 1, minHeight: 0, maxWidth: 1200, width: '100%', alignSelf: 'center' },
  mobileHeader: { height: 58, paddingHorizontal: 18, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', gap: 9 },
  mobileLogout: { marginLeft: 'auto', padding: 8 },
  bottomNav: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 70, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', zIndex: 2 },
  bottomItem: { minWidth: 54, alignItems: 'center', gap: 3 },
  bottomLabel: { color: colors.textSecondary, fontSize: 9 },
  fab: { position: 'absolute', right: 32, bottom: 30, width: 54, height: 54, alignItems: 'center', justifyContent: 'center', borderRadius: 27, backgroundColor: colors.accent, ...shadows.floating, zIndex: 3 },
  fabCompact: { right: 18, bottom: 84 },
  modalScrim: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'center', alignItems: 'center', padding: 20 },
  modal: { width: '100%', maxWidth: 540, backgroundColor: colors.background, borderRadius: radii.xl, padding: 24, gap: 18, ...shadows.floating },
  modalHead: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  modalEyebrow: { color: colors.accentDeep, marginBottom: 6 },
  modalTitle: { color: colors.ink, fontSize: 25 },
  typeRow: { gap: 8 },
  typePill: { paddingHorizontal: 13, paddingVertical: 8, backgroundColor: colors.surface, borderRadius: radii.pill, borderWidth: 1, borderColor: colors.border },
  typePillActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  typeText: { color: colors.textSecondary, textTransform: 'capitalize' },
  typeTextActive: { color: colors.derived.onAccent },
  input: { minHeight: 54, backgroundColor: colors.surface, borderRadius: radii.md, paddingHorizontal: 14, borderWidth: 1, borderColor: colors.border, color: colors.ink, fontSize: 16 },
  fieldRow: { gap: 14 },
  fieldGroup: { gap: 8 },
  fieldLabel: { color: colors.textSecondary },
  contextRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  contextPill: { paddingHorizontal: 10, paddingVertical: 7, backgroundColor: colors.surface, borderRadius: radii.pill },
  contextPillActive: { backgroundColor: colors.accent },
  dateInput: { height: 42, backgroundColor: colors.surface, borderRadius: radii.md, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.border, color: colors.ink },
  createButton: { backgroundColor: colors.accent, alignItems: 'center', paddingVertical: 14, borderRadius: radii.pill },
  createDisabled: { opacity: 0.5 },
  createLabel: { color: colors.derived.onAccent },
});
