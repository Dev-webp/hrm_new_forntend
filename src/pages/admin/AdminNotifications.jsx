import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  deleteNotification,
  markAllRead,
  markAsRead,
} from "../../services/notificationsApi";
import { getAuthToken } from "../../utils/auth";
import { loadSocketIoClient, SOCKET_SERVER_URL } from "../../utils/socketClient";
import "../../styles/AdminNotifications.css";

const FILTER_CHIPS = [
  { filter: "all", label: "All" },
  { filter: "login", label: "🔐 Login / Logout" },
  { filter: "checkin", label: "📋 Check-in" },
  { filter: "checkout", label: "🚪 Check-out" },
  { filter: "late_login", label: "⏰ Late Login" },
  { filter: "leave_request", label: "📋 Leave Applied" },
  { filter: "leave_status", label: "✅ Leave Status" },
  { filter: "break_update", label: "☕ Breaks" },
  { filter: "payslip_generated", label: "💰 Payroll" },
];

function actionIcon(type) {
  const map = {
    login: { cls: "icon-login", fa: "fas fa-sign-in-alt", emoji: "🔐" },
    logout: { cls: "icon-logout", fa: "fas fa-sign-out-alt", emoji: "🚪" },
    checkin: {
      cls: "icon-checkin",
      fa: "fas fa-clipboard-check",
      emoji: "📋",
    },
    checkout: { cls: "icon-checkout", fa: "fas fa-door-open", emoji: "🚪" },
    late_login: { cls: "icon-late", fa: "fas fa-clock", emoji: "⏰" },
    leave_request: {
      cls: "icon-leave",
      fa: "fas fa-umbrella-beach",
      emoji: "📋",
    },
    leave_status: {
      cls: "icon-leave",
      fa: "fas fa-check-circle",
      emoji: "✅",
    },
    break_update: { cls: "icon-break", fa: "fas fa-coffee", emoji: "☕" },
    payslip_generated: {
      cls: "icon-payslip",
      fa: "fas fa-file-invoice",
      emoji: "💰",
    },
    payslip_paid: { cls: "icon-payslip", fa: "fas fa-coins", emoji: "💵" },
  };
  return map[type] || { cls: "icon-default", fa: "fas fa-bell", emoji: "🔔" };
}

