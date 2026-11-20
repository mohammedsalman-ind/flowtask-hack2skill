import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { AppText } from '../components/ui/app-text';
import { AppButton } from '../components/ui';
import { Field, PasswordField } from '../components/ui/field';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { colors } from '../theme/colors';
import { radii, screenPadding, spacing } from '../theme/theme';

export default function SignupScreen({ navigation }: any) {
  const { signUp, signInWithGoogle } = useAuth();
  const { theme } = useTheme();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim().toLowerCase());
  const passwordValid = password.length >= 6;
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;
  const canSubmit = name.trim().length > 0 && emailValid && passwordValid && passwordsMatch && !loading;

  const handleSignup = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!name.trim()) {
      setError('Name is required.');
      return;
    }
    if (!normalizedEmail || !emailValid) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await signUp(name.trim(), normalizedEmail, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.screen, { backgroundColor: theme.background }]}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.duration(450)} style={styles.head}>
          <AppText variant="micro" style={styles.eyebrow}>
            Join FlowTask
          </AppText>
          <AppText variant="display" style={[styles.title, { color: theme.text }]}>
            Create your account
          </AppText>
          <AppText variant="bodySecondary" style={{ color: theme.muted }}>
            Start with a real FlowTask workspace and keep your tasks synced.
          </AppText>
        </Animated.View>

        <View style={styles.form}>
          <Field
            label="Full name"
            value={name}
            onChangeText={setName}
            placeholder="Ana Silva"
            autoCorrect={false}
          />

          <Field
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="ana@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <PasswordField
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            returnKeyType="next"
          />
          <AppText variant="caption" style={[styles.helperText, { color: theme.muted }]}>
            Password must be at least 6 characters.
          </AppText>

          <PasswordField
            label="Confirm password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="••••••••"
            returnKeyType="done"
            onSubmitEditing={handleSignup}
          />
          {confirmPassword.length > 0 && !passwordsMatch && (
            <AppText variant="caption" style={[styles.helperError, { color: theme.danger }]}>
              Passwords do not match.
            </AppText>
          )}

          {error ? (
            <AppText variant="caption" style={[styles.error, { color: theme.danger }]}>
              {error}
            </AppText>
          ) : null}

          <View style={{ marginTop: spacing.md }}>
            <AppButton
              label={loading ? 'Creating account…' : 'Sign Up'}
              icon="person-add-outline"
              onPress={handleSignup}
              loading={loading}
              disabled={loading}
            />
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Already have an account?"
            onPress={() => navigation.goBack()}
            style={styles.loginLink}
          >
            <AppText variant="caption" style={{ color: theme.muted, textAlign: 'center' }}>
              Already have an account?{' '}
              <AppText variant="caption" style={{ color: theme.primary, fontWeight: '700' }}>
                Log in
              </AppText>
            </AppText>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: screenPadding,
    paddingTop: 54,
    paddingBottom: 40,
  },
  head: {
    marginBottom: spacing.xl,
  },
  eyebrow: {
    color: colors.accentDeep,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
  },
  title: {
    fontFamily: 'serif',
    marginBottom: spacing.xs,
  },
  form: {
    marginTop: spacing.sm,
  },
  helperText: {
    fontSize: 11,
    marginTop: -4,
    marginBottom: 12,
    marginLeft: 2,
  },
  helperError: {
    fontSize: 11,
    marginTop: -4,
    marginBottom: 12,
    marginLeft: 2,
    fontWeight: '700',
  },
  error: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  loginLink: {
    marginTop: spacing.lg,
    paddingVertical: 10,
    alignItems: 'center',
  },
});
