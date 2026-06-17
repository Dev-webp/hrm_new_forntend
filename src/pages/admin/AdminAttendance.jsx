import { useCallback, useEffect, useRef, useState } from "react";
import AttendanceEditModal from "../../components/attendance/AttendanceEditModal";
import AttendanceFilters from "../../components/attendance/AttendanceFilters";
import AttendanceKpis from "../../components/attendance/AttendanceKpis";
import AttendanceLateAlerts from "../../components/attendance/AttendanceLateAlerts";
import AttendanceLeaderboard from "../../components/attendance/AttendanceLeaderboard";
import AttendanceTable from "../../components/attendance/AttendanceTable";
import {
  fetchAttendance,
  fetchAttendanceStats,
  fetchDepartmentLeaderboard,
  updateAttendance,
} from "../../services/attendanceApi";
import {
  ATTENDANCE_BRANCH_MENU,
  branchDisplayLabel,
  branchSelectorLabel,
} from "../../utils/attendanceHelpers";
import "../../styles/adminAttendance.css";

const SEARCH_DEBOUNCE_MS = 400;
const AUTO_REFRESH_MS = 30_000;

function AdminAttendance() {
  const todayStr = new Date().toISOString().slice(0, 10);

  const [currentBranch, setCurrentBranch] = useState("all");
  const [currentDateStr, setCurrentDateStr] = useState(todayStr);
  const [deptFilter, setDeptFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [lateAlertsVisible, setLateAlertsVisible] = useState(true);
  const [branchMenuOpen, setBranchMenuOpen] = useState(false);

  const [stats, setStats] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [editModal, setEditModal] = useState({
    open: false,
    userId: null,
    name: "",
    checkIn: "",
    checkOut: "",
  });
  const [saving, setSaving] = useState(false);

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
    const interval = window.setInterval(() => {
      loadData().catch(console.error);
    }, AUTO_REFRESH_MS);
    return () => window.clearInterval(interval);
  }, [loadData]);

const handleBranchSelect = (branch) => {
  setCurrentBranch(branch);
  setBranchMenuOpen(false);
  setDeptFilter("all");
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
      checkIn: payload.checkIn,
      checkOut: payload.checkOut,
    });
  };

  const handleCloseModal = () => {
    if (!saving) {
      setEditModal((prev) => ({ ...prev, open: false }));
    }
  };

  const handleSaveAttendance = async (checkIn, checkOut, reason) => {
    setSaving(true);
    try {
      await updateAttendance(
        editModal.userId,
        currentDateStr,
        checkIn,
        checkOut,
        reason
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
          search={search}
          onSearchChange={setSearch}
        />

        <div className="att-table-container">
          <table className="att-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Department</th>
                <th>Check-In</th>
                <th>Check-Out</th>
                <th>Status</th>
                <th>Late</th>
                <th>Production (hrs)</th>
                <th>Break (min)</th>
                <th>Action</th>
              </tr>
            </thead>
            <AttendanceTable
              records={records}
              dateStr={currentDateStr}
              deptFilter={deptFilter}
              search={searchDebounced}
              loading={loading}
              onEdit={handleEdit}
            />
          </table>
        </div>
      </div>

      <AttendanceEditModal
        open={editModal.open}
        employeeName={editModal.name}
        dateStr={currentDateStr}
        initialCheckIn={editModal.checkIn}
        initialCheckOut={editModal.checkOut}
        saving={saving}
        onClose={handleCloseModal}
        onSave={handleSaveAttendance}
      />
    </div>
  );
}

export default AdminAttendance;
