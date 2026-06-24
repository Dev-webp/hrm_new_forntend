import { useCallback, useEffect, useRef, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { MANAGER_NAV } from "../config/managerNav";
import { clearAuthSession, getAuthToken } from "../utils/auth";
import { fetchUnreadCount } from "../services/notificationsApi";
import { fetchManagerPendingLeaveCount } from "../services/managerApi";
import { loadSocketIoClient, SOCKET_SERVER_URL } from "../utils/socketClient";
import logo from "../assets/logoimagefinally1.png";

function ManagerSidebar() {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const [pendingLeaveCount, setPendingLeaveCount] = useState(0);
  const socketRef = useRef(null);

  const loadNotificationCount = useCallback(async () => {
    try {
      const data = await fetchUnreadCount();
      setNotificationCount(Number(data.count || 0));
    } catch (error) {
      console.error("Manager unread notification count failed:", error);
    }
  }, []);

  const loadPendingLeaveCount = useCallback(async () => {
    try {
      const data = await fetchManagerPendingLeaveCount();
      setPendingLeaveCount(Number(data.count || 0));
    } catch (error) {
      console.error("Manager pending leave count failed:", error);
    }
  }, []);

  useEffect(() => {
    const token = getAuthToken();
    loadNotificationCount();
    loadPendingLeaveCount();

    window.addEventListener("notification-count-changed", loadNotificationCount);
    window.addEventListener("manager-pending-leave-count-changed", loadPendingLeaveCount);
    const interval = window.setInterval(() => {
      loadNotificationCount();
      loadPendingLeaveCount();
    }, 30000);

    let cancelled = false;
    if (token) {
      loadSocketIoClient().then((io) => {
        if (cancelled) return;
        const socket = io(SOCKET_SERVER_URL, { auth: { token }, reconnection: true });
        socketRef.current = socket;
        socket.on("connect", loadNotificationCount);
        socket.on("new_notification", () => {
          if (!cancelled) setNotificationCount((current) => current + 1);
        });
      }).catch((error) => console.error("Manager badge socket failed:", error));
    }

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener("notification-count-changed", loadNotificationCount);
      window.removeEventListener("manager-pending-leave-count-changed", loadPendingLeaveCount);
      socketRef.current?.disconnect();
    };
  }, [loadNotificationCount, loadPendingLeaveCount]);

  const handleLogout = () => {
    clearAuthSession();
    navigate("/");
  };

  return (
    <aside className={`sidebar${collapsed ? " collapsed" : ""}`}>
     <div className="sidebar-header logo-only-header">
  <img
    src={logo}
    alt="VJC Overseas"
    className="sidebar-logo-img"
    style={{
      borderRadius: "10px",
      width: "200px",
      height: "auto",
      objectFit: "contain"
    }}
  />
</div>

      <div className="nav-section">
        {MANAGER_NAV.map((section) => (
          <div key={section.section}>
            <div className="nav-label sb-label">{section.section}</div>

            {section.items.map((item) => (
           <NavLink
  key={item.path}
  to={item.path}
  end={item.end}
  className={({ isActive }) =>
    `nav-item${isActive ? " active" : ""}`
  }
>
  <i className={`fas ${item.icon}`} />
  <span className="sb-label">{item.label}</span>

{item.path.includes("notifications") && notificationCount > 0 ? (
  <span className="notif-badge">{notificationCount}</span>
) : item.path.includes("leave") && pendingLeaveCount > 0 ? (
  <span className="notif-badge">{pendingLeaveCount}</span>
) : null}
</NavLink>
            ))}
          </div>
        ))}

        <div className="nav-item">
          <i className="fas fa-shield-alt" />
          <span className="sb-label">Manager</span>
          <span className="secure-badge">
            <i className="fas fa-lock" /> MGR
          </span>
        </div>
      </div>

      <div className="sidebar-footer">
        <button type="button" className="nav-item" onClick={() => setCollapsed((c) => !c)}>
          <i className={`fas fa-chevron-${collapsed ? "right" : "left"}`} />
          <span className="sb-label collapse-text">Collapse</span>
        </button>

        <button type="button" className="nav-item" onClick={handleLogout}>
          <i className="fas fa-sign-out-alt" />
          <span className="sb-label">Logout</span>
        </button>
      </div>
    </aside>
  );
}

export default ManagerSidebar;
