import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchBreaks,
  fetchEmployees,
  updateBreaks,
} from "../../services/breaksApi";
import "../../styles/adminBreaks.css";

const MAX_BREAK_MINUTES = 60;
const MAX_DAILY_BREAK_SESSIONS = 6;
const STANDARD_BREAK_TYPES = ["break1", "lunch", "break2", "break3"];

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

function getBreak3Sessions(breaks = {}) {
  return Array.isArray(breaks.break3Sessions)
    ? breaks.break3Sessions
    : breaks.break3?.start || breaks.break3?.end
      ? [breaks.break3]
      : [];
}

function getVisibleBreak3Sessions(breaks = {}) {
  return getBreak3Sessions(breaks).filter((item) => {
    if (item?.start && !item?.end) return true;
    return getBreakDuration(item) > 0;
  });
}

function getTotalBreakSessions(breaks = {}) {
  const standardCount = ["break1", "lunch", "break2"].reduce((sum, type) => {
    const item = breaks[type] || {};
    return sum + (item.start || item.end ? 1 : 0);
  }, 0);
  const break3Count = getBreak3Sessions(breaks).filter((item) => item?.start || item?.end).length;
  return standardCount + break3Count;
}

function getStandardBreakMinutes(breaks) {
  return STANDARD_BREAK_TYPES
    .filter((type) => type !== "break3")
    .reduce((sum, type) => sum + getBreakDuration(breaks[type] || {}), 0);
}

function getBreak3Minutes(breaks) {
  return getVisibleBreak3Sessions(breaks).reduce(
    (sum, item) => sum + (Number(item.duration_minutes ?? item.duration) || getBreakDuration(item)),
    0
  );
}

function getTotalBreakMinutes(breaks) {
  const apiTotal = Number(breaks?.total_break_minutes);
  if (Number.isFinite(apiTotal) && apiTotal >= 0) return apiTotal;
  return getStandardBreakMinutes(breaks) + getBreak3Minutes(breaks);
}

function escapeHtml(str) {
  if (!str) return "";
  return str.replace(/[&<>]/g, (m) =>
    m === "&" ? "&amp;" : m === "<" ? "&lt;" : "&gt;"
  );
}

