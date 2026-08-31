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
  const response = await api.get(`/attendance/user/${userId}`, {
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

  return Array.isArray(response.data)
    ? response.data
    : [];
}
export async function updateEmployeeCalendarDay(userId, payload) {
  const response = await api.put(`/attendance/${userId}`, payload);
  return response.data;
}
