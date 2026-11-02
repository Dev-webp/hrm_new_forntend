import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import PageLoading from "../../components/PageLoading";
import RouteErrorBoundary from "../../components/RouteErrorBoundary";
import { useOpsAuth } from "../../context/OpsAuthContext";
import { api } from "./services/opsApi";
import { normalizeOpsLink, opsBaseFromPath, withOpsBase } from "./opsPaths";
import { underscoreToSpace } from "./Shared";
import "./styles/ops.css";
import "./styles/opsIntegration.css";

// The OPS portal inside HRMS. Mounted at "ops/*" in every role's route tree, so
// it always renders inside the HRMS shell (sidebar, header, logout) the person
// is already using. Nothing here creates a router, a login page or a second
// layout: OPS's own BrowserRouter, Login and sidebar are intentionally not used.

const Dashboard = lazy(() => import("./Dashboard"));
const Leads = lazy(() => import("./Leads"));
const Audit = lazy(() => import("./Audit"));
const Cases = lazy(() => import("./Cases"));
const Reports = lazy(() => import("./Reports"));
const Employees = lazy(() => import("./Employees"));
const AddEmployee = lazy(() => import("./AddEmployee"));

// ---------------------------------------------------------------------------
// Connection gate: waits for the HRMS -> OPS sign-in, explains failures
// ---------------------------------------------------------------------------
function Message({ tone = "info", children }) {
  return (
    <div className={`ops-state ops-state-${tone}`} role={tone === "error" ? "alert" : "status"}>
      {children}
    </div>
  );
}

function OpsGate({ children }) {
  const { enabled, ready, error, retry } = useOpsAuth();

  if (!enabled) {
    return (
      <Message tone="error">
        OPS access is not enabled for your account. If an administrator has just enabled it,
        sign out of HRMS and sign in again.
      </Message>
    );
  }
  if (!ready && error) {
    return (
      <Message tone="error">
        <div>{error}</div>
        <button type="button" className="btn-sm outline" onClick={() => retry()}>
          Try again
        </button>
      </Message>
    );
  }
  if (!ready) return <Message>Connecting to OPS…</Message>;
  return children;
}

// Which OPS sections each work profile may open is decided by OPS data (the
// work profiles OPS returned at sign-in). The OPS API enforces the same rules on
// every request; this only keeps people off pages that would answer 403.
function SectionGuard({ section, children }) {
  const { allowedSections } = useOpsAuth();
  const { pathname } = useLocation();
  if (!allowedSections.includes(section)) {
    return <Navigate to={`${opsBaseFromPath(pathname)}/dashboard`} replace />;
  }
  return children;
}

// ---------------------------------------------------------------------------
// Notification bell (polls every 20s; desktop popup + sound for new items).
// Mounted only while an OPS page is open, so polling stops when you leave OPS.
// ---------------------------------------------------------------------------
function playNotificationSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    osc.start();
    osc.stop(ctx.currentTime + 0.25);
  } catch {
    /* some browsers block audio before the first user click */
  }
}

