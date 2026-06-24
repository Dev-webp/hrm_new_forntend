import api from "./api";

function normalizeNotificationsList(raw) {
  if (Array.isArray(raw)) return raw;
  if (raw && Array.isArray(raw.data)) return raw.data;
  if (raw != null) {
    console.warn("[notificationsApi] Unexpected notifications list shape:", raw);
  }
  return [];
}

export async function fetchNotifications(limit = 100, filters = {}) {
  const params = { limit };
  if (filters.fromDate) params.fromDate = filters.fromDate;
  if (filters.toDate) params.toDate = filters.toDate;
  const response = await api.get("/notifications", { params });
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

export async function deleteReadNotifications() {
  const response = await api.delete("/notifications/read");
  return response.data;
}

export async function deleteSelectedNotifications(ids) {
  const response = await api.delete("/notifications/selected", { data: { ids } });
  return response.data;
}

export async function deleteNotificationsByRange(fromDate, toDate) {
  const response = await api.delete("/notifications/range", { data: { fromDate, toDate } });
  return response.data;
}

export async function fetchEmployeeMessages(limit = 100) {
  const response = await api.get("/employee/messages", { params: { limit } });
  return normalizeNotificationsList(response.data);
}

export async function fetchEmployeeUnreadCount() {
  const response = await api.get("/employee/messages/unread-count");
  return response.data;
}

export async function markEmployeeMessageRead(id) {
  const response = await api.put(`/employee/messages/${id}/read`);
  return response.data;
}
