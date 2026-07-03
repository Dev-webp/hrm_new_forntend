import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import EmployeeSidebar from "../../components/EmployeeSidebar";
import { useEmployeeApi } from "../../hooks/useEmployeeApi";
import {
  escapeHtml,
  formatTime12,
  MONTH_NAMES,
  normalizeArray,
  WEEK_DAYS,
} from "./employeeUtils";
import {
  formatLateLoginCount,
  getLateLoginStatusClass,
} from "../../utils/attendanceHelpers";
import "../../styles/EmployeeAttendance.css";

function getStatusBadgeClass(status, lateMins) {
  if (status === "in_progress" || status === "working") return "badge-working";
  if (status === "full_day") return "badge-present";
  if (status === "present") return "badge-present";
  if (status === "half_day") return "badge-halfday";
  if (status === "leave") return "badge-leave";
  if (status === "holiday") return "badge-leave";
  if (lateMins > 0 && status !== "absent") return "badge-late";
  return "badge-absent";
}

function getStatusText(status, lateMins) {
  if (status === "in_progress" || status === "working") return "Working";
  if (status === "full_day") return "Present";
  if (status === "present") return "Present";
  if (status === "half_day") return "Half Day";
  if (status === "leave") return "On Leave";
  if (status === "holiday") return "Holiday";
  if (lateMins > 0 && status !== "absent") return `Late (${lateMins}m)`;
  if (status === "absent") return "Absent";
  return status || "—";
}

function getLateUsageTone(count) {
  if (count >= 3) return "warning";
  return "good";
}

function getLateUsageText(count) {
  if (count >= 3) return "Monthly Warning";
  return "Within Limit";
}

function getMonthlyLateStatus(count) {
  return getLateUsageText(count);
}

function isPaidLeaveDay(rec = {}) {
  const safe = rec || {};
  const status = String(safe.status || safe.day_status || "").toLowerCase();
  const leaveType = String(safe.leave_type || safe.leaveType || safe.leave_category || safe.leaveCategory || "").toLowerCase();
  return (
    safe.is_paid_leave === true ||
    safe.isPaidLeave === true ||
    status === "paid_leave" ||
    leaveType === "paid" ||
    Number(safe.paid_days || safe.paidDays || 0) > 0
  );
}

function isUnpaidLeaveDay(rec = {}) {
  const safe = rec || {};
  const status = String(safe.status || safe.day_status || "").toLowerCase();
  const leaveType = String(safe.leave_type || safe.leaveType || safe.leave_category || safe.leaveCategory || "").toLowerCase();
  return (
    safe.is_paid_leave === false ||
    safe.isPaidLeave === false ||
    status === "unpaid_leave" ||
    leaveType === "unpaid" ||
    Number(safe.unpaid_days || safe.unpaidDays || 0) > 0
  );
}

function isGraceLateLogin(rec = {}) {
  const raw = rec.check_in_time || rec.office_in || rec.checkIn;
  if (!raw) return false;
  const [h, m] = String(raw).slice(0, 5).split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return false;
  const minutes = h * 60 + m;
  return minutes >= 10 * 60 + 15 && minutes < 10 * 60 + 30;
}

