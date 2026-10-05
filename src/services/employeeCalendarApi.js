import api from "./api";

export async function fetchEmployees(branch = "all") {
  const params = {};
  if (branch && branch !== "all") params.branch = branch;

  const response = await api.get("/employees/list", { params });
  console.log(
    "Loaded users for attendance:",
    response.data.map((u) => ({ name: u.full_name, role: u.role }))
  );
  return Array.isArray(response.data) ? response.data : [];
}

export async function fetchEmployeeCalendar(userId, start, end) {
  // Guard against null/undefined userId
  if (!userId || userId === "null" || userId === "undefined") {
    console.warn("fetchEmployeeCalendar called with invalid userId:", userId);
    return { rows: [], summary: null };
  }

  const response = await api.get(`/attendance/range/summary/user/${userId}`, {
    params: {
      start,
      end,
      _t: Date.now(),
    },
  });

  console.log(
    "EMPLOYEE CALENDAR API RESPONSE:",
    response.data
  );

  // The endpoint returns { rows, summary }
  return response.data || { rows: [], summary: null };
}
export async function updateEmployeeCalendarDay(userId, payload) {
  const response = await api.put(`/attendance/${userId}`, payload);
  return response.data;
}

/**
 * HR/Admin: toggle a half-day leave between Paid and Unpaid.
 * @param {number} recordId - attendance_records.id
 * @param {boolean} is_paid - true = Paid Half Day, false = Unpaid Half Day
 * @param {string} reason - mandatory reason (min 5 chars)
 */
export async function verifyHalfDayPaidStatus(recordId, is_paid, reason) {
  const response = await api.patch(`/attendance/${recordId}/half-day-verification`, {
    is_paid,
    reason,
  });
  return response.data;
}
