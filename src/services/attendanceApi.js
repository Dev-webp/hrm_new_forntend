import api from "./api";

/** GET /api/attendance?date=&branch=&department=&search= */
export async function fetchAttendance(date, branch, department, search) {
  const params = { date };
  if (branch && branch !== "all") params.branch = branch;
  if (department && department !== "all") params.department = department;
  if (search) params.search = search;

  const { data } = await api.get("/attendance", { params });
  return data;
}

/** GET /api/attendance/stats?date=&branch= */
export async function fetchAttendanceStats(date, branch) {
  const params = { date };
  if (branch && branch !== "all") params.branch = branch;

  const { data } = await api.get("/attendance/stats", { params });
  return data;
}

/** GET /api/attendance/department-leaderboard?date=&branch= */
export async function fetchDepartmentLeaderboard(date, branch) {
  const params = { date };
  if (branch && branch !== "all") params.branch = branch;

  const { data } = await api.get("/attendance/department-leaderboard", {
    params,
  });
  return data;
}

function normalizeDate(value) {
  if (!value) return null;
  return String(value).slice(0, 10); // converts ISO date to YYYY-MM-DD
}

function normalizeTime(value) {
  if (!value || value === "--") return null;

  if (/^\d{2}:\d{2}:\d{2}$/.test(value)) return value;
  if (/^\d{2}:\d{2}$/.test(value)) return `${value}:00`;

  return value;
}

/** PUT /api/attendance/:userId */
export async function updateAttendance(userId, date, updatesOrCheckIn, checkOut, reason) {
  const updates =
    typeof updatesOrCheckIn === "object" && updatesOrCheckIn !== null
      ? updatesOrCheckIn
      : {
          check_in_time: normalizeTime(updatesOrCheckIn),
          check_out_time: normalizeTime(checkOut),
          reason,
        };

  const payload = {
    date: normalizeDate(date),
    ...updates,
    reason: updates.reason || reason,
  };

  Object.keys(payload).forEach((key) => {
    if (payload[key] === undefined) delete payload[key];
  });

  const { data } = await api.put(`/attendance/${userId}`, {
    ...payload,
  });

  return data;
}
