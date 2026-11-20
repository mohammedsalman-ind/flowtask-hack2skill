import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeIn } from '@/components/ui/web-motion';
import { useAuthStore } from '../../../store/authStore';

import { AppText } from '@/components/ui/app-text';
import { Divider } from '@/components/ui/divider';
import { Field } from '@/components/ui/field';
import { colors } from '@/theme/colors';
import { radii, screenPadding, shadows, spacing } from '@/theme/theme';

/**
 * Auth — polished Create Account / Log In. Segmented mode switch, social
 * first (Google / Apple), email fallback. Visual only; no backend.
 */
export default function Auth({ initialMode = 'create', successHref = '/today' }: { initialMode?: 'create' | 'login'; successHref?: string }) {
  const router = useRouter();
  const { login, register, isLoading, error, clearError } = useAuthStore();
  const [mode, setMode] = useState<'create' | 'login'>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => setMode(initialMode), [initialMode]);

  const isCreate = mode === 'create';
  const valid = isCreate
    ? name.trim().length > 0 && email.includes('@') && password.length >= 6
    : email.includes('@') && password.length >= 6;

  const submit = async () => {
    if (!valid || isLoading) return;
    clearError();
    setNotice('');
    const ok = isCreate
      ? await register(email.trim(), password, name.trim())
      : await login(email.trim(), password);
    if (!ok) return;
    const auth = useAuthStore.getState();
    if (auth.isAuthenticated) {
      router.replace(successHref);
    } else {
      setNotice('Account created. Check your email to confirm it, then log in.');
      setMode('login');
    }
  };

  return (
    <View style={styles.screen}>
      <Animated.View entering={FadeInDown.duration(450).springify().damping(16)} style={styles.head}>
        <AppText variant="micro" style={styles.eyebrow}>
          Welcome to FlowTask
        </AppText>
        <AppText variant="display" style={styles.title}>
          {isCreate ? 'Create your account' : 'Welcome back'}
        </AppText>
        <AppText variant="bodySecondary">
          {isCreate ? 'Your day, organized around you.' : 'Pick up right where you left off.'}
        </AppText>
      </Animated.View>

      {/* Mode switch — quiet segmented control */}
      <Animated.View entering={FadeIn.duration(350).delay(100)} style={styles.segmentWrap}>
        <View style={styles.segment}>
          {(['create', 'login'] as const).map((m) => (
            <Pressable
              key={m}
              accessibilityRole="tab"
              accessibilityState={mode === m ? { selected: true } : {}}
              onPress={() => setMode(m)}
              style={[styles.segmentBtn, mode === m ? styles.segmentOn : null]}>
              <AppText
                variant="subtitle"
                style={mode === m ? styles.segmentLabelOn : styles.segmentLabel}>
                {m === 'create' ? 'Create Account' : 'Log In'}
              </AppText>
            </Pressable>
          ))}
        </View>
      </Animated.View>

      <View style={styles.form}>
        <Divider label="email and password" />

        {isCreate ? (
          <Field label="Your name" value={name} onChangeText={setName} placeholder="Ana" />
        ) : null}
        <Field
          label="Email"
          value={email}
          onChangeText={setEmail}
          placeholder="ana@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <Field
          label="Password"
          value={password}
          onChangeText={setPassword}
          placeholder="••••••••"
          secureTextEntry
        />
      </View>

      <View style={styles.footer}>
        <Pressable
          accessibilityRole="button"
          disabled={!valid || isLoading}
          onPress={submit}
          style={({ pressed }) => [
            styles.cta,
            valid ? null : styles.ctaDisabled,
            pressed && valid ? styles.pressed : null,
          ]}>
          <AppText variant="button" style={[styles.ctaLabel, valid ? null : styles.ctaLabelMuted]}>
            {isLoading ? 'One moment…' : isCreate ? 'Create account' : 'Log in'}
          </AppText>
        </Pressable>

        <AppText variant="caption" style={styles.legal}>
          {error || notice || 'Your account is managed securely by FlowTask.'}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: screenPadding,
    paddingTop: 64,
  },
  head: {
    gap: spacing.sm,
  },
  eyebrow: {
    color: colors.accentDeep,
  },
  title: {
    color: colors.ink,
  },
  segmentWrap: {
    marginTop: spacing.xl,
  },
  segment: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 3,
  },
  segmentBtn: {
    flex: 1,
    alignItems: 'center',
    borderRadius: radii.pill,
    paddingVertical: 9,
  },
  segmentOn: {
    backgroundColor: colors.accent,
  },
  segmentLabel: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 18,
  },
  segmentLabelOn: {
    color: colors.derived.onAccent,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '600',
  },
  form: {
    flex: 1,
    justifyContent: 'center',
    gap: spacing.md,
    paddingVertical: spacing.lg,
  },
  footer: {
    gap: spacing.lg,
    paddingBottom: 36,
  },
  cta: {
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: radii.pill,
    paddingVertical: 16,
    ...shadows.floating,
  },
  ctaDisabled: {
    backgroundColor: colors.lavenderLight,
  },
  ctaLabel: {
    color: colors.derived.onAccent,
  },
  ctaLabelMuted: {
    color: colors.textSecondary,
  },
  legal: {
    textAlign: 'center',
    color: colors.textSecondary,
  },
  pressed: {
    opacity: 0.9,
  },
});
