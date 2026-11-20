import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Session, User } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import * as LocalAuthentication from 'expo-local-authentication';
import { authRedirectTo, requireSupabaseConfig, supabase } from '../services/supabase';
import { api, getApiErrorMessage } from '../services/api';

const biometricStorageKey = 'flowtask-biometric-enabled';

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  initializing: boolean;
  locked: boolean;
  recovering: boolean;
  unlock: () => Promise<boolean>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
  exitRecovery: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [locked, setLocked] = useState(false);
  const [recovering, setRecovering] = useState(false);

  useEffect(() => {
    let mounted = true;
    const restore = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (mounted) {
          setSession(data.session);
          const biometricEnabled = (await AsyncStorage.getItem(biometricStorageKey)) === 'true';
          if (data.session && biometricEnabled) setLocked(true);
        }
      } catch {
        if (mounted) setSession(null);
      } finally {
        if (mounted) setInitializing(false);
      }
    };
    restore();
    const { data: listener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!mounted) return;
      setSession(nextSession);
      // When user taps the reset-password email link, Supabase fires PASSWORD_RECOVERY.
      // Enter recovery mode so the UI shows the Update Password screen instead of Home.
      if (event === 'PASSWORD_RECOVERY') {
        setRecovering(true);
      }
    });
    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const unlock = useCallback(async () => {
    try {
      const result = await LocalAuthentication.authenticateAsync({ promptMessage: 'Unlock FlowTask' });
      if (result.success) setLocked(false);
      return result.success;
    } catch { return false; }
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      requireSupabaseConfig();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (error || !data.session) throw new Error(error?.message || 'Sign-in succeeded without a session.');
      setSession(data.session);
      // Creates a profile for users provisioned outside the Node API. The API
      // interceptor supplies the session access token to this request.
      await api.get('/api/auth/me');
    } catch (error) {
      throw new Error(getApiErrorMessage(error, 'Unable to sign in.'));
    }
  }, []);


  const signInWithGoogle = useCallback(async () => {
    requireSupabaseConfig();
    const redirectTo = authRedirectTo || Linking.createURL('auth/callback');
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo, skipBrowserRedirect: true },
    });
    if (error || !data?.url) throw new Error(error?.message || 'Unable to start Google sign-in.');

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (result.type !== 'success' || !result.url) {
      if (result.type === 'cancel' || result.type === 'dismiss') return;
      throw new Error('Google sign-in was not completed.');
    }

    const callbackUrl = new URL(result.url);
    const hashParams = new URLSearchParams(callbackUrl.hash.replace(/^#/, ''));
    const queryParams = callbackUrl.searchParams;
    const accessToken = hashParams.get('access_token') || queryParams.get('access_token');
    const refreshToken = hashParams.get('refresh_token') || queryParams.get('refresh_token');
    if (!accessToken || !refreshToken) {
      const authError = hashParams.get('error_description') || queryParams.get('error_description');
      throw new Error(authError ? decodeURIComponent(authError) : 'Google sign-in did not return a session.');
    }

    const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (sessionError || !sessionData.session) throw new Error(sessionError?.message || 'Google sign-in did not return a session.');
    await api.post('/api/auth/google', { access_token: sessionData.session.access_token });
    setSession(sessionData.session);
  }, []);

  const signUp = useCallback(async (name: string, email: string, password: string) => {
    try {
      const { data } = await api.post('/api/auth/register', { name: name.trim(), email: email.trim().toLowerCase(), password });
      const payload = data?.data;
      if (!payload?.access_token || !payload?.refresh_token) {
        if (payload?.requires_confirmation) throw new Error('Account created. Check your email to confirm it, then sign in.');
        throw new Error('Account created without a usable session. Please sign in.');
      }
      const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
        access_token: payload.access_token,
        refresh_token: payload.refresh_token,
      });
      if (sessionError || !sessionData.session) throw new Error(sessionError?.message || 'Account created but the session could not be restored.');
      setSession(sessionData.session);
    } catch (error) {
      throw new Error(getApiErrorMessage(error, 'Unable to create account.'));
    }
  }, []);

  const signOut = useCallback(async () => {
    try { if (session?.access_token) await api.post('/api/auth/logout'); } catch { /* local logout still succeeds */ }
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error(error.message);
    setSession(null);
    setLocked(false);
  }, [session]);

  const resetPassword = useCallback(async (email: string) => {
    requireSupabaseConfig();
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: authRedirectTo,
    });
    if (error) throw new Error(error.message);
  }, []);

  const updatePassword = useCallback(async (newPassword: string) => {
    requireSupabaseConfig();
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw new Error(error.message);
    // Password updated successfully. Sign out so user logs in with new password.
    setRecovering(false);
    await supabase.auth.signOut();
    setSession(null);
  }, []);

  const exitRecovery = useCallback(() => {
    setRecovering(false);
    supabase.auth.signOut().catch(() => {});
    setSession(null);
  }, []);

  const value = useMemo(
    () => ({
      user: session?.user ?? null,
      session,
      initializing,
      locked,
      recovering,
      unlock,
      signIn,
      signInWithGoogle,
      signUp,
      signOut,
      resetPassword,
      updatePassword,
      exitRecovery,
    }),
    [initializing, locked, recovering, resetPassword, session, signIn, signInWithGoogle, signOut, signUp, unlock, updatePassword, exitRecovery]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
