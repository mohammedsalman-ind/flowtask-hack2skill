import { NavigationContainerRef } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';

/**
 * Pending notification data stored during cold-start before navigation is ready.
 * Once the user is authenticated and NavigationContainer is mounted,
 * processPendingNotification() will navigate to the correct task.
 */
let pendingNotification: { taskId: string; type: string } | null = null;

let navigationRef: React.RefObject<NavigationContainerRef<any>> | null = null;

/**
 * Set the navigation container ref. Called once from AppNavigator.
 */
export function setNavigationRef(ref: React.RefObject<NavigationContainerRef<any>>) {
  navigationRef = ref;
}

/**
 * Handle a notification tap (response).
 * Extracts taskId and type from the notification data.
 */
function handleNotificationTap(response: Notifications.NotificationResponse) {
  const data = response.notification.request.content.data;
  const taskId = data?.taskId as string | undefined;
  const type = data?.type as string | undefined;

  if (!taskId) return;

  // Try to navigate immediately
  if (navigationRef?.current?.isReady()) {
    navigateToTask(taskId);
  } else {
    // Store for later (cold-start case)
    pendingNotification = { taskId, type: type || 'task-reminder' };
  }
}

/**
 * Navigate to the TaskDetail screen for a given task ID.
 * Guards against duplicate navigation.
 */
function navigateToTask(taskId: string) {
  const nav = navigationRef?.current;
  if (!nav?.isReady()) return;

  // Avoid duplicate navigation if already on the same task
  const currentRoute = nav.getCurrentRoute();
  if (currentRoute?.name === 'TaskDetail' && (currentRoute.params as any)?.taskId === taskId) {
    return;
  }

  // Navigate to TaskDetail. If we're in a tab, first go to MainTabs, then push TaskDetail.
  // This handles the case where user is on Login screen or deep in another stack.
  nav.reset({
    index: 1,
    routes: [
      { name: 'MainTabs' },
      { name: 'TaskDetail', params: { taskId } },
    ],
  });
}

/**
 * Process any pending notification from cold-start.
 * Called after auth state is resolved and navigation is ready.
 */
export function processPendingNotification() {
  if (!pendingNotification) return;
  const { taskId } = pendingNotification;
  pendingNotification = null;

  // Small delay to ensure NavigationContainer is fully mounted
  setTimeout(() => {
    navigateToTask(taskId);
  }, 300);
}

/**
 * Clear any pending notification (e.g., if the user dismisses it).
 */
export function clearPendingNotification() {
  pendingNotification = null;
}

/**
 * Check if there is a pending notification waiting to be processed.
 */
export function hasPendingNotification(): boolean {
  return pendingNotification !== null;
}

/**
 * Register the notification response listener.
 * Should be called once, after NavigationContainer is mounted.
 * Returns a cleanup function to remove the listener.
 */
export function registerNotificationTapListener(): () => void {
  const subscription = Notifications.addNotificationResponseReceivedListener(handleNotificationTap);
  return () => subscription.remove();
}

/**
 * Get the pending notification task ID (for testing/debugging).
 */
export function getPendingTaskId(): string | null {
  return pendingNotification?.taskId ?? null;
}
