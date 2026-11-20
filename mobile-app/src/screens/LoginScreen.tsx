import React, { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { AppText } from '../components/ui/app-text';
import { Field, PasswordField } from '../components/ui/field';
import { Divider } from '../components/ui/divider';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { colors } from '../theme/colors';
import { radii, screenPadding, shadows, spacing } from '../theme/theme';

export default function LoginScreen({ navigation, route }: any) {
  const { signIn, signUp, signInWithGoogle, resetPassword, unlock } = useAuth();
  const { theme, mode: themeMode } = useTheme();

  // Support both login and create mode right here with segmented toggle
  const initialMode = route?.params?.initialMode || 'login';
  const [authMode, setAuthMode] = useState<'login' | 'create'>(initialMode);
  const isCreate = authMode === 'create';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem('flowtask-biometric-enabled');
        if (stored !== 'true') return;
        const hardware = await LocalAuthentication.hasHardwareAsync();
        const enrolled = await LocalAuthentication.isEnrolledAsync();
        if (hardware && enrolled) setBiometricAvailable(true);
      } catch {
        /* ignore */
      }
    })();
  }, []);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim().toLowerCase());
  const passwordValid = password.length >= 6;
  const passwordsMatch = !isCreate || password === confirmPassword;
  const canSubmit =
    emailValid &&
    passwordValid &&
    (!isCreate || (name.trim().length > 0 && passwordsMatch)) &&
    !loading &&
    !googleLoading;

  const handleSubmit = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (isCreate && !name.trim()) {
      setError('Please enter your name.');
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
    if (isCreate && password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (isCreate) {
        await signUp(name.trim(), normalizedEmail, password);
      } else {
        await signIn(normalizedEmail, password);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = handleSubmit;

  const handleBiometricLogin = async () => {
    setBiometricLoading(true);
    try {
      const ok = await unlock();
      if (!ok) {
        Alert.alert('Authentication failed', 'Fingerprint or face not recognized. Try again or enter your password.');
      }
    } catch {
      Alert.alert('Error', 'Biometric login is unavailable. Use your password instead.');
    } finally {
      setBiometricLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setError('Enter your email first, then tap Forgot password.');
      return;
    }
    try {
      await resetPassword(email.trim().toLowerCase());
      Alert.alert('Reset email sent', 'Check your inbox for a password reset link.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to send reset email.');
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
        <Animated.View entering={FadeInDown.duration(450).springify().damping(16)} style={styles.head}>
          <AppText variant="micro" style={styles.eyebrow}>
            Welcome to FlowTask
          </AppText>
          <AppText variant="display" style={[styles.title, { color: theme.text }]}>
            {isCreate ? 'Create your account' : 'Welcome back'}
          </AppText>
          <AppText variant="bodySecondary" style={{ color: theme.muted }}>
            {isCreate ? 'Your day, organized around you.' : 'Pick up right where you left off.'}
          </AppText>
        </Animated.View>

        {/* Mode switch — segmented control */}
        <Animated.View entering={FadeIn.duration(350).delay(80)} style={styles.segmentWrap}>
          <View style={[styles.segment, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}>
            {(['create', 'login'] as const).map((m) => {
              const active = authMode === m;
              return (
                <Pressable
                  key={m}
                  accessibilityRole="tab"
                  accessibilityState={active ? { selected: true } : {}}
                  onPress={() => {
                    setAuthMode(m);
                    setError('');
                  }}
                  style={[
                    styles.segmentBtn,
                    active ? [styles.segmentOn, { backgroundColor: theme.surface }] : null,
                  ]}
                >
                  <AppText
                    variant="subtitle"
                    style={active ? styles.segmentLabelOn : [styles.segmentLabel, { color: theme.muted }]}
                  >
                    {m === 'create' ? 'Create Account' : 'Log In'}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        </Animated.View>

        <View style={styles.form}>
          {/* Social login */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Continue with Google"
            onPress={async () => {
              setGoogleLoading(true);
              setError('');
              try {
                await signInWithGoogle();
              } catch (err) {
                setError(err instanceof Error ? err.message : 'Unable to sign in with Google.');
              } finally {
                setGoogleLoading(false);
              }
            }}
            disabled={googleLoading}
            style={({ pressed }) => [
              styles.social,
              { backgroundColor: theme.surface, borderColor: theme.border },
              pressed ? styles.pressed : null,
            ]}
          >
            <Ionicons name="logo-google" size={18} color={theme.text} />
            <AppText variant="subtitle" style={{ color: theme.text }}>
              {googleLoading ? 'Connecting to Google…' : 'Continue with Google'}
            </AppText>
          </Pressable>

          <Divider label="or with email" />

          {isCreate && (
            <Field
              label="Your name"
              value={name}
              onChangeText={setName}
              placeholder="Ana"
              autoCorrect={false}
            />
          )}

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
            returnKeyType={isCreate ? 'next' : 'done'}
            onSubmitEditing={!isCreate ? handleLogin : undefined}
          />
          <AppText variant="caption" style={{ color: theme.muted, marginTop: -4, marginBottom: 10 }}>
            Password must be at least 6 characters.
          </AppText>

          {isCreate && (
            <PasswordField
              label="Confirm password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="••••••••"
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
            />
          )}

          {error ? <AppText variant="caption" style={[styles.errorText, { color: theme.danger }]}>{error}</AppText> : null}

          {/* Biometric login button if available on device and in login mode */}
          {!isCreate && biometricAvailable && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Login with fingerprint"
              onPress={handleBiometricLogin}
              disabled={biometricLoading}
              style={({ pressed }) => [
                styles.biometricBtn,
                { backgroundColor: theme.surface, borderColor: theme.border },
                pressed ? styles.pressed : null,
              ]}
            >
              <Ionicons name="finger-print-outline" size={20} color={colors.accentDeep} />
              <AppText variant="subtitle" style={{ color: colors.accentDeep }}>
                {biometricLoading ? 'Verifying…' : 'Login with fingerprint'}
              </AppText>
            </Pressable>
          )}

          {/* Primary CTA */}
          <Pressable
            accessibilityRole="button"
            disabled={!canSubmit}
            onPress={handleSubmit}
            style={({ pressed }) => [
              styles.cta,
              !canSubmit ? styles.ctaDisabled : null,
              pressed && canSubmit ? styles.pressed : null,
            ]}
          >
            <AppText
              variant="button"
              style={[styles.ctaLabel, canSubmit ? null : styles.ctaLabelMuted]}
            >
              {loading
                ? 'One moment…'
                : isCreate
                ? 'Create account'
                : 'Log In'}
            </AppText>
          </Pressable>

          {/* Footnotes */}
          {!isCreate ? (
            <Pressable onPress={handleForgotPassword} style={styles.footerLink}>
              <AppText variant="caption" style={{ color: theme.muted, textAlign: 'center' }}>
                Forgot password? Tap to reset.
              </AppText>
            </Pressable>
          ) : (
            <AppText variant="caption" style={[styles.legalText, { color: theme.muted }]}>
              By continuing you agree to FlowTask's Terms & Privacy Policy.
            </AppText>
          )}
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
    paddingTop: 64,
    paddingBottom: 40,
    gap: spacing.xl,
  },
  head: {
    gap: spacing.xs,
  },
  eyebrow: {
    color: colors.accentDeep,
    letterSpacing: 1.2,
  },
  title: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 32,
    lineHeight: 38,
  },
  segmentWrap: {
    alignItems: 'center',
  },
  segment: {
    flexDirection: 'row',
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 3,
    width: '100%',
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentOn: {
    ...shadows.card,
  },
  segmentLabel: {
    fontSize: 14,
  },
  segmentLabelOn: {
    color: colors.accentDeep,
    fontSize: 14,
    fontWeight: '700',
  },
  form: {
    gap: spacing.lg,
  },
  social: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 14,
  },
  biometricBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 14,
  },
  cta: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
    borderRadius: radii.pill,
    paddingVertical: 15,
    ...shadows.button,
  },
  ctaDisabled: {
    backgroundColor: colors.lavenderLight,
    shadowOpacity: 0,
    elevation: 0,
  },
  ctaLabel: {
    color: colors.derived.onAccent,
    fontWeight: '700',
  },
  ctaLabelMuted: {
    color: colors.derived.onAccentMuted,
  },
  errorText: {
    textAlign: 'center',
    fontWeight: '600',
  },
  footerLink: {
    marginTop: 4,
    alignItems: 'center',
  },
  legalText: {
    textAlign: 'center',
    marginTop: 4,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
});
