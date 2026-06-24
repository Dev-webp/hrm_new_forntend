import api from "./api";

function normalizeArray(raw) {
  if (Array.isArray(raw)) return raw;
  if (raw?.data && Array.isArray(raw.data)) return raw.data;
  return [];
}

export async function fetchSelfToday() {
  const response = await api.get("/attendance/self/today");
  return response.data;
}

export async function fetchSelfHistory(start, end) {
  const response = await api.get("/attendance/self/history", {
    params: { start, end },
  });
  return normalizeArray(response.data);
}

export async function fetchMyLeaves() {
  const response = await api.get("/leaves/my");
  return normalizeArray(response.data);
}

export async function fetchHolidays(year, month) {
  const response = await api.get("/holidays", { params: { year, month } });
  return normalizeArray(response.data);
}

export async function employeeCheckIn() {
  const response = await api.post("/employee/check-in");
  return response.data;
}

export async function employeeCheckOut() {
  const response = await api.post("/employee/check-out");
  return response.data;
}

export async function fetchMyBreaks(date) {
  const response = await api.get("/employee/my-breaks", { params: { date } });
  return response.data;
}

export async function updateMyBreaks(date, breaks) {
  const response = await api.put("/employee/my-breaks", { date, breaks });
  return response.data;
}

export async function fetchMyBreaksHistory() {
  const response = await api.get("/employee/my-breaks-history");
  return normalizeArray(response.data);
}

export async function submitLeave(payload) {
  const response = await api.post("/leaves", payload);
  return response.data;
}

export async function fetchMyPayslips() {
  const response = await api.get("/employee/my-payslips");
  return normalizeArray(response.data);
}

export async function fetchMyPayslip(month) {
  const response = await api.get("/employee/my-payslip", { params: { month } });
  return response.data;
}
export async function fetchMyLeaveBalance() {
  const response = await api.get("/leaves/my/balance");
  return response.data;
}

export async function updateEmployeeStatus(id, status, reason = "") {
  const response = await api.patch(`/admin/employees/${id}/status`, { status, reason });
  return response.data;
}
