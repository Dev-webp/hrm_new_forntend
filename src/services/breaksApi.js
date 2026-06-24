import api from "./api";

// Fetch all employees (SUPER_ADMIN only)
export async function fetchEmployees() {
  const response = await api.get("/admin/employees");
  console.log(
    "Loaded users for attendance:",
    response.data.map((u) => ({ name: u.full_name, role: u.role }))
  );
  // Map to our expected structure
  return response.data.map((emp) => ({
    id: emp.id,
    name: emp.full_name,
    department: emp.department,
    branch: emp.branch,
    role: emp.role,
  }));
}

// Fetch breaks for given date & branch
export async function fetchBreaks(date, branch) {
  let url = `/breaks?date=${date}`;
  if (branch && branch !== "all") {
    url += `&branch=${encodeURIComponent(branch)}`;
  }
  const response = await api.get(url);
  return response.data;
}

// Update breaks for a specific user
export async function updateBreaks(userId, date, breaks, reason) {
  const payload = { date, breaks, reason };
  const response = await api.put(`/breaks/${userId}`, payload);
  return response.data;
}
