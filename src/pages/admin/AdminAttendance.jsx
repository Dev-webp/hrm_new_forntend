import { useCallback, useEffect, useRef, useState } from "react";
import AttendanceEditModal from "../../components/attendance/AttendanceEditModal";
import AttendanceFilters from "../../components/attendance/AttendanceFilters";
import AttendanceKpis from "../../components/attendance/AttendanceKpis";
import AttendanceLateAlerts from "../../components/attendance/AttendanceLateAlerts";
import AttendanceLeaderboard from "../../components/attendance/AttendanceLeaderboard";
import AttendanceTable, { AttendanceStatusLegend } from "../../components/attendance/AttendanceTable";
import {
  fetchAttendance,
  fetchAttendanceStats,
  fetchDepartmentLeaderboard,
  fetchEmployeeAttendanceHistory,
  updateAttendance,
} from "../../services/attendanceApi";
import { fetchActiveDepartments } from "../../services/departmentApi";
import {
  ATTENDANCE_BRANCH_MENU,
  branchDisplayLabel,
  branchSelectorLabel,
} from "../../utils/attendanceHelpers";
import {
  formatProductionHours,
  formatTime12Hour,
} from "../../utils/timeFormat";
import "../../styles/adminAttendance.css";

const SEARCH_DEBOUNCE_MS = 400;
const AUTO_REFRESH_MS = 30_000;

function formatLocalDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getDefaultHistoryStart(dateStr) {
  const baseDate = dateStr ? new Date(`${dateStr}T00:00:00`) : new Date();
  baseDate.setDate(baseDate.getDate() - 90);
  return formatLocalDate(baseDate);
}

function getHistoryStatusLabel(status) {
  const value = String(status || "absent").replace(/_/g, " ");
  return value ? value.toUpperCase() : "ABSENT";
}

