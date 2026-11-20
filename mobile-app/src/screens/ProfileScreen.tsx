import React, { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppText } from '../components/ui/app-text';
import { Card } from '../components/ui/card';
import { IconButton } from '../components/ui/icon-button';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useSafeBottomPadding } from '../hooks/useSafeBottomPadding';
import { colors } from '../theme/colors';
import { radii, screenPadding, shadows, spacing } from '../theme/theme';

export default function ProfileScreen({ navigation }: any) {
  const { user, signOut } = useAuth();
  const { theme, mode, toggleTheme } = useTheme();
  const paddingBottom = useSafeBottomPadding(40);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    Alert.alert('Log out', 'Are you sure you want to log out of FlowTask?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: async () => {
          setLoggingOut(true);
          try {
            await signOut();
          } catch (err) {
            Alert.alert('Logout failed', err instanceof Error ? err.message : 'Please try again.');
          } finally {
            setLoggingOut(false);
          }
        },
      },
    ]);
  };

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: theme.background }]}
      contentContainerStyle={[styles.content, { paddingBottom }]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.topBar}>
        <IconButton
          icon="chevron-back"
          label="Back"
          tone="plain"
          onPress={() => navigation.goBack()}
        />
        <AppText variant="caption" style={{ color: theme.muted, textTransform: 'uppercase', letterSpacing: 1 }}>
          User Profile
        </AppText>
        <IconButton
          icon="settings-outline"
          label="Settings"
          tone="plain"
          onPress={() => navigation.navigate('Settings')}
        />
      </View>

      <AppText variant="display" style={[styles.title, { color: theme.text }]}>
        Profile
      </AppText>

      {/* User Hero Card */}
      <Card style={styles.profileCard}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={26} color={colors.accentDeep} />
        </View>
        <View style={styles.profileCopy}>
          <AppText variant="title" style={{ color: theme.text, fontSize: 20 }}>
            {user?.user_metadata?.name || 'FlowTask User'}
          </AppText>
          <AppText variant="caption" style={{ color: theme.muted, marginTop: 2 }}>
            {user?.email || 'No email registered'}
          </AppText>
        </View>
      </Card>

      {/* Settings Navigation Shortcut */}
      <Pressable
        accessibilityRole="button"
        onPress={() => navigation.navigate('Settings')}
        style={({ pressed }) => [
          styles.shortcutBtn,
          { backgroundColor: theme.surface, borderColor: theme.border },
          pressed ? styles.pressed : null,
        ]}
      >
        <View style={styles.iconChip}>
          <Ionicons name="settings-outline" size={18} color={colors.accentDeep} />
        </View>
        <View style={{ flex: 1 }}>
          <AppText variant="subtitle" style={{ color: theme.text }}>
            Manage Settings
          </AppText>
          <AppText variant="caption" style={{ color: theme.muted }}>
            Biometrics, reminders & alerts
          </AppText>
        </View>
        <Ionicons name="chevron-forward" size={17} color={theme.muted} />
      </Pressable>

      {/* Preferences */}
      <View style={styles.group}>
        <AppText variant="micro" style={[styles.groupTitle, { color: theme.muted }]}>
          PREFERENCES
        </AppText>
        <Card style={styles.groupCard}>
          <View style={styles.settingRow}>
            <View style={styles.iconChip}>
              <Ionicons name={mode === 'dark' ? 'moon' : 'sunny-outline'} size={18} color={colors.accentDeep} />
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="subtitle" style={{ color: theme.text }}>Dark mode</AppText>
              <AppText variant="caption" style={{ color: theme.muted }}>Switch the theme palette</AppText>
            </View>
            <Switch
              value={mode === 'dark'}
              onValueChange={toggleTheme}
              thumbColor="#FFFFFF"
              trackColor={{ false: theme.border, true: colors.accent }}
            />
          </View>
        </Card>
      </View>

      {/* Account */}
      <View style={styles.group}>
        <AppText variant="micro" style={[styles.groupTitle, { color: theme.muted }]}>
          ACCOUNT & COMMUNITY
        </AppText>
        <Card style={styles.groupCard}>
          <View style={styles.settingRow}>
            <View style={styles.iconChip}>
              <Ionicons name="shield-checkmark-outline" size={18} color={colors.accentDeep} />
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="subtitle" style={{ color: theme.text }}>Privacy</AppText>
              <AppText variant="caption" style={{ color: theme.muted }}>Scoped to your secure Supabase account</AppText>
            </View>
          </View>

          <View style={[styles.divider, { borderTopColor: theme.border }]} />

          <Pressable
            accessibilityRole="button"
            onPress={() => Share.share({ message: 'Try FlowTask, a productivity app with AI meeting follow-ups.' })}
            style={({ pressed }) => [styles.settingRow, pressed ? styles.pressed : null]}
          >
            <View style={styles.iconChip}>
              <Ionicons name="share-social-outline" size={18} color={colors.accentDeep} />
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="subtitle" style={{ color: theme.text }}>Share FlowTask</AppText>
              <AppText variant="caption" style={{ color: theme.muted }}>Invite a colleague or friend</AppText>
            </View>
            <Ionicons name="chevron-forward" size={16} color={theme.muted} />
          </Pressable>
        </Card>
      </View>

      {/* About */}
      <View style={styles.group}>
        <AppText variant="micro" style={[styles.groupTitle, { color: theme.muted }]}>
          ABOUT
        </AppText>
        <Card style={styles.groupCard}>
          <AppText variant="bodySecondary" style={{ color: theme.muted, lineHeight: 20 }}>
            FlowTask combines task planning, calendar focus, and AI meeting follow-ups into a unified, mobile-first productivity workflow.
          </AppText>
          <View style={[styles.divider, { borderTopColor: theme.border, marginVertical: 8 }]} />
          <View style={styles.metaRow}>
            <Ionicons name="phone-portrait-outline" size={16} color={colors.accentDeep} />
            <AppText variant="caption" style={{ color: theme.text }}>Expo SDK 54 mobile app</AppText>
          </View>
          <View style={styles.metaRow}>
            <Ionicons name="server-outline" size={16} color={colors.accentDeep} />
            <AppText variant="caption" style={{ color: theme.text }}>Supabase Authentication & Database</AppText>
          </View>
          <View style={styles.metaRow}>
            <Ionicons name="sparkles-outline" size={16} color={colors.accentDeep} />
            <AppText variant="caption" style={{ color: theme.text }}>Jerry AI Assistant</AppText>
          </View>
        </Card>
      </View>

      {/* Logout */}
      <Pressable
        accessibilityRole="button"
        onPress={handleLogout}
        disabled={loggingOut}
        style={({ pressed }) => [
          styles.logoutBtn,
          { borderColor: theme.border },
          pressed ? styles.pressed : null,
        ]}
      >
        <Ionicons name="log-out-outline" size={18} color={theme.danger} />
        <AppText variant="subtitle" style={{ color: theme.danger }}>
          {loggingOut ? 'Signing out…' : 'Sign out'}
        </AppText>
      </Pressable>

      <AppText variant="caption" style={[styles.version, { color: theme.muted }]}>
        FlowTask 1.0.0
      </AppText>
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
    gap: spacing.xl,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 32,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: radii.md,
    backgroundColor: colors.lavenderMist,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileCopy: {
    flex: 1,
  },
  shortcutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  group: {
    gap: spacing.sm,
  },
  groupTitle: {
    letterSpacing: 0.8,
    paddingHorizontal: spacing.xs,
  },
  groupCard: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: 12,
  },
  iconChip: {
    width: 34,
    height: 34,
    borderRadius: radii.md,
    backgroundColor: colors.lavenderMist,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: 14,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: spacing.xs,
  },
  version: {
    textAlign: 'center',
    fontSize: 11,
    paddingBottom: 20,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
});
