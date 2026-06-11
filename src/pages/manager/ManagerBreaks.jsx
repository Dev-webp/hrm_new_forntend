import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/ManagerBreaks.css";

const MAX_BREAK_MINUTES = 60;
const API_BASE =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";
  
const BREAK_LABELS = { break1: "☕ Break 1", lunch: "🍽️ Lunch", break2: "🧋 Break 2", break3: "☕ Break 3" };

function parseJwt(t) {
  try {
    return JSON.parse(atob(t.split(".")[1]));
  } catch (e) {
    return null;
  }
}

async function authFetch(url, options = {}, token, navigate) {
  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...options.headers };
  const response = await fetch(`${API_BASE}${url}`, { ...options, headers });
  if (response.status === 401 || response.status === 403) {
    localStorage.clear();
    navigate("/login");
    throw new Error("Unauth");
  }
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || "API error");
  }
  return response.json();
}

function timeToMinutes(timeStr) {
  if (!timeStr) return 0;
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
  return Math.max(0, end - start);
}

function getTotalBreakMinutes(breaks) {
  return [breaks.break1, breaks.lunch, breaks.break2, breaks.break3].reduce((sum, b) => sum + getBreakDuration(b), 0);
}

function formatTimeDisplay(time24) {
  if (!time24) return "";
  const [hour, minute] = time24.split(":");
  let h = parseInt(hour);
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${minute} ${ampm}`;
}

function getCurrentTimeAMPM() {
  const now = new Date();
  let hours = now.getHours();
  const minutes = now.getMinutes();
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  return `${hours}:${minutes.toString().padStart(2, "0")} ${ampm}`;
}

export default function ManagerBreaks() {
  const navigate = useNavigate();
  const [token, setToken] = useState("");
  const [managerBranch, setManagerBranch] = useState("");
  const [managerId, setManagerId] = useState(null);
  const [managerName, setManagerName] = useState("");
  const [currentDate, setCurrentDate] = useState(new Date().toISOString().slice(0, 10));
  const [employeesList, setEmployeesList] = useState([]);
  const [breaksData, setBreaksData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState({ msg: "", visible: false });
  const [editModal, setEditModal] = useState({ open: false, empId: null, empName: "", breaks: { break1: {}, lunch: {}, break2: {}, break3: {} } });
  const [historyPanelOpen, setHistoryPanelOpen] = useState(false);
  const [historyFrom, setHistoryFrom] = useState("");
  const [historyTo, setHistoryTo] = useState("");
  const [historyRows, setHistoryRows] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [summaryStat, setSummaryStat] = useState({ days: 0, avg: 0, highest: 0, exceeded: 0 });
  const [managerBreaks, setManagerBreaks] = useState({ break1: {}, lunch: {}, break2: {}, break3: {} });
  const [currentEditEmployeeId, setCurrentEditEmployeeId] = useState(null);

  const showToast = useCallback((msg, dur = 2500) => {
    setToast({ msg, visible: true });
    setTimeout(() => setToast({ msg: "", visible: false }), dur);
  }, []);

  const refreshData = useCallback(async () => {
    setIsLoading(true);
    try {
      const employees = await authFetch("/admin/employees", {}, token, navigate);
      const filteredEmployees = employees
        .filter((emp) => emp.branch === managerBranch)
        .map((emp) => ({ id: emp.id, name: emp.full_name, department: emp.department, branch: emp.branch }));
      setEmployeesList(filteredEmployees);

      const fetchedBreaks = await authFetch(`/breaks?date=${currentDate}&branch=${encodeURIComponent(managerBranch)}`, {}, token, navigate);
      setBreaksData(fetchedBreaks);

      const myBreaks = fetchedBreaks.find((b) => b.id === managerId) || { break1: {}, lunch: {}, break2: {}, break3: {} };
      setManagerBreaks(myBreaks);
    } catch (err) {
      showToast("Error loading data: " + err.message);
    } finally {
      setIsLoading(false);
    }
  }, [currentDate, managerBranch, managerId, token, navigate, showToast]);

  const handleBreakButtonClick = useCallback(
    async (breakType) => {
      const current = breaksData.find((b) => b.id === managerId) || { break1: {}, lunch: {}, break2: {}, break3: {} };
      let newStart = current[breakType]?.start;
      let newEnd = current[breakType]?.end;

      if (!newStart) {
        newStart = getCurrentTimeAMPM();
        newEnd = "";
      } else if (newStart && !newEnd) {
        newEnd = getCurrentTimeAMPM();
      } else {
        showToast("Break already completed. Use Edit button.");
        return;
      }

      const updated = { break1: { ...current.break1 }, lunch: { ...current.lunch }, break2: { ...current.break2 }, break3: { ...current.break3 } };
      updated[breakType] = { start: newStart, end: newEnd };

      try {
        await authFetch(`/breaks/${managerId}`, { method: "PUT", body: JSON.stringify({ date: currentDate, breaks: updated }) }, token, navigate);
        showToast(`${BREAK_LABELS[breakType]} updated`);
        refreshData();
      } catch (err) {
        showToast("Error: " + err.message);
      }
    },
    [breaksData, managerId, currentDate, token, navigate, showToast, refreshData]
  );

  const openEditModal = useCallback(
    (empId) => {
      const emp = employeesList.find((e) => e.id === empId);
      if (!emp) return;
      setCurrentEditEmployeeId(empId);
      const empBreaks = breaksData.find((b) => b.id === empId) || { break1: {}, lunch: {}, break2: {}, break3: {} };
      setEditModal({ open: true, empId, empName: emp.name, breaks: empBreaks });
    },
    [employeesList, breaksData]
  );

  const closeModal = useCallback(() => {
    setEditModal({ open: false, empId: null, empName: "", breaks: { break1: {}, lunch: {}, break2: {}, break3: {} } });
    setCurrentEditEmployeeId(null);
  }, []);

  const updateEditField = useCallback((breakType, field, value) => {
    setEditModal((prev) => ({
      ...prev,
      breaks: { ...prev.breaks, [breakType]: { ...prev.breaks[breakType], [field]: value } },
    }));
  }, []);

  const saveModalChanges = useCallback(async () => {
    if (!currentEditEmployeeId) return;
    const newBreaks = {
      break1: { start: editModal.breaks.break1?.start || "", end: editModal.breaks.break1?.end || "" },
      lunch: { start: editModal.breaks.lunch?.start || "", end: editModal.breaks.lunch?.end || "" },
      break2: { start: editModal.breaks.break2?.start || "", end: editModal.breaks.break2?.end || "" },
      break3: { start: editModal.breaks.break3?.start || "", end: editModal.breaks.break3?.end || "" },
    };
    try {
      await authFetch(`/breaks/${currentEditEmployeeId}`, { method: "PUT", body: JSON.stringify({ date: currentDate, breaks: newBreaks }) }, token, navigate);
      showToast(`✅ Breaks saved for ${currentDate}`);
      closeModal();
      refreshData();
    } catch (err) {
      showToast("Update failed: " + err.message);
    }
  }, [currentEditEmployeeId, editModal.breaks, currentDate, token, navigate, showToast, closeModal, refreshData]);

  const loadPersonalHistory = useCallback(async () => {
    if (!historyFrom || !historyTo) {
      showToast("Select both dates");
      return;
    }
    setHistoryLoading(true);
    try {
      const records = await authFetch(`/breaks/employee/${managerId}?start=${historyFrom}&end=${historyTo}`, {}, token, navigate);
      const grouped = new Map();
      for (const rec of records) {
        const date = rec.date;
        if (!grouped.has(date)) grouped.set(date, { break1: null, lunch: null, break2: null, break3: null });
        const dayMap = grouped.get(date);
        dayMap[rec.break_type] = {
          start: rec.start_time ? formatTimeDisplay(rec.start_time) : "",
          end: rec.end_time ? formatTimeDisplay(rec.end_time) : "",
          duration: rec.duration_minutes || 0,
        };
      }
      const sortedDates = Array.from(grouped.keys()).sort((a, b) => new Date(b) - new Date(a));
      if (!sortedDates.length) {
        setHistoryRows([]);
        setSummaryStat({ days: 0, avg: 0, highest: 0, exceeded: 0 });
        return;
      }

      let totalMinutesAll = 0;
      let maxDaily = 0;
      let exceededCount = 0;
      const dailyTotals = [];
      const rows = [];

      for (const date of sortedDates) {
        const b = grouped.get(date);
        const getCombined = (type) => {
          const item = b[type];
          if (!item || (!item.start && !item.end)) return <span className="time-slot">—</span>;
          const start = item.start || "—";
          const end = item.end || "—";
          return (
            <span className="time-slot">
              {start} → {end}
            </span>
          );
        };

        const break1Jsx = getCombined("break1");
        const lunchJsx = getCombined("lunch");
        const break2Jsx = getCombined("break2");
        const break3Jsx = getCombined("break3");

        const dur = (t) => {
          const d = b[t]?.duration || 0;
          return d;
        };
        const total = dur("break1") + dur("lunch") + dur("break2") + dur("break3");
        totalMinutesAll += total;
        dailyTotals.push(total);
        if (total > maxDaily) maxDaily = total;
        if (total > MAX_BREAK_MINUTES) exceededCount++;

        const remaining = Math.max(0, MAX_BREAK_MINUTES - total);
        let statusClass = "status-ok";
        let statusText = "OK";
        let remClass = "remaining-good";
        if (total >= MAX_BREAK_MINUTES) {
          statusClass = "status-exceed";
          statusText = "Exceeded";
          remClass = "remaining-bad";
        } else if (total >= 45) {
          statusClass = "status-warning";
          statusText = "Warning";
          remClass = "remaining-warn";
        }

        const dayName = new Date(date).toLocaleDateString("en-US", { weekday: "short" });
        const formattedDate = new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" });

        rows.push({
          formattedDate,
          dayName,
          break1Jsx,
          lunchJsx,
          break2Jsx,
          break3Jsx,
          total,
          remaining,
          remClass,
          statusClass,
          statusText,
        });
      }

      setHistoryRows(rows);
      const avgVal = dailyTotals.length ? Math.round(totalMinutesAll / dailyTotals.length) : 0;
      setSummaryStat({ days: dailyTotals.length, avg: avgVal, highest: maxDaily, exceeded: exceededCount });
    } catch (err) {
      showToast("Failed to load history");
    } finally {
      setHistoryLoading(false);
    }
  }, [historyFrom, historyTo, managerId, token, navigate, showToast]);

  const toggleHistoryPanel = useCallback(async () => {
    const newState = !historyPanelOpen;
    setHistoryPanelOpen(newState);
    if (newState) {
      await loadPersonalHistory();
    }
  }, [historyPanelOpen, loadPersonalHistory]);

  const setThisWeek = useCallback(() => {
    const now = new Date();
    const first = new Date(now);
    first.setDate(now.getDate() - now.getDay());
    setHistoryFrom(first.toISOString().slice(0, 10));
    setHistoryTo(now.toISOString().slice(0, 10));
    loadPersonalHistory();
  }, [loadPersonalHistory]);

  const setThisMonth = useCallback(() => {
    const now = new Date();
    const firstMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    setHistoryFrom(firstMonth.toISOString().slice(0, 10));
    setHistoryTo(now.toISOString().slice(0, 10));
    loadPersonalHistory();
  }, [loadPersonalHistory]);

  const formatBreakCell = (b) => {
    if (!b?.start && !b?.end) return <span style={{ color: "#6b6b6b" }}>—</span>;
    return (
      <span className="break-time-cell">
        {b.start || "—"} → {b.end || "—"}
      </span>
    );
  };

  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    if (!storedToken) {
      navigate("/login");
      return;
    }
    setToken(storedToken);

    const decoded = parseJwt(storedToken);
    if (!decoded || decoded.role !== "MANAGER") {
      navigate("/login");
      return;
    }

    setManagerBranch(decoded.branch);
    setManagerId(decoded.id);
    setManagerName(decoded.full_name || "Manager");

    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    setHistoryFrom(firstDay.toISOString().slice(0, 10));
    setHistoryTo(today.toISOString().slice(0, 10));
  }, [navigate]);

  useEffect(() => {
    if (managerBranch && currentDate) {
      refreshData();
    }
  }, [managerBranch, currentDate, refreshData]);

  const avgBreakUsed = employeesList.length
    ? Math.round(
        employeesList.reduce((sum, emp) => {
          const empBreaks = breaksData.find((b) => b.id === emp.id) || { break1: {}, lunch: {}, break2: {}, break3: {} };
          return sum + getTotalBreakMinutes(empBreaks);
        }, 0) / employeesList.length
      )
    : 0;

  const exceedingCount = employeesList.filter((emp) => {
    const empBreaks = breaksData.find((b) => b.id === emp.id) || { break1: {}, lunch: {}, break2: {}, break3: {} };
    return getTotalBreakMinutes(empBreaks) > MAX_BREAK_MINUTES;
  }).length;

  return (
    <>
      <main className="main-content">
        <div className="page-header">
          <div className="title">
            <h1>
              <i className="fas fa-coffee"></i> Employee Breaks Tracker
            </h1>
            <p>
              Real-time breaks · {managerBranch} · edit & save
            </p>
          </div>
          <div className="branch-pill">
            <i className="fas fa-store"></i> {managerBranch}
          </div>
        </div>

        <div className="controls">
          <div className="date-picker-wrapper">
            <i className="fas fa-calendar-alt"></i>
            <input type="date" value={currentDate} onChange={(e) => setCurrentDate(e.target.value)} />
          </div>
        </div>

        <div className="my-break-card">
          <div className="my-break-title">
            <i className="fas fa-user-tie"></i> My Break Status (Manager)
          </div>
          <div className="break-buttons">
            {["break1", "lunch", "break2", "break3"].map((bt) => {
              const b = managerBreaks[bt] || {};
              const active = b.start && !b.end;
              const done = b.start && b.end;
              return (
                <button
                  key={bt}
                  className={`break-action-btn ${active ? "active" : ""}`}
                  onClick={() => handleBreakButtonClick(bt)}
                >
                  {BREAK_LABELS[bt]}
                  {active ? " (ongoing)" : done ? " (done)" : ""}
                </button>
              );
            })}
          </div>
          <div style={{ marginTop: "12px", fontSize: "0.8rem", color: "#64748B" }}>
            Click a break button to start/stop. Total used today: <span>{getTotalBreakMinutes(managerBreaks)}</span> min (max 60 min)
          </div>
        </div>

        <div className="my-history-btn-wrapper">
          <button className="premium-history-btn" onClick={toggleHistoryPanel}>
            <i className={`fas ${historyPanelOpen ? "fa-eye-slash" : "fa-history"}`}></i>
            {historyPanelOpen ? " Hide My Break History" : " My Break History"}
          </button>
        </div>

        {historyPanelOpen && (
          <div className="history-panel active">
            <div className="controls" style={{ marginBottom: "20px" }}>
              <div className="range-picker">
                <i className="fas fa-calendar-week"></i>
                <input type="date" value={historyFrom} onChange={(e) => setHistoryFrom(e.target.value)} />
                <span>to</span>
                <input type="date" value={historyTo} onChange={(e) => setHistoryTo(e.target.value)} />
                <button className="edit-btn" onClick={loadPersonalHistory}>
                  <i className="fas fa-sync-alt"></i> Load
                </button>
              </div>
              <button className="edit-btn" onClick={setThisWeek}>
                <i className="fas fa-calendar-week"></i> This Week
              </button>
              <button className="edit-btn" onClick={setThisMonth}>
                <i className="fas fa-calendar-alt"></i> This Month
              </button>
            </div>

            <div className="summary-cards">
              <div className="summary-card">
                <div className="label">Days Tracked</div>
                <div className="value">{summaryStat.days}</div>
              </div>
              <div className="summary-card">
                <div className="label">Avg Break (min)</div>
                <div className="value">{summaryStat.avg}</div>
              </div>
              <div className="summary-card">
                <div className="label">Highest Usage</div>
                <div className="value">
                  {summaryStat.highest}m
                </div>
              </div>
              <div className="summary-card">
                <div className="label">Exceeded Days</div>
                <div className="value">{summaryStat.exceeded}</div>
              </div>
            </div>

            <div className="table-wrapper" style={{ marginBottom: 0 }}>
              <table className="history-premium-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Day</th>
                    <th>Break 1</th>
                    <th>Lunch</th>
                    <th>Break 2</th>
                    <th>Break 3</th>
                    <th>Total (min)</th>
                    <th>Remaining</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {historyLoading ? (
                    <tr>
                      <td colSpan="9" style={{ textAlign: "center", padding: "40px" }}>
                        <div className="spinner"></div>
                      </td>
                    </tr>
                  ) : historyRows.length === 0 ? (
                    <tr>
                      <td colSpan="9" style={{ textAlign: "center", padding: "40px" }}>
                        Click "Load History" or use quick filters
                      </td>
                    </tr>
                  ) : (
                    historyRows.map((row, i) => (
                      <tr key={i}>
                        <td>
                          <span className="date-pill">{row.formattedDate}</span>
                        </td>
                        <td>{row.dayName}</td>
                        <td>{row.break1Jsx}</td>
                        <td>{row.lunchJsx}</td>
                        <td>{row.break2Jsx}</td>
                        <td>{row.break3Jsx}</td>
                        <td>
                          <strong>{row.total}m</strong>
                        </td>
                        <td>
                          <span className={`remaining-pill ${row.remClass}`}>
                            {row.remaining}m
                          </span>
                        </td>
                        <td>
                          <span className={`status-badge ${row.statusClass}`}>{row.statusText}</span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="stats-row">
          <div className="stat-card">
            <div className="stat-label">Total Employees</div>
            <div className="stat-number">{employeesList.length}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Avg Break Used (min)</div>
            <div className="stat-number">{avgBreakUsed}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Exceeding Limit (60 min)</div>
            <div className="stat-number">{exceedingCount}</div>
          </div>
        </div>

        <div className="table-wrapper">
          <table className="breaks-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Department</th>
                <th>Break 1</th>
                <th>Lunch</th>
                <th>Break 2</th>
                <th>Break 3</th>
                <th>Total (min)</th>
                <th>Remaining</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="9">
                    <div className="spinner"></div> Loading...
                  </td>
                </tr>
              ) : employeesList.length === 0 ? (
                <tr>
                  <td colSpan="9">No employees found</td>
                </tr>
              ) : (
                employeesList.map((emp) => {
                  const eb = breaksData.find((b) => b.id === emp.id) || { break1: {}, lunch: {}, break2: {}, break3: {} };
                  const totalUsed = getTotalBreakMinutes(eb);
                  const remaining = Math.max(0, MAX_BREAK_MINUTES - totalUsed);
                  const remClass = remaining <= 0 ? "remaining-badge danger" : remaining <= 15 ? "remaining-badge warning" : "remaining-badge";
                  return (
                    <tr key={emp.id}>
                      <td>
                        <i className="fas fa-user-circle"></i> {emp.name}
                      </td>
                      <td>{emp.department}</td>
                      <td>{formatBreakCell(eb.break1)}</td>
                      <td>{formatBreakCell(eb.lunch)}</td>
                      <td>{formatBreakCell(eb.break2)}</td>
                      <td>{formatBreakCell(eb.break3)}</td>
                      <td>{totalUsed}</td>
                      <td>
                        <span className={remClass}>{remaining}</span>
                      </td>
                      <td>
                        <button className="edit-btn" onClick={() => openEditModal(emp.id)}>
                          <i className="fas fa-pencil-alt"></i> Edit
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </main>

      {editModal.open && (
        <div className="modal" style={{ display: "flex" }} onClick={(e) => { if (e.target.className.includes("modal")) closeModal(); }}>
          <div className="modal-content">
            <h3>
              Edit Breaks - {editModal.empName} · {currentDate}
            </h3>
            {["break1", "lunch", "break2", "break3"].map((bt) => (
              <div className="form-group" key={bt}>
                <label>{BREAK_LABELS[bt]}</label>
                <div className="time-row">
                  <input
                    type="text"
                    placeholder="H:MM AM"
                    value={editModal.breaks[bt]?.start || ""}
                    onChange={(e) => updateEditField(bt, "start", e.target.value)}
                  />
                  <span>→</span>
                  <input
                    type="text"
                    placeholder="H:MM PM"
                    value={editModal.breaks[bt]?.end || ""}
                    onChange={(e) => updateEditField(bt, "end", e.target.value)}
                  />
                </div>
              </div>
            ))}
            <div className="modal-actions">
              <button className="modal-btn cancel" onClick={closeModal}>
                Cancel
              </button>
              <button className="modal-btn" onClick={saveModalChanges}>
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={`toast ${toast.visible ? "show" : ""}`}>{toast.msg}</div>
    </>
  );
}
