import axios, { AxiosError } from 'axios';
import { Platform } from 'react-native';
import { supabase } from './supabase';

// On Android, a physical device can reach the dev machine via:
//   1. ADB reverse: adb reverse tcp:4000 tcp:4000  (allows http://127.0.0.1:4000)
//   2. LAN IP:      set EXPO_PUBLIC_API_BASE_URL to http://<your-ip>:4000
// The Node API must listen on 0.0.0.0 for LAN access.
function resolveApiBaseUrl(): string {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location) {
    const envUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
    if (envUrl && !envUrl.includes('10.79.38.113')) {
      if (envUrl.includes('127.0.0.1') || envUrl.includes('localhost')) {
        const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
        const hostname = window.location.hostname || 'localhost';
        return `${protocol}//${hostname}:4000`;
      }
      return envUrl.replace(/\/$/, '');
    }
    const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
    const hostname = window.location.hostname || 'localhost';
    return `${protocol}//${hostname}:4000`;
  }
  const rawUrl = (process.env.EXPO_PUBLIC_API_BASE_URL || 'http://127.0.0.1:4000').trim().replace(/\/$/, '');
  if (rawUrl.includes('10.79.38.113')) {
    return 'http://127.0.0.1:4000';
  }
  return rawUrl;
}

export const API_BASE_URL = resolveApiBaseUrl();

// TEMP DEBUG — always log base URL (no sensitive data)
console.log(`[FlowTask DEBUG] API_BASE_URL = ${API_BASE_URL}`);
console.log(`[FlowTask DEBUG] process.env.EXPO_PUBLIC_API_BASE_URL = ${process.env.EXPO_PUBLIC_API_BASE_URL || '(not set)'}`);

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: { Accept: 'application/json' },
});

// ── Request logging (dev only) ──────────────────────────────────────────
let requestCount = 0;
api.interceptors.request.use(async (config) => {
  requestCount++;
  const id = requestCount;
  // TEMP DEBUG — always log the full request URL (no sensitive data)
  const fullUrl = `${config.baseURL || API_BASE_URL}${config.url || ''}`;
  console.log(`[FlowTask DEBUG] → ${config.method?.toUpperCase()} ${fullUrl}`);
  if (__DEV__) console.log(`[API #${id}] ${config.method?.toUpperCase()} ${config.url}`);
  return config;
});

api.interceptors.response.use(
  (response) => {
    if (__DEV__) {
      const id = requestCount;
      console.log(`[API #${id}] ← ${response.status} ${response.config.url}`);
    }
    return response;
  },
  (error) => {
    // TEMP DEBUG — always log failures (no sensitive data)
    const fullUrl = error.config?.baseURL && error.config?.url
      ? `${error.config.baseURL}${error.config.url}`
      : error.config?.url || '(unknown)';
    if (error.response) {
      console.warn(`[FlowTask DEBUG] HTTP ${error.response.status} ${fullUrl}`);
      console.warn(`[FlowTask DEBUG] Response: ${JSON.stringify(error.response.data)}`);
    } else if (error.code === 'ECONNABORTED') {
      console.warn(`[FlowTask DEBUG] TIMEOUT ${fullUrl}`);
    } else {
      console.warn(`[FlowTask DEBUG] NETWORK ERROR ${fullUrl}: ${error.message}`);
    }
    if (__DEV__) {
      const url = error.config?.url || '(unknown)';
      if (error.response) {
        console.warn(`[API] ← ${error.response.status} ${url}:`, error.response.data);
      } else if (error.code === 'ECONNABORTED') {
        console.warn(`[API] ⏰ Timeout: ${url}`);
      } else {
        console.warn(`[API] ❌ Network error: ${url}:`, error.message);
      }
    }
    return Promise.reject(error);
  },
);

// Supabase owns the session. Resolve its current access token for each API
// request so refreshes and a restored session are reflected automatically.
api.interceptors.request.use(async (config) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`;
  }
  return config;
});

export function getApiErrorMessage(error: unknown, fallback = 'Something went wrong. Please try again.') {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as any;

    if (Array.isArray(data?.details) && data.details.length > 0) {
      const detailMessages = data.details
        .map((d: any) => d.message)
        .filter(Boolean)
        .join('. ');
      if (detailMessages) return detailMessages;
    }

    const message = data?.error || data?.detail || data?.message;
    if (typeof message === 'string' && message.trim()) {
      if (message === 'fetch failed') {
        return 'Authentication service is currently unreachable. The database or auth provider may be unavailable.';
      }
      return message;
    }

    if (!error.response) {
      // No response at all — connection failure
      if (error.code === 'ECONNABORTED') {
        return 'The request timed out. The API server may be slow or unreachable.';
      }
      if (Platform.OS === 'android') {
        return (
          'Cannot connect to FlowTask server. Make sure:\n' +
          '1. The Node API is running (npm run dev in backend/node-api)\n' +
          '2. ADB reverse is set up: adb reverse tcp:4000 tcp:4000\n' +
          '   — OR set EXPO_PUBLIC_API_BASE_URL to your machine\'s LAN IP —'
        );
      }
      return 'Cannot reach FlowTask right now. Check your connection and that the API is running.';
    }

    if (error.response.status === 400) return 'Invalid request. Please check your input and try again.';
    if (error.response.status === 401) return 'Your session has expired. Please sign in again.';
    if (error.response.status === 403) return 'You are not authorized to perform this action.';
    if (error.response.status === 404) return 'The requested resource was not found.';
    if (error.response.status === 503) return 'Service temporarily unavailable. Please try again shortly.';
    if (error.response.status >= 500) return 'Something went wrong on our end. Please try again shortly.';
  }
  if (error instanceof Error && error.message.trim()) return error.message;
  return fallback;
}

export function isNetworkError(error: unknown) {
  return error instanceof AxiosError && !error.response;
}

/**
 * Quick connectivity check — call on app startup to log whether
 * the API server is reachable and help diagnose connection issues.
 */
export async function checkApiConnectivity(): Promise<void> {
  try {
    console.log(`[Connectivity] Checking API at ${API_BASE_URL} ...`);
    const response = await api.get('/api/auth/me').catch((err) => {
      // 401 means the API is reachable but we need auth — that's fine
      if (err.response?.status === 401) return err.response;
      throw err;
    });
    console.log(`[Connectivity] ✅ API reachable (HTTP ${response.status})`);
  } catch (err: any) {
    const msg = err?.code === 'ECONNABORTED' ? 'Timeout' : err?.message || 'Unknown error';
    console.warn(`[Connectivity] ❌ API unreachable: ${msg}`);
    console.warn(
      `[Connectivity] API_BASE_URL = ${API_BASE_URL}\n` +
      `[Connectivity] If using a physical Android device, run:\n` +
      `  adb reverse tcp:4000 tcp:4000\n` +
      `[Connectivity] Or set EXPO_PUBLIC_API_BASE_URL in mobile-app/.env to your LAN IP.`
    );
  }
}
