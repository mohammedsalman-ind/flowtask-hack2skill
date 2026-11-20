import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '../components/ui/app-text';
import { colors } from '../theme/colors';
import { radii, screenPadding, spacing } from '../theme/theme';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useSafeBottomPadding } from '../hooks/useSafeBottomPadding';

export default function MoreScreen({ navigation }: any) {
  const { user, signOut } = useAuth();
  const { theme, mode, toggleTheme } = useTheme();
  const paddingBottom = useSafeBottomPadding(120);
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

  const GROUPS = [
    {
      title: 'Flow',
      items: [
        {
          label: 'Focus Mode',
          icon: 'timer-outline' as const,
          hint: 'Deep work sessions',
          onPress: () => navigation.navigate('FocusMode'),
        },
        {
          label: 'Insights',
          icon: 'pie-chart-outline' as const,
          hint: 'Your circular stats & flow rate',
          onPress: () => navigation.navigate('Insights'),
        },
      ],
    },
    {
      title: 'Organize',
      items: [
        {
          label: 'Organization workspaces',
          icon: 'people-outline' as const,
          hint: 'Team meetings and assignments',
          onPress: () => navigation.navigate('Workspaces'),
        },
        {
          label: 'Spaces & Boards',
          icon: 'grid-outline' as const,
          hint: 'Visual board by life area',
          onPress: () => navigation.navigate('Board'),
        },
        {
          label: 'Meetings AI',
          icon: 'sparkles-outline' as const,
          hint: 'Record audio or upload transcripts',
          onPress: () => navigation.navigate('MeetingAssistant'),
        },
        {
          label: 'Calendar Timeline',
          icon: 'calendar-outline' as const,
          hint: 'Hourly schedule rail',
          onPress: () => navigation.navigate('Calendar'),
        },
      ],
    },
    {
      title: 'Account & Preferences',
      items: [
        {
          label: 'Set up your flow',
          icon: 'options-outline' as const,
          hint: 'Goals, favorite spaces and reminders',
          onPress: () => navigation.navigate('Setup'),
        },
        {
          label: 'Profile Details',
          icon: 'person-outline' as const,
          hint: user?.email || 'View your account',
          onPress: () => navigation.navigate('Profile'),
        },
        {
          label: 'Settings',
          icon: 'settings-outline' as const,
          hint: 'Biometrics, notifications & alerts',
          onPress: () => navigation.navigate('Settings'),
        },
      ],
    },
  ];

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: theme.background }]}
      contentContainerStyle={[styles.content, { paddingBottom }]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <AppText variant="micro" style={styles.eyebrow}>
          FlowTask Hub
        </AppText>
        <AppText variant="display" style={[styles.title, { color: theme.text }]}>
          More
        </AppText>
      </View>

      {/* User summary mini card */}
      <View style={[styles.userCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={20} color={colors.accentDeep} />
        </View>
        <View style={styles.userText}>
          <AppText variant="subtitle" style={{ color: theme.text }}>
            {user?.user_metadata?.name || 'FlowTask User'}
          </AppText>
          <AppText variant="caption" style={{ color: theme.muted }}>
            {user?.email || 'Signed in'}
          </AppText>
        </View>
      </View>

      {/* Quick theme switch row */}
      <View style={styles.group}>
        <AppText variant="micro" style={[styles.groupTitle, { color: theme.muted }]}>
          Appearance
        </AppText>
        <View style={[styles.groupCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.themeRow}>
            <View style={styles.iconChip}>
              <Ionicons name={mode === 'dark' ? 'moon' : 'sunny-outline'} size={18} color={colors.accentDeep} />
            </View>
            <View style={styles.rowText}>
              <AppText variant="subtitle" style={{ color: theme.text }}>
                Dark Mode
              </AppText>
              <AppText variant="caption" style={{ color: theme.muted }}>
                {mode === 'dark' ? 'Night palette active' : 'Soft blush & paper light'}
              </AppText>
            </View>
            <Switch
              value={mode === 'dark'}
              onValueChange={toggleTheme}
              thumbColor="#FFFFFF"
              trackColor={{ false: theme.border, true: colors.accent }}
            />
          </View>
        </View>
      </View>

      {GROUPS.map((g) => (
        <View key={g.title} style={styles.group}>
          <AppText variant="micro" style={[styles.groupTitle, { color: theme.muted }]}>
            {g.title}
          </AppText>
          <View style={[styles.groupCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            {g.items.map((item, i) => (
              <Pressable
                key={item.label}
                accessibilityRole="button"
                onPress={item.onPress}
                style={({ pressed }) => [
                  styles.row,
                  i > 0 ? [styles.rowDivider, { borderTopColor: theme.border }] : null,
                  pressed ? styles.pressed : null,
                ]}
              >
                <View style={styles.iconChip}>
                  <Ionicons name={item.icon} size={18} color={colors.accentDeep} />
                </View>
                <View style={styles.rowText}>
                  <AppText variant="subtitle" style={[styles.rowLabel, { color: theme.text }]}>
                    {item.label}
                  </AppText>
                  {item.hint ? (
                    <AppText variant="caption" style={[styles.rowHint, { color: theme.muted }]}>
                      {item.hint}
                    </AppText>
                  ) : null}
                </View>
                <Ionicons name="chevron-forward" size={16} color={theme.muted} />
              </Pressable>
            ))}
          </View>
        </View>
      ))}

      {/* Logout button */}
      <Pressable
        accessibilityRole="button"
        onPress={handleLogout}
        disabled={loggingOut}
        style={({ pressed }) => [
          styles.logoutButton,
          { backgroundColor: theme.surface, borderColor: theme.border },
          pressed ? styles.pressed : null,
        ]}
      >
        <Ionicons name="log-out-outline" size={18} color={theme.danger} />
        <AppText variant="subtitle" style={{ color: theme.danger }}>
          {loggingOut ? 'Signing out...' : 'Sign out'}
        </AppText>
      </Pressable>

      <AppText variant="caption" style={[styles.versionText, { color: theme.muted }]}>
        FlowTask v1.0.0 · Mobile Productivity & AI Follow-ups
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
  header: {
    gap: spacing.xs,
  },
  eyebrow: {
    color: colors.accentDeep,
    letterSpacing: 1.2,
  },
  title: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 32,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    backgroundColor: colors.lavenderMist,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userText: {
    flex: 1,
  },
  group: {
    gap: spacing.sm,
  },
  groupTitle: {
    letterSpacing: 0.8,
    paddingHorizontal: spacing.xs,
  },
  groupCard: {
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.lg,
  },
  themeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    paddingVertical: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    paddingVertical: 14,
  },
  rowDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  iconChip: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    backgroundColor: colors.lavenderMist,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  rowHint: {
    fontSize: 12,
    marginTop: 2,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: 14,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: spacing.md,
  },
  versionText: {
    textAlign: 'center',
    fontSize: 11,
    paddingBottom: 20,
  },
  pressed: {
    opacity: 0.8,
  },
});
