import { useCallback, useEffect, useMemo, useState } from "react";
import EmployeeSidebar from "../../components/EmployeeSidebar";
import {
  fetchEmployeeMessages,
  markEmployeeMessageRead,
} from "../../services/notificationsApi";
import "../../styles/EmployeeMessages.css";

function formatDate(value) {
  if (!value) return "Not specified";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(value) {
  if (!value) return "Not specified";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function EmployeeMessages() {
  const [messages, setMessages] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const selectedMessage = useMemo(
    () => messages.find((message) => message.id === selectedId) || null,
    [messages, selectedId]
  );

  const unreadCount = useMemo(
    () => messages.filter((message) => !message.is_read).length,
    [messages]
  );

  const loadMessages = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchEmployeeMessages(100);
      setMessages(data);
      setSelectedId((current) => current || data[0]?.id || null);
    } catch (err) {
      setError(err?.response?.data?.error || "Unable to load messages.");
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  const openMessage = async (message) => {
    setSelectedId(message.id);
    if (message.is_read) return;

    try {
      await markEmployeeMessageRead(message.id);
      setMessages((current) =>
        current.map((item) =>
          item.id === message.id ? { ...item, is_read: true } : item
        )
      );
    } catch {
      // Keep the message visible even if the read update fails.
    }
  };

  return (
    <div className="employee-layout employee-messages-page">
      <EmployeeSidebar activePage="messages" />

      <main className="employee-messages-main">
        <header className="messages-header">
          <div>
            <p className="messages-kicker">Employee Portal</p>
            <h1>Messages</h1>
          </div>
          <div className="messages-summary">
            <span>{unreadCount}</span>
            <small>Unread</small>
          </div>
        </header>

        {error && <div className="messages-alert">{error}</div>}

        <section className="messages-shell">
          <div className="messages-list" aria-label="Employee messages">
            {loading ? (
              <div className="messages-empty">Loading messages...</div>
            ) : messages.length === 0 ? (
              <div className="messages-empty">No messages yet.</div>
            ) : (
              messages.map((message) => (
                <button
                  key={message.id}
                  type="button"
                  className={`message-row${
                    selectedId === message.id ? " selected" : ""
                  }${message.is_read ? "" : " unread"}`}
                  onClick={() => openMessage(message)}
                >
                  <div className="message-row-top">
                    <span className="message-title">
                      {message.action_type === "attendance_update"
                        ? "Attendance updated"
                        : "Notification"}
                    </span>
                    {!message.is_read && <span className="unread-dot" />}
                  </div>
                  <p>{message.description}</p>
                  <time>{formatDateTime(message.created_at)}</time>
                </button>
              ))
            )}
          </div>

          <article className="message-detail">
            {selectedMessage ? (
              <>
                <div className="detail-status-row">
                  <span
                    className={`read-status${
                      selectedMessage.is_read ? " read" : " unread"
                    }`}
                  >
                    {selectedMessage.is_read ? "Read" : "Unread"}
                  </span>
                  <time>{formatDateTime(selectedMessage.created_at)}</time>
                </div>
                <h2>
                  {selectedMessage.action_type === "attendance_update"
                    ? "Attendance was updated"
                    : "Message"}
                </h2>
                <p className="detail-message">{selectedMessage.description}</p>

                <div className="detail-grid">
                  <div>
                    <span>Related date</span>
                    <strong>{formatDate(selectedMessage.related_date)}</strong>
                  </div>
                  <div>
                    <span>Reason</span>
                    <strong>{selectedMessage.reason || "No reason provided"}</strong>
                  </div>
                </div>
              </>
            ) : (
              <div className="messages-empty">Select a message to view details.</div>
            )}
          </article>
        </section>
      </main>
    </div>
  );
}
