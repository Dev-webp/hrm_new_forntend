import { useEffect, useRef, useState } from "react";
import { getAuthToken } from "../utils/auth";
import { loadSocketIoClient, SOCKET_SERVER_URL } from "../utils/socketClient";
import "../styles/LiveNotificationToast.css";

export default function LiveNotificationToast() {
  const [toast, setToast] = useState(null);
  const socketRef = useRef(null);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) return;

    let cancelled = false;

    async function connect() {
      const io = await loadSocketIoClient();

      const socket = io(SOCKET_SERVER_URL, {
        auth: { token },
        reconnection: true,
      });

      socketRef.current = socket;

      socket.on("new_notification", (n) => {
        if (cancelled) return;

        setToast(n);

        setTimeout(() => {
          setToast(null);
        }, 5000);
      });
    }

    connect();

    return () => {
      cancelled = true;
      socketRef.current?.disconnect();
    };
  }, []);

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