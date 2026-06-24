/** Centralized auth/session helpers (localStorage). */

export function getAuthToken() {
  return localStorage.getItem("token");
}

export function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
}

export function getStoredBranch() {
  return localStorage.getItem("branch");
}

export function setAuthSession({ token, user }) {
  localStorage.setItem("token", token);
  localStorage.setItem("user", JSON.stringify(user));
  localStorage.setItem("full_name", user?.full_name || user?.name || "Employee");
  localStorage.setItem("designation", user?.designation || "");
  if (user?.branch) {
    localStorage.setItem("branch", user.branch);
  }
}

export function clearAuthSession() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  localStorage.removeItem("branch");
  localStorage.removeItem("full_name");
  localStorage.removeItem("designation");
}

export function isAuthenticated() {
  return Boolean(getAuthToken());
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
