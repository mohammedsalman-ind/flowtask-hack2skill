import * as Notifications from 'expo-notifications';
import * as Application from 'expo-application';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { api } from './api';
import { areNotificationsEnabled } from './notificationScheduler';

/**
 * Register the device's Expo push token with the FlowTask backend.
 *
 * Flow:
 * 1. Get or request notification permissions
 * 2. Get the Expo push token for this device (requires FCM on Android)
 * 3. Send it to the backend, which stores it in users.push_subscription
 *
 * IMPORTANT: On Android, push token registration requires:
 * - Firebase Cloud Messaging (FCM) configured in the project
 * - google-services.json in the android/app/ directory
 * - expo-notifications plugin in app.json
 *
 * If FCM is not configured, this function will log a clear warning
 * and return null without crashing the app. Push notifications for
 * cross-user assignments will not work until FCM is set up.
 *
 * Must be called after the user is authenticated (needs valid session).
 */
export async function registerPushToken(): Promise<string | null> {
  try {
    if (!(await areNotificationsEnabled())) return null;
    console.log('[PushToken] Starting registration...');

    // 1. Request permissions if not already granted
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      console.log('[PushToken] Notification permission not granted, requesting...');
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('[PushToken] Notification permission denied by user. Push notifications will not work.');
      return null;
    }

    console.log('[PushToken] Notification permission granted.');

    // 2. Get the Expo push token
    //    On Android, this REQUIRES Firebase Cloud Messaging (FCM) to be configured.
    //    If FCM is missing, this will throw with a Firebase error.
    const projectId = getExpoProjectId();
    console.log(`[PushToken] Using project ID: ${projectId || '(empty - this may cause issues)'}`);

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId,
    });

    const pushToken = tokenData.data;

    if (!pushToken) {
      console.warn('[PushToken] Push token was empty after successful API call');
      return null;
    }

    console.log(`[PushToken] Got push token: ${pushToken.substring(0, 30)}...`);

    // 3. Send to backend
    const deviceId = await getDeviceId();
    const platform = Platform.OS;

    try {
      await api.post('/api/auth/push-token', {
        push_token: pushToken,
        platform,
        device_id: deviceId,
      });
      console.log('[PushToken] ✅ Registered with backend successfully');
      return pushToken;
    } catch (err: any) {
      console.warn('[PushToken] ❌ Failed to register with backend:', err?.response?.data || err?.message || err);
      return null;
    }
  } catch (err: any) {
    // Provide a clear, human-readable message for common Firebase issues
    const msg = String(err?.message || err);
    if (msg.includes('FirebaseApp') || msg.includes('FCM') || msg.includes('google-services')) {
      console.warn(
        '[PushToken] ⚠️ Firebase Cloud Messaging is not configured for this Android build.\n' +
        'Push notifications for cross-user task assignments will NOT work until FCM is set up.\n' +
        'To fix this:\n' +
        '  1. Create a Firebase project at https://console.firebase.google.com/\n' +
        '  2. Download google-services.json and place it in android/app/\n' +
        '  3. Add "expo-notifications" plugin to app.json plugins array\n' +
        '  4. Rebuild the Android app with: npx expo run:android\n' +
        'See: https://docs.expo.dev/push-notifications/fcm-credentials/\n' +
        'This does NOT affect task reminders or local notifications.'
      );
    } else {
      console.warn('[PushToken] Unexpected error:', msg);
    }
    return null;
  }
}

/**
 * Get a stable device identifier.
 */
async function getDeviceId(): Promise<string> {
  try {
    if (Platform.OS === 'android') {
      const androidId = await Application.getAndroidId();
      return androidId || `android-${Date.now()}`;
    }
    return await Application.getIosIdForVendorAsync() || `ios-${Date.now()}`;
  } catch {
    return `device-${Date.now()}`;
  }
}

/**
 * Get the Expo project ID from app.json via expo-constants.
 *
 * In Expo SDK 54, Constants.expoConfig?.extra?.eas?.projectId
 * contains the value from app.json → extra.eas.projectId.
 */
function getExpoProjectId(): string {
  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    if (typeof projectId === 'string' && projectId.length > 0) {
      return projectId;
    }
    console.warn('[PushToken] No project ID found in expo-constants. Check app.json → extra.eas.projectId');
    return '';
  } catch {
    console.warn('[PushToken] Could not read project ID from expo-constants');
    return '';
  }
}
