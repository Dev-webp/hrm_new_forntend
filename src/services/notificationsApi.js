import api from "./api";

function normalizeNotificationsList(raw) {
  if (Array.isArray(raw)) return raw;
  if (raw && Array.isArray(raw.data)) return raw.data;
  if (raw != null) {
    console.warn("[notificationsApi] Unexpected notifications list shape:", raw);
  }
  return [];
}

export async function fetchNotifications(limit = 100) {
  const response = await api.get(`/notifications?limit=${limit}`);
  return normalizeNotificationsList(response.data);
}

export async function fetchUnreadCount() {
  const response = await api.get("/notifications/unread-count");
  return response.data;
}

export async function markAsRead(id) {
  const response = await api.put(`/notifications/${id}/read`);
  return response.data;
}

export async function markAllRead() {
  const response = await api.put("/notifications/mark-all-read");
  return response.data;
}

export async function deleteNotification(id) {
  const response = await api.delete(`/notifications/${id}`);
  return response.data;
}
