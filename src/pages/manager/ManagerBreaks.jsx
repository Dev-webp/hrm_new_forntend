import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/ManagerBreaks.css";

const MAX_BREAK_MINUTES = 60;
const MAX_DAILY_BREAK_SESSIONS = 6;
const STANDARD_BREAK_TYPES = ["break1", "lunch", "break2", "break3"];
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

function getStandardBreakMinutes(breaks = {}) {
  return STANDARD_BREAK_TYPES
    .filter((type) => type !== "break3")
    .reduce((sum, type) => sum + getBreakDuration(breaks[type] || {}), 0);
}

function getBreak3Minutes(breaks = {}) {
  return getVisibleBreak3Sessions(breaks).reduce(
    (sum, item) => sum + (Number(item.duration_minutes ?? item.duration) || getBreakDuration(item)),
    0
  );
}

function getTotalBreakMinutes(breaks) {
  return getStandardBreakMinutes(breaks) + getBreak3Minutes(breaks);
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

export default function ManagerBreaks() {
  const navigate = useNavigate();
  const [token, setToken] = useState("");
  const [managerBranch, setManagerBranch] = useState("");
  const [isOperationalManager, setIsOperationalManager] = useState(false);
  const [managerId, setManagerId] = useState(null);
  const [managerName, setManagerName] = useState("");
  const [currentDate, setCurrentDate] = useState(new Date().toISOString().slice(0, 10));
  const [employeesList, setEmployeesList] = useState([]);
  const [breaksData, setBreaksData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState({ msg: "", visible: false });
  const [editModal, setEditModal] = useState({ open: false, empId: null, empName: "", department: "", breaks: { break1: {}, lunch: {}, break2: {}, break3: {}, break3Sessions: [] } });
  const [historyPanelOpen, setHistoryPanelOpen] = useState(false);
  const [historyFrom, setHistoryFrom] = useState("");
  const [historyTo, setHistoryTo] = useState("");
  const [historyRows, setHistoryRows] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [summaryStat, setSummaryStat] = useState({ days: 0, avg: 0, highest: 0, exceeded: 0 });
  const [managerBreaks, setManagerBreaks] = useState({ break1: {}, lunch: {}, break2: {}, break3: {} });
  const [myBreaksOpen, setMyBreaksOpen] = useState(false);
  const [currentEditEmployeeId, setCurrentEditEmployeeId] = useState(null);
  const [editReason, setEditReason] = useState("");

  const showToast = useCallback((msg, dur = 2500) => {
    setToast({ msg, visible: true });
    setTimeout(() => setToast({ msg: "", visible: false }), dur);
  }, []);

  const refreshData = useCallback(async () => {
    setIsLoading(true);
    try {
      const employees = await authFetch(
        `/admin/employees?branch=${encodeURIComponent(managerBranch || "all")}`,
        {},
        token,
        navigate
      );
      const filteredEmployees = employees
        .filter((emp) => managerBranch === "all" || emp.branch === managerBranch)
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
      const current = breaksData.find((b) => b.id === managerId) || managerBreaks || { break1: {}, lunch: {}, break2: {}, break3: {}, break3Sessions: [] };
      const activeStandard = ["break1", "lunch", "break2"].find((type) => current[type]?.start && !current[type]?.end);
      const activeBreak3 = getBreak3Sessions(current).some((item) => item.start && !item.end);
      let newStart = current[breakType]?.start;
      let newEnd = current[breakType]?.end;

      if (!newStart) {
        if ((activeStandard && activeStandard !== breakType) || activeBreak3) {
          showToast("End the current break before starting another");
          return;
        }
        if (getTotalBreakMinutes(current) >= MAX_BREAK_MINUTES) {
          showToast("Daily break limit reached");
          return;
        }
        if (getTotalBreakSessions(current) >= MAX_DAILY_BREAK_SESSIONS) {
          showToast("Daily break session limit reached");
          return;
        }
        newStart = getCurrentTimeAMPM();
        newEnd = "";
      } else if (newStart && !newEnd) {
        newEnd = getCurrentTimeAMPM();
      } else {
        showToast("Break already completed for today");
        return;
      }

      const updated = {
        break1: { ...current.break1 },
        lunch: { ...current.lunch },
        break2: { ...current.break2 },
        break3: { ...current.break3 },
        break3Sessions: getBreak3Sessions(current),
      };
      updated[breakType] = { start: newStart, end: newEnd };

      try {
        setManagerBreaks(updated);
        await authFetch(`/breaks/${managerId}`, {
          method: "PUT",
          body: JSON.stringify({ date: currentDate, breaks: updated, reason: "Manager self break update" }),
        }, token, navigate);
        showToast(newEnd ? "Break ended" : "Break started");
        refreshData();
      } catch (err) {
        showToast("Error: " + err.message);
        refreshData();
      }
    },
    [breaksData, managerBreaks, managerId, currentDate, token, navigate, showToast, refreshData]
  );

  const handleBreak3ButtonClick = useCallback(async () => {
    const current = breaksData.find((b) => b.id === managerId) || managerBreaks || { break1: {}, lunch: {}, break2: {}, break3: {}, break3Sessions: [] };
    const sessions = getBreak3Sessions(current).map((item, index) => ({ ...item, number: item.number || index + 1 }));
    const activeIndex = sessions.findIndex((item) => item.start && !item.end);
    const activeStandard = ["break1", "lunch", "break2"].find((type) => current[type]?.start && !current[type]?.end);

    if (activeIndex >= 0) {
      sessions[activeIndex] = { ...sessions[activeIndex], end: getCurrentTimeAMPM() };
    } else {
      if (activeStandard) {
        showToast("End the current break before starting another");
        return;
      }
      if (getTotalBreakMinutes(current) >= MAX_BREAK_MINUTES) {
        showToast("Daily break limit reached");
        return;
      }
      if (getTotalBreakSessions(current) >= MAX_DAILY_BREAK_SESSIONS) {
        showToast("Daily break session limit reached");
        return;
      }
      sessions.push({ start: getCurrentTimeAMPM(), end: "", number: sessions.length + 1 });
    }

    const completed = sessions.filter((item) => item.start && item.end);
    const active = sessions.find((item) => item.start && !item.end);
    const break3Total = sessions.reduce((sum, item) => sum + getBreakDuration(item), 0);
    const updated = {
      break1: { ...current.break1 },
      lunch: { ...current.lunch },
      break2: { ...current.break2 },
      break3: {
        start: sessions[0]?.start || "",
        end: active ? "" : completed.at(-1)?.end || "",
        duration_minutes: break3Total,
      },
      break3Sessions: sessions,
    };

    try {
      setManagerBreaks(updated);
      await authFetch(`/breaks/${managerId}`, {
        method: "PUT",
        body: JSON.stringify({ date: currentDate, breaks: updated, reason: "Manager self break update" }),
      }, token, navigate);
      showToast(activeIndex >= 0 ? "Break 3 ended" : "Break 3 started");
      refreshData();
    } catch (err) {
      showToast("Error: " + err.message);
      refreshData();
    }
  }, [breaksData, managerBreaks, managerId, currentDate, token, navigate, showToast, refreshData]);

  const openEditModal = useCallback(
    (empId) => {
      const emp = employeesList.find((e) => e.id === empId);
      if (!emp) return;
      setCurrentEditEmployeeId(empId);
      const empBreaks = breaksData.find((b) => b.id === empId) || { break1: {}, lunch: {}, break2: {}, break3: {}, break3Sessions: [] };
      setEditModal({ open: true, empId, empName: emp.name, department: emp.department, breaks: normalizeBreaksForEdit(empBreaks) });
      setEditReason("");
    },
    [employeesList, breaksData]
  );

  const closeModal = useCallback(() => {
    setEditModal({ open: false, empId: null, empName: "", department: "", breaks: { break1: {}, lunch: {}, break2: {}, break3: {}, break3Sessions: [] } });
    setCurrentEditEmployeeId(null);
    setEditReason("");
  }, []);

  const updateEditField = useCallback((breakType, field, value) => {
    setEditModal((prev) => ({
      ...prev,
      breaks: { ...prev.breaks, [breakType]: { ...prev.breaks[breakType], [field]: value } },
    }));
  }, []);

  const updateBreak3SessionField = useCallback((index, field, value) => {
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
  }, []);

  const saveModalChanges = useCallback(async () => {
    if (!currentEditEmployeeId) return;
    if (editReason.trim().length < 5) {
      showToast("Enter a reason of at least 5 characters");
      return;
    }
    const totalSessions = getTotalBreakSessions(editModal.breaks);
    if (totalSessions > MAX_DAILY_BREAK_SESSIONS) {
      showToast("Maximum 6 total break sessions are allowed per day");
      return;
    }
    const newBreaks = {
      break1: { start: editModal.breaks.break1?.start || "", end: editModal.breaks.break1?.end || "" },
      lunch: { start: editModal.breaks.lunch?.start || "", end: editModal.breaks.lunch?.end || "" },
      break2: { start: editModal.breaks.break2?.start || "", end: editModal.breaks.break2?.end || "" },
      break3: { start: editModal.breaks.break3?.start || "", end: editModal.breaks.break3?.end || "" },
      break3Sessions: editModal.breaks.break3Sessions || [],
    };
    try {
      const result = await authFetch(`/breaks/${currentEditEmployeeId}`, { method: "PUT", body: JSON.stringify({ date: currentDate, breaks: newBreaks, reason: editReason.trim() }) }, token, navigate);
      showToast(`✅ Breaks saved for ${currentDate}`);
      if (result?.break_exceeded) {
        showToast(result.warning || "Break limit exceeded. Attendance marked as Half Day.");
      }
      closeModal();
      refreshData();
    } catch (err) {
      showToast("Update failed: " + err.message);
    }
  }, [currentEditEmployeeId, editModal.breaks, editReason, currentDate, token, navigate, showToast, closeModal, refreshData]);

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
        if (!grouped.has(date)) grouped.set(date, { break1: null, lunch: null, break2: null, break3: null, break3Sessions: [] });
        const dayMap = grouped.get(date);
        const breakEntry = {
          start: rec.start_time ? formatTimeDisplay(rec.start_time) : "",
          end: rec.end_time ? formatTimeDisplay(rec.end_time) : "",
          duration: rec.duration_minutes || 0,
        };
        dayMap[rec.break_type] = breakEntry;
        if (rec.break_type === "break3") {
          dayMap.break3Sessions = Array.isArray(rec.break3_sessions) && rec.break3_sessions.length
            ? rec.break3_sessions
            : breakEntry.start || breakEntry.end
              ? [breakEntry]
              : [];
        }
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
        const standardTotal = dur("break1") + dur("lunch") + dur("break2");
        const break3Total = getVisibleBreak3Sessions(b).reduce((sum, item) => sum + (item.duration || getBreakDuration(item)), 0);
        const total = standardTotal + break3Total;
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
          standardTotal,
          break3Total,
          break3Count: getVisibleBreak3Sessions(b).length,
          break3History: getVisibleBreak3Sessions(b).map((item, index) => `S${index + 1}: ${item.start || "--"} - ${item.end || "Active"}`).join(", ") || "—",
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
    if (!decoded || !["MANAGER", "OPERATIONAL_MANAGER", "SUB_ADMIN"].includes(decoded.role)) {
      navigate("/login");
      return;
    }

    const operational = decoded.role === "OPERATIONAL_MANAGER";
    setIsOperationalManager(operational);
    setManagerBranch(operational ? "all" : decoded.branch);
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
  const managerBreak3Sessions = getBreak3Sessions(managerBreaks);
  const managerActiveStandard = ["break1", "lunch", "break2"].find((bt) => managerBreaks[bt]?.start && !managerBreaks[bt]?.end);
  const managerActiveBreak3Index = managerBreak3Sessions.findIndex((item) => item.start && !item.end);
  const managerHasActiveBreak = Boolean(managerActiveStandard) || managerActiveBreak3Index >= 0;
  const managerTotalUsed = getTotalBreakMinutes(managerBreaks);
  const managerRemaining = Math.max(0, MAX_BREAK_MINUTES - managerTotalUsed);
  const managerTotalSessions = getTotalBreakSessions(managerBreaks);

  return (
    <>
      <main className="main-content manager-portal-page manager-breaks-page">
        <div className="page-header">
          <div className="title">
            <h1>
              <i className="fas fa-coffee"></i> Employee Breaks Tracker
            </h1>
            <p>
              Real-time breaks · {managerBranch} · edit & save
            </p>
          </div>
          {isOperationalManager ? (
            <label className="branch-pill">
              <i className="fas fa-store"></i>
              <select value={managerBranch} onChange={(e) => setManagerBranch(e.target.value)}>
                <option value="all">All Branches</option>
                <option value="Hyderabad">Hyderabad</option>
                <option value="Bangalore">Bangalore</option>
              </select>
            </label>
          ) : (
            <div className="branch-pill">
              <i className="fas fa-store"></i> {managerBranch}
            </div>
          )}
        </div>

        <div className="controls">
          <div className="date-picker-wrapper">
            <i className="fas fa-calendar-alt"></i>
            <input type="date" value={currentDate} onChange={(e) => setCurrentDate(e.target.value)} />
          </div>
          <button type="button" className="my-breaks-trigger" onClick={() => setMyBreaksOpen(true)}>
            <i className="fas fa-mug-hot"></i> My Breaks
          </button>
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
                    <th>Break 3 Summary</th>
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
                        <td>
                          <div className="break3-summary-cell">
                            <strong>Break 3</strong>
                            <span>{row.break3Total ? `${row.break3Total}m` : "—"}</span>
                            <em>{row.break3Count} sessions</em>
                          </div>
                        </td>
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
                <th>Break 3 Summary</th>
                <th>Total (min)</th>
                <th>Remaining</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="10">
                    <div className="spinner"></div> Loading...
                  </td>
                </tr>
              ) : employeesList.length === 0 ? (
                <tr>
                  <td colSpan="10">No employees found</td>
                </tr>
              ) : (
                employeesList.map((emp) => {
                  const eb = breaksData.find((b) => b.id === emp.id) || { break1: {}, lunch: {}, break2: {}, break3: {} };
                  const break3Used = getBreak3Minutes(eb);
                  const break3Count = getVisibleBreak3Sessions(eb).length;
                  const break3History = getVisibleBreak3Sessions(eb)
                    .join(", ") || "—";
                  const totalUsed = getTotalBreakMinutes(eb);
                  const remaining = Math.max(0, MAX_BREAK_MINUTES - totalUsed);
                  const remClass = remaining <= 0 ? "remaining-badge danger" : remaining <= 15 ? "remaining-badge warning" : "remaining-badge";
                  const statusText = totalUsed > MAX_BREAK_MINUTES ? "Exceeded" : "Within limit";
                  return (
                    <tr key={emp.id}>
                      <td>
                        <i className="fas fa-user-circle"></i> {emp.name}
                      </td>
                      <td>{emp.department}</td>
                      <td>{formatBreakCell(eb.break1)}</td>
                      <td>{formatBreakCell(eb.lunch)}</td>
                      <td>{formatBreakCell(eb.break2)}</td>
                      <td>
                        <div className="break3-summary-cell">
                          <strong>Break 3</strong>
                          <span>{break3Used ? `${break3Used} min` : "—"}</span>
                          <em>{break3Count} sessions</em>
                        </div>
                      </td>
                      <td>{totalUsed}</td>
                      <td>
                        <span className={remClass}>{remaining}</span>
                      </td>
                      <td>{statusText}</td>
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
            <div className="break-detail-summary">
              <div><span>Employee</span><strong>{editModal.empName || "-"}</strong></div>
              <div><span>Department</span><strong>{editModal.department || "-"}</strong></div>
              <div><span>Date</span><strong>{currentDate}</strong></div>
              <div><span>Daily Limit</span><strong>{MAX_BREAK_MINUTES} min</strong></div>
              <div><span>Total Used</span><strong>{modalTotalUsed} min</strong></div>
              <div><span>Remaining</span><strong>{modalRemaining} min</strong></div>
              <div><span>Total Sessions</span><strong>{modalTotalSessions} / {MAX_DAILY_BREAK_SESSIONS}</strong></div>
            </div>
            <div className="modal-section-title">Standard Breaks</div>
            {["break1", "lunch", "break2"].map((bt) => (
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
            <div className="modal-section-title">Break 3 Sessions</div>
            <div className="break3-session-editor">
              {modalBreak3Rows.map((session, index) => (
                <div className="break3-edit-row" key={`manager-b3-${index}`}>
                  <span>Session {index + 1}</span>
                  <input
                    type="text"
                    placeholder="Start"
                    value={session.start || ""}
                    onChange={(e) => updateBreak3SessionField(index, "start", e.target.value)}
                  />
                  <input
                    type="text"
                    placeholder="End"
                    value={session.end || ""}
                    onChange={(e) => updateBreak3SessionField(index, "end", e.target.value)}
                  />
                  <em>{getBreakDuration(session)} min</em>
                </div>
              ))}
            </div>
            <div className="form-group">
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
            </div>
            <div className="modal-actions">
              <button className="modal-btn cancel" onClick={closeModal}>
                Cancel
              </button>
              <button className="modal-btn" onClick={saveModalChanges} disabled={editReason.trim().length < 5}>
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {myBreaksOpen && (
        <div className="modal" style={{ display: "flex" }} onClick={(e) => { if (e.target.className.includes("modal")) setMyBreaksOpen(false); }}>
          <div className="modal-content my-breaks-modal">
            <div className="my-breaks-modal-header">
              <div>
                <h3><i className="fas fa-user-tie"></i> My Breaks</h3>
                <p>{managerName} · {currentDate}</p>
              </div>
              <button type="button" className="modal-close-btn" onClick={() => setMyBreaksOpen(false)} aria-label="Close my breaks">
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="manager-break-usage">
              <div><span>Used</span><strong>{managerTotalUsed} min</strong></div>
              <div><span>Remaining</span><strong>{managerRemaining} min</strong></div>
              <div><span>Sessions</span><strong>{managerTotalSessions} / {MAX_DAILY_BREAK_SESSIONS}</strong></div>
            </div>

            <div className="manager-my-break-grid">
              {["break1", "lunch", "break2"].map((bt) => {
                const b = managerBreaks[bt] || {};
                const active = b.start && !b.end;
                const done = b.start && b.end;
                const disabled = !active && (managerHasActiveBreak || managerRemaining <= 0 || managerTotalSessions >= MAX_DAILY_BREAK_SESSIONS || done);
                return (
                  <section className={`manager-my-break-card ${active ? "active" : ""} ${done ? "done" : ""}`} key={bt}>
                    <div className="manager-my-break-card-head">
                      <strong>{BREAK_LABELS[bt]}</strong>
                      <span>{getBreakDuration(b) || "—"} min</span>
                    </div>
                    <div className="manager-my-break-times">
                      <div><span>Start</span><strong>{b.start || "—"}</strong></div>
                      <div><span>End</span><strong>{b.end || "—"}</strong></div>
                    </div>
                    <button
                      type="button"
                      className={`break-action-btn ${active ? "active" : ""}`}
                      onClick={() => handleBreakButtonClick(bt)}
                      disabled={disabled}
                    >
                      <i className={`fas ${active ? "fa-stop" : done ? "fa-check" : "fa-play"}`}></i>
                      {active ? "End Break" : done ? "Completed" : "Start Break"}
                    </button>
                  </section>
                );
              })}

              <section className={`manager-my-break-card ${managerActiveBreak3Index >= 0 ? "active" : ""}`}>
                <div className="manager-my-break-card-head">
                  <strong>{BREAK_LABELS.break3}</strong>
                  <span>{getBreak3Minutes(managerBreaks) || "—"} min</span>
                </div>
                <div className="manager-my-break-times">
                  <div><span>Sessions</span><strong>{managerBreak3Sessions.length || "—"}</strong></div>
                  <div><span>Status</span><strong>{managerActiveBreak3Index >= 0 ? "Active" : "Ready"}</strong></div>
                </div>
                <button
                  type="button"
                  className={`break-action-btn ${managerActiveBreak3Index >= 0 ? "active" : ""}`}
                  onClick={handleBreak3ButtonClick}
                  disabled={managerActiveBreak3Index < 0 && (managerHasActiveBreak || managerRemaining <= 0 || managerTotalSessions >= MAX_DAILY_BREAK_SESSIONS)}
                >
                  <i className={`fas ${managerActiveBreak3Index >= 0 ? "fa-stop" : "fa-play"}`}></i>
                  {managerActiveBreak3Index >= 0 ? "End Break 3" : "Start Break 3"}
                </button>
                <div className="manager-break3-sessions">
                  {managerBreak3Sessions.length ? managerBreak3Sessions.map((item, index) => (
                    <div key={`${item.start}-${index}`}>
                      <span>Session {index + 1}</span>
                      <strong>{item.start || "--"} - {item.end || (item.start ? "Active" : "--")}</strong>
                      <em>{getBreakDuration(item)} min</em>
                    </div>
                  )) : <p>No Break 3 sessions used today</p>}
                </div>
              </section>
            </div>
          </div>
        </div>
      )}

      <div className={`toast ${toast.visible ? "show" : ""}`}>{toast.msg}</div>
    </>
  );
}
