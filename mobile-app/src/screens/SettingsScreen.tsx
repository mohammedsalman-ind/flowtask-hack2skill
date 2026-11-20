import React, { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';

import { AppText } from '../components/ui/app-text';
import { Card } from '../components/ui/card';
import { IconButton } from '../components/ui/icon-button';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useSafeBottomPadding } from '../hooks/useSafeBottomPadding';
import { api } from '../services/api';
import {
  cancelAllNotifications,
  cancelRecurringNotifications,
} from '../services/notificationScheduler';
import { colors } from '../theme/colors';
import { radii, screenPadding, shadows, spacing } from '../theme/theme';

export default function SettingsScreen({ navigation }: any) {
  const { theme, mode, toggleTheme } = useTheme();
  const { user, signOut } = useAuth();
  const paddingBottom = useSafeBottomPadding(40);

  const [reminders, setReminders] = useState(true);
  const [deadlineAlerts, setDeadlineAlerts] = useState(true);
  const [dailyReminders, setDailyReminders] = useState(true);
  const [biometric, setBiometric] = useState(false);
  const [biometricHardware, setBiometricHardware] = useState(false);
  const [biometricEnrolled, setBiometricEnrolled] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('flowtask-biometric-enabled').then((value) =>
      setBiometric(value === 'true')
    );
    AsyncStorage.getItem('flowtask-notifications-enabled').then((value) =>
      setReminders(value !== 'false')
    );
    AsyncStorage.getItem('flowtask-deadline-alerts').then((value) =>
      setDeadlineAlerts(value !== 'false')
    );
    AsyncStorage.getItem('flowtask-daily-reminders').then((value) =>
      setDailyReminders(value !== 'false')
    );

    (async () => {
      try {
        const hardware = await LocalAuthentication.hasHardwareAsync();
        const enrolled = await LocalAuthentication.isEnrolledAsync();
        setBiometricHardware(hardware);
        setBiometricEnrolled(enrolled);
      } catch {
        /* ignore */
      }
    })();
  }, []);

  const toggleBiometric = async (enabled: boolean) => {
    if (!enabled) {
      setBiometric(false);
      await AsyncStorage.setItem('flowtask-biometric-enabled', 'false');
      return;
    }
    const hardware = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    if (!hardware || !enrolled) {
      Alert.alert(
        'Biometrics unavailable',
        'Set up fingerprint or face authentication in your device settings first.'
      );
      return;
    }
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Enable biometric unlock for FlowTask',
    });
    setBiometric(result.success);
    await AsyncStorage.setItem('flowtask-biometric-enabled', result.success ? 'true' : 'false');
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete account',
      'This will permanently delete your FlowTask account and all associated tasks, meetings, and data. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await api.delete('/api/auth/me');
              try { await signOut(); } catch {
                /* local signout fallback */
              }
            } catch (err) {
              Alert.alert(
                'Delete failed',
                err instanceof Error ? err.message : 'Could not delete account. Please try again.'
              );
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
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
          Preferences
        </AppText>
        <View style={{ width: 40 }} />
      </View>

      <AppText variant="display" style={[styles.title, { color: theme.text }]}>
        Settings
      </AppText>

      {/* Account Info */}
      <Card style={styles.accountCard}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={22} color={colors.accentDeep} />
        </View>
        <View style={{ flex: 1 }}>
          <AppText variant="subtitle" style={{ color: theme.text }}>
            {user?.user_metadata?.name || 'FlowTask User'}
          </AppText>
          <AppText variant="caption" style={{ color: theme.muted, marginTop: 2 }}>
            {user?.email || 'Signed in'}
          </AppText>
        </View>
      </Card>

      {/* Preferences Group */}
      <View style={styles.group}>
        <AppText variant="micro" style={[styles.groupTitle, { color: theme.muted }]}>
          PREFERENCES & ALERTS
        </AppText>
        <Card style={styles.groupCard}>
          <SettingSwitchRow
            icon={mode === 'dark' ? 'moon' : 'sunny-outline'}
            title="Dark mode"
            subtitle="Switch between light and dark palettes"
            value={mode === 'dark'}
            onValueChange={toggleTheme}
          />
          <View style={[styles.divider, { borderTopColor: theme.border }]} />
          <SettingSwitchRow
            icon="notifications-outline"
            title="Notifications"
            subtitle="Enable system notifications"
            value={reminders}
            onValueChange={async (v) => {
              setReminders(v);
              await AsyncStorage.setItem('flowtask-notifications-enabled', String(v));
              if (!v) {
                try {
                  await cancelAllNotifications();
                } catch {
                  /* best effort */
                }
              }
            }}
          />
          <View style={[styles.divider, { borderTopColor: theme.border }]} />
          <SettingSwitchRow
            icon="alarm-outline"
            title="Deadline alerts"
            subtitle="Notify before scheduled due times"
            value={deadlineAlerts}
            onValueChange={(v) => {
              setDeadlineAlerts(v);
              AsyncStorage.setItem('flowtask-deadline-alerts', String(v));
            }}
          />
          <View style={[styles.divider, { borderTopColor: theme.border }]} />
          <SettingSwitchRow
            icon="repeat-outline"
            title="Daily reminders"
            subtitle="Automatic morning agenda reminder"
            value={dailyReminders}
            onValueChange={async (v) => {
              setDailyReminders(v);
              await AsyncStorage.setItem('flowtask-daily-reminders', String(v));
              if (!v) {
                try {
                  await cancelRecurringNotifications();
                } catch {
                  /* best effort */
                }
              }
            }}
          />
          <View style={[styles.divider, { borderTopColor: theme.border }]} />
          <SettingSwitchRow
            icon="finger-print-outline"
            title="Biometric login"
            subtitle={
              !biometricHardware
                ? 'Not supported on this hardware'
                : !biometricEnrolled
                ? 'Enroll fingerprint/face on device first'
                : biometric
                ? 'Unlock FlowTask with biometrics'
                : 'Require fingerprint or face unlock'
            }
            value={biometric}
            onValueChange={toggleBiometric}
            disabled={!biometricHardware || !biometricEnrolled}
          />
        </Card>
      </View>

      {/* Info & Features */}
      <View style={styles.group}>
        <AppText variant="micro" style={[styles.groupTitle, { color: theme.muted }]}>
          PRODUCT INFORMATION
        </AppText>
        <Card style={styles.groupCard}>
          <View style={styles.infoRow}>
            <Ionicons name="sparkles-outline" size={19} color={colors.accentDeep} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <AppText variant="subtitle" style={{ color: theme.text }}>Jerry Assistant</AppText>
              <AppText variant="caption" style={{ color: theme.muted }}>Voice AI & bilingual NLP task parsing</AppText>
            </View>
          </View>
          <View style={[styles.divider, { borderTopColor: theme.border }]} />
          <View style={styles.infoRow}>
            <Ionicons name="shield-checkmark-outline" size={19} color={colors.accentDeep} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <AppText variant="subtitle" style={{ color: theme.text }}>Privacy & Security</AppText>
              <AppText variant="caption" style={{ color: theme.muted }}>Encrypted with Supabase Row Level Security</AppText>
            </View>
          </View>
          <View style={[styles.divider, { borderTopColor: theme.border }]} />
          <View style={styles.infoRow}>
            <Ionicons name="information-circle-outline" size={19} color={colors.accentDeep} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <AppText variant="subtitle" style={{ color: theme.text }}>Version</AppText>
              <AppText variant="caption" style={{ color: theme.muted }}>FlowTask 1.0.0 (Expo SDK 54)</AppText>
            </View>
          </View>
        </Card>
      </View>

      {/* Danger Zone */}
      <View style={styles.group}>
        <AppText variant="micro" style={[styles.groupTitle, { color: theme.danger }]}>
          DANGER ZONE
        </AppText>
        <Card style={[styles.groupCard, { borderColor: theme.danger }]}>
          <Pressable
            accessibilityRole="button"
            disabled={deleting}
            onPress={handleDeleteAccount}
            style={styles.dangerRow}
          >
            <Ionicons name="trash-outline" size={20} color={theme.danger} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <AppText variant="subtitle" style={{ color: theme.danger }}>
                {deleting ? 'Deleting account…' : 'Delete Account'}
              </AppText>
              <AppText variant="caption" style={{ color: theme.muted, marginTop: 2 }}>
                Permanently purge all tasks, meetings, and data
              </AppText>
            </View>
            <Ionicons name="chevron-forward" size={16} color={theme.danger} />
          </Pressable>
        </Card>
      </View>
    </ScrollView>
  );
}

function SettingSwitchRow({
  icon,
  title,
  subtitle,
  value,
  onValueChange,
  disabled,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  const { theme } = useTheme();
  return (
    <View style={styles.switchRow}>
      <View style={styles.iconChip}>
        <Ionicons name={icon} size={18} color={colors.accentDeep} />
      </View>
      <View style={styles.switchCopy}>
        <AppText variant="subtitle" style={{ color: theme.text }}>
          {title}
        </AppText>
        <AppText variant="caption" style={{ color: theme.muted, marginTop: 2 }}>
          {subtitle}
        </AppText>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        thumbColor="#FFFFFF"
        trackColor={{ false: theme.border, true: colors.accent }}
      />
    </View>
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
  accountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    backgroundColor: colors.lavenderMist,
    alignItems: 'center',
    justifyContent: 'center',
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
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
  switchCopy: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  dangerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  divider: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
