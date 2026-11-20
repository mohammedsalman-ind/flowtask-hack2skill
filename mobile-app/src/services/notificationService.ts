import { api } from './api';

export type FlowNotification = { id: string; message: string; type: string; is_read: boolean; created_at: string; reference_id?: string | null };

export async function fetchNotifications(): Promise<{ notifications: FlowNotification[]; unreadCount: number }> {
  if (!api.defaults.baseURL) throw new Error('API service is not configured.');
  const { data } = await api.get('/api/notifications');
  const payload = data?.data || {};
  return { notifications: payload.notifications || [], unreadCount: payload.unread_count || 0 };
}

export async function markAllNotificationsRead() {
  if (!api.defaults.baseURL) return;
  await api.patch('/api/notifications/read-all');
}
