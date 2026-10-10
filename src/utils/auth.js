/** Centralized auth/session helpers (localStorage). */

export function getAuthToken() {
  return localStorage.getItem("token");
}

export function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    clearAuthSession();
    return null;
  }
}

export function getStoredRole() {
  return getStoredUser()?.role || "";
}

export function getStoredBranch() {
  return localStorage.getItem("branch");
}

export function setAuthSession({ token, user }) {
  // Clear any previously exchanged Invoice/CRM session first — a fresh
  // HRMS login must never inherit whoever's Invoice token was last set,
  // even if the browser wasn't explicitly logged out in between.
  localStorage.removeItem("vjc_invoice_auth");
  localStorage.removeItem("vjc_invoice_user");

  localStorage.setItem("token", token);
  localStorage.setItem("user", JSON.stringify(user));
  localStorage.setItem("full_name", user?.full_name || user?.name || "Employee");
  localStorage.setItem("designation", user?.designation || "");
  if (user?.employee_code) {
    localStorage.setItem("employee_code", user.employee_code);
  }
  if (user?.role === "OPERATIONAL_MANAGER") {
    localStorage.setItem("branch", "all");
  } else if (user?.branch) {
    localStorage.setItem("branch", user.branch);
  }
}

export function clearAuthSession() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  localStorage.removeItem("branch");
  localStorage.removeItem("full_name");
  localStorage.removeItem("designation");
  localStorage.removeItem("employee_code");
  // Also clear the exchanged Invoice/CRM session — otherwise the next
  // person to log into HRMS on this browser inherits whoever's Invoice
  // token was last exchanged (e.g. seeing "Zakir" data while logged in
  // as a different admin).
  localStorage.removeItem("vjc_invoice_auth");
  localStorage.removeItem("vjc_invoice_user");
}

export function isAuthenticated() {
  const token = getAuthToken();
  if (!token) return false;

  try {
    if (localStorage.getItem("user")) {
      JSON.parse(localStorage.getItem("user"));
    }
  } catch {
    clearAuthSession();
    return false;
  }

  return true;
}

/** Decode JWT payload without external library */
export function decodeJwt(token) {
  if (!token) return {};
  try {
    const payload = token.split(".")[1];
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(normalized));
  } catch {
    return {};
  }
}