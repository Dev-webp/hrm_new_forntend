import { useEffect, useRef, useState } from "react";
import { getAuthToken } from "../utils/auth";
import { loadSocketIoClient, SOCKET_SERVER_URL } from "../utils/socketClient";
import "../styles/LiveNotificationToast.css";

export default function LiveNotificationToast() {
  const [toast, setToast] = useState(null);
  const [authToken, setAuthToken] = useState(getAuthToken());
  const socketRef = useRef(null);
  const toastTimerRef = useRef(null);

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
    if (!token) return;

    let cancelled = false;

    async function connect() {
      try {
      const io = await loadSocketIoClient();

      const socket = io(SOCKET_SERVER_URL, {
        auth: { token },
        reconnection: true,
      });

      socketRef.current = socket;

      socket.on("new_notification", (n) => {
        if (cancelled) return;

        setToast(n);

        clearTimeout(toastTimerRef.current);
        toastTimerRef.current = setTimeout(() => {
          setToast(null);
        }, 5000);
      });
      } catch (err) {
        console.error("Live notification socket error:", err);
      }
    }

    connect();

    return () => {
      cancelled = true;
      clearTimeout(toastTimerRef.current);
      socketRef.current?.disconnect();
    };
  }, [authToken]);

  if (!toast) return null;

  return (
    <div className="live-notification-toast">
      <div className="toast-icon">🔔</div>
      <div>
        <strong>HRMS Notification</strong>
        <p>{toast.description}</p>
      </div>
    </div>
  );
}
