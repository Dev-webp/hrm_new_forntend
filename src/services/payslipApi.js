import api from "./api";

function normalizeArrayResponse(raw, context = "API") {
  if (Array.isArray(raw)) return raw;
  if (raw && Array.isArray(raw.data)) return raw.data;
  if (raw && Array.isArray(raw.payslips)) return raw.payslips;
  if (raw && Array.isArray(raw.rows)) return raw.rows;
  if (raw && Array.isArray(raw.results)) return raw.results;
  if (raw != null) {
    console.warn(`[payslipApi] Unexpected ${context} response shape:`, raw);
  }
  return [];
}

// Fetch all branches
export async function fetchBranches() {
  const response = await api.get("/admin/branches");
  return response.data;
}

// Fetch payroll employees
export async function fetchPayrollEmployees() {
  const response = await api.get("/payroll/employees");
  return normalizeArrayResponse(response.data, "fetchPayrollEmployees");
}

// Fetch payslips with filters
export async function fetchPayslips(filters) {
  let url = `/payroll/payslips?limit=200`;
  if (filters.month) url += `&month=${filters.month}`;
  if (filters.branch && filters.branch !== "all")
    url += `&branch=${encodeURIComponent(filters.branch)}`;
  if (filters.department && filters.department !== "all")
    url += `&department=${encodeURIComponent(filters.department)}`;
  if (filters.search)
    url += `&search=${encodeURIComponent(filters.search)}`;
  const response = await api.get(url);
  return normalizeArrayResponse(response.data, "fetchPayslips");
}

// Fetch attendance preview for payslip generation
export async function fetchAttendancePreview(userId, month) {
  const response = await api.get(
    `/payroll/attendance-preview?user_id=${userId}&month=${month}`
  );
  return response.data;
}

// Generate payslip
export async function generatePayslip(payload) {
  const response = await api.post("/payroll/generate", payload);
  return response.data;
}

// Batch generate payslips
export async function batchGeneratePayslips(payload) {
  const response = await api.post("/payroll/batch-generate", payload);
  return response.data;
}

// Fetch single payslip
export async function fetchPayslip(id) {
  const response = await api.get(`/payroll/payslip/${id}`);
  return response.data;
}

// Update payslip status
export async function updatePayslipStatus(id, status) {
  const response = await api.put(`/payroll/payslip/${id}/status`, {
    payment_status: status,
  });
  return response.data;
}

// Download payslip PDF
export async function downloadPayslipPdf(id) {
  const response = await api.get(`/payroll/payslip/${id}/download`, {
    responseType: "blob",
  });
  return response.data;
}