function normalizeBreaksForEdit(breaks = {}) {
  return {
    break1: { start: breaks.break1?.start || "", end: breaks.break1?.end || "" },
    lunch: { start: breaks.lunch?.start || "", end: breaks.lunch?.end || "" },
    break2: { start: breaks.break2?.start || "", end: breaks.break2?.end || "" },
    break3: { start: breaks.break3?.start || "", end: breaks.break3?.end || "" },
    break3Sessions: getBreak3Sessions(breaks).map((item, index) => ({
      start: item.start || "",
      end: item.end || "",
      number: item.number || index + 1,
    })),
  };
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
      break3Sessions: [],
    },
    reason: "",
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
        break3Sessions: [],
      };

    setEditModal({
      open: true,
      employeeId: empId,
      employeeName: emp.name,
      department: emp.department,
      breaks: normalizeBreaksForEdit(empBreaks),
      reason: "",
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
    if (editModal.reason.trim().length < 5) {
      window.alert("Please enter a reason of at least 5 characters.");
      return;
    }
    const totalSessions = getTotalBreakSessions(editModal.breaks);
    if (totalSessions > MAX_DAILY_BREAK_SESSIONS) {
      window.alert("Maximum 6 total break sessions are allowed per day.");
      return;
    }

    setSaving(true);
    try {
      const result = await updateBreaks(
        editModal.employeeId,
        currentDate,
        editModal.breaks,
        editModal.reason.trim()
      );
      showToast(`✅ Break timings saved for ${currentDate}`);
      setEditModal((prev) => ({ ...prev, open: false }));
      await loadData();
      if (result?.break_exceeded) {
        showToast(result.warning || "Break limit exceeded. Attendance marked as Half Day.");
      }
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

  const handleBreak3SessionChange = (index, field, value) => {
    setEditModal((prev) => {
      const sessions = [...(prev.breaks.break3Sessions || [])];
      while (sessions.length <= index) {
        sessions.push({ start: "", end: "", number: sessions.length + 1 });
      }
      sessions[index] = { ...sessions[index], [field]: value, number: index + 1 };
      return {
        ...prev,
        breaks: {
          ...prev.breaks,
          break3Sessions: sessions
            .map((item, itemIndex) => ({ ...item, number: itemIndex + 1 }))
            .slice(0, MAX_DAILY_BREAK_SESSIONS),
        },
      };
    });
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
    if ([empBreaks.break1, empBreaks.lunch, empBreaks.break2, ...getBreak3Sessions(empBreaks)]
      .some((item) => item?.start && !item?.end)) onBreak++;
    totalUsedSum += totalUsed;
    if (totalUsed > MAX_BREAK_MINUTES) exceeding++;
    const break3Used = getBreak3Minutes(empBreaks);
    const break3Count = getVisibleBreak3Sessions(empBreaks).length;
    const break3History = getVisibleBreak3Sessions(empBreaks)
      .join(", ") || "—";
    const limitStatus = totalUsed > MAX_BREAK_MINUTES ? "Exceeded" : "Within limit";

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
        <td>
          <div className="break3-summary-cell">
            <strong>Break 3</strong>
            <span>{break3Used ? `${break3Used} min` : "—"}</span>
            <em>{break3Count} sessions</em>
          </div>
        </td>
        <td style={{ fontWeight: "600" }}>{totalUsed}</td>
        <td>
          <span className={remainingClass}>{remaining}</span>
        </td>
        <td>{limitStatus}</td>
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

  const modalTotalUsed = getTotalBreakMinutes(editModal.breaks);
  const modalRemaining = Math.max(0, MAX_BREAK_MINUTES - modalTotalUsed);
  const modalTotalSessions = getTotalBreakSessions(editModal.breaks);
  const modalStandardSessions = ["break1", "lunch", "break2"].reduce((sum, type) => {
    const item = editModal.breaks[type] || {};
    return sum + (item.start || item.end ? 1 : 0);
  }, 0);
  const modalBreak3Rows = Array.from(
    { length: Math.max(MAX_DAILY_BREAK_SESSIONS - modalStandardSessions, editModal.breaks.break3Sessions?.length || 0, 1) },
    (_, index) => editModal.breaks.break3Sessions?.[index] || { start: "", end: "", number: index + 1 }
  ).slice(0, MAX_DAILY_BREAK_SESSIONS);

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
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="10" style={{ textAlign: "center", padding: "40px" }}>
                  <div className="loading-spinner"></div> Loading breaks...
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan="10" style={{ textAlign: "center", padding: "40px" }}>
                  Failed to load breaks: {error}
                </td>
              </tr>
            ) : filteredEmployees.length === 0 ? (
              <tr>
                <td colSpan="10" style={{ textAlign: "center", padding: "40px" }}>
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
          <div className="break-detail-summary">
            <div><span>Employee</span><strong>{editModal.employeeName || "-"}</strong></div>
            <div><span>Department</span><strong>{editModal.department || "-"}</strong></div>
            <div><span>Date</span><strong>{currentDate}</strong></div>
            <div><span>Daily Limit</span><strong>{MAX_BREAK_MINUTES} min</strong></div>
            <div><span>Total Used</span><strong>{modalTotalUsed} min</strong></div>
            <div><span>Remaining</span><strong>{modalRemaining} min</strong></div>
            <div><span>Total Sessions</span><strong>{modalTotalSessions} / {MAX_DAILY_BREAK_SESSIONS}</strong></div>
          </div>
          <div className="modal-section-title">Standard Breaks</div>
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
          <div className="modal-section-title">Break 3 Sessions</div>
          <div className="break3-session-editor">
            {modalBreak3Rows.map((session, index) => (
              <div className="break3-edit-row" key={`admin-b3-${index}`}>
                <span>Session {index + 1}</span>
                <input
                  type="text"
                  placeholder="Start"
                  value={session.start || ""}
                  onChange={(e) => handleBreak3SessionChange(index, "start", e.target.value)}
                />
                <input
                  type="text"
                  placeholder="End"
                  value={session.end || ""}
                  onChange={(e) => handleBreak3SessionChange(index, "end", e.target.value)}
                />
                <em>{getBreakDuration(session)} min</em>
              </div>
            ))}
          </div>
          <div className="form-group break3-legacy-group">
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
          <div className="form-group">
            <label>Reason</label>
            <textarea
              value={editModal.reason}
              onChange={(e) =>
                setEditModal((prev) => ({ ...prev, reason: e.target.value }))
              }
              placeholder="Enter reason for this edit"
              rows={3}
              required
            />
            {editModal.reason.trim().length < 5 && (
              <div className="modal-error">
                Reason must be at least 5 characters.
              </div>
            )}
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
              disabled={saving || editModal.reason.trim().length < 5}
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
