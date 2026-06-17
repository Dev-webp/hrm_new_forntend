import api from "./api";

function normalizeArray(raw) {
  if (Array.isArray(raw)) return raw;
  if (raw && Array.isArray(raw.data)) return raw.data;
  return [];
}

/** GET /auth/me */
export async function fetchManagerProfile() {
  const response = await api.get("/auth/me");
  return response.data;
}

/**
 * GET /dashboard/summary — dashboardRoutes.js (MANAGER role uses token branch)
 * Replaces separate stats calls for welcome banner KPIs.
 */
export async function fetchManagerDashboardStats(branch, date) {
  const month = date.slice(0, 7);
  const response = await api.get("/dashboard/summary", {
    params: { month, today: date, branch },
  });
  return response.data;
}

/** GET /attendance?date= — attendanceRoutes.js */
export async function fetchManagerTodayAttendance(branch, date) {
  const params = { date };
  if (branch && branch !== "all") params.branch = branch;
  const response = await api.get("/attendance", { params });
  return normalizeArray(response.data);
}

/** GET /notifications — notificationRoutes.js */
export async function fetchManagerNotifications(limit = 20) {
  const response = await api.get("/notifications", { params: { limit } });
  return normalizeArray(response.data);
}

/** GET /manager/employees — managerRoutes.js (branch from JWT) */
export async function fetchManagerEmployees(filters = {}) {
  const params = {};
  if (filters.department && filters.department !== "all") {
    params.department = filters.department;
  }
  if (filters.search) params.search = filters.search;
  if (filters.status) params.status = filters.status;
  const response = await api.get("/manager/employees", { params });
  return normalizeArray(response.data);
}

/** GET /holidays — holiday routes */
export async function fetchManagerHolidays(year, month) {
  const response = await api.get("/holidays", { params: { year, month } });
  return normalizeArray(response.data);
}

/** GET /attendance/bulk-monthly — attendanceRoutes.js */
export async function fetchManagerBulkMonthlyAttendance(start, end, branch) {
  const params = { start, end };
  if (branch && branch !== "all") params.branch = branch;
  const response = await api.get("/attendance/bulk-monthly", { params });
  return response.data || {};
}

/** GET /leaves — leaveRoutes.js (MANAGER scoped to own branch) */
export async function fetchManagerLeaves(status = "all") {
  const params = {};
  if (status && status !== "all") params.status = status;
  const response = await api.get("/leaves", { params });
  return normalizeArray(response.data);
}

/** PUT /leaves/:id — leaveRoutes.js */
export async function updateManagerLeaveStatus(id, status) {
  const response = await api.put(`/leaves/${id}`, { status });
  return response.data;
}

/** GET /manager/team-payslips — managerRoutes.js */
export async function fetchManagerTeamPayslips(month) {
  const response = await api.get("/manager/team-payslips", { params: { month } });
  return normalizeArray(response.data);
}

/** GET /manager/my-payslip — managerRoutes.js */
export async function fetchManagerMyPayslip(month) {
  const response = await api.get("/manager/my-payslip", { params: { month } });
  return response.data;
}

/** GET /manager/my-break-history — managerRoutes.js */
export async function fetchManagerMyBreakHistory(from, to) {
  const response = await api.get("/manager/my-break-history", {
    params: { from, to },
  });
  return normalizeArray(response.data);
}

/** PUT /notifications/:id/read — notificationRoutes.js */
export async function markManagerNotificationRead(id) {
  const response = await api.put(`/notifications/${id}/read`);
  return response.data;
}

/** GET /attendance/stats?date=&branch= — attendanceRoutes.js */
export async function fetchAttendanceStats(date, branch) {
  const params = { date };
  if (branch && branch !== "all") params.branch = branch;
  const response = await api.get("/attendance/stats", { params });
  return response.data;
}

/** GET /attendance?date=&branch= — attendanceRoutes.js */
export async function fetchAttendanceRecords(date, branch) {
  const params = { date };
  if (branch && branch !== "all") params.branch = branch;
  const response = await api.get("/attendance", { params });
  return normalizeArray(response.data);
}

/** GET /attendance/department-leaderboard?date=&branch= — attendanceRoutes.js */
export async function fetchDeptLeaderboard(date, branch) {
  const params = { date };
  if (branch && branch !== "all") params.branch = branch;
  const response = await api.get("/attendance/department-leaderboard", { params });
  return normalizeArray(response.data);
}

/** GET /attendance/self/today — attendanceRoutes.js */
export async function fetchSelfToday() {
  const response = await api.get("/attendance/self/today");
  return response.data;
}

/** GET /attendance/self/history?start=&end= — attendanceRoutes.js */
export async function fetchSelfHistory(start, end) {
  const response = await api.get("/attendance/self/history", { params: { start, end } });
  return normalizeArray(response.data);
}

export async function checkIn() {
  const response = await api.post("/attendance", {
    action: "office_in",
  });
  return response.data;
}

export async function checkOut() {
  const response = await api.post("/attendance", {
    action: "office_out",
  });
  return response.data;
}

/** PUT /attendance/:userId — attendanceRoutes.js */
export async function editAttendanceRecord(userId, date, checkIn, checkOut, reason) {
  const response = await api.put(`/attendance/${userId}`, {
    date,
    check_in_time: checkIn,
    check_out_time: checkOut,
    reason,
  });
  return response.data;
}

/** GET /attendance-analysis/summary — analysisRoutes.js */
export async function fetchAttendanceAnalysisSummary(month, branch) {
  const params = { month };
  if (branch && branch !== "all") params.branch = branch;
  const response = await api.get("/attendance-analysis/summary", { params });
  return response.data;
}

/** GET /attendance-analysis/individual — analysisRoutes.js */
export async function fetchAttendanceAnalysisIndividual(userId, month) {
  const response = await api.get("/attendance-analysis/individual", {
    params: { userId, month },
  });
  return response.data;
}

/** GET /admin/employees/:id — employeeRoutes.js */
export async function fetchEmployeeById(id) {
  const response = await api.get(`/admin/employees/${id}`);
  return response.data;
}

/** POST /admin/employees — employeeRoutes.js */
export async function createEmployee(payload) {
  const response = await api.post("/admin/employees", payload);
  return response.data;
}

/** PUT /admin/employees/:id — employeeRoutes.js */
export async function updateEmployee(id, payload) {
  const response = await api.put(`/admin/employees/${id}`, payload);
  return response.data;
}

/** DELETE /admin/employees/:id — employeeRoutes.js */
export async function deleteEmployee(id) {
  const response = await api.delete(`/admin/employees/${id}`);
  return response.data;
}

/** GET /leaves/my — leaveRoutes.js */
export async function fetchMyLeaves() {
  const response = await api.get("/leaves/my");
  return normalizeArray(response.data);
}

/** POST /leaves — leaveRoutes.js */
export async function createLeaveRequest(payload) {
  const response = await api.post("/leaves", payload);
  return response.data;
}

/** GET /leaves/my/balance */
export async function fetchMyLeaveBalance(year, month) {
  const response = await api.get("/leaves/my/balance", {
    params: { year, month },
  });
  return response.data;
}
