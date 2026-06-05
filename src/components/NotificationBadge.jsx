import { useEffect, useRef, useState } from "react";
import { fetchUnreadCount } from "../services/notificationsApi";
import { getAuthToken } from "../utils/auth";
import { loadSocketIoClient, SOCKET_SERVER_URL } from "../utils/socketClient";

export default function NotificationBadge() {
  const [count, setCount] = useState(0);
  const socketRef = useRef(null);

  async function loadCount() {
    try {
      const data = await fetchUnreadCount();
      setCount(Number(data.count || 0));
    } catch (err) {
      console.error("Unread count error:", err);
    }
  }

  useEffect(() => {
    const token = getAuthToken();

    loadCount();

    if (!token) return undefined;

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
      socketRef.current?.disconnect();
    };
  }, []);

  if (count <= 0) return null;

  return <span className="notif-badge">{count}</span>;
}