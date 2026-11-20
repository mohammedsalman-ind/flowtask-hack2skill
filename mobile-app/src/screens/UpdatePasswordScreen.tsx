import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppButton, Card, PasswordField, Screen } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function UpdatePasswordScreen() {
  const { theme } = useTheme();
  const { updatePassword, exitRecovery } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const passwordValid = password.length >= 6;
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;
  const canSubmit = passwordValid && passwordsMatch && !loading;

  const handleUpdate = async () => {
    if (!password) { setError('Password is required.'); return; }
    if (!passwordValid) { setError('Password must be at least 6 characters.'); return; }
    if (!passwordsMatch) { setError('Passwords do not match.'); return; }

    setLoading(true);
    setError('');
    try {
      await updatePassword(password);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Screen>
        <View style={styles.center}>
          <View style={[styles.successIcon, { backgroundColor: theme.success }]}>
            <Ionicons name="checkmark" size={40} color="#FFFFFF" />
          </View>
          <Text style={[styles.successTitle, { color: theme.text }]}>Password changed</Text>
          <Text style={[styles.successMessage, { color: theme.muted }]}>Your password has been updated successfully. Please sign in with your new password.</Text>
          <AppButton label="Go to Login" icon="log-in-outline" onPress={exitRecovery} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <KeyboardAvoidingView behavior="padding" style={styles.center}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={[styles.iconWrap, { backgroundColor: theme.primarySoft }]}>
            <Ionicons name="key-outline" size={32} color={theme.primary} />
          </View>
          <Text style={[styles.title, { color: theme.text }]}>Update password</Text>
          <Text style={[styles.subtitle, { color: theme.muted }]}>Enter your new password below. Make sure it's something you'll remember.</Text>

          <PasswordField value={password} onChangeText={setPassword} placeholder="New password" />
          <Text style={[styles.helperText, { color: theme.muted }]}>Password must be at least 6 characters.</Text>
          <PasswordField value={confirmPassword} onChangeText={setConfirmPassword} placeholder="Confirm new password" returnKeyType="done" onSubmitEditing={handleUpdate} />

          {confirmPassword.length > 0 && !passwordsMatch ? (
            <Text style={[styles.helperError, { color: theme.danger }]}>Passwords do not match.</Text>
          ) : null}

          {error ? <Text style={[styles.error, { color: theme.danger }]}>{error}</Text> : null}

          <AppButton label="Change Password" icon="checkmark-circle-outline" onPress={handleUpdate} loading={loading} disabled={!canSubmit} />

          <AppButton label="Cancel" variant="secondary" onPress={exitRecovery} disabled={loading} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: 'center', paddingVertical: 28, paddingHorizontal: 20 },
  iconWrap: { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 18 },
  title: { fontSize: 28, fontWeight: '900', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 15, lineHeight: 22, textAlign: 'center', marginBottom: 24 },
  helperText: { fontSize: 11, fontWeight: '600', marginTop: -8, marginBottom: 12, marginLeft: 2 },
  helperError: { fontSize: 11, fontWeight: '700', marginTop: -8, marginBottom: 12, marginLeft: 2 },
  error: { fontSize: 13, fontWeight: '700', marginBottom: 12 },
  successIcon: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 18 },
  successTitle: { fontSize: 24, fontWeight: '900', textAlign: 'center', marginBottom: 8 },
  successMessage: { fontSize: 15, lineHeight: 22, textAlign: 'center', marginBottom: 24 },
});
