import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  deleteNotification,
  deleteNotificationsByRange,
  deleteReadNotifications,
  deleteSelectedNotifications,
  fetchNotifications,
  markAllRead,
  markAsRead,
} from "../../services/notificationsApi";
import {
  decodeJwt,
  getAuthToken,
  getStoredBranch,
} from "../../utils/auth";
import {
  actionIcon,
  computeNotificationStats,
  filterNotifications,
  relativeTime,
} from "../../utils/notificationHelpers";
import { loadSocketIoClient, SOCKET_SERVER_URL } from "../../utils/socketClient";
import "../../styles/ManagerNotifications.css";

const FILTER_CHIPS = [
  { filter: "all", label: "All" },
  { filter: "login", label: "🔐 Login / Logout" },
  { filter: "checkin", label: "📋 Check-in" },
  { filter: "checkout", label: "🚪 Check-out" },
  { filter: "late_login", label: "⏰ Late Login" },
  { filter: "leave_request", label: "📋 Leave Applied" },
  { filter: "leave_status", label: "✅ Leave Status" },
  { filter: "break_update", label: "☕ Breaks" },
];

export default function ManagerNotifications() {
  const navigate = useNavigate();
  const token = getAuthToken();
  const jwtPayload = useMemo(() => decodeJwt(token), [token]);
  const myBranch =
    jwtPayload.branch || getStoredBranch() || "My Branch";

  const [notifications, setNotifications] = useState([]);
  const [currentFilter, setCurrentFilter] = useState("all");
  const [currentSearch, setCurrentSearch] = useState("");
  const [connected, setConnected] = useState(false);
  const [feedReady, setFeedReady] = useState(false);
  const [flashIds, setFlashIds] = useState(() => new Set());
  const [, setTimeTick] = useState(0);
  const [toast, setToast] = useState({ show: false, message: "", type: "" });
  const [viewFromDate, setViewFromDate] = useState("");
  const [viewToDate, setViewToDate] = useState("");
  const [deleteFromDate, setDeleteFromDate] = useState("");
  const [deleteToDate, setDeleteToDate] = useState("");
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [bulkLoading, setBulkLoading] = useState(false);

  const socketRef = useRef(null);

  useEffect(() => {
    if (jwtPayload.role && jwtPayload.role !== "MANAGER") {
      navigate("/admin/notifications", { replace: true });
    }
  }, [jwtPayload.role, navigate]);

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

  const stats = useMemo(
    () => computeNotificationStats(notifications),
    [notifications]
  );

  const filteredList = useMemo(
    () => filterNotifications(notifications, currentFilter, currentSearch),
    [notifications, currentFilter, currentSearch]
  );

  useEffect(() => {
    const interval = setInterval(() => setTimeTick((t) => t + 1), 60000);
    return () => clearInterval(interval);
  }, []);

  const loadNotifications = useCallback(async () => {
    setFeedReady(false);
    try {
      const rows = await fetchNotifications(500, { fromDate: viewFromDate, toDate: viewToDate });
      setNotifications(rows);
      setSelectedIds(new Set());
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to load notifications", "error");
    } finally {
      setFeedReady(true);
    }
  }, [showToast, viewFromDate, viewToDate]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  useEffect(() => {
    let cancelled = false;

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
          showToast("🔌 Connected to branch feed", "success");
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
          if (viewFromDate || viewToDate) return;
          setNotifications(Array.isArray(list) ? list : []);
          setFeedReady(true);
        });

        socket.on("new_notification", (notif) => {
          if (cancelled) return;
          const createdDate = String(notif.created_at || "").slice(0, 10);
          if ((viewFromDate && createdDate < viewFromDate) ||
              (viewToDate && createdDate > viewToDate)) return;
          setNotifications((prev) => [notif, ...prev]);
          const icons = actionIcon(notif.action_type);
          showToast(
            `${icons.emoji} ${notif.description?.slice(0, 60) ?? ""}…`
          );
          setTimeout(() => addFlash(notif.id), 50);
        });

        socket.on("unread_count", () => {
          /* backend may push count; list state drives UI */
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
  }, [addFlash, showToast, token, viewFromDate, viewToDate]);

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
      window.dispatchEvent(new Event("notification-count-changed"));
    } catch (err) {
      showToast(`Failed: ${err.message}`, "error");
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      window.dispatchEvent(new Event("notification-count-changed"));
      showToast("✅ All marked as read", "success");
    } catch (err) {
      showToast(`Failed: ${err.message}`, "error");
    }
  };

  const handleClearRead = async () => {
    if (!window.confirm("Permanently delete all read notifications for your branch?")) return;
    setBulkLoading(true);
    try {
      const result = await deleteReadNotifications();
      await loadNotifications();
      window.dispatchEvent(new Event("notification-count-changed"));
      showToast(`${result.deletedCount || 0} read notification(s) deleted`, "success");
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to delete read notifications", "error");
    } finally {
      setBulkLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this notification permanently?")) return;
    try {
      await deleteNotification(id);
      await loadNotifications();
      window.dispatchEvent(new Event("notification-count-changed"));
      showToast("Notification deleted", "success");
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to delete notification", "error");
    }
  };

  const handleDeleteSelected = async () => {
    const ids = [...selectedIds];
    if (!ids.length || !window.confirm(`Permanently delete ${ids.length} selected notification(s)?`)) return;
    setBulkLoading(true);
    try {
      const result = await deleteSelectedNotifications(ids);
      await loadNotifications();
      window.dispatchEvent(new Event("notification-count-changed"));
      showToast(`${result.deletedCount || 0} notification(s) deleted`, "success");
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to delete selected notifications", "error");
    } finally {
      setBulkLoading(false);
    }
  };

  const handleDeleteRange = async () => {
    if (!deleteFromDate || !deleteToDate) {
      showToast("Choose both delete range dates", "error");
      return;
    }
    if (!window.confirm(`Permanently delete branch notifications from ${deleteFromDate} through ${deleteToDate}?`)) return;
    setBulkLoading(true);
    try {
      const result = await deleteNotificationsByRange(deleteFromDate, deleteToDate);
      await loadNotifications();
      window.dispatchEvent(new Event("notification-count-changed"));
      showToast(`${result.deletedCount || 0} notification(s) deleted`, "success");
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to delete notifications by range", "error");
    } finally {
      setBulkLoading(false);
    }
  };

  const allVisibleSelected = filteredList.length > 0 &&
    filteredList.every((item) => selectedIds.has(item.id));
  const toggleAllVisible = () => setSelectedIds(
    allVisibleSelected ? new Set() : new Set(filteredList.map((item) => item.id))
  );
  const toggleSelected = (id) => setSelectedIds((current) => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const statCardClass = (filter) =>
    `stat-card${currentFilter === filter ? " active-filter" : ""}`;

  const chipClass = (filter) =>
    `filter-chip${currentFilter === filter ? " active" : ""}`;

  const topbarSub = `${myBranch} branch · Real-time events`;

  return (
    <div className="manager-notifications-page manager-portal-page">
      <div className="topbar">
        <div>
          <h1>
            <i className="fas fa-bell" style={{ fontSize: "1.3rem" }} /> Live
            Notifications
          </h1>
          <p>{topbarSub}</p>
        </div>
        <div className="topbar-right">
          <div className="connection-pill">
            <div
              className={`conn-dot ${connected ? "connected" : "disconnected"}`}
            />
            <span>{connected ? "Live" : "Reconnecting…"}</span>
          </div>
          <div className="branch-scope-badge">
            <i className="fas fa-building" /> {myBranch}
          </div>
          <div className="live-badge-topbar">
            <div className="live-pulse" /> LIVE
          </div>
          <button
            type="button"
            className="mark-all-btn"
            onClick={handleMarkAllRead}
          >
            <i className="fas fa-check-double" /> Mark All Read
          </button>
          <button type="button" className="clear-btn" onClick={handleClearRead} disabled={bulkLoading}>
            <i className="fas fa-trash-alt" /> Delete All Read
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
            className={statCardClass("checkin")}
            data-filter="checkin"
            onClick={() => handleStatFilter("checkin")}
            onKeyDown={(e) => e.key === "Enter" && handleStatFilter("checkin")}
            role="button"
            tabIndex={0}
          >
            <div className="stat-label">Check-ins</div>
            <div className="stat-num">{stats.checkin}</div>
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
              placeholder="Search by name, event…"
              value={currentSearch}
              onChange={(e) => setCurrentSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="notification-bulk-toolbar">
          <div className="notification-view-dates">
            <label>View from<input type="date" value={viewFromDate} onChange={(event) => setViewFromDate(event.target.value)} /></label>
            <label>View to<input type="date" value={viewToDate} onChange={(event) => setViewToDate(event.target.value)} /></label>
            <button type="button" onClick={() => { setViewFromDate(""); setViewToDate(""); }}>Clear Filter</button>
          </div>
          <div className="notification-selection-actions">
            <label><input type="checkbox" checked={allVisibleSelected} onChange={toggleAllVisible} /> Select visible</label>
            <button type="button" className="bulk-danger" onClick={handleDeleteSelected} disabled={bulkLoading || !selectedIds.size}>Delete Selected ({selectedIds.size})</button>
          </div>
          <div className="notification-delete-range">
            <label>Delete from<input type="date" value={deleteFromDate} onChange={(event) => setDeleteFromDate(event.target.value)} /></label>
            <label>Delete to<input type="date" value={deleteToDate} onChange={(event) => setDeleteToDate(event.target.value)} /></label>
            <button type="button" className="bulk-danger filled" onClick={handleDeleteRange} disabled={bulkLoading}>{bulkLoading ? "Deleting…" : "Delete Date Range"}</button>
          </div>
        </div>

        <div className="notif-list">
          {!feedReady ? (
            <div className="empty-state">
              <i className="fas fa-spinner fa-spin" />
              <p>Connecting to branch feed…</p>
            </div>
          ) : !filteredList.length ? (
            <div className="empty-state">
              <i className="fas fa-bell-slash" />
              <p>
                No notifications
                {currentFilter !== "all" ? " for this filter" : ""} in{" "}
                <strong>{myBranch}</strong>
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
                <div key={n.id} className={itemClass} data-id={n.id}>
                  <label className="notif-select">
                    <input type="checkbox" checked={selectedIds.has(n.id)} onChange={() => toggleSelected(n.id)} aria-label={`Select notification ${n.id}`} />
                  </label>
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
                      <span className="notif-branch">
                        <i
                          className="fas fa-building"
                          style={{ fontSize: "0.6rem" }}
                        />{" "}
                        {myBranch}
                      </span>
                      <span className="action-badge">
                        {n.action_type?.replace(/_/g, " ")}
                      </span>
                      {n.user_name ? (
                        <span style={{ fontSize: "0.7rem", color: "#64748B" }}>
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
                    <button type="button" className="btn-del" onClick={() => handleDelete(n.id)}>
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
