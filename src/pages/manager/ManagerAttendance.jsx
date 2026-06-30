import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  checkIn,
  checkOut,
  editAttendanceRecord,
  fetchAttendanceRecords,
  fetchAttendanceStats,
  fetchDeptLeaderboard,
  fetchSelfHistory,
  fetchSelfToday,
} from "../../services/managerApi";
import { fetchActiveDepartments } from "../../services/departmentApi";
import {
  formatProductionHours,
  formatTime12Hour,
} from "../../utils/timeFormat";
import {
  formatLateLoginCount,
  getLateLoginStatus,
  getLateLoginStatusClass,
  getRemainingGraceLateLogins,
} from "../../utils/attendanceHelpers";
import "./ManagerAttendance.css";

function formatTimeForInput(time) {
  return time ? String(time).slice(0, 5) : "";
}

function formatTimeForEdit(time) {
  const raw = formatTimeForInput(time);
  if (!raw) return "";
  const [h, m] = raw.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return "";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

function parseEditTime(value) {
  const text = String(value || "").trim();
  if (!text) return null;
  const match12 = text.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (match12) {
    let hour = Number(match12[1]);
    const minute = Number(match12[2]);
    const suffix = match12[3].toUpperCase();
    if (hour < 1 || hour > 12 || minute > 59) return null;
    if (suffix === "PM" && hour !== 12) hour += 12;
    if (suffix === "AM" && hour === 12) hour = 0;
    return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00`;
  }
  const match24 = text.match(/^(\d{1,2}):(\d{2})$/);
  if (match24) {
    const hour = Number(match24[1]);
    const minute = Number(match24[2]);
    if (hour > 23 || minute > 59) return null;
    return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00`;
  }
  return null;
}

function getStatusBadge(status) {
  const s = (status || "absent").toLowerCase();
  if (s === "in_progress" || s === "working") {
    return <span className="badge" style={{ background: "#DBEAFE", color: "#1D4ED8" }}>WORKING</span>;
  }
  if (s === "full_day") return <span className="badge badge-full-day">FULL DAY</span>;
  if (s === "present") return <span className="badge badge-full-day">PRESENT</span>;
  if (s === "half_day") return <span className="badge badge-half-day">HALF DAY</span>;
  if (s === "leave") return <span className="badge badge-leave">LEAVE</span>;
  if (s === "holiday") return <span className="badge badge-leave">HOLIDAY</span>;
  return <span className="badge badge-absent">ABSENT</span>;
}

function getStatusLabel(status) {
  const s = String(status || "absent").toLowerCase();
  if (s === "in_progress" || s === "working") return "WORKING";
  if (s === "full_day") return "FULL DAY";
  if (s === "present") return "PRESENT";
  if (s === "half_day") return "HALF DAY";
  if (s === "leave") return "LEAVE";
  if (s === "holiday") return "HOLIDAY";
  return "Not Checked In";
}

function getLatePill(emp) {
  const status = (emp.status || "absent").toLowerCase();
  const lateMins = Number(emp.late_minutes || 0);
  if (status === "in_progress" || status === "working") {
    return (
      <span className="on-time-pill" style={{ background: "#DBEAFE", color: "#1D4ED8" }}>
        {lateMins > 0 ? `Working - ${lateMins} min late` : "Working"}
      </span>
    );
  }
  if (status === "absent") return <span className="absent-pill">Absent</span>;
  if (status === "leave") return <span className="badge badge-leave" style={{ padding: "4px 10px" }}>Leave</span>;
  if (lateMins > 0) return <span className="late-pill">🔴 {lateMins} min</span>;
  return <span className="on-time-pill">On Time</span>;
}

function getInitials(name) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

const LATE_LOGIN_LIMIT = 6;

function getLateUsageTone(count) {
  if (count > 6) return "danger";
  if (count === 5) return "near";
  if (count === 6) return "near";
  if (count >= 3) return "warning";
  return "good";
}

function getLateUsageText(count) {
  if (count > 6) return "Limit Exceeded";
  if (count === 6) return "Limit Reached";
  if (count === 5) return "Near Limit";
  if (count >= 3) return "Monthly Warning";
  return "Within Limit";
}

function LateLoginCountCell({ record }) {
  const status = getLateLoginStatus(record);
  return (
    <div className="late-login-count-cell">
      <strong>{formatLateLoginCount(record)}</strong>
      <span className={getLateLoginStatusClass(status)}>{status}</span>
      {status !== "Limit Exceeded" && (
        <small>Remaining Grace: {getRemainingGraceLateLogins(record)}</small>
      )}
    </div>
  );
}

export default function ManagerAttendance() {
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const [currentDate, setCurrentDate] = useState(today);
  const [currentDept, setCurrentDept] = useState("all");
  const [currentSearch, setCurrentSearch] = useState("");
  const [records, setRecords] = useState([]);
  const [stats, setStats] = useState({});
  const [leaderboard, setLeaderboard] = useState([]);
  const [selfAttendance, setSelfAttendance] = useState(null);
  const [loading, setLoading] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [editCI, setEditCI] = useState("");
  const [editCO, setEditCO] = useState("");
  const [editReason, setEditReason] = useState("");
  const [historyModal, setHistoryModal] = useState(false);
  const [historyRecords, setHistoryRecords] = useState([]);
  const [historyStart, setHistoryStart] = useState("");
  const [historyEnd, setHistoryEnd] = useState("");
  const [toast, setToast] = useState("");
  const [lateEmployees, setLateEmployees] = useState([]);
  const [departments, setDepartments] = useState(["all"]);
  const [monthlyLateCount, setMonthlyLateCount] = useState(0);

  const storedUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
      return {};
    }
  }, []);
  const isOperationalManager = storedUser.role === "OPERATIONAL_MANAGER";
  const [selectedBranch, setSelectedBranch] = useState("all");
  const branch = isOperationalManager ? selectedBranch : (localStorage.getItem("branch") || "Hyderabad");
  const managerName = localStorage.getItem("full_name") || "Manager";
  const managerId = parseInt(localStorage.getItem("id") || "0");

  const searchTimeoutRef = useRef(null);

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2800);
  }, []);

  const loadSelfAttendance = useCallback(async () => {
    try {
      const data = await fetchSelfToday();
      setSelfAttendance(data);
    } catch (err) {
      console.warn(err);
    }
  }, []);

  const loadMonthlyLateUsage = useCallback(async () => {
    try {
      const date = new Date(currentDate);
      const start = new Date(date.getFullYear(), date.getMonth(), 1).toISOString().slice(0, 10);
      const end = new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().slice(0, 10);
      const records = await fetchSelfHistory(start, end);
      const lateCount = records.filter((record) => Number(record.late_minutes || 0) > 0).length;
      setMonthlyLateCount(lateCount);
    } catch (err) {
      console.warn(err);
      setMonthlyLateCount(0);
    }
  }, [currentDate]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [statsResult, leaderboardResult, recordsResult] = await Promise.allSettled([
        fetchAttendanceStats(currentDate, branch),
        fetchDeptLeaderboard(currentDate, branch),
        fetchAttendanceRecords(currentDate, branch),
      ]);

      const s = statsResult.status === "fulfilled" ? statsResult.value : {};
      const attendanceRate = Number(s.attendanceRate ?? 0);
      const dailyPresent = Number(s.dailyPresent ?? 0);
      const totalActive = Number(s.totalActive ?? 0);
      const lateToday = Number(s.lateToday ?? 0);

      const attRecords = recordsResult.status === "fulfilled" ? recordsResult.value : [];
      const totalLeave = attRecords.filter((r) => r.status && r.status.toLowerCase() === "leave").length;

      setStats({
        attendanceRate,
        dailyPresent,
        totalActive,
        lateToday,
        totalLeave,
      });

      const lateEmps = attRecords.filter((e) => Number(e.late_minutes || 0) > 0);
      setLateEmployees(lateEmps);

      const lb = leaderboardResult.status === "fulfilled" ? leaderboardResult.value : [];
      setLeaderboard(lb);

      setRecords(attRecords);
    } catch (err) {
      showToast("Error: " + (err.message || "Failed to load data"));
    } finally {
      setLoading(false);
    }
  }, [currentDate, branch, showToast]);

  const loadHistory = useCallback(async () => {
    try {
      const records = await fetchSelfHistory(historyStart, historyEnd);
      setHistoryRecords(records);
    } catch (err) {
      showToast("Failed to load history: " + err.message);
    }
  }, [historyStart, historyEnd, showToast]);

  const handleCheckIn = async () => {
    try {
      await checkIn();
      showToast("✅ Checked in successfully");
      await loadSelfAttendance();
      await refresh();
    } catch (err) {
      showToast("Check-in failed: " + err.message);
    }
  };

  const handleCheckOut = async () => {
    try {
      await checkOut();
      showToast("✅ Checked out successfully");
      await loadSelfAttendance();
      await refresh();
    } catch (err) {
      showToast("Check-out failed: " + err.message);
    }
  };

  const handleEditSave = async () => {
    if (editReason.trim().length < 5) {
      showToast("Enter a reason of at least 5 characters");
      return;
    }
    const nextCheckIn = editCI.trim() ? parseEditTime(editCI) : undefined;
    const nextCheckOut = editCO.trim() ? parseEditTime(editCO) : undefined;
    if ((editCI.trim() && !nextCheckIn) || (editCO.trim() && !nextCheckOut)) {
      showToast("Use 12-hour time format, for example 10:00 AM");
      return;
    }
    if (nextCheckIn === undefined && nextCheckOut === undefined) {
      showToast("Update at least one time field");
      return;
    }
    try {
      await editAttendanceRecord(editTarget, currentDate, nextCheckIn, nextCheckOut, editReason.trim());
      showToast("✅ Attendance updated");
      setEditModal(false);
      setEditReason("");
      await refresh();
    } catch (err) {
      showToast("Failed: " + err.message);
    }
  };

  const handleHistoryOpen = () => {
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 3600000).toISOString().slice(0, 10);
    setHistoryStart(ninetyDaysAgo);
    setHistoryEnd(today);
    loadHistory();
    setHistoryModal(true);
  };

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setCurrentSearch(value);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      // Search is client-side only, no API call needed
    }, 300);
  };

  const filteredRecords = useMemo(
    () =>
      records.filter((r) => {
        const deptOk = currentDept === "all" || r.department === currentDept;
        const searchOk = !currentSearch || r.full_name.toLowerCase().includes(currentSearch.toLowerCase());
        return deptOk && searchOk;
      }),
    [records, currentDept, currentSearch]
  );

  useEffect(() => {
    loadSelfAttendance();
    loadMonthlyLateUsage();
    refresh();
  }, [loadMonthlyLateUsage, loadSelfAttendance, refresh]);

  useEffect(() => {
    let cancelled = false;
    fetchActiveDepartments({ branch })
      .then((data) => {
        if (!cancelled) {
          setDepartments(["all", ...data.map((dept) => dept.name).filter(Boolean)]);
        }
      })
      .catch(() => {
        if (!cancelled) setDepartments(["all"]);
      });
    return () => {
      cancelled = true;
    };
  }, [branch]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      loadSelfAttendance();
      loadMonthlyLateUsage();
      refresh();
    }, 30000);
    return () => clearInterval(intervalId);
  }, [loadMonthlyLateUsage, loadSelfAttendance, refresh]);

  return (
    <>
      <div className="att-dashboard manager-portal-page manager-attendance-page">
        <div className="header">
          <div className="title">
            <h1>
              <i className="fas fa-calendar-check"></i> Attendance Management
            </h1>
            <p>
              Your attendance + team oversight · {branch} Branch · {currentDate}
            </p>
          </div>
          <div className="controls-group">
            {isOperationalManager ? (
              <label className="branch-pill">
                <i className="fas fa-store"></i>
                <select
                  value={selectedBranch}
                  onChange={(e) => {
                    setSelectedBranch(e.target.value);
                    setCurrentDept("all");
                  }}
                >
                  <option value="all">All Branches</option>
                  <option value="Hyderabad">Hyderabad</option>
                  <option value="Bangalore">Bangalore</option>
                </select>
              </label>
            ) : (
              <div className="branch-pill">
                <i className="fas fa-store"></i> {branch}
              </div>
            )}
            <div className="date-picker-wrapper">
              <i className="fas fa-calendar-alt" style={{ color: "#FF8C00" }}></i>
              <input type="date" value={currentDate} onChange={(e) => setCurrentDate(e.target.value)} />
            </div>
            <div className="live-badge">
              <span className="live-pulse"></span> LIVE
            </div>
          </div>
        </div>

        <div className="self-card">
          <div className="self-info">
            <i className="fas fa-user-check" style={{ fontSize: "1.6rem", color: "var(--gold)" }}></i>
            <div>
              <strong>My Attendance Today</strong>
              <br />
              {selfAttendance && selfAttendance.id ? (
                <span className="self-status">
                  <i className="fas fa-circle" style={{ color: "#16A34A", fontSize: "10px" }}></i>{" "}
                  {getStatusLabel(selfAttendance.status)}
                </span>
              ) : (
                <span className="self-status">
                  <i className="fas fa-circle" style={{ color: "#DC2626", fontSize: "10px" }}></i> Not Checked In
                </span>
              )}
            </div>
            <div>
              {selfAttendance && selfAttendance.id ? (
                <span>
                  In: {formatTime12Hour(selfAttendance.check_in_time)} | Out:{" "}
                  {formatTime12Hour(selfAttendance.check_out_time)}
                </span>
              ) : null}
            </div>
          </div>
          <div className="self-buttons">
            <button
              type="button"
              className="btn-check"
              disabled={!!(selfAttendance?.check_in_time)}
              onClick={handleCheckIn}
            >
              <i className="fas fa-sign-in-alt"></i> Check In
            </button>
            <button
              type="button"
              className="btn-check-out"
              disabled={!selfAttendance?.check_in_time || !!selfAttendance?.check_out_time}
              onClick={handleCheckOut}
            >
              <i className="fas fa-sign-out-alt"></i> Check Out
            </button>
            <button type="button" className="btn-history" onClick={handleHistoryOpen}>
              <i className="fas fa-history"></i> My History
            </button>
          </div>
        </div>

        {lateEmployees.length > 0 ? (
          <div className="late-alert">
            <i className="fas fa-clock"></i>
            <div>
              <strong>⚠️ Late Arrivals Today</strong>
              <br />
              <span className="late-list">
                {lateEmployees.map((e) => (
                  <span key={e.user_id} className="late-chip">
                    <i className="fas fa-user"></i> {e.full_name} ({Number(e.late_minutes)} min late)
                  </span>
                ))}
              </span>
            </div>
          </div>
        ) : null}

        <div className="kpi-grid">
          <div className="kpi">
            <div className="kpi-title">
              <i className="fas fa-percent"></i> Attendance Rate
            </div>
            <div className="kpi-value">{loading ? <span className="spinner"></span> : stats.attendanceRate + "%"}</div>
            <div className="kpi-sub">Selected date</div>
          </div>
          <div className="kpi">
            <div className="kpi-title">
              <i className="fas fa-users"></i> Present
            </div>
            <div className="kpi-value">{loading ? <span className="spinner"></span> : stats.dailyPresent}</div>
            <div className="kpi-sub">of {stats.totalActive} active</div>
          </div>
          <div className="kpi">
            <div className="kpi-title">
              <i className="fas fa-clock"></i> Late Arrivals
            </div>
            <div className="kpi-value">{loading ? <span className="spinner"></span> : stats.lateToday}</div>
            <div className="kpi-sub">Real-time</div>
          </div>
          <div className="kpi">
            <div className="kpi-title">
              <i className="fas fa-umbrella-beach"></i> Total Leave
            </div>
            <div className="kpi-value">{loading ? <span className="spinner"></span> : stats.totalLeave}</div>
            <div className="kpi-sub">On this day</div>
          </div>
          <div
            className={`kpi late-usage-kpi ${getLateUsageTone(monthlyLateCount)}`}
            title="Late Login Policy: Maximum allowed late logins per month is 6. Grace login time is 10:15 AM. After reaching the limit, attendance is calculated according to company policy. The count resets automatically every month."
          >
            <div className="kpi-title">
              <i className="fas fa-circle-info"></i> Late Logins
            </div>
            <div className="kpi-value">{monthlyLateCount} / {LATE_LOGIN_LIMIT}</div>
            <div className="kpi-sub">{getLateUsageText(monthlyLateCount)}</div>
          </div>
        </div>

        <div className="two-cols">
          <div className="card">
            <div className="card-header">
              <i className="fas fa-chart-simple"></i> Department Leaderboard
            </div>
            <div className="dept-leaderboard">
              {loading && leaderboard.length === 0 ? (
                <div style={{ color: "#64748B", textAlign: "center", padding: "20px" }}>Loading...</div>
              ) : leaderboard.length === 0 ? (
                <div style={{ color: "#64748B", textAlign: "center", padding: "20px" }}>No data</div>
              ) : (
                leaderboard.map((d, index) => (
                  <div key={index} className="dept-row">
                    <span className="dname">{d.name}</span>
                    <div className="progress">
                      <div className="progress-fill" style={{ width: Number(d.percent ?? 0) + "%" }}></div>
                    </div>
                    <span style={{ fontSize: "0.8rem", color: "#FF8C00", width: "36px", textAlign: "right" }}>
                      {Number(d.percent ?? 0)}%
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="table-card">
          <div className="card-header" style={{ marginBottom: "18px" }}>
            <i className="fas fa-table-list"></i> Employee Attendance Register
          </div>
          <div className="filter-bar">
            {departments.map((dept) => (
              <button
                key={dept}
                type="button"
                className={`filter-btn${currentDept === dept ? " active" : ""}`}
                onClick={() => setCurrentDept(dept)}
              >
                {dept === "all" ? "All" : dept}
              </button>
            ))}
            <input
              type="text"
              className="search-input"
              placeholder="🔍 Search employee..."
              value={currentSearch}
              onChange={handleSearchChange}
            />
          </div>
          <div style={{ overflowX: "auto" }}>
            <table className="att-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Department</th>
                  <th>Check-In</th>
                  <th>Check-Out</th>
                  <th>Status</th>
                  <th>Late</th>
                  <th>Late Login Count</th>
                  <th>Production</th>
                  <th>Break (min)</th>
                  <th>Edit</th>
                </tr>
              </thead>
              <tbody>
                {loading && filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan="10" style={{ textAlign: "center", padding: "40px" }}>
                      <span className="spinner"></span>
                    </td>
                  </tr>
                ) : filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan="10" style={{ textAlign: "center", padding: "40px", color: "#64748B" }}>
                      No records found
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((r) => (
                    <tr key={r.user_id || r.id}>
                      <td>
                        <i className="fas fa-user-circle" style={{ color: "#FF8C00", marginRight: "6px" }}></i>
                        {r.full_name}
                      </td>
                      <td>{r.department || "—"}</td>
                      <td>{formatTime12Hour(r.check_in_time)}</td>
                      <td>{formatTime12Hour(r.check_out_time)}</td>
                      <td>{getStatusBadge(r.status)}</td>
                      <td>{getLatePill(r)}</td>
                      <td><LateLoginCountCell record={r} /></td>
                      <td style={{ color: "#FF8C00", fontWeight: "600" }}>
                        {formatProductionHours(r.production_hours)}
                      </td>
                      <td style={{ color: "#64748B" }}>{Number(r.total_break_minutes || 0)} min</td>
                      <td>
                        <button
                          type="button"
                          className="edit-btn"
                          onClick={() => {
                            setEditTarget(r.user_id);
                            setEditCI(formatTimeForEdit(r.check_in_time));
                            setEditCO(formatTimeForEdit(r.check_out_time));
                            setEditReason("");
                            setEditModal(true);
                          }}
                        >
                          <i className="fas fa-edit"></i> Edit
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {editModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h3>
              <i className="fas fa-pen-alt"></i> Edit Attendance
            </h3>
            <label>Employee</label>
            <input type="text" value={editTarget} readOnly style={{ opacity: 0.6 }} />
            <label>Check-In (AM/PM)</label>
            <input type="text" value={editCI} onChange={(e) => setEditCI(e.target.value)} placeholder="10:00 AM" />
            <label>Check-Out (AM/PM)</label>
            <input type="text" value={editCO} onChange={(e) => setEditCO(e.target.value)} placeholder="7:00 PM" />
            <label>Reason</label>
            <textarea
              value={editReason}
              onChange={(e) => setEditReason(e.target.value)}
              placeholder="Enter reason for this edit"
              rows={3}
              required
            />
            {editReason.trim().length < 5 && (
              <div className="modal-error">Reason must be at least 5 characters.</div>
            )}
            <div className="modal-actions">
              <button type="button" className="cancel-btn" onClick={() => setEditModal(false)}>
                Cancel
              </button>
              <button type="button" className="save-btn" onClick={handleEditSave} disabled={editReason.trim().length < 5}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {historyModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h3>
              <i className="fas fa-calendar-alt"></i> My Attendance History
            </h3>
            <div style={{ display: "flex", gap: "12px", marginBottom: "20px", alignItems: "center" }}>
              <label>From</label>
              <input type="date" value={historyStart} onChange={(e) => setHistoryStart(e.target.value)} style={{ flex: 1 }} />
              <label>To</label>
              <input type="date" value={historyEnd} onChange={(e) => setHistoryEnd(e.target.value)} style={{ flex: 1 }} />
              <button type="button" className="save-btn" style={{ padding: "6px 16px" }} onClick={loadHistory}>
                Filter
              </button>
            </div>
            <div style={{ maxHeight: "400px", overflowY: "auto" }}>
              <table className="history-table">
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
                  {historyRecords.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={{ textAlign: "center" }}>No records found</td>
                    </tr>
                  ) : (
                    historyRecords.map((r, index) => (
                      <tr key={index}>
                        <td>{r.date}</td>
                        <td>{formatTime12Hour(r.check_in_time)}</td>
                        <td>{formatTime12Hour(r.check_out_time)}</td>
                        <td>{getStatusBadge(r.status)}</td>
                        <td>{Number(r.late_minutes || 0)}</td>
                        <td style={{ color: "#FF8C00" }}>{formatProductionHours(Number(r.production_hours || 0))}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="modal-actions">
              <button type="button" className="cancel-btn" onClick={() => setHistoryModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="toast show">{toast}</div>}
    </>
  );
}



