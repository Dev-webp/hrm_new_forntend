import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchBreaks,
  fetchEmployees,
  updateBreaks,
} from "../../services/breaksApi";
import "../../styles/adminBreaks.css";

const MAX_BREAK_MINUTES = 60;

// Helper: convert "10:30 AM" -> minutes
function timeToMinutes(timeStr) {
  if (!timeStr || timeStr.trim() === "") return 0;
  const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return 0;
  let hours = parseInt(match[1]);
  const minutes = parseInt(match[2]);
  const meridian = match[3].toUpperCase();
  if (meridian === "PM" && hours !== 12) hours += 12;
  if (meridian === "AM" && hours === 12) hours = 0;
  return hours * 60 + minutes;
}

function getBreakDuration(breakObj) {
  if (!breakObj.start || !breakObj.end) return 0;
  const start = timeToMinutes(breakObj.start);
  const end = timeToMinutes(breakObj.end);
  if (start === 0 || end === 0) return 0;
  return Math.max(0, end - start);
}

function getTotalBreakMinutes(breaks) {
  const items = [breaks.break1, breaks.lunch, breaks.break2, breaks.break3];
  return items.reduce((sum, b) => sum + getBreakDuration(b), 0);
}

function escapeHtml(str) {
  if (!str) return "";
  return str.replace(/[&<>]/g, (m) =>
    m === "&" ? "&amp;" : m === "<" ? "&lt;" : "&gt;"
  );
}

