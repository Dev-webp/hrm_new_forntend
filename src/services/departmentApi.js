import api from "./api";

function normalizeDepartmentList(raw) {
  if (Array.isArray(raw)) return raw;
  if (raw && Array.isArray(raw.data)) return raw.data;
  if (raw != null) {
    console.warn("[departmentApi] Unexpected departments response shape:", raw);
  }
  return [];
}

export async function fetchBranches() {
  const response = await api.get("/admin/branches");
  return Array.isArray(response.data) ? response.data : [];
}

export async function fetchDepartments(filters = {}) {
  const params = {};
  if (filters.date) params.date = filters.date;
  if (filters.branch && filters.branch !== "all") {
    params.branch = filters.branch;
  }
  if (filters.status && filters.status !== "all") {
    params.status = filters.status;
  }
  if (filters.search) {
    params.search = filters.search;
  }
  const response = await api.get("/departments", { params });
  return normalizeDepartmentList(response.data);
}

export async function fetchDepartmentCount(filters = {}) {
  const params = {};
  if (filters.branch && filters.branch !== "all") {
    params.branch = filters.branch;
  }
  if (filters.status && filters.status !== "all") {
    params.status = filters.status;
  }

  const response = await api.get("/departments", { params });
  const raw = response.data;

  if (typeof raw?.count === "number") return raw.count;
  if (typeof raw?.total === "number") return raw.total;
  if (typeof raw?.data?.count === "number") return raw.data.count;
  if (typeof raw?.data?.total === "number") return raw.data.total;

  return normalizeDepartmentList(raw).length;
}

export async function fetchActiveDepartments(filters = {}) {
  const params = {};
  if (filters.branch && filters.branch !== "all") {
    params.branch = filters.branch;
  }
  const response = await api.get("/departments/active", { params });
  return normalizeDepartmentList(response.data);
}

export async function createDepartment(payload) {
  const response = await api.post("/departments", payload);
  return response.data;
}

export async function updateDepartment(id, payload) {
  const response = await api.put(`/departments/${id}`, payload);
  return response.data;
}

export async function updateDepartmentStatus(id, status) {
  const response = await api.patch(`/departments/${id}/status`, { status });
  return response.data;
}

export async function deleteDepartment(id) {
  const response = await api.delete(`/departments/${id}`);
  return response.data;
}

export async function fetchDepartmentStats(date, branch = "all") {
  const params = { date };
  if (branch && branch !== "all") {
    params.branch = branch;
  }
  const response = await api.get("/attendance/stats", { params });
  return response.data;
}

export async function fetchDepartmentEmployees(department, branch = "all") {
  const params = { department };
  if (branch && branch !== "all") {
    params.branch = branch;
  }
  const response = await api.get("/admin/employees", { params });
  return Array.isArray(response.data) ? response.data : [];
}
