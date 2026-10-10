// ── HRMS → Invoice/CRM SSO bridge ──────────────────────────────────────────
// IMPORTANT: the copied pages in src/modules/crm/* and src/modules/invoice/*
// were NOT rewritten — they still contain their original auth code, e.g.
// (see Leads.jsx):
//
//   const authHeader = () => ({
//     Authorization: `Bearer ${localStorage.getItem("vjc_invoice_auth")}`,
//   });
//   const getCurrentUser = () =>
//     JSON.parse(localStorage.getItem("vjc_invoice_user")) || {};
//
// So this file's ONLY job is to make sure those two exact keys —
// "vjc_invoice_auth" and "vjc_invoice_user" — are populated with a real
// Invoice JWT and user object before those pages render. We do NOT invent
// new key names and we do NOT touch the 9+ copied page files.

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5001/api";

const INVOICE_BACKEND_URL =
  import.meta.env.VITE_INVOICE_API_URL ||
  "https://invoice.vjcoverseas.com/api";

/**
 * Runs the two-step SSO exchange and writes vjc_invoice_auth / vjc_invoice_user.
 * Throws on failure — callers decide how to surface that (toast, silent, etc).
 */
export async function runInvoiceSso() {
  const hrmsToken = localStorage.getItem("token");
  if (!hrmsToken) {
    throw new Error("HRMS session expired. Please login again.");
  }

  // Step 1 — HRMS backend issues a 60s one-time ssoToken for this user.
  const hrmsResponse = await fetch(`${API_BASE_URL}/invoice-sso`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${hrmsToken}`,
      "Content-Type": "application/json",
    },
  });
  const hrmsData = await hrmsResponse.json();

  if (!hrmsResponse.ok || !hrmsData?.ssoToken) {
    // Most common cause: this user's invoice_access flag is false/unset in HRMS.
    throw new Error(hrmsData?.message || "Unable to create Invoice SSO session.");
  }

  // Step 2 — Invoice backend exchanges that ssoToken for a real Invoice JWT.
  const invoiceResponse = await fetch(`${INVOICE_BACKEND_URL}/auth/sso`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ssoToken: hrmsData.ssoToken }),
  });
  const invoiceData = await invoiceResponse.json();

  if (!invoiceResponse.ok || !invoiceData?.token) {
    // Most common cause: no row in Invoice's users table matches this email yet.
    throw new Error(invoiceData?.message || "Unable to authenticate with Invoice / CRM.");
  }

  // Write the EXACT keys the copied pages already read.
  localStorage.setItem("vjc_invoice_auth", invoiceData.token);
  localStorage.setItem("vjc_invoice_user", JSON.stringify(invoiceData.user));

  return invoiceData.user; // { id, name, email, role, permissions, ... }
}

/**
 * Call this once, quietly, when an authenticated employee/manager/admin
 * loads any page — e.g. from EmployeeSidebar.jsx on mount. It does nothing
 * (no network call, no error) if the person doesn't have invoice_access,
 * and does nothing if a session is already cached.
 *
 * Returns the Invoice user object on success, or null if not applicable/failed.
 * Never throws — this is meant to run silently in the background.
 */
export async function ensureInvoiceSession(hrmsUser) {
  if (!hrmsUser?.invoice_access) return null;

  const cached = getInvoiceSession();
  if (cached) return cached;

  try {
    return await runInvoiceSso();
  } catch (err) {
    console.warn("[INVOICE_SSO] background bridge failed:", err.message);
    return null;
  }
}

/** Read back the cached Invoice user (role + permissions) without a network call. */
export function getInvoiceSession() {
  const raw = localStorage.getItem("vjc_invoice_user");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/** Call on HRMS logout so a stale Invoice session never leaks into the next login. */
export function clearInvoiceSession() {
  localStorage.removeItem("vjc_invoice_auth");
  localStorage.removeItem("vjc_invoice_user");
}