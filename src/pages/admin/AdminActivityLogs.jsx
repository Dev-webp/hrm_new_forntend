import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  exportActivityLogs,
  fetchActivityLogById,
  fetchActivityLogStats,
  fetchActivityLogs,
} from "../../services/activityLogsApi";
import { getAuthToken } from "../../utils/auth";
import { loadSocketIoClient, SOCKET_SERVER_URL } from "../../utils/socketClient";
import "../../styles/AdminActivityLogs.css";

const PAGE_LIMIT = 20;

const BRANCH_OPTIONS = [
  { value: "all", label: "🌍 All Branches", headerLabel: "All Branches" },
  {
    value: "Hyderabad",
    label: "🏢 Hyderabad Branch",
    headerLabel: "🏢 Hyderabad Branch",
  },
  {
    value: "Bangalore",
    label: "💻 Bangalore Tech Hub",
    headerLabel: "💻 Bangalore Tech Hub",
  },
];

function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function timeAgo(iso) {
  if (!iso) return "";
  const secs = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (secs < 60) return `${secs}s ago`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

function badgeClass(action) {
  if (!action) return "badge-system";
  const a = action.toLowerCase();
  if (a.includes("login") && a.includes("fail")) return "badge-critical";
  if (a.includes("login")) return "badge-login";
  if (a.includes("logout")) return "badge-logout";
  if (a.includes("create")) return "badge-create";
  if (a.includes("edit") || a.includes("update")) return "badge-edit";
  if (a.includes("delete")) return "badge-delete";
  if (a.includes("approve")) return "badge-approve";
  if (a.includes("reject")) return "badge-reject";
  if (a.includes("checkin") || a.includes("check_in")) return "badge-login";
  if (a.includes("checkout") || a.includes("check_out")) return "badge-logout";
  return "badge-system";
}

function severityDotClass(sev) {
  if (sev === "critical") return "sev-critical";
  if (sev === "warning") return "sev-warning";
  return "sev-info";
}

function severityBadgeClass(sev) {
  if (sev === "critical") return "badge-critical";
  if (sev === "warning") return "badge-warning";
  return "badge-system";
}

function BranchChip({ branch }) {
  if (!branch) return "—";
  if (branch === "all") return <span className="branch-chip">🌍 All</span>;
  if (branch === "Hyderabad")
    return <span className="branch-chip">🏢 HYD</span>;
  if (branch === "Bangalore")
    return <span className="branch-chip">💻 BLR</span>;
  return <span className="branch-chip">{branch}</span>;
}

function decodeHtmlEntities(value) {
  if (typeof value !== "string") return value;
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function decodeMetadata(value) {
  if (!value) return value;
  if (typeof value === "string") {
    const decoded = decodeHtmlEntities(value);
    try {
      return JSON.parse(decoded);
    } catch {
      return decoded;
    }
  }
  if (Array.isArray(value)) return value.map(decodeMetadata);
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, val]) => [key, decodeMetadata(val)])
    );
  }
  return value;
}

function normalizeLogRecord(log) {
  if (!log) return log;
  return {
    ...log,
    action: decodeHtmlEntities(log.action),
    action_type: decodeHtmlEntities(log.action_type),
    user_name: decodeHtmlEntities(log.user_name),
    role: decodeHtmlEntities(log.role),
    user_role: decodeHtmlEntities(log.user_role),
    details: decodeHtmlEntities(log.details),
    target_name: decodeHtmlEntities(log.target_name),
    ip_address: decodeHtmlEntities(log.ip_address),
    branch: decodeHtmlEntities(log.branch),
    severity: decodeHtmlEntities(log.severity),
    status: decodeHtmlEntities(log.status),
    device_info: decodeHtmlEntities(log.device_info),
    metadata: decodeMetadata(log.metadata),
  };
}

function normalizeLogFields(log) {
  return {
    id: log.id,
    action: decodeHtmlEntities(log.action || log.action_type || ""),
    username: decodeHtmlEntities(log.user_name || ""),
    role: decodeHtmlEntities(log.role || log.user_role || ""),
    details: decodeHtmlEntities(log.details || log.target_name || ""),
    ip: decodeHtmlEntities(log.ip_address || ""),
    branch: decodeHtmlEntities(log.branch || ""),
    timestamp: log.timestamp || log.created_at || "",
    severity: decodeHtmlEntities(log.severity || ""),
  };
}

