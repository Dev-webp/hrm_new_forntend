import api from "./api";

export async function fetchLeaveRequests(date, branch) {
  const params = {};

  // ✅ Do not force date filter unless user selected date
  if (date) {
    params.date = date;
  }

  if (branch && branch !== "all") {
    params.branch = branch;
  }

  const response = await api.get("/leaves", { params });
  return Array.isArray(response.data) ? response.data : [];
}

export async function fetchLeaveStats(date, branch) {
  const requests = await fetchLeaveRequests(date, branch);

  return {
    total: requests.length,
    pending: requests.filter((r) => r.status === "pending").length,
    approved: requests.filter((r) => r.status === "approved").length,
    rejected: requests.filter((r) => r.status === "rejected").length,
  };
}

export async function updateLeaveRequest(leaveId, status, reason) {
  const response = await api.put(`/leaves/${leaveId}`, {
    status,
    rejection_reason: reason,
  });

  return response.data;
}

export async function createLeaveRequest(payload) {
  const response = await api.post("/leaves", payload);
  return response.data;
}

export async function fetchLeaveApprovalPreview(leaveId) {
  const response = await api.get(`/leaves/${leaveId}/approval-preview`);
  return response.data;
}