export function actionIcon(type) {
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
  };
  return map[type] || { cls: "icon-default", fa: "fas fa-bell", emoji: "🔔" };
}

export function relativeTime(isoStr) {
  if (!isoStr) return "Just now";
  const diff = Date.now() - new Date(isoStr).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function filterNotifications(list, currentFilter, currentSearch) {
  let filtered = [...list];

  if (currentFilter === "unread") {
    filtered = filtered.filter((n) => !n.is_read);
  } else if (currentFilter !== "all") {
    filtered = filtered.filter(
      (n) =>
        n.action_type === currentFilter ||
        (currentFilter === "login" &&
          ["login", "logout"].includes(n.action_type))
    );
  }

  if (currentSearch.trim()) {
    const q = currentSearch.toLowerCase();
    filtered = filtered.filter(
      (n) =>
        n.description?.toLowerCase().includes(q) ||
        (n.user_name || "").toLowerCase().includes(q)
    );
  }

  return filtered;
}

export function computeNotificationStats(notifications) {
  const today = new Date().toISOString().slice(0, 10);
  return {
    all: notifications.length,
    unread: notifications.filter((n) => !n.is_read).length,
    checkin: notifications.filter(
      (n) =>
        n.action_type === "checkin" && n.created_at?.slice(0, 10) === today
    ).length,
    late: notifications.filter(
      (n) =>
        n.action_type === "late_login" && n.created_at?.slice(0, 10) === today
    ).length,
    leave: notifications.filter((n) => n.action_type === "leave_request").length,
  };
}