export default function EmployeeAttendance({ embedded = false }) {
  const { apiFetch, navigate } = useEmployeeApi();
  const token = localStorage.getItem("token");
  const detailedRef = useRef(null);

  const [currentDate, setCurrentDate] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  );
  const [holidayMap, setHolidayMap] = useState({});
  const [personalData, setPersonalData] = useState({});
  const [currentWeek, setCurrentWeek] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [todayStatus, setTodayStatus] = useState(null);
  const [toast, setToast] = useState({ msg: "", visible: false });

  useEffect(() => {
    if (!token) navigate("/login");
  }, [token, navigate]);

  const showToast = useCallback((msg) => {
    setToast({ msg, visible: true });
    const t = setTimeout(() => setToast({ msg: "", visible: false }), 2800);
    return () => clearTimeout(t);
  }, []);

  const fetchHolidays = useCallback(
    async (year, month) => {
      try {
        const data = normalizeArray(
          await apiFetch(`/holidays?year=${year}&month=${month + 1}`)
        );
        const map = {};
        data.forEach((h) => {
          const d =
            typeof h.date === "string"
              ? h.date.slice(0, 10)
              : h.date?.toISOString?.().slice(0, 10) || "";
          if (d) map[d.slice(5, 10)] = { name: h.name, type: h.type };
        });
        setHolidayMap(map);
        return map;
      } catch {
        setHolidayMap({});
        return {};
      }
    },
    [apiFetch]
  );

  const fetchPersonalMonth = useCallback(
    async (year, month) => {
      const mm = String(month + 1).padStart(2, "0");
      const start = `${year}-${mm}-01`;
      const lastDay = new Date(year, month + 1, 0).getDate();
      const end = `${year}-${mm}-${String(lastDay).padStart(2, "0")}`;
      try {
        const records = normalizeArray(
          await apiFetch(`/attendance/self/history?start=${start}&end=${end}`)
        );
        const map = {};
        records.forEach((r) => {
          map[r.date] = r;
        });
        setPersonalData(map);
        return map;
      } catch {
        setPersonalData({});
        return {};
      }
    },
    [apiFetch]
  );

  const fetchTodayStatus = useCallback(async () => {
    try {
      const data = await apiFetch("/attendance/self/today");
      setTodayStatus(data?.id ? data : null);
    } catch {
      setTodayStatus(null);
    }
  }, [apiFetch]);

  const loadMonth = useCallback(async () => {
    setIsLoading(true);
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    await fetchHolidays(year, month);
    await fetchPersonalMonth(year, month);
    setIsLoading(false);
  }, [currentDate, fetchHolidays, fetchPersonalMonth]);

  useEffect(() => {
    loadMonth();
  }, [loadMonth]);

  useEffect(() => {
    fetchTodayStatus();
    const id = setInterval(() => {
      fetchTodayStatus();
      loadMonth();
    }, 60000);
    return () => clearInterval(id);
  }, [fetchTodayStatus, loadMonth]);

  const checkIn = async () => {
    try {
      await apiFetch("/employee/check-in", { method: "POST" });
      showToast("✅ Checked in successfully");
      fetchTodayStatus();
      loadMonth();
    } catch (e) {
      showToast(`Check-in failed: ${e.message}`);
    }
  };

  const checkOut = async () => {
    try {
      await apiFetch("/employee/check-out", { method: "POST" });
      showToast("✅ Checked out successfully");
      fetchTodayStatus();
      loadMonth();
    } catch (e) {
      showToast(`Check-out failed: ${e.message}`);
    }
  };

  const changeMonth = (delta) => {
    setCurrentDate((prev) => {
      let y = prev.getFullYear();
      let m = prev.getMonth() + delta;
      if (m < 0) {
        m = 11;
        y--;
      }
      if (m > 11) {
        m = 0;
        y++;
      }
      return new Date(y, m, 1);
    });
    setCurrentWeek("all");
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const mm = String(month + 1).padStart(2, "0");
  const todayStr = new Date().toISOString().slice(0, 10);

  const monthStats = useMemo(() => {
    const lastDay = new Date(year, month + 1, 0).getDate();
    let holidayCount = 0;
    let halfDayHolidayCount = 0;
    let sundayCount = 0;
    let presentCount = 0;
    let absentCount = 0;
    let lateCount = 0;

    for (let d = 1; d <= lastDay; d++) {
      const dateKey = `${mm}-${String(d).padStart(2, "0")}`;
      const dateStr = `${year}-${dateKey}`;
      const entry = holidayMap[dateKey];
      const isSunday = new Date(year, month, d).getDay() === 0;
      if (isSunday && !entry) sundayCount++;
      if (entry?.type === "holiday") holidayCount++;
      if (entry?.type === "halfday") halfDayHolidayCount++;

      const rec = personalData[dateStr];
      if (!isSunday && !entry) {
        if (rec) {
          const s = rec.status;
          if (s === "full_day" || s === "half_day") presentCount++;
          else absentCount++;
          if (isGraceLateLogin(rec)) lateCount++;
        } else if (dateStr <= todayStr) absentCount++;
      }
    }
    const totalDays = lastDay;
    const workingDays =
      totalDays - sundayCount - holidayCount - halfDayHolidayCount;
    return {
      totalDays,
      workingDays,
      presentCount,
      absentCount,
      lateCount,
      holidayCount,
    };
  }, [year, month, mm, holidayMap, personalData]);

  const calDays = useMemo(() => {
    const lastDay = new Date(year, month + 1, 0).getDate();
    const firstWday = new Date(year, month, 1).getDay();
    const cells = [];

    for (let i = 0; i < firstWday; i++) {
      cells.push({ key: `empty-${i}`, empty: true });
    }

    for (let d = 1; d <= lastDay; d++) {
      const dateKey = `${mm}-${String(d).padStart(2, "0")}`;
      const dateStr = `${year}-${dateKey}`;
      const entry = holidayMap[dateKey];
      const isSunday = new Date(year, month, d).getDay() === 0;
      const isToday = dateStr === todayStr;
      let dayClass = "cal-day";
      let badgeHtml = null;
      let miniHtml = null;
      let tooltip = null;

      if (isSunday && !entry) {
        dayClass += " is-sunday calendar-holiday";
        badgeHtml = (
          <div
            className="day-badge"
            style={{ background: "rgba(185,28,28,0.25)", color: "#ff8a8a" }}
          >
            📆 Sunday
          </div>
        );
        tooltip = (
          <div className="tooltip-card">
            <div className="tt-title">Sunday</div>
            <div>Weekly Off</div>
          </div>
        );
      } else if (entry?.type === "holiday") {
        dayClass += " is-holiday calendar-holiday";
        badgeHtml = (
          <div
            className="day-badge"
            style={{ background: "rgba(255, 140, 0,0.25)", color: "#e8c84a" }}
          >
            🎉 {entry.name}
          </div>
        );
        tooltip = (
          <div className="tooltip-card">
            <div className="tt-title">🎉 {entry.name}</div>
            <div>Office Closed</div>
          </div>
        );
      } else if (entry?.type === "halfday") {
        dayClass += " is-halfday-holiday calendar-halfday";
        badgeHtml = (
          <div
            className="day-badge"
            style={{ background: "rgba(139,92,246,0.25)", color: "#b89fef" }}
          >
            🌓 {entry.name || "Half Day"}
          </div>
        );
        tooltip = (
          <div className="tooltip-card">
            <div className="tt-title">🌓 {entry.name}</div>
            <div>Company Half Day</div>
          </div>
        );
      }

      if (isToday) dayClass += " is-today";

      const rec = personalData[dateStr];
      if (!isSunday && !entry) {
        if (rec) {
          const s = rec.status;
          if (isPaidLeaveDay(rec)) {
            dayClass += " p-leave calendar-paid-leave paid-leave";
            miniHtml = (
              <div className="day-mini-stats">
                <div className="mini-row">Paid Leave</div>
              </div>
            );
          } else if (isUnpaidLeaveDay(rec)) {
            dayClass += " p-leave calendar-unpaid-leave unpaid-leave";
            miniHtml = (
              <div className="day-mini-stats">
                <div className="mini-row">Unpaid Leave</div>
              </div>
            );
          } else if (s === "full_day") {
            dayClass += " p-present calendar-present";
            miniHtml = (
              <div className="day-mini-stats">
                <div className="mini-row">✅ Present</div>
              </div>
            );
          } else if (s === "half_day") {
            dayClass += " p-halfday calendar-halfday";
            miniHtml = (
              <div className="day-mini-stats">
                <div className="mini-row">🌓 Half Day</div>
              </div>
            );
          } else if (s === "leave") {
            dayClass += " p-leave";
            miniHtml = (
              <div className="day-mini-stats">
                <div className="mini-row">🏖️ Leave</div>
              </div>
            );
          } else {
            dayClass += " p-absent calendar-absent";
            miniHtml = (
              <div className="day-mini-stats">
                <div className="mini-row">❌ Absent</div>
              </div>
            );
          }
          if (isGraceLateLogin(rec) && !["absent", "half_day", "full_day"].includes(s) && !isPaidLeaveDay(rec) && !isUnpaidLeaveDay(rec)) {
            dayClass = dayClass.replace(" p-present", "");
            dayClass = dayClass.replace(" calendar-present", "");
            dayClass += " p-late calendar-late";
            miniHtml = (
              <div className="day-mini-stats">
                <div className="mini-row">⚠️ Late {rec.late_minutes}m</div>
              </div>
            );
          }
          tooltip = (
            <div className="tooltip-card">
              <div className="tt-title">
                {MONTH_NAMES[month]} {d}
              </div>
              <div className="tt-row">
                <span>Status</span>
                <span className="tv">
                  {getStatusText(s, rec.late_minutes)}
                </span>
              </div>
              {rec.check_in_time && (
                <div className="tt-row">
                  <span>In</span>
                  <span className="tv">{formatTime12(rec.check_in_time)}</span>
                </div>
              )}
              {rec.check_out_time && (
                <div className="tt-row">
                  <span>Out</span>
                  <span className="tv">{formatTime12(rec.check_out_time)}</span>
                </div>
              )}
              {isGraceLateLogin(rec) && (
                <div className="tt-row">
                  <span>Late</span>
                  <span className="tv">{rec.late_minutes} min</span>
                </div>
              )}
            </div>
          );
        } else if (dateStr <= todayStr) {
          dayClass += " p-absent calendar-absent";
          miniHtml = (
            <div className="day-mini-stats">
              <div className="mini-row">Absent</div>
            </div>
          );
          tooltip = (
            <div className="tooltip-card">
              <div className="tt-title">
                {MONTH_NAMES[month]} {d}
              </div>
              <div>Absent</div>
            </div>
          );
        } else {
          dayClass += " calendar-empty";
          miniHtml = (
            <div className="day-mini-stats">
              <div className="mini-row">No Record</div>
            </div>
          );
          tooltip = (
            <div className="tooltip-card">
              <div className="tt-title">
                {MONTH_NAMES[month]} {d}
              </div>
              <div>No attendance data</div>
            </div>
          );
        }
      }

      cells.push({
        key: dateStr,
        dayClass,
        dayNum: d,
        badgeHtml,
        miniHtml,
        tooltip,
      });
    }

    return cells;
  }, [year, month, mm, holidayMap, personalData, todayStr]);

  const detailRows = useMemo(() => {
    const lastDay = new Date(year, month + 1, 0).getDate();
    const rows = [];
    for (let d = 1; d <= lastDay; d++) {
      const dateKey = `${mm}-${String(d).padStart(2, "0")}`;
      const dateStr = `${year}-${dateKey}`;
      const entry = holidayMap[dateKey];
      const isSunday = new Date(year, month, d).getDay() === 0;
      let weekNum = Math.ceil(d / 7);
      if (weekNum > 5) weekNum = 5;
      if (currentWeek !== "all" && weekNum !== parseInt(currentWeek, 10))
        continue;

      const dayName = WEEK_DAYS[new Date(year, month, d).getDay()];
      let checkIn = "—";
      let checkOut = "—";
      let lateMin = 0;
      let statusLabel = "—";
      let statusClass = "badge-absent";

      if (isSunday) {
        statusLabel = "Sunday";
        statusClass = "badge-sunday";
      } else if (entry) {
        statusLabel =
          entry.type === "holiday" ? "Holiday" : "Half Day (Company)";
        statusClass = "badge-holiday";
      } else {
        const rec = personalData[dateStr];
        if (rec) {
          checkIn = formatTime12(rec.check_in_time);
          checkOut = formatTime12(rec.check_out_time);
          lateMin = Number(rec.late_minutes) || 0;
          statusLabel = getStatusText(rec.status, lateMin);
          statusClass = getStatusBadgeClass(rec.status, lateMin);
        } else if (dateStr <= todayStr) {
          statusLabel = "Absent";
          statusClass = "badge-absent";
        } else {
          statusLabel = "No Record";
          statusClass = "badge-no-record";
        }
      }

      rows.push({
        key: dateStr,
        dateStr,
        dayName,
        checkIn,
        checkOut,
        statusLabel,
        statusClass,
        lateMin,
      });
    }
    return rows;
  }, [year, month, mm, holidayMap, personalData, currentWeek]);

  const bottomTables = useMemo(() => {
    const holidays = [];
    const halfDays = [];
    const sundays = [];
    const lastDay = new Date(year, month + 1, 0).getDate();
    for (let d = 1; d <= lastDay; d++) {
      const dk = `${mm}-${String(d).padStart(2, "0")}`;
      const entry = holidayMap[dk];
      const disp = `${month + 1}/${d}`;
      if (entry?.type === "holiday")
        holidays.push({ date: disp, name: entry.name });
      if (entry?.type === "halfday")
        halfDays.push({ date: disp, name: entry.name });
      if (new Date(year, month, d).getDay() === 0)
        sundays.push({ date: disp });
    }
    return { holidays, halfDays, sundays };
  }, [year, month, mm, holidayMap]);

  const todayUi = useMemo(() => {
    const data = todayStatus;
    if (data?.id) {
      let statusText = data.status?.toUpperCase() || "ABSENT";
      if (data.status === "full_day") statusText = "FULL DAY";
      else if (data.status === "half_day") statusText = "HALF DAY";
      const color =
        data.status === "full_day"
          ? "#16A34A"
          : data.status === "half_day"
            ? "#FBB824"
            : "#64748B";
      return {
        statusHtml: statusText,
        color,
        timings: `In: ${formatTime12(data.check_in_time)} | Out: ${formatTime12(data.check_out_time)}`,
        checkInDisabled: !!data.check_in_time,
        checkOutDisabled: !data.check_in_time || !!data.check_out_time,
      };
    }
    return {
      statusHtml: "NOT CHECKED IN",
      color: "#64748B",
      timings: "No active session",
      checkInDisabled: false,
      checkOutDisabled: true,
    };
  }, [todayStatus]);

  const scrollToHistory = () => {
    detailedRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className={embedded ? "employee-attendance-page" : "layout employee-attendance-page"}>
      {!embedded && <EmployeeSidebar activePage="attendance" />}
      <main className="main-content">
        <div className="page-header">
          <div>
            <h1>
              <i className="fas fa-calendar-alt" /> My Attendance Calendar
            </h1>
            <p>Personal attendance history · Monthly view</p>
          </div>
          <div className="header-actions">
            <div className="live-badge">
              <span className="live-pulse" /> LIVE
            </div>
            <button type="button" className="history-btn" onClick={scrollToHistory}>
              <i className="fas fa-clock-rotate-left" /> History
            </button>
          </div>
        </div>

        <div className="attendance-actions">
          <button
            type="button"
            id="checkInBtn"
            className="action-btn checkin-btn"
            disabled={todayUi.checkInDisabled}
            onClick={checkIn}
          >
            <i className="fas fa-sign-in-alt fa-fw" /> Check In
          </button>
          <div className="center-stats">
            <div className="status-badge" id="todayStatusBadge">
              <i className="fas fa-circle" style={{ color: todayUi.color }} />{" "}
              {todayUi.statusHtml}
            </div>
            <div className="today-timings">{todayUi.timings}</div>
          </div>
          <button
            type="button"
            id="checkOutBtn"
            className="action-btn checkout-btn"
            disabled={todayUi.checkOutDisabled}
            onClick={checkOut}
          >
            <i className="fas fa-sign-out-alt fa-fw" /> Check Out
          </button>
        </div>

        <div className="month-nav">
          <button type="button" onClick={() => changeMonth(-1)}>
            <i className="fas fa-chevron-left" /> Prev
          </button>
          <span className="month-label">
            {MONTH_NAMES[month]} {year}
          </span>
          <button type="button" onClick={() => changeMonth(1)}>
            Next <i className="fas fa-chevron-right" />
          </button>
        </div>

        <div className="month-stats">
          <div className="stat-pill">
            <div className="sv">{monthStats.totalDays}</div>
            <div className="sl">Days in Month</div>
          </div>
          <div className="stat-pill">
            <div className="sv">{monthStats.workingDays}</div>
            <div className="sl">Working Days</div>
          </div>
          <div className="stat-pill">
            <div className="sv">{monthStats.presentCount}</div>
            <div className="sl">Present</div>
          </div>
          <div className="stat-pill">
            <div className="sv">{monthStats.absentCount}</div>
            <div className="sl">Absent</div>
          </div>
          <div className="stat-pill">
            <div className="sv">{monthStats.lateCount}</div>
            <div className="sl">Late</div>
          </div>
          <div
            className={`stat-pill late-usage-card ${getLateUsageTone(monthStats.lateCount)}`}
            title="Late Login Policy: check-ins at or after 10:15 AM count as late. Check-ins from 10:00 AM to 10:14 AM are on time, but require 9 hours from actual login."
          >
            <div className="late-usage-title">
              <i className="fas fa-circle-info" /> Late Logins
            </div>
            <div className="sv">{formatLateLoginCount(monthStats.lateCount)}</div>
            <div className="sl">
              <span className={getLateLoginStatusClass(getMonthlyLateStatus(monthStats.lateCount))}>
                {getMonthlyLateStatus(monthStats.lateCount)}
              </span>
            </div>
          </div>
          <div className="stat-pill">
            <div className="sv">{monthStats.holidayCount}</div>
            <div className="sl">Holidays</div>
          </div>
        </div>

        <div className="legend">
          {[
            ["present", "Present"],
            ["absent", "Absent"],
            ["late", "Late"],
            ["halfday", "Half Day"],
            ["leave", "Leave"],
            ["holiday", "Holiday"],
            ["sunday", "Sunday"],
          ].map(([cls, label]) => (
            <div key={cls} className="legend-item">
              <div className={`ldot ${cls}`} />
              {label}
            </div>
          ))}
        </div>

        <div className="calendar-grid" id="calGrid">
          {WEEK_DAYS.map((d) => (
            <div key={d} className="cal-weekday">
              {d}
            </div>
          ))}
          {isLoading ? (
            <div className="grid-loader">
              <span className="loading-spinner" />
            </div>
          ) : (
            calDays.map((cell) =>
              cell.empty ? (
                <div
                  key={cell.key}
                  className="cal-day"
                  style={{
                    opacity: 0.2,
                    background: "#F5F7FA",
                    pointerEvents: "none",
                  }}
                />
              ) : (
                <div key={cell.key} className={cell.dayClass}>
                  <div className="day-num">{cell.dayNum}</div>
                  {cell.badgeHtml}
                  {cell.miniHtml}
                  {cell.tooltip}
                </div>
              )
            )
          )}
        </div>

        <div className="detailed-section" id="detailedLogSection" ref={detailedRef}>
          <div className="section-header">
            <h3 style={{ color: "var(--gold)" }}>
              <i className="fas fa-table-list" /> Daily Attendance Log
            </h3>
            <div className="week-filters">
              {["all", "1", "2", "3", "4", "5"].map((w) => (
                <button
                  key={w}
                  type="button"
                  className={`week-btn${currentWeek === w ? " active" : ""}`}
                  onClick={() => setCurrentWeek(w)}
                >
                  {w === "all" ? "📅 All" : `Week ${w}`}
                </button>
              ))}
            </div>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table className="att-table" id="detailTable">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Day</th>
                  <th>Check In</th>
                  <th>Check Out</th>
                  <th>Status</th>
                  <th>Late (min)</th>
                </tr>
              </thead>
              <tbody>
                {detailRows.length ? (
                  detailRows.map((row) => (
                    <tr key={row.key}>
                      <td style={{ fontFamily: "monospace" }}>{row.dateStr}</td>
                      <td>{row.dayName}</td>
                      <td>{row.checkIn}</td>
                      <td>{row.checkOut}</td>
                      <td>
                        <span className={`badge-sm ${row.statusClass}`}>
                          {row.statusLabel}
                        </span>
                      </td>
                      <td>{row.lateMin}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} style={{ textAlign: "center", padding: 30 }}>
                      No records for selected week
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bottom-tables" id="bottomTables">
          <div className="info-table">
            <h3>
              <i className="fas fa-umbrella" /> Holidays
            </h3>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Name</th>
                </tr>
              </thead>
              <tbody>
                {bottomTables.holidays.length ? (
                  bottomTables.holidays.map((h) => (
                    <tr key={`${h.date}-${h.name}`}>
                      <td>{h.date}</td>
                      <td>{escapeHtml(h.name)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={2}>None</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="info-table">
            <h3>
              <i className="fas fa-adjust" /> Half Days (Company)
            </h3>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Label</th>
                </tr>
              </thead>
              <tbody>
                {bottomTables.halfDays.length ? (
                  bottomTables.halfDays.map((h) => (
                    <tr key={`${h.date}-${h.name}`}>
                      <td>{h.date}</td>
                      <td>{escapeHtml(h.name)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={2}>None</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="info-table">
            <h3>
              <i className="fas fa-sun" /> Sundays
            </h3>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {bottomTables.sundays.length ? (
                  bottomTables.sundays.map((s) => (
                    <tr key={s.date}>
                      <td>{s.date}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td>None</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <div className={`toast${toast.visible ? " show" : ""}`}>{toast.msg}</div>
    </div>
  );
}

