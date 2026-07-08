import { useEffect, useRef, useState } from "react";
import { fetchUnreadCount } from "../services/notificationsApi";
import { fetchPendingLeaveCount } from "../services/leaveApi";
import { fetchActivityLogCount } from "../services/activityLogsApi";
import { getAuthToken } from "../utils/auth";
import { loadSocketIoClient, SOCKET_SERVER_URL } from "../utils/socketClient";

export default function NotificationBadge({ type = "notifications" }) {
  const [count, setCount] = useState(0);
  const [authToken, setAuthToken] = useState(getAuthToken());
  const socketRef = useRef(null);

  async function loadCount() {
    try {
      const loaders = { notifications: fetchUnreadCount, leaves: fetchPendingLeaveCount, activityLogs: fetchActivityLogCount };
      const data = await (loaders[type] || fetchUnreadCount)();
      setCount(Number(data.count || 0));
    } catch (err) {
      console.error("Unread count error:", err);
    }
  }

  useEffect(() => {
    const syncToken = () => setAuthToken(getAuthToken());
    window.addEventListener("storage", syncToken);
    window.addEventListener("focus", syncToken);
    const interval = setInterval(syncToken, 5000);
    return () => {
      window.removeEventListener("storage", syncToken);
      window.removeEventListener("focus", syncToken);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const token = authToken;

    loadCount();
    const countEvent = type === "notifications" ? "notification-count-changed" : `${type}-count-changed`;
    window.addEventListener(countEvent, loadCount);

    if (!token) {
      return () => window.removeEventListener(countEvent, loadCount);
    }

    let cancelled = false;

    async function connectSocket() {
      try {
        const io = await loadSocketIoClient();

        if (cancelled) return;

        const socket = io(SOCKET_SERVER_URL, {
          auth: { token },
          reconnection: true,
        });

        socketRef.current = socket;

        socket.on("connect", () => {
          console.log("✅ Badge socket connected");
          loadCount();
        });

        socket.on("new_notification", () => {
          if (type !== "notifications") return;
          if (!cancelled) {
            setCount((prev) => prev + 1);
          }
        });

        socket.on("unread_count", (payload) => {
          if (!cancelled && payload?.count !== undefined) {
            setCount(Number(payload.count));
          }
        });
      } catch (err) {
        console.error("Badge socket error:", err);
      }
    }

    connectSocket();

    const interval = setInterval(loadCount, 30000);

    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener(countEvent, loadCount);
      socketRef.current?.disconnect();
    };
  }, [type, authToken]);

  if (count <= 0) return null;

  return <span className="notif-badge">{count}</span>;
}