function relativeTime(isoStr) {
  if (!isoStr) return "Just now";
  const diff = Date.now() - new Date(isoStr).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export default function AdminNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [currentFilter, setCurrentFilter] = useState("all");
  const [currentSearch, setCurrentSearch] = useState("");
  const [connected, setConnected] = useState(false);
  const [feedReady, setFeedReady] = useState(false);
  const [flashIds, setFlashIds] = useState(() => new Set());
  const [, setTimeTick] = useState(0);
  const [toast, setToast] = useState({ show: false, message: "", type: "" });

  const socketRef = useRef(null);

  const showToast = useCallback((message, type = "") => {
    setToast({ show: true, message, type });
    window.setTimeout(() => {
      setToast({ show: false, message: "", type: "" });
    }, 3000);
  }, []);

  const addFlash = useCallback((id) => {
    setFlashIds((prev) => new Set(prev).add(id));
    setTimeout(() => {
      setFlashIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 600);
  }, []);

  const stats = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return {
      all: notifications.length,
      unread: notifications.filter((n) => !n.is_read).length,
      login: notifications.filter(
        (n) =>
          ["login", "logout"].includes(n.action_type) &&
          n.created_at?.slice(0, 10) === today
      ).length,
      late: notifications.filter(
        (n) =>
          n.action_type === "late_login" && n.created_at?.slice(0, 10) === today
      ).length,
      leave: notifications.filter((n) => n.action_type === "leave_request")
        .length,
    };
  }, [notifications]);

  const filteredList = (() => {
    let list = [...notifications];

    if (currentFilter === "unread") {
      list = list.filter((n) => !n.is_read);
    } else if (currentFilter !== "all") {
      list = list.filter(
        (n) =>
          n.action_type === currentFilter ||
          (currentFilter === "login" &&
            ["login", "logout"].includes(n.action_type))
      );
    }

    if (currentSearch.trim()) {
      const q = currentSearch.toLowerCase();
      list = list.filter(
        (n) =>
          n.description?.toLowerCase().includes(q) ||
          (n.user_name || "").toLowerCase().includes(q) ||
          (n.branch || "").toLowerCase().includes(q)
      );
    }

    return list;
  })();

  useEffect(() => {
    const interval = setInterval(() => setTimeTick((t) => t + 1), 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const token = getAuthToken();

    if (!token) return undefined;

    async function connectSocket() {
      try {
        const io = await loadSocketIoClient();
        if (cancelled) return;

        const socket = io(SOCKET_SERVER_URL, {
          auth: { token },
          reconnection: true,
          reconnectionDelay: 2000,
        });

        socketRef.current = socket;

        socket.on("connect", () => {
          if (cancelled) return;
          setConnected(true);
          showToast("🔌 Connected to live feed", "success");
          socket.emit("fetch_notifications", { limit: 100 });
        });

        socket.on("disconnect", () => {
          if (cancelled) return;
          setConnected(false);
        });

        socket.on("connect_error", (err) => {
          if (cancelled) return;
          setConnected(false);
          console.error("Socket error:", err.message);
        });

        socket.on("notifications_list", (list) => {
          if (cancelled) return;
          setNotifications(Array.isArray(list) ? list : []);
          setFeedReady(true);
        });

        socket.on("new_notification", (notif) => {
          if (cancelled) return;
          setNotifications((prev) => [notif, ...prev]);
          const icons = actionIcon(notif.action_type);
          showToast(
            `${icons.emoji} ${notif.description?.slice(0, 60) ?? ""}…`
          );
          setTimeout(() => addFlash(notif.id), 50);
        });
      } catch (err) {
        console.error("Failed to connect socket:", err);
        setConnected(false);
      }
    }

    connectSocket();

    return () => {
      cancelled = true;
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [addFlash, showToast]);

  const handleFilterChip = (filter) => {
    setCurrentFilter(filter);
  };

  const handleStatFilter = (filter) => {
    setCurrentFilter(filter);
  };

  const handleMarkRead = async (id) => {
    try {
      await markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch (err) {
      showToast(`Failed: ${err.message}`, "error");
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      showToast(`Failed: ${err.message}`, "error");
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      showToast("✅ All marked as read", "success");
    } catch (err) {
      showToast(`Failed: ${err.message}`, "error");
    }
  };

  const handleClearRead = () => {
    setNotifications((prev) => prev.filter((n) => !n.is_read));
    showToast("🗑️ Read notifications cleared from view");
  };

  const statCardClass = (filter) =>
    `stat-card${currentFilter === filter ? " active-filter" : ""}`;

  const chipClass = (filter) =>
    `filter-chip${currentFilter === filter ? " active" : ""}`;

  return (
    <div className="admin-notifications-page">
      <div className="topbar">
        <div>
          <h1>
            <i className="fas fa-bell" style={{ fontSize: "1.3rem" }} /> Live
            Notifications
          </h1>
          <p>Real-time HRMS events · Socket.io powered</p>
        </div>
        <div className="topbar-right">
          <div className="connection-pill">
            <div
              className={`conn-dot ${connected ? "connected" : "disconnected"}`}
            />
            <span>{connected ? "Live" : "Reconnecting…"}</span>
          </div>
          <div className="live-badge-topbar">
            <div className="live-pulse" /> LIVE
          </div>
          <button type="button" className="mark-all-btn" onClick={handleMarkAllRead}>
            <i className="fas fa-check-double" /> Mark All Read
          </button>
          <button type="button" className="clear-btn" onClick={handleClearRead}>
            <i className="fas fa-trash-alt" /> Clear Read
          </button>
        </div>
      </div>

      <div className="content">
        <div className="stats-row">
          <div
            className={statCardClass("all")}
            data-filter="all"
            onClick={() => handleStatFilter("all")}
            onKeyDown={(e) => e.key === "Enter" && handleStatFilter("all")}
            role="button"
            tabIndex={0}
          >
            <div className="stat-label">Total</div>
            <div className="stat-num">{stats.all}</div>
            <div className="stat-sub">All notifications</div>
          </div>
          <div
            className={statCardClass("unread")}
            data-filter="unread"
            onClick={() => handleStatFilter("unread")}
            onKeyDown={(e) => e.key === "Enter" && handleStatFilter("unread")}
            role="button"
            tabIndex={0}
          >
            <div className="stat-label">Unread</div>
            <div className="stat-num">{stats.unread}</div>
            <div className="stat-sub">Needs attention</div>
          </div>
          <div
            className={statCardClass("login")}
            data-filter="login"
            onClick={() => handleStatFilter("login")}
            onKeyDown={(e) => e.key === "Enter" && handleStatFilter("login")}
            role="button"
            tabIndex={0}
          >
            <div className="stat-label">Logins</div>
            <div className="stat-num">{stats.login}</div>
            <div className="stat-sub">Today</div>
          </div>
          <div
            className={statCardClass("late_login")}
            data-filter="late_login"
            onClick={() => handleStatFilter("late_login")}
            onKeyDown={(e) =>
              e.key === "Enter" && handleStatFilter("late_login")
            }
            role="button"
            tabIndex={0}
          >
            <div className="stat-label">Late Logins</div>
            <div className="stat-num">{stats.late}</div>
            <div className="stat-sub">Today</div>
          </div>
          <div
            className={statCardClass("leave_request")}
            data-filter="leave_request"
            onClick={() => handleStatFilter("leave_request")}
            onKeyDown={(e) =>
              e.key === "Enter" && handleStatFilter("leave_request")
            }
            role="button"
            tabIndex={0}
          >
            <div className="stat-label">Leave Requests</div>
            <div className="stat-num">{stats.leave}</div>
            <div className="stat-sub">Pending</div>
          </div>
        </div>

        <div className="filter-row">
          {FILTER_CHIPS.map((chip) => (
            <button
              key={chip.filter}
              type="button"
              className={chipClass(chip.filter)}
              data-filter={chip.filter}
              onClick={() => handleFilterChip(chip.filter)}
            >
              {chip.label}
            </button>
          ))}
          <div className="search-box">
            <i
              className="fas fa-search"
              style={{ color: "var(--gold)", fontSize: "0.8rem" }}
            />
            <input
              type="text"
              placeholder="Search notifications…"
              value={currentSearch}
              onChange={(e) => setCurrentSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="notif-list">
          {!feedReady ? (
            <div className="empty-state">
              <i className="fas fa-spinner fa-spin" />
              <p>Connecting to live feed…</p>
            </div>
          ) : !filteredList.length ? (
            <div className="empty-state">
              <i className="fas fa-bell-slash" />
              <p>
                No notifications
                {currentFilter !== "all" ? " for this filter" : ""}
              </p>
            </div>
          ) : (
            filteredList.map((n) => {
              const icon = actionIcon(n.action_type);
              const timeStr = relativeTime(n.created_at);
              const itemClass = [
                "notif-item",
                n.is_read ? "" : "unread",
                flashIds.has(n.id) ? "new-flash" : "",
              ]
                .filter(Boolean)
                .join(" ");

              return (
                <div
                  key={n.id}
                  className={itemClass}
                  data-id={n.id}
                >
                  {!n.is_read ? <div className="unread-dot" /> : null}
                  <div className={`notif-icon ${icon.cls}`}>
                    <i className={icon.fa} />
                  </div>
                  <div className="notif-body">
                    <div className="notif-desc">{n.description}</div>
                    <div className="notif-meta">
                      <span className="notif-time">
                        <i className="far fa-clock" /> {timeStr}
                      </span>
                      {n.branch ? (
                        <span className="notif-branch">{n.branch}</span>
                      ) : null}
                      <span className="action-badge">
                        {n.action_type?.replace(/_/g, " ")}
                      </span>
                      {n.user_name ? (
                        <span style={{ fontSize: "0.7rem", color: "#666" }}>
                          by {n.user_name}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="notif-actions">
                    {!n.is_read ? (
                      <button
                        type="button"
                        className="btn-read"
                        onClick={() => handleMarkRead(n.id)}
                      >
                        Mark read
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="btn-del"
                      onClick={() => handleDelete(n.id)}
                    >
                      <i className="fas fa-trash" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div
        className={`toast${toast.show ? " show" : ""}${toast.type ? ` ${toast.type}` : ""}`}
      >
        {toast.message}
      </div>
    </div>
  );
}