function AdminAttendance() {
  const todayStr = new Date().toISOString().slice(0, 10);

  const [currentBranch, setCurrentBranch] = useState("all");
  const [currentDateStr, setCurrentDateStr] = useState(todayStr);
  const [deptFilter, setDeptFilter] = useState("all");
  const [lateStatusFilter, setLateStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [lateAlertsVisible, setLateAlertsVisible] = useState(true);
  const [branchMenuOpen, setBranchMenuOpen] = useState(false);

  const [stats, setStats] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [records, setRecords] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [editModal, setEditModal] = useState({
    open: false,
    userId: null,
    name: "",
    initialValues: {},
  });
  const [saving, setSaving] = useState(false);
  const [historyModal, setHistoryModal] = useState({
    open: false,
    userId: null,
    name: "",
    fromDate: "",
    toDate: "",
    records: [],
    loading: false,
    loaded: false,
    error: "",
  });

  const branchDropdownRef = useRef(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearchDebounced(search);
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [search]);

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

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError("");

    try {
      const [statsData, leaderboardData, attendanceData] = await Promise.all([
        fetchAttendanceStats(currentDateStr, currentBranch),
        fetchDepartmentLeaderboard(currentDateStr, currentBranch),
       fetchAttendance(
  currentDateStr,
  currentBranch,
  "all",
  searchDebounced
),
      ]);

      setStats(statsData);
      setLeaderboard(leaderboardData);
      setRecords(attendanceData);
    } catch (err) {
      const message =
        err.response?.data?.message || err.message || "Failed to load data";
      setLoadError(message);
      setStats(null);
      setLeaderboard([]);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [currentBranch, currentDateStr, searchDebounced]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    let cancelled = false;
    fetchActiveDepartments({ branch: currentBranch })
      .then((data) => {
        if (!cancelled) {
          setDepartments([
            { value: "all", label: "All Departments" },
            ...data.map((dept) => ({ value: dept.name, label: dept.name })),
          ]);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDepartments([{ value: "all", label: "All Departments" }]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [currentBranch]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      loadData().catch(console.error);
    }, AUTO_REFRESH_MS);
    return () => window.clearInterval(interval);
  }, [loadData]);

const handleBranchSelect = (branch) => {
  setCurrentBranch(branch);
  setBranchMenuOpen(false);
  setDeptFilter("all");
  setLateStatusFilter("all");
  setSearch("");
  setSearchDebounced("");

  requestAnimationFrame(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  });
};

  const handleDeptFilterChange = (value) => {
    setDeptFilter(value);
  };

  const handleToggleLateAlerts = () => {
    setLateAlertsVisible((prev) => !prev);
  };

  const handleEdit = (payload) => {
    setEditModal({
      open: true,
      userId: payload.userId,
      name: payload.name,
      initialValues: payload.initialValues || {},
    });
  };

  const handleCloseModal = () => {
    if (!saving) {
      setEditModal((prev) => ({ ...prev, open: false }));
    }
  };

  const loadEmployeeHistory = useCallback(async (userId, fromDate, toDate) => {
    if (!userId || !fromDate || !toDate) {
      setHistoryModal((prev) => ({
        ...prev,
        records: [],
        loading: false,
        loaded: true,
        error: "Select an employee and date range.",
      }));
      return;
    }

    setHistoryModal((prev) => ({
      ...prev,
      loading: true,
      loaded: false,
      error: "",
    }));

    try {
      const historyRows = await fetchEmployeeAttendanceHistory(
        userId,
        fromDate,
        toDate
      );
      setHistoryModal((prev) => ({
        ...prev,
        records: historyRows,
        loading: false,
        loaded: true,
        error: "",
      }));
    } catch (err) {
      const message =
        err.response?.data?.message || err.message || "Failed to load history";
      setHistoryModal((prev) => ({
        ...prev,
        records: [],
        loading: false,
        loaded: true,
        error: message,
      }));
    }
  }, []);

  const handleViewHistory = ({ userId, name }) => {
    const fromDate = getDefaultHistoryStart(currentDateStr);
    const toDate = currentDateStr;

    setHistoryModal({
      open: true,
      userId,
      name,
      fromDate,
      toDate,
      records: [],
      loading: false,
      loaded: false,
      error: "",
    });

    loadEmployeeHistory(userId, fromDate, toDate);
  };

  const handleHistoryDateChange = (field, value) => {
    setHistoryModal((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleHistoryFilter = () => {
    loadEmployeeHistory(
      historyModal.userId,
      historyModal.fromDate,
      historyModal.toDate
    );
  };

  const handleCloseHistory = () => {
    setHistoryModal((prev) => ({ ...prev, open: false }));
  };

  const handleSaveAttendance = async (updates) => {
    setSaving(true);
    try {
      await updateAttendance(
        editModal.userId,
        currentDateStr,
        updates
      );
      setEditModal((prev) => ({ ...prev, open: false }));
      await loadData();
    } catch (err) {
      const message =
        err.response?.data?.message || err.message || "Update failed";
      window.alert(`Update failed: ${message}`);
    } finally {
      setSaving(false);
    }
  };

  const branchLabel = branchDisplayLabel(currentBranch);
  const tableNote = `Data for ${currentDateStr} · ${branchLabel}`;

  return (
    <div className="admin-attendance-page att-dashboard admin-portal-page">
      <div className="header">
        <div className="title">
          <h1>
            <i className="fas fa-calendar-day" /> Attendance Management Suite
          </h1>
          <p>
            Live from database · Real‑time editing · {branchLabel} ·{" "}
            <i className="fas fa-calendar-check" /> {currentDateStr}
          </p>
        </div>

        <div className="controls-group">
          <div className="branch-dropdown" ref={branchDropdownRef}>
            <button
              type="button"
              className="branch-selector-btn"
              onClick={(e) => {
                e.stopPropagation();
                setBranchMenuOpen((open) => !open);
              }}
            >
              <i className="fas fa-store" />{" "}
              {branchSelectorLabel(currentBranch)}{" "}
              <i className="fas fa-chevron-down" />
            </button>
            {branchMenuOpen && (
              <div className="branch-menu">
                {ATTENDANCE_BRANCH_MENU.map((opt) => (
                <button
  key={opt.value}
  type="button"
  className="branch-menu-item"
  onClick={(e) => {
    e.preventDefault();
    e.stopPropagation();
    handleBranchSelect(opt.value);
  }}
>
  {opt.label}
</button>
                ))}
              </div>
            )}
          </div>

          <div className="date-picker-wrapper">
            <input
              type="date"
              value={currentDateStr}
              onChange={(e) => setCurrentDateStr(e.target.value)}
            />
          </div>

          <div className="live-badge">
            <span className="live-pulse" /> LIVE · DB sync
          </div>
        </div>
      </div>

      <AttendanceKpis stats={stats} records={records} loading={loading} error={loadError} />

      <AttendanceLateAlerts
        records={records}
        visible={lateAlertsVisible}
        onToggle={handleToggleLateAlerts}
        loading={loading}
      />

      <div className="card">
        <div className="card-header">
          <span>
            <i className="fas fa-chart-line" /> Department Attendance
            Leaderboard
          </span>
          <span>Ranked by presence %</span>
        </div>
        <AttendanceLeaderboard leaderboard={leaderboard} loading={loading} />
      </div>

      <div className="card">
        <div className="card-header">
          <span>
            <i className="fas fa-table-list" /> Employee Attendance Register
          </span>
          <span>
            <i className="fas fa-calendar-alt" /> {tableNote}
          </span>
        </div>

        <AttendanceFilters
          deptFilter={deptFilter}
          onDeptFilterChange={handleDeptFilterChange}
          departments={departments}
          search={search}
          onSearchChange={setSearch}
          lateStatusFilter={lateStatusFilter}
          onLateStatusFilterChange={setLateStatusFilter}
        />
        <AttendanceStatusLegend />

        <div className="att-table-container">
          <table className="att-table">
            <thead>
              <tr>
                <th>Avatar</th>
                <th>Employee</th>
                <th>Department</th>
                <th>Check-In</th>
                <th>Check-Out</th>
                <th>Status</th>
                <th>Late</th>
                <th>Late Login Count</th>
                <th>Production</th>
                <th>Break (min)</th>
                <th>Actions</th>
              </tr>
            </thead>
            <AttendanceTable
              records={records}
              dateStr={currentDateStr}
              deptFilter={deptFilter}
              search={searchDebounced}
              lateStatusFilter={lateStatusFilter}
              loading={loading}
              onEdit={handleEdit}
              onViewHistory={handleViewHistory}
            />
          </table>
        </div>
      </div>

      {historyModal.open && (
        <div className="att-modal-overlay">
          <div className="att-modal-card att-modal-card-wide">
            <h3>
              <i className="fas fa-calendar-alt" /> Attendance History
            </h3>
            <div className="att-history-employee">
              <strong>{historyModal.name || "Selected employee"}</strong>
              <span>User ID: {historyModal.userId}</span>
            </div>
            <div className="att-history-filters">
              <label>
                <span>From</span>
                <input
                  type="date"
                  value={historyModal.fromDate}
                  onChange={(e) =>
                    handleHistoryDateChange("fromDate", e.target.value)
                  }
                />
              </label>
              <label>
                <span>To</span>
                <input
                  type="date"
                  value={historyModal.toDate}
                  onChange={(e) =>
                    handleHistoryDateChange("toDate", e.target.value)
                  }
                />
              </label>
              <button
                type="button"
                className="save-btn"
                onClick={handleHistoryFilter}
                disabled={historyModal.loading}
              >
                {historyModal.loading ? "Loading..." : "Filter"}
              </button>
            </div>
            <div className="att-history-table-wrap">
              <table className="att-history-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Check In</th>
                    <th>Check Out</th>
                    <th>Status</th>
                    <th>Late (min)</th>
                    <th>Production</th>
                  </tr>
                </thead>
                <tbody>
                  {historyModal.loading ? (
                    <tr>
                      <td colSpan="6" className="att-history-empty">
                        Loading history...
                      </td>
                    </tr>
                  ) : historyModal.error ? (
                    <tr>
                      <td colSpan="6" className="att-history-empty error">
                        {historyModal.error}
                      </td>
                    </tr>
                  ) : historyModal.loaded && historyModal.records.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="att-history-empty">
                        No attendance records found for this employee in the
                        selected date range.
                      </td>
                    </tr>
                  ) : (
                    historyModal.records.map((record, index) => (
                      <tr key={`${record.date || "date"}-${index}`}>
                        <td>{record.date || "-"}</td>
                        <td>{formatTime12Hour(record.check_in_time)}</td>
                        <td>{formatTime12Hour(record.check_out_time)}</td>
                        <td>{getHistoryStatusLabel(record.status)}</td>
                        <td>{Number(record.late_minutes || 0)}</td>
                        <td>
                          {formatProductionHours(
                            Number(record.production_hours || 0)
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="att-modal-actions">
              <button
                type="button"
                className="cancel-btn"
                onClick={handleCloseHistory}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <AttendanceEditModal
        open={editModal.open}
        employeeName={editModal.name}
        dateStr={currentDateStr}
        initialValues={editModal.initialValues}
        saving={saving}
        onClose={handleCloseModal}
        onSave={handleSaveAttendance}
      />
    </div>
  );
}

export default AdminAttendance;

