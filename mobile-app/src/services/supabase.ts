import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (process.env.EXPO_PUBLIC_SUPABASE_URL || '').trim();
const supabaseAnonKey = (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '').trim();
export const authRedirectTo = (process.env.EXPO_PUBLIC_AUTH_REDIRECT_URL || 'flowtask://auth/callback').trim();

function isValidSupabaseUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname.endsWith('.supabase.co') && !url.hostname.includes('xxxx');
  } catch {
    return false;
  }
}

function isLikelyJwt(value: string) {
  return value.split('.').length === 3 && value.length > 100;
}

export const isSupabaseConfigured = isValidSupabaseUrl(supabaseUrl) && isLikelyJwt(supabaseAnonKey);

export const supabase = createClient(
  supabaseUrl || 'https://invalid.supabase.co',
  supabaseAnonKey || 'missing.invalid.key',
  {
    auth: {
      storage: AsyncStorage,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  }
);

export function requireSupabaseConfig() {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured correctly. Set a real EXPO_PUBLIC_SUPABASE_URL and full EXPO_PUBLIC_SUPABASE_ANON_KEY in mobile-app/.env, then restart Expo with --clear.');
  }
}