export default function AdminActivityLogs() {
  const [branch, setBranch] = useState("all");
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [severityFilter, setSeverityFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sortFilter, setSortFilter] = useState("desc");

  const [logsData, setLogsData] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [bumpTotalCard, setBumpTotalCard] = useState(false);
  const [statDelta, setStatDelta] = useState(0);
  const prevTotalRef = useRef(0);

  const [connected, setConnected] = useState(false);
  const [tickerText, setTickerText] = useState("Waiting for events…");
  const [newRowIds, setNewRowIds] = useState(() => new Set());

  const [branchMenuOpen, setBranchMenuOpen] = useState(false);
  const [toasts, setToasts] = useState([]);

  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailLog, setDetailLog] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const branchDropdownRef = useRef(null);
  const searchDebounceRef = useRef(null);
  const socketRef = useRef(null);
  const toastIdRef = useRef(0);

  const filters = useMemo(
    () => ({
      branch,
      search: debouncedSearch,
      action: actionFilter,
      severity: severityFilter,
      from: startDate,
      to: endDate,
      sort: sortFilter,
    }),
    [
      branch,
      debouncedSearch,
      actionFilter,
      severityFilter,
      startDate,
      endDate,
      sortFilter,
    ]
  );

  const selectedBranchOption =
    BRANCH_OPTIONS.find((b) => b.value === branch) ?? BRANCH_OPTIONS[0];

  const showToast = useCallback((msg, type = "info") => {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev, { id, msg, type }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const addNewRowFlash = useCallback((id) => {
    setNewRowIds((prev) => new Set(prev).add(id));
    window.setTimeout(() => {
      setNewRowIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 1500);
  }, []);

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const s = await fetchActivityLogStats(branch);
      const total = s.total || 0;
      const delta = total - prevTotalRef.current;

      if (prevTotalRef.current > 0 && delta > 0) {
        setStatDelta(delta);
        setBumpTotalCard(true);
        window.setTimeout(() => setBumpTotalCard(false), 700);
      } else {
        setStatDelta(0);
      }

      prevTotalRef.current = total;
      setStats(s);
    } catch (err) {
      console.error("Stats error", err);
    } finally {
      setStatsLoading(false);
    }
  }, [branch]);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const result = await fetchActivityLogs(filters, currentPage, PAGE_LIMIT);
      setLogsData((result.data || []).map(normalizeLogRecord));
      setTotalPages(result.totalPages);
      setTotalCount(result.total);
      setCurrentPage(result.page);
    } catch (err) {
      const message =
        err.response?.data?.message || err.message || "Failed to fetch logs";
      setLoadError(message);
      showToast("Failed to load logs", "error");
    } finally {
      setLoading(false);
    }
  }, [filters, currentPage, showToast]);

  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setCurrentPage(1);
    }, 300);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [searchInput]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    const interval = setInterval(loadStats, 60_000);
    return () => clearInterval(interval);
  }, [loadStats]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        branchDropdownRef.current &&
        !branchDropdownRef.current.contains(event.target)
      ) {
        setBranchMenuOpen(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const handleLiveLog = useCallback(
    (log) => {
      const normalizedLog = normalizeLogRecord(log);
      const action = normalizedLog.action || normalizedLog.action_type || "Event";
      const username = normalizedLog.user_name || "System";
      setTickerText(`${action} by ${username} · just now`);

      if (currentPage === 1 && sortFilter === "desc") {
        setLogsData((prev) => {
          const exists = prev.some((r) => r.id === normalizedLog.id);
          if (exists) return prev;
          const next = [normalizedLog, ...prev];
          return next.slice(0, PAGE_LIMIT);
        });
        addNewRowFlash(normalizedLog.id);
        showToast(`⚡ Live: ${action}`, "success");
      } else {
        showToast(`New: ${action} by ${username}`, "info");
      }

      loadStats();
    },
    [addNewRowFlash, currentPage, loadStats, showToast, sortFilter]
  );

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
          reconnectionDelayMax: 10000,
        });

        socketRef.current = socket;

        socket.on("connect", () => {
          if (cancelled) return;
          setConnected(true);
          showToast("Real-time feed connected", "success");
          socket.emit("fetch_activity_logs", {
            limit: PAGE_LIMIT,
            branch: branch !== "all" ? branch : undefined,
          });
        });

        socket.on("disconnect", () => {
          if (cancelled) return;
          setConnected(false);
        });

        socket.on("connect_error", () => {
          if (cancelled) return;
          setConnected(false);
        });

        socket.on("new_audit_log", (log) => {
          if (cancelled) return;
          handleLiveLog(log);
        });

        socket.on("activity_log", (log) => {
          if (cancelled) return;
          handleLiveLog(log);
        });

        socket.on("activity_logs_list", (rows) => {
          if (cancelled || !Array.isArray(rows) || !rows.length) return;
          setLogsData(rows.map(normalizeLogRecord));
        });
      } catch (err) {
        console.error("Socket connect failed:", err);
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
  }, [branch, handleLiveLog, showToast]);

  const handleFilterChange = (setter) => (e) => {
    setter(e.target.value);
    setCurrentPage(1);
  };

  const handleBranchSelect = (value) => {
    setBranch(value);
    setBranchMenuOpen(false);
    setCurrentPage(1);
  };

  const handleRefresh = () => {
    loadLogs();
    loadStats();
    showToast("Refreshed", "success");
  };

  const handleExportCSV = async () => {
    showToast("Preparing CSV export…");
    try {
      const result = await exportActivityLogs(filters);
      const logs = (result.data || []).map(normalizeLogRecord);
      if (!logs.length) {
        showToast("No data to export", "error");
        return;
      }

      const headers = [
        "Timestamp",
        "User",
        "Role",
        "Action",
        "Severity",
        "Details",
        "IP",
        "Branch",
      ];
      const rows = logs.map((l) => [
        l.timestamp || l.created_at,
        l.user_name,
        l.role || l.user_role,
        l.action || l.action_type,
        l.severity || l.status,
        l.details || l.target_name || "",
        l.ip_address,
        l.branch,
      ]);
      const csv = [headers, ...rows]
        .map((r) =>
          r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")
        )
        .join("\n");

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `activity_logs_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(a.href);
      showToast("Export ready", "success");
    } catch {
      showToast("Export failed", "error");
    }
  };

  const showDetailModal = async (logId) => {
    setDetailModalOpen(true);
    setDetailLoading(true);
    setDetailLog(null);
    try {
      const log = await fetchActivityLogById(logId);
      setDetailLog(normalizeLogRecord(log));
    } catch {
      showToast("Could not load log details", "error");
      setDetailModalOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const paginationFrom = totalCount ? (currentPage - 1) * PAGE_LIMIT + 1 : 0;
  const paginationTo = Math.min(currentPage * PAGE_LIMIT, totalCount);

  const pageNumbers = useMemo(() => {
    if (totalPages <= 1) return [];
    let start = Math.max(1, currentPage - 2);
    const end = Math.min(totalPages, start + 4);
    if (end - start < 4) start = Math.max(1, end - 4);
    const pages = [];
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }, [currentPage, totalPages]);

  const statNumberClass = (loadingStats) =>
    `stat-number${loadingStats ? " skeleton" : ""}`;

  const detailFields = detailLog
    ? {
        action: detailLog.action || detailLog.action_type || "—",
        username: detailLog.user_name || "—",
        role: detailLog.role || detailLog.user_role || "—",
        ip: detailLog.ip_address || "—",
        branchVal: detailLog.branch || "—",
        details: detailLog.details || "—",
        sev: detailLog.severity || detailLog.status || "—",
        timestamp: detailLog.timestamp || detailLog.created_at || "",
        device: detailLog.device_info || "—",
      }
    : null;



  const hasDiff =
    detailLog &&
    (detailLog.field_changed || detailLog.old_value || detailLog.new_value);

  return (
    <div className="admin-activity-logs-page admin-portal-page">
      <div className="dashboard-header">
        <div>
          <h1>
            <i
              className="fas fa-shield-halved"
              style={{ fontSize: "1.4rem", marginRight: "10px" }}
            />
            Activity Logs
          </h1>
          <p>
            Live audit trail ·{" "}
            <span>{selectedBranchOption.headerLabel}</span>
          </p>
        </div>
        <div className="header-right">
          <div className="live-ticker">
            <span className="live-pulse" />
            <span className="ticker-text">{tickerText}</span>
          </div>
          <div
            className={`socket-status ${connected ? "connected" : "disconnected"}`}
          >
            <div className="socket-dot" />
            <span>{connected ? "Live" : "Reconnecting…"}</span>
          </div>
          <div className="branch-dropdown" ref={branchDropdownRef}>
            <div
              className="branch-selector"
              onClick={(e) => {
                e.stopPropagation();
                setBranchMenuOpen((open) => !open);
              }}
              onKeyDown={(e) =>
                e.key === "Enter" && setBranchMenuOpen((open) => !open)
              }
              role="button"
              tabIndex={0}
            >
              <i className="fas fa-store" />
              <span>{selectedBranchOption.label}</span>
              <i className="fas fa-chevron-down" />
            </div>
            <div className={`branch-menu${branchMenuOpen ? " show" : ""}`}>
              {BRANCH_OPTIONS.map((opt) => (
                <div
                  key={opt.value}
                  className="branch-menu-item"
                  data-branch={opt.value}
                  onClick={() => handleBranchSelect(opt.value)}
                  onKeyDown={(e) =>
                    e.key === "Enter" && handleBranchSelect(opt.value)
                  }
                  role="button"
                  tabIndex={0}
                >
                  {opt.label}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="stats-row">
        <div className={`stat-card${bumpTotalCard ? " bump" : ""}`}>
          <div className="stat-label">Total Events</div>
          <div className={statNumberClass(statsLoading)}>
            {statsLoading ? "—" : (stats?.total ?? 0).toLocaleString()}
          </div>
          {!statsLoading && statDelta > 0 ? (
            <div className="stat-delta">
              <i className="fas fa-arrow-up" /> +{statDelta} new
            </div>
          ) : null}
        </div>
        <div className="stat-card">
          <div className="stat-label">Unique Users</div>
          <div className={statNumberClass(statsLoading)}>
            {statsLoading ? "—" : (stats?.uniqueUsers ?? 0).toLocaleString()}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Critical Actions</div>
          <div className={statNumberClass(statsLoading)}>
            {statsLoading ? "—" : (stats?.critical ?? 0).toLocaleString()}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Failed Logins</div>
          <div className={statNumberClass(statsLoading)}>
            {statsLoading ? "—" : (stats?.failedLogins ?? 0).toLocaleString()}
          </div>
        </div>
      </div>

      <div className="advanced-filters">
        <div className="filter-group search-group">
          <label htmlFor="searchInput">Search</label>
          <div className="search-wrap">
            <i className="fas fa-search" />
            <input
              type="text"
              id="searchInput"
              placeholder="Name, action, details…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
        </div>
        <div className="filter-group">
          <label htmlFor="startDate">From</label>
          <input
            type="date"
            id="startDate"
            value={startDate}
            onChange={handleFilterChange(setStartDate)}
          />
        </div>
        <div className="filter-group">
          <label htmlFor="endDate">To</label>
          <input
            type="date"
            id="endDate"
            value={endDate}
            onChange={handleFilterChange(setEndDate)}
          />
        </div>
        <div className="filter-group">
          <label htmlFor="actionFilter">Action</label>
          <select
            id="actionFilter"
            value={actionFilter}
            onChange={handleFilterChange(setActionFilter)}
          >
            <option value="">All Actions</option>
            <option value="Login">Login</option>
            <option value="Logout">Logout</option>
            <option value="FailedLogin">Failed Login</option>
            <option value="Create">Create</option>
            <option value="Edit">Edit</option>
            <option value="Delete">Delete</option>
            <option value="Approve">Approve</option>
            <option value="Reject">Reject</option>
            <option value="CheckIn">Check In</option>
            <option value="CheckOut">Check Out</option>
            <option value="LeaveApply">Leave Apply</option>
            <option value="PayslipGen">Payslip Gen</option>
            <option value="System">System</option>
          </select>
        </div>
        <div className="filter-group">
          <label htmlFor="severityFilter">Severity</label>
          <select
            id="severityFilter"
            value={severityFilter}
            onChange={handleFilterChange(setSeverityFilter)}
          >
            <option value="">All</option>
            <option value="critical">Critical</option>
            <option value="warning">Warning</option>
            <option value="info">Info</option>
          </select>
        </div>
        <div className="filter-group">
          <label htmlFor="sortFilter">Sort</label>
          <select
            id="sortFilter"
            value={sortFilter}
            onChange={handleFilterChange(setSortFilter)}
          >
            <option value="desc">Newest First</option>
            <option value="asc">Oldest First</option>
          </select>
        </div>
        <div className="export-buttons">
          <button type="button" className="export-btn" onClick={handleRefresh}>
            <i className="fas fa-sync-alt" /> Refresh
          </button>
          <button type="button" className="export-btn" onClick={handleExportCSV}>
            <i className="fas fa-file-csv" /> CSV
          </button>
        </div>
      </div>

      <div className="table-wrapper">
        {loading ? (
          <div className="table-loading-overlay" aria-busy="true">
            <div className="loading-spinner" />
          </div>
        ) : null}
        <div className="table-scroll">
          <table className="log-table">
            <thead>
              <tr>
                <th className="sorted">
                  Timestamp <span className="sort-icon sorted">↓</span>
                </th>
                <th>User / Role</th>
                <th>Action</th>
                <th>Severity</th>
                <th>Details</th>
                <th>IP Address</th>
                <th>Branch</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {loading && !logsData.length ? (
                <tr>
                  <td colSpan={8} className="table-message">
                    <i className="fas fa-spinner fa-spin" />
                    Loading logs…
                  </td>
                </tr>
              ) : !loading && loadError ? (
                <tr>
                  <td colSpan={8} className="table-message">
                    <i
                      className="fas fa-exclamation-triangle"
                      style={{ color: "#DC2626" }}
                    />
                    {loadError}
                  </td>
                </tr>
              ) : !loading && !logsData.length ? (
                <tr>
                  <td colSpan={8} className="table-message">
                    <i className="fas fa-inbox" />
                    No logs found
                  </td>
                </tr>
              ) : (
                logsData.map((log) => {
                  const fields = normalizeLogFields(log);
                  const rowClass = [
                    newRowIds.has(fields.id) ? "new-row" : "",
                    fields.severity === "critical" ? "severity-critical" : "",
                    fields.severity === "warning" ? "severity-warning" : "",
                  ]
                    .filter(Boolean)
                    .join(" ");

                  return (
                    <tr key={fields.id} className={rowClass || undefined}>
                      <td style={{ whiteSpace: "nowrap", fontSize: "0.75rem" }}>
                        <div>{fmtDate(fields.timestamp)}</div>
                        <div
                          style={{
                            color: "#64748B",
                            fontSize: "0.65rem",
                            marginTop: "2px",
                          }}
                        >
                          {timeAgo(fields.timestamp)}
                        </div>
                      </td>
                      <td className="user-cell">
                        <strong>{fields.username}</strong>
                        <span className="role-tag">{fields.role}</span>
                      </td>
                      <td>
                        <span className={`badge ${badgeClass(fields.action)}`}>
                          {fields.action}
                        </span>
                      </td>
                      <td>
                        {fields.severity ? (
                          <span
                            className={`badge ${severityBadgeClass(fields.severity)}`}
                          >
                            <span
                              className={`sev-dot ${severityDotClass(fields.severity)}`}
                            />
                            {fields.severity}
                          </span>
                        ) : null}
                      </td>
                      <td
                        style={{
                          maxWidth: "360px",
                          fontSize: "0.78rem",
                          color: "#bbb",
                        }}
                      >
                        {fields.details}
                      </td>
                      <td>
                        <span className="ip-code">{fields.ip}</span>
                      </td>
                      <td>
                        <BranchChip branch={fields.branch} />
                      </td>
                      <td>
                        <button
                          type="button"
                          className="details-btn"
                          data-id={fields.id}
                          onClick={() => showDetailModal(fields.id)}
                        >
                          <i className="fas fa-eye" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="pagination-bar">
          <div className="pagination-info">
            {totalCount
              ? `Showing ${paginationFrom}–${paginationTo} of ${totalCount.toLocaleString()} events`
              : "No results"}
          </div>
          <div className="pagination-btns">
            {totalPages > 1 ? (
              <>
                <button
                  type="button"
                  className="page-btn"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                >
                  ‹ Prev
                </button>
                {pageNumbers.map((page) => (
                  <button
                    key={page}
                    type="button"
                    className={`page-btn${page === currentPage ? " active" : ""}`}
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </button>
                ))}
                <button
                  type="button"
                  className="page-btn"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => p + 1)}
                >
                  Next ›
                </button>
              </>
            ) : null}
          </div>
        </div>
      </div>

      <div
        className={`modal-overlay${detailModalOpen ? " open" : ""}`}
        onClick={() => setDetailModalOpen(false)}
      >
        <div className="modal-box" onClick={(e) => e.stopPropagation()}>
          <div className="modal-title">
            <i className="fas fa-fingerprint" /> Log Entry Detail
          </div>
          {detailLoading ? (
            <div className="table-message">
              <i className="fas fa-spinner fa-spin" />
            </div>
          ) : detailFields ? (
            <>
              <div className="modal-meta">
                <div className="meta-item">
                  <div className="meta-label">User</div>
                  <div className="meta-value">{detailFields.username}</div>
                </div>
                <div className="meta-item">
                  <div className="meta-label">Role</div>
                  <div className="meta-value">{detailFields.role}</div>
                </div>
                <div className="meta-item">
                  <div className="meta-label">Action</div>
                  <div className="meta-value">
                    <span className={`badge ${badgeClass(detailFields.action)}`}>
                      {detailFields.action}
                    </span>
                  </div>
                </div>
                <div className="meta-item">
                  <div className="meta-label">Severity / Status</div>
                  <div className="meta-value">{detailFields.sev}</div>
                </div>
                <div className="meta-item">
                  <div className="meta-label">Timestamp</div>
                  <div className="meta-value">
                    {fmtDate(detailFields.timestamp)}
                  </div>
                </div>
                <div className="meta-item">
                  <div className="meta-label">IP Address</div>
                  <div className="meta-value">
                    <span className="ip-code">{detailFields.ip}</span>
                  </div>
                </div>
                <div className="meta-item">
                  <div className="meta-label">Branch</div>
                  <div className="meta-value">{detailFields.branchVal}</div>
                </div>
                <div className="meta-item">
                  <div className="meta-label">Details</div>
                  <div className="meta-value">{detailFields.details}</div>
                </div>
                {detailFields.device !== "—" ? (
                  <div className="meta-item" style={{ gridColumn: "span 2" }}>
                    <div className="meta-label">Device / Browser</div>
                    <div
                      className="meta-value"
                      style={{ fontSize: "0.75rem", wordBreak: "break-all" }}
                    >
                      {detailFields.device}
                    </div>
                  </div>
                ) : null}
              </div>

              {hasDiff ? (
                <div className="diff-section">
                  <div className="diff-title">Field Change</div>
                  <div className="diff-block">
                    <div className="diff-old">
                      <div className="diff-value-label">
                        Before · {detailLog.field_changed || "old value"}
                      </div>
                      <div className="diff-value">
                        {detailLog.old_value || "—"}
                      </div>
                    </div>
                    <div className="diff-new">
                      <div className="diff-value-label">
                        After · {detailLog.field_changed || "new value"}
                      </div>
                      <div className="diff-value">
                        {detailLog.new_value || "—"}
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

        
            </>
          ) : null}
          <button
            type="button"
            className="modal-close"
            onClick={() => setDetailModalOpen(false)}
          >
            Close
          </button>
        </div>
      </div>

      <div className="toast-container">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`toast${t.type === "error" ? " error" : t.type === "success" ? " success" : ""}`}
          >
            {t.msg}
          </div>
        ))}
      </div>
    </div>
  );
}
