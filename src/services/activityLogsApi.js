import api from "./api";

function appendFilterParams(params, filters) {
  if (filters.branch && filters.branch !== "all") {
    params.branch = filters.branch;
  }
  if (filters.search) params.search = filters.search;
  if (filters.action) params.action = filters.action;
  if (filters.severity) params.severity = filters.severity;
  if (filters.from) params.startDate = filters.from;
  if (filters.to) params.endDate = filters.to;
  if (filters.date) params.date = filters.date;
  if (filters.sort) params.sort = filters.sort;
}

function normalizeLogsResponse(raw) {
  const data = Array.isArray(raw?.data) ? raw.data : [];
  return {
    data,
    total: raw?.total ?? raw?.pagination?.total ?? 0,
    page: raw?.page ?? raw?.pagination?.page ?? 1,
    limit: raw?.limit ?? raw?.pagination?.limit ?? 20,
    totalPages: raw?.totalPages ?? raw?.pagination?.totalPages ?? 1,
  };
}

export async function fetchActivityLogs(filters = {}, page = 1, limit = 20) {
  const params = { page, limit };
  appendFilterParams(params, filters);
  const response = await api.get("/activity-logs", { params });
  return normalizeLogsResponse(response.data);
}

export async function fetchActivityLogStats(branch = "all") {
  const params = {};
  if (branch && branch !== "all") {
    params.branch = branch;
  }
  const response = await api.get("/activity-logs/stats/summary", { params });
  return response.data;
}

export async function fetchActivityLogById(id) {
  const response = await api.get(`/activity-logs/${id}`);
  return response.data;
}

export async function deleteActivityLog(id) {
  const response = await api.delete(`/activity-logs/${id}`);
  return response.data;
}

export async function deleteSelectedActivityLogs(ids) {
  const response = await api.delete("/activity-logs/selected", { data: { ids } });
  return response.data;
}

export async function deleteActivityLogsByRange(fromDate, toDate) {
  const response = await api.delete("/activity-logs/range", { data: { fromDate, toDate } });
  return response.data;
}

export async function fetchActivityLogCount() {
  const response = await api.get("/activity-logs/count");
  return response.data;
}

export async function exportActivityLogs(filters = {}) {
  return fetchActivityLogs(filters, 1, 5000);
}
