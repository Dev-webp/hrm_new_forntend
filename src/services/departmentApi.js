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
  const params = { date: filters.date };
  if (filters.branch && filters.branch !== "all") {
    params.branch = filters.branch;
  }
  const response = await api.get("/departments", { params });
  return normalizeDepartmentList(response.data);
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
