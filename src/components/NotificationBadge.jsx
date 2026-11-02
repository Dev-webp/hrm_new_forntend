import { useEffect, useRef, useState } from "react";
import { fetchUnreadCount } from "../services/notificationsApi";
import { fetchPendingLeaveCount } from "../services/leaveApi";
import { fetchActivityLogCount } from "../services/activityLogsApi";
import { getAuthToken } from "../utils/auth";
import { loadSocketIoClient, SOCKET_SERVER_URL } from "../utils/socketClient";
import { api as opsApi, hasOpsSession } from "../modules/ops/services/opsApi";

export default function NotificationBadge({ type = "notifications" }) {
  const [count, setCount] = useState(0);
  const [authToken, setAuthToken] = useState(getAuthToken());
  const socketRef = useRef(null);

  async function loadCount() {
    try {
      const loaders = { 
        notifications: fetchUnreadCount, 
        leaves: fetchPendingLeaveCount, 
        activityLogs: fetchActivityLogCount,
        invoiceApprovals: async () => {
          // Fetch pending invoice count from Invoice API
          const token = localStorage.getItem("vjc_invoice_auth");
          if (!token) return { count: 0 };
          
          const API = import.meta.env.VITE_INVOICE_API_URL || "http://localhost:5000/api";
          const res = await fetch(`${API}/invoices/pending`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const data = await res.json();
          return { count: Array.isArray(data.invoices) ? data.invoices.length : 0 };
        },
        ops: async () => {
          // Fetch OPS notifications count from OPS API
          if (!hasOpsSession()) return { count: 0 };
          
          try {
            const response = await opsApi.get('/dashboard/stats');
            const stats = response.data || {};
            // Return sum of pending leads and pending audits
            const pendingCount = (stats.leads?.pending || 0) + (stats.audits?.pending || 0);
            return { count: pendingCount };
          } catch (err) {
            console.error("OPS notification count error:", err);
            return { count: 0 };
          }
        },
        crmLeads: async () => {
          // Fetch CRM leads count from Invoice API
          const token = localStorage.getItem("vjc_invoice_auth");
          if (!token) return { count: 0 };
          
          try {
            const API = import.meta.env.VITE_INVOICE_API_URL || "http://localhost:5000/api";
            const res = await fetch(`${API}/leads`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            // Return total leads count or new leads today count
            return { count: Array.isArray(data.leads) ? data.leads.length : 0 };
          } catch (err) {
            console.error("CRM leads notification count error:", err);
            return { count: 0 };
          }
        }
      };
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