function AdminLeave() {
  const todayStr = new Date().toISOString().slice(0, 10);

  const [currentBranch, setCurrentBranch] = useState("all");
  const [currentDate, setCurrentDate] = useState(todayStr);
  const [employeesList, setEmployeesList] = useState([]);
  const [breaksData, setBreaksData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [branchMenuOpen, setBranchMenuOpen] = useState(false);
  const [toast, setToast] = useState({ show: false, message: "" });

  const [editModal, setEditModal] = useState({
    open: false,
    employeeId: null,
    employeeName: "",
    department: "",
    breaks: {
      break1: { start: "", end: "" },
      lunch: { start: "", end: "" },
      break2: { start: "", end: "" },
      break3: { start: "", end: "" },
    },
  });
  const [saving, setSaving] = useState(false);

  const branchDropdownRef = useRef(null);

  // Close branch menu when clicking outside
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

  // Load data
  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      // Fetch employees only if not already loaded
      if (employeesList.length === 0) {
        const employees = await fetchEmployees();
        setEmployeesList(employees);
      }

      const fetchedBreaks = await fetchBreaks(currentDate, currentBranch);
      setBreaksData(fetchedBreaks);
    } catch (err) {
      const message =
        err.response?.data?.message || err.message || "Failed to load data";
      setError(message);
      setBreaksData([]);
    } finally {
      setLoading(false);
    }
  }, [currentDate, currentBranch, employeesList.length]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Show toast
  const showToast = (message) => {
    setToast({ show: true, message });
    setTimeout(() => setToast({ show: false, message: "" }), 2500);
  };

  // Branch selection
  const handleBranchSelect = (branch) => {
    setCurrentBranch(branch);
    setBranchMenuOpen(false);
    const display =
      branch === "Hyderabad"
        ? "🏢 Hyderabad Branch"
        : branch === "Bangalore"
        ? "💻 Bangalore Tech Hub"
        : "🌍 All Branches";
    showToast(`Filter: ${display}`);
  };

  // Date change
  const handleDateChange = (e) => {
    setCurrentDate(e.target.value);
    showToast(`📅 Switched to ${e.target.value}`);
  };

  // Open edit modal
  const handleEdit = (empId) => {
    const emp = employeesList.find((e) => e.id === empId);
    if (!emp) return;

    const empBreaks =
      breaksData.find((b) => b.id === empId) || {
        break1: { start: "", end: "" },
        lunch: { start: "", end: "" },
        break2: { start: "", end: "" },
        break3: { start: "", end: "" },
      };

    setEditModal({
      open: true,
      employeeId: empId,
      employeeName: emp.name,
      department: emp.department,
      breaks: empBreaks,
    });
  };

  // Close modal
  const handleCloseModal = () => {
    if (!saving) {
      setEditModal((prev) => ({ ...prev, open: false }));
    }
  };

  // Save modal changes
  const handleSaveChanges = async () => {
    if (editModal.employeeId === null) return;

    setSaving(true);
    try {
      await updateBreaks(editModal.employeeId, currentDate, editModal.breaks);
      showToast(`✅ Break timings saved for ${currentDate}`);
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

  // Update break field in modal
  const handleBreakFieldChange = (breakType, field, value) => {
    setEditModal((prev) => ({
      ...prev,
      breaks: {
        ...prev.breaks,
        [breakType]: {
          ...prev.breaks[breakType],
          [field]: value,
        },
      },
    }));
  };

  // Filter employees by branch
  const filteredEmployees =
    currentBranch === "all"
      ? employeesList
      : employeesList.filter((emp) => emp.branch === currentBranch);

  // Create breaks map for quick lookup
  const breaksMap = {};
  breaksData.forEach((empBreaks) => {
    breaksMap[empBreaks.id] = empBreaks;
  });

  // Calculate stats
  let totalUsedSum = 0;
  let exceeding = 0;
  let onBreak = 0;

  const rows = filteredEmployees.map((emp) => {
    const empBreaks =
      breaksMap[emp.id] || {
        break1: { start: "", end: "" },
        lunch: { start: "", end: "" },
        break2: { start: "", end: "" },
        break3: { start: "", end: "" },
      };
    const totalUsed = getTotalBreakMinutes(empBreaks);
    if ([empBreaks.break1, empBreaks.lunch, empBreaks.break2, empBreaks.break3]
      .some((item) => item?.start && !item?.end)) onBreak++;
    totalUsedSum += totalUsed;
    if (totalUsed > MAX_BREAK_MINUTES) exceeding++;

    const remaining = Math.max(0, MAX_BREAK_MINUTES - totalUsed);
    let remainingClass = "remaining-badge";
    if (remaining <= 0) remainingClass += " danger";
    else if (remaining <= 15) remainingClass += " warning";

    return (
      <tr key={emp.id} data-id={emp.id}>
        <td>
          <i className="fas fa-user-circle"></i> {escapeHtml(emp.name)}
        </td>
        <td>{escapeHtml(emp.department)}</td>
        <td>{formatBreakCell(empBreaks.break1)}</td>
        <td>{formatBreakCell(empBreaks.lunch)}</td>
        <td>{formatBreakCell(empBreaks.break2)}</td>
        <td>{formatBreakCell(empBreaks.break3)}</td>
        <td style={{ fontWeight: "600" }}>{totalUsed}</td>
        <td>
          <span className={remainingClass}>{remaining}</span>
        </td>
        <td>
          <button
            className="edit-btn"
            onClick={() => handleEdit(emp.id)}
            disabled={loading}
          >
            <i className="fas fa-pencil-alt"></i> Edit
          </button>
        </td>
      </tr>
    );
  });

  const avgUsed = filteredEmployees.length
    ? Math.round(totalUsedSum / filteredEmployees.length)
    : 0;

  const branchDisplay =
    currentBranch === "Hyderabad"
      ? "🏢 Hyderabad Branch"
      : currentBranch === "Bangalore"
      ? "💻 Bangalore Tech Hub"
      : "🌍 All Branches";

  return (
    <div className="admin-breaks-page admin-portal-page">
      <div className="header">
        <div className="title">
          <h1>
            <i className="fas fa-coffee"></i> Employee Breaks Tracker
          </h1>
          <p>Live from database · edit & save for any date</p>
        </div>
        <div className="controls">
          <div className="date-picker-wrapper">
            <i className="fas fa-calendar-alt"></i>
            <input
              type="date"
              id="attendanceDate"
              value={currentDate}
              onChange={handleDateChange}
            />
          </div>
          <div className="branch-dropdown" ref={branchDropdownRef}>
            <button
              type="button"
              className="branch-selector-btn"
              onClick={(e) => {
                e.stopPropagation();
                setBranchMenuOpen((open) => !open);
              }}
            >
              <i className="fas fa-store"></i>{" "}
              <span id="selectedBranchText">{branchDisplay}</span>{" "}
              <i className="fas fa-chevron-down"></i>
            </button>
            {branchMenuOpen && (
              <div className="branch-menu">
                <div
                  className="branch-menu-item"
                  role="button"
                  tabIndex={0}
                  onClick={() => handleBranchSelect("all")}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      handleBranchSelect("all");
                    }
                  }}
                >
                  🌍 All Branches
                </div>
                <div
                  className="branch-menu-item"
                  role="button"
                  tabIndex={0}
                  onClick={() => handleBranchSelect("Hyderabad")}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      handleBranchSelect("Hyderabad");
                    }
                  }}
                >
                  🏢 Hyderabad Branch
                </div>
                <div
                  className="branch-menu-item"
                  role="button"
                  tabIndex={0}
                  onClick={() => handleBranchSelect("Bangalore")}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      handleBranchSelect("Bangalore");
                    }
                  }}
                >
                  💻 Bangalore Tech Hub
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-label">Total Employees</div>
          <div className="stat-number">
            {loading ? "-" : filteredEmployees.length}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">On Break</div>
          <div className="stat-number">{loading ? "-" : onBreak}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Over Break Limit</div>
          <div className="stat-number">{loading ? "-" : exceeding}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Avg Break Used (min)</div>
          <div className="stat-number">{loading ? "-" : avgUsed}</div>
        </div>
      </div>

      <div className="table-wrapper">
        <table className="breaks-table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Department</th>
              <th>Break 1 (In → Out)</th>
              <th>Lunch (In → Out)</th>
              <th>Break 2 (In → Out)</th>
              <th>Break 3 (In → Out)</th>
              <th>Total Used (min)</th>
              <th>Remaining (min)</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="9" style={{ textAlign: "center", padding: "40px" }}>
                  <div className="loading-spinner"></div> Loading breaks...
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan="9" style={{ textAlign: "center", padding: "40px" }}>
                  Failed to load breaks: {error}
                </td>
              </tr>
            ) : filteredEmployees.length === 0 ? (
              <tr>
                <td colSpan="9" style={{ textAlign: "center", padding: "40px" }}>
                  No employees found for this branch
                </td>
              </tr>
            ) : (
              rows
            )}
          </tbody>
        </table>
      </div>

      {/* Edit Modal */}
      <div
        className={`modal ${editModal.open ? "show" : ""}`}
        onClick={handleCloseModal}
      >
        <div
          className="modal-content"
          onClick={(e) => e.stopPropagation()}
        >
          <h3>
            Edit Breaks - {editModal.employeeName} ({editModal.department}) ·{" "}
            {currentDate}
          </h3>
          <div className="form-group">
            <label>
              <i className="fas fa-mug-hot"></i> Break 1
            </label>
            <div className="time-row">
              <input
                type="text"
                placeholder="e.g., 10:30 AM"
                value={editModal.breaks.break1.start}
                onChange={(e) =>
                  handleBreakFieldChange("break1", "start", e.target.value)
                }
              />
              <span>→</span>
              <input
                type="text"
                placeholder="e.g., 10:45 AM"
                value={editModal.breaks.break1.end}
                onChange={(e) =>
                  handleBreakFieldChange("break1", "end", e.target.value)
                }
              />
            </div>
          </div>
          <div className="form-group">
            <label>
              <i className="fas fa-utensils"></i> Lunch Break
            </label>
            <div className="time-row">
              <input
                type="text"
                placeholder="e.g., 1:00 PM"
                value={editModal.breaks.lunch.start}
                onChange={(e) =>
                  handleBreakFieldChange("lunch", "start", e.target.value)
                }
              />
              <span>→</span>
              <input
                type="text"
                placeholder="e.g., 1:30 PM"
                value={editModal.breaks.lunch.end}
                onChange={(e) =>
                  handleBreakFieldChange("lunch", "end", e.target.value)
                }
              />
            </div>
          </div>
          <div className="form-group">
            <label>
              <i className="fas fa-coffee"></i> Break 2
            </label>
            <div className="time-row">
              <input
                type="text"
                placeholder="e.g., 4:00 PM"
                value={editModal.breaks.break2.start}
                onChange={(e) =>
                  handleBreakFieldChange("break2", "start", e.target.value)
                }
              />
              <span>→</span>
              <input
                type="text"
                placeholder="e.g., 4:15 PM"
                value={editModal.breaks.break2.end}
                onChange={(e) =>
                  handleBreakFieldChange("break2", "end", e.target.value)
                }
              />
            </div>
          </div>
          <div className="form-group">
            <label>
              <i className="fas fa-mug-saucer"></i> Break 3
            </label>
            <div className="time-row">
              <input
                type="text"
                placeholder="e.g., 6:00 PM"
                value={editModal.breaks.break3.start}
                onChange={(e) =>
                  handleBreakFieldChange("break3", "start", e.target.value)
                }
              />
              <span>→</span>
              <input
                type="text"
                placeholder="e.g., 6:15 PM"
                value={editModal.breaks.break3.end}
                onChange={(e) =>
                  handleBreakFieldChange("break3", "end", e.target.value)
                }
              />
            </div>
          </div>
          <div className="modal-actions">
            <button
              className="modal-btn cancel"
              onClick={handleCloseModal}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              className="modal-btn"
              onClick={handleSaveChanges}
              disabled={saving}
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>

      {/* Toast */}
      <div className={`toast ${toast.show ? "show" : ""}`}>
        {toast.message}
      </div>
    </div>
  );
}

function formatBreakCell(breakObj) {
  if (!breakObj.start && !breakObj.end)
    return <span style={{ color: "#6b6b6b" }}>—</span>;
  return (
    <span className="break-time-cell">
      {breakObj.start || "—"} → {breakObj.end || "—"}
    </span>
  );
}

export default AdminLeave;
