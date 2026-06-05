import api from "./api";

export async function fetchEmployees(branch = "all") {
  const params = {};
  if (branch && branch !== "all") params.branch = branch;

  const response = await api.get("/employees/list", { params });
  return Array.isArray(response.data) ? response.data : [];
}

export async function fetchEmployeeCalendar(userId, start, end) {
  const response = await api.get(`/attendance/employee/${userId}`, {
    params: { start, end, _t: Date.now() },
  });

  return Array.isArray(response.data) ? response.data : [];
}

export async function updateEmployeeCalendarDay(userId, payload) {
  const response = await api.put(`/attendance/${userId}`, payload);
  return response.data;
}