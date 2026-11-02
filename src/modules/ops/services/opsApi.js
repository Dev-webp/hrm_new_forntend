// The only place that knows where the OPS backend lives and how to talk to it.
//
// OPS is a separate service with its own sessions. This client deliberately does
// NOT use the shared HRMS axios instance (src/services/api.js), because that
// instance signs the user out of HRMS on any 401 and an expired OPS session must
// never do that.
//
// The OPS session token lives in module memory only: it is never written to
// localStorage/sessionStorage or a cookie, so it cannot be read back by other
// scripts on the page after a reload and it disappears with the tab. A reload
// simply performs the HRMS -> OPS single sign-on exchange again.
//
// Configuration:
//   VITE_OPS_API_URL  origin of the OPS API, e.g. https://ops-api.example.com
//                     (a trailing "/api" is tolerated). In development it falls
//                     back to http://localhost:4000. In a production build there
//                     is NO fallback: if it is missing, OPS calls fail with a
//                     clear message instead of silently targeting localhost.

const configured = (import.meta.env.VITE_OPS_API_URL || "")
  .trim()
  .replace(/\/+$/, "")
  .replace(/\/api$/, "");

export const OPS_ORIGIN = configured || (import.meta.env.PROD ? "" : "http://localhost:4000");

const session = { token: null, refresher: null };

export function setOpsSession(token) {
  session.token = typeof token === "string" && token ? token : null;
}

export function clearOpsSession() {
  session.token = null;
}

export function hasOpsSession() {
  return Boolean(session.token);
}

// The provider registers a function that performs a fresh SSO exchange and
// resolves to true on success. It is used once when OPS answers 401.
export function setOpsSessionRefresher(fn) {
  session.refresher = typeof fn === "function" ? fn : null;
}

function requestError(message, status) {
  const err = new Error(message);
  if (status) err.status = status;
  return err;
}

function apiBase() {
  if (!OPS_ORIGIN) {
    throw requestError("The OPS service address is not configured (VITE_OPS_API_URL).");
  }
  return `${OPS_ORIGIN}/api`;
}

async function send(path, options, token) {
  const isForm = options.body instanceof FormData;
  const url = apiBase() + path;
  console.log('[opsApi] Sending request to:', url);
  try {
    const res = await fetch(url, {
      ...options,
      // Authentication is the Bearer token only. Never send or accept cookies
      // from the OPS origin so a stale legacy session cookie cannot interfere.
      credentials: "omit",
      headers: {
        ...(isForm ? {} : { "Content-Type": "application/json" }),
        ...(options.headers || {}),
        Authorization: `Bearer ${token}`,
      },
    });
    console.log('[opsApi] Response status:', res.status, res.statusText);
    return res;
  } catch (err) {
    console.error('[opsApi] Network error:', err);
    if (err?.message?.includes("VITE_OPS_API_URL")) throw err;
    throw requestError("Unable to reach the OPS service. Please try again.");
  }
}

export async function apiFetch(path, options = {}) {
  if (!session.token) {
    throw requestError("You are not connected to OPS.", 401);
  }

  let res = await send(path, options, session.token);

  // Session expired or was replaced: ask the provider for one fresh exchange,
  // then repeat the request once.
  if (res.status === 401 && session.refresher) {
    const refreshed = await session.refresher();
    if (refreshed && session.token) {
      res = await send(path, options, session.token);
    }
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error('[opsApi] Request failed:', { path, status: res.status, statusText: res.statusText, data });
    throw requestError(data.error || "Request failed", res.status);
  }
  return data;
}

// Backend returns uploaded-file paths like "/uploads/audits/x.mp3".
export function fileUrl(url) {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  return `${OPS_ORIGIN}${url}`;
}

// True only for files that live on the OPS origin and therefore need the OPS
// token. A link to any other origin (for example an agreement PDF hosted by the
// Invoice portal) is opened as a plain link and never receives the OPS token.
export function isOpsHostedFile(url) {
  if (!url) return false;
  if (!/^https?:\/\//i.test(url)) return true;
  try {
    return Boolean(OPS_ORIGIN) && new URL(url).origin === new URL(OPS_ORIGIN).origin;
  } catch {
    return false;
  }
}

// Uploaded files are served only to signed-in users, and a plain <a href> cannot
// send the Bearer token. So fetch the file with the token and open the result.
export async function openOpsFile(url) {
  if (!isOpsHostedFile(url)) {
    window.open(url, "_blank", "noopener,noreferrer");
    return;
  }
  if (!session.token) throw requestError("You are not connected to OPS.", 401);

  // Open the tab synchronously (inside the click) so popup blockers allow it.
  const tab = window.open("", "_blank");
  try {
    const target = /^https?:\/\//i.test(url) ? url : `${OPS_ORIGIN}${url}`;
    let res = await fetch(target, {
      credentials: "omit",
      headers: { Authorization: `Bearer ${session.token}` },
    });
    if (res.status === 401 && session.refresher && (await session.refresher()) && session.token) {
      res = await fetch(target, {
        credentials: "omit",
        headers: { Authorization: `Bearer ${session.token}` },
      });
    }
    if (!res.ok) {
      throw requestError(
        res.status === 404 ? "That file is no longer available." : "Could not open the file.",
        res.status
      );
    }
    const blobUrl = URL.createObjectURL(await res.blob());
    if (tab) {
      tab.opener = null;
      tab.location.href = blobUrl;
    } else {
      window.location.assign(blobUrl);
    }
    setTimeout(() => URL.revokeObjectURL(blobUrl), 5 * 60 * 1000);
  } catch (err) {
    if (tab) tab.close();
    throw err;
  }
}

// Same surface as the standalone OPS portal, so the copied pages are unchanged.
export const api = {
  get: (path) => apiFetch(path),
  post: (path, body) => apiFetch(path, { method: "POST", body: JSON.stringify(body ?? {}) }),
  put: (path, body) => apiFetch(path, { method: "PUT", body: JSON.stringify(body ?? {}) }),
  patch: (path, body) =>
    apiFetch(path, { method: "PATCH", ...(body !== undefined ? { body: JSON.stringify(body) } : {}) }),
  upload: (path, formData) => apiFetch(path, { method: "POST", body: formData }),
};

// Used by OpsAuthContext for the unauthenticated exchange call.
export async function exchangeSsoToken(ssoToken) {
  let res;
  try {
    res = await fetch(`${apiBase()}/auth/sso`, {
      method: "POST",
      credentials: "omit",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ssoToken }),
    });
  } catch (err) {
    if (err?.message?.includes("VITE_OPS_API_URL")) throw err;
    throw requestError("Unable to reach the OPS service. Please try again.");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.token) {
    throw requestError(data.error || "Unable to sign in to OPS.", res.status);
  }
  return data;
}
