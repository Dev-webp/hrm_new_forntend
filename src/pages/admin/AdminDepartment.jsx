import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchBranches,
  fetchDepartments,
} from "../../services/departmentApi";
import "./AdminDepartment.css";

function formatDateDisplay(dateStr) {
  if (!dateStr) return "Today";
  return dateStr.split("-").reverse().join("/");
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function AdminDepartment() {
  const [currentBranch, setCurrentBranch] = useState("all");
  const [currentDate, setCurrentDate] = useState(todayStr);
  const [departments, setDepartments] = useState([]);
  const [branchesList, setBranchesList] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [initialLoaded, setInitialLoaded] = useState(false);

  const [branchMenuOpen, setBranchMenuOpen] = useState(false);
  const [toast, setToast] = useState({ show: false, message: "" });

  const branchDropdownRef = useRef(null);

  const showToast = useCallback((message) => {
    setToast({ show: true, message });
    window.setTimeout(() => setToast({ show: false, message: "" }), 3000);
  }, []);

  const selectedBranchLabel =
    currentBranch === "all" ? "All Branches" : currentBranch;
  const summary = departments.reduce(
    (totals, dept) => ({
      employees: totals.employees + Number(dept.employees || 0),
      present: totals.present + Number(dept.present || 0),
      absent: totals.absent + Number(dept.absent || 0),
    }),
    { employees: 0, present: 0, absent: 0 }
  );
  const selectedBranchText =
    currentBranch === "all" ? "🌍 All Branches" : `🏢 ${currentBranch}`;

  const loadBranches = useCallback(async () => {
    try {
      const branches = await fetchBranches();
      setBranchesList(branches.map((b) => b.name).filter(Boolean));
    } catch (err) {
      console.error(err);
      showToast("Failed to load branches");
    }
  }, [showToast]);

  const loadDepartments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchDepartments({
        date: currentDate,
        branch: currentBranch,
      });
      setDepartments(data);
    } catch (err) {
      const message =
        err.response?.data?.message || err.message || "Failed to load departments";
      setError(message);
    } finally {
      setLoading(false);
      setInitialLoaded(true);
    }
  }, [currentBranch, currentDate]);

  useEffect(() => {
    loadBranches();
  }, [loadBranches]);

  useEffect(() => {
    loadDepartments();
  }, [loadDepartments]);

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

  const handleBranchSelect = (branchVal) => {
    setCurrentBranch(branchVal);
    setBranchMenuOpen(false);
    showToast(
      `Switched to ${branchVal === "all" ? "All Branches" : branchVal}`
    );
  };

  const handleDateChange = (e) => {
    setCurrentDate(e.target.value);
    showToast(`Attendance data loaded for ${e.target.value}`);
  };

  return (
    <div className="admin-department-page admin-portal-page">
      <div className="dashboard-header">
        <div>
          <h1>
            <i className="fas fa-chalkboard-user" /> Department Operations
          </h1>
          <p>
            Real employee counts · Date‑aware attendance ·{" "}
            <span>{selectedBranchLabel}</span>
          </p>
        </div>
        <div className="header-actions">
          <div className="date-picker-wrapper">
            <i className="fas fa-calendar-day" style={{ color: "#FF8C00" }} />
            <label htmlFor="attendanceDate">Date:</label>
            <input
              type="date"
              id="attendanceDate"
              value={currentDate}
              onChange={handleDateChange}
            />
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
              <i className="fas fa-store" /> <span>{selectedBranchText}</span>{" "}
              <i className="fas fa-chevron-down" />
            </div>
            <div className={`branch-menu${branchMenuOpen ? " show" : ""}`}>
              <div
                className="branch-menu-item"
                data-branch="all"
                onClick={() => handleBranchSelect("all")}
                onKeyDown={(e) => e.key === "Enter" && handleBranchSelect("all")}
                role="button"
                tabIndex={0}
              >
                🌍 All Branches (Consolidated)
              </div>
              {branchesList.map((name) => (
                <div
                  key={name}
                  className="branch-menu-item"
                  data-branch={name}
                  onClick={() => handleBranchSelect(name)}
                  onKeyDown={(e) =>
                    e.key === "Enter" && handleBranchSelect(name)
                  }
                  role="button"
                  tabIndex={0}
                >
                  🏢 {name}
                </div>
              ))}
            </div>
          </div>
          <div className="live-badge">
            <span className="live-pulse" /> LIVE · Database sync
          </div>
        </div>
      </div>

      <div className="department-kpi-grid">
        {[
          ["Total Departments", departments.length, "fa-building", "primary"],
          ["Total Employees", summary.employees, "fa-users", "info"],
          ["Present Today", summary.present, "fa-user-check", "success"],
          ["Absent Today", summary.absent, "fa-user-xmark", "danger"],
        ].map(([label, value, icon, tone]) => (
          <div className={`department-kpi ${tone}`} key={label}>
            <div><span>{label}</span><strong>{loading ? "—" : value}</strong></div>
            <i className={`fas ${icon}`} />
          </div>
        ))}
      </div>

      <div className="dept-grid-wrap">
        {loading ? (
          <div className="dept-loading-overlay" aria-busy="true">
            <div className="loading-spinner" />
          </div>
        ) : null}

        <div className="dept-grid">
          {!initialLoaded && loading ? (
            <div className="empty-state">
              <i className="fas fa-spinner fa-pulse" /> Loading departments...
            </div>
          ) : error ? (
            <div className="empty-state">Error loading departments: {error}</div>
          ) : !departments.length ? (
            <div className="empty-state">
              <i
                className="fas fa-building"
                style={{ fontSize: "48px", opacity: 0.5 }}
              />
              <br />
              No departments found for this branch on {currentDate}
            </div>
          ) : (
            departments.map((dept) => {
              const attendancePct = Number(dept.employees)
                ? Math.round((Number(dept.present || 0) / Number(dept.employees)) * 100)
                : 0;
              return (
              <div className="glass-card" key={dept.name}>
                <div className="dept-header">
                  <div>
                    <div className="dept-name">{dept.name}</div>
                    <div
                      style={{
                        fontSize: "12px",
                        color: "#64748B",
                        marginTop: "8px",
                      }}
                    >
                      Department Head
                    </div>
                    <div
                      style={{
                        marginTop: "4px",
                        fontSize: "14px",
                        fontWeight: 600,
                        color: "#FF8C00",
                      }}
                    >
                      <i className="fas fa-user-tie" />{" "}
                      {dept.head || "Not Assigned"}
                    </div>
                  </div>
                  <span className="dept-code">{dept.code}</span>
                </div>
                <div className="employee-count">
                  {dept.employees}{" "}
                  {dept.employees === 1 ? "Employee" : "Employees"}
                </div>
                <div className="attendance-stats">
                  <div className="present-box">
                    <div className="attendance-label">
                      <i className="fas fa-user-check" /> Present (
                      {formatDateDisplay(currentDate)})
                    </div>
                    <div className="attendance-number">{dept.present || 0}</div>
                  </div>
                  <div className="absent-box">
                    <div className="attendance-label">
                      <i className="fas fa-user-times" /> Absent (
                      {formatDateDisplay(currentDate)})
                    </div>
                    <div className="attendance-number">{dept.absent || 0}</div>
                  </div>
                </div>
                <div className="department-progress">
                  <div><span>Attendance rate</span><strong>{attendancePct}%</strong></div>
                  <div className="department-progress-track">
                    <span style={{ width: `${attendancePct}%` }} />
                  </div>
                </div>
              </div>
            )})
          )}
        </div>
      </div>

      <div className={`toast-msg${toast.show ? " show" : ""}`}>{toast.message}</div>
    </div>
  );
}