function NotificationBell({ base }) {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const seenIds = useRef(new Set());
  const firstPoll = useRef(true);

  const goTo = useCallback(
    (link) => {
      const to = normalizeOpsLink(link);
      if (to) navigate(withOpsBase(base, to));
    },
    [base, navigate]
  );

  const poll = useCallback(async () => {
    try {
      const data = await api.get("/notifications");
      const list = data.notifications || [];
      setUnreadCount(data.unreadCount || 0);
      setNotifications(list);

      const unread = list.filter((n) => !n.is_read);
      const fresh = unread.filter((n) => !seenIds.current.has(n.id));
      if (!firstPoll.current && fresh.length) {
        fresh.forEach((n) => {
          if ("Notification" in window && Notification.permission === "granted") {
            const popup = new Notification("VJC Ops Portal", { body: n.message });
            popup.onclick = () => {
              window.focus();
              goTo(n.link);
            };
          }
        });
        playNotificationSound();
      }
      firstPoll.current = false;
      seenIds.current = new Set(unread.map((n) => n.id));
    } catch {
      /* silent: don't spam toasts for a background poll */
    }
  }, [goTo]);

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
    poll();
    const id = setInterval(poll, 20000);
    return () => clearInterval(id);
  }, [poll]);

  // close when clicking anywhere outside
  useEffect(() => {
    const onDocClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  const openNotification = async (n) => {
    try {
      await api.patch(`/notifications/${n.id}/read`);
      poll();
    } catch {
      /* ignore */
    }
    if (n.link) {
      setOpen(false);
      goTo(n.link);
    }
  };

  return (
    <div className="notif-bell-wrap" ref={wrapRef}>
      <button
        type="button"
        className="notif-bell-btn"
        aria-label="OPS notifications"
        onClick={() => setOpen((o) => !o)}
      >
        🔔
        <span className="notif-badge" style={{ display: unreadCount ? "inline-block" : "none" }}>
          {unreadCount}
        </span>
      </button>

      {open && (
        <div className="notif-panel" style={{ display: "block" }}>
          {notifications.length ? (
            notifications.map((n) => (
              <div
                key={n.id}
                className={`notif-item ${n.is_read ? "" : "unread"}`}
                onClick={() => openNotification(n)}
              >
                <div>{n.message}</div>
                <div className="notif-time">{new Date(n.created_at).toLocaleString()}</div>
              </div>
            ))
          ) : (
            <div className="notif-empty">No notifications yet.</div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------
function OpsPages() {
  const { user } = useOpsAuth();
  const { pathname } = useLocation();
  const base = opsBaseFromPath(pathname);

  // Toast, passed to every page as `showToast` exactly as in the standalone portal.
  const [toast, setToast] = useState({ message: "", isError: false, show: false });
  const toastTimer = useRef(null);
  const showToast = useCallback((message, isError = false) => {
    setToast({ message, isError, show: true });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast((t) => ({ ...t, show: false })), 3200);
  }, []);
  useEffect(() => () => clearTimeout(toastTimer.current), []);

  const profileLabel = (user?.work_profiles?.length ? user.work_profiles : [user?.work_profile])
    .filter(Boolean)
    .map(underscoreToSpace)
    .join(" · ");

  const isDashboard = /\/dashboard\/?$/.test(pathname);

  return (
    <>
      <div className="ops-topbar-integrated">
        <div className="ops-topbar-title">
          <strong>OPS Portal</strong>
          {profileLabel && <span className="role-pill">{profileLabel}</span>}
        </div>
        <NotificationBell base={base} />
      </div>

      <main className={isDashboard ? "main dashboard-page" : "main"}>
        <Routes>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard user={user} showToast={showToast} />} />
          <Route
            path="leads"
            element={
              <SectionGuard section="leads">
                <Leads user={user} showToast={showToast} />
              </SectionGuard>
            }
          />
          <Route
            path="audit"
            element={
              <SectionGuard section="audit">
                <Audit showToast={showToast} />
              </SectionGuard>
            }
          />
          <Route
            path="cases"
            element={
              <SectionGuard section="cases">
                <Cases user={user} showToast={showToast} />
              </SectionGuard>
            }
          />
          <Route
            path="reports"
            element={
              <SectionGuard section="reports">
                <Reports user={user} showToast={showToast} />
              </SectionGuard>
            }
          />
          <Route
            path="employees"
            element={
              <SectionGuard section="employees">
                <Employees showToast={showToast} />
              </SectionGuard>
            }
          />
          <Route
            path="employees/new"
            element={
              <SectionGuard section="employees">
                <AddEmployee />
              </SectionGuard>
            }
          />
          <Route path="*" element={<Navigate to="dashboard" replace />} />
        </Routes>
      </main>

      <div className={`toast${toast.show ? " show" : ""}${toast.isError ? " error" : ""}`}>
        {toast.message}
      </div>
    </>
  );
}

export default function OpsRoutes() {
  return (
    <RouteErrorBoundary title="OPS module error">
      <div className="ops-portal ops-embedded">
        <OpsGate>
          <Suspense fallback={<PageLoading label="Loading OPS…" />}>
            <OpsPages />
          </Suspense>
        </OpsGate>
      </div>
    </RouteErrorBoundary>
  );
}
