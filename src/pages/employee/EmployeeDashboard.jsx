import { useCallback, useEffect, useMemo, useState } from "react";
import EmployeeSidebar from "../../components/EmployeeSidebar";
import { useEmployeeApi } from "../../hooks/useEmployeeApi";
import { parseJwt } from "../../utils/parseJwt";
import { CALENDAR_STATUS_COLORS } from "../../utils/calendarStatusColors";
import { MONTH_NAMES, normalizeArray, WEEK_DAYS } from "./employeeUtils";
import "../../styles/EmployeeDashboard.css";

const GAUGE_CIRCUMFERENCE = 226.2;
const LATE_MAX = 6;

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good Morning";
  if (h < 17) return "Good Afternoon";
  return "Good Evening";
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

export default function EmployeeDashboard() {
  const { apiFetch, navigate } = useEmployeeApi();
  const token = localStorage.getItem("token");

  const userProfile = useMemo(() => {
    const decoded = parseJwt(token) || {};
    return {
      full_name: decoded.full_name || "Employee",
      department: decoded.department || "",
      branch: decoded.branch || "Hyderabad",
      email: decoded.email || "",
      employee_code: decoded.employee_code || "—",
      firstName: (decoded.full_name || "Employee").split(" ")[0],
    };
  }, [token]);

  const [viewDate, setViewDate] = useState(() => new Date());
  const [allAttendance, setAllAttendance] = useState([]);
  const [allLeaves, setAllLeaves] = useState([]);
  const [todayData, setTodayData] = useState(null);
  const [holidayList, setHolidayList] = useState([]);
  const [activeTab, setActiveTab] = useState("overview");
  const [greetingMsg, setGreetingMsg] = useState("");
  const [liveDateTime, setLiveDateTime] = useState("—");

  useEffect(() => {
    if (!token) navigate("/login");
  }, [token, navigate]);

  const updateDateTime = useCallback(() => {
    const now = new Date();
    setGreetingMsg(`${getGreeting()}, ${userProfile.firstName} 👋`);
    setLiveDateTime(
      now.toLocaleString("en-IN", {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    );
  }, [userProfile.firstName]);

  useEffect(() => {
    updateDateTime();
    const id = setInterval(updateDateTime, 1000);
    return () => clearInterval(id);
  }, [updateDateTime]);

  const loadAll = useCallback(async () => {
    const y = viewDate.getFullYear();
    const m = viewDate.getMonth();
    const mm = String(m + 1).padStart(2, "0");
    const start = `${y}-${mm}-01`;
    const lastDay = new Date(y, m + 1, 0).getDate();
    const end = `${y}-${mm}-${lastDay}`;

    try {
      setTodayData(await apiFetch("/attendance/self/today"));
    } catch {
      setTodayData(null);
    }
    try {
      setAllAttendance(normalizeArray(await apiFetch(`/attendance/self/history?start=${start}&end=${end}`)));
    } catch {
      setAllAttendance([]);
    }
    try {
      setAllLeaves(normalizeArray(await apiFetch("/leaves/my")));
    } catch {
      setAllLeaves([]);
    }
    try {
      setHolidayList(normalizeArray(await apiFetch(`/holidays?year=${y}&month=${m + 1}`)));
    } catch {
      setHolidayList([]);
    }
  }, [apiFetch, viewDate]);

  useEffect(() => {
    loadAll();
    const id = setInterval(loadAll, 60000);
    return () => clearInterval(id);
  }, [loadAll]);

  const monthMeta = useMemo(() => {
    const y = viewDate.getFullYear();
    const m = viewDate.getMonth();
    const mm = String(m + 1).padStart(2, "0");
    const lastDay = new Date(y, m + 1, 0).getDate();
    return { y, m, mm, lastDay };
  }, [viewDate]);

  const analytics = useMemo(() => {
    const { y, m, mm, lastDay } = monthMeta;
    const holidaySet = new Set(
      holidayList.map((h) => {
        const d = h.date;
        return typeof d === "string" ? d.slice(0, 10) : d?.toISOString?.()?.slice(0, 10);
      })
    );

    let workingDays = 0;
    let fullDays = 0;
    let halfDays = 0;
    let absentDays = 0;
    let totalProdHours = 0;
    let prodCount = 0;

    for (let d = 1; d <= lastDay; d++) {
      const ds = `${y}-${mm}-${String(d).padStart(2, "0")}`;
      const dow = new Date(ds).getDay();
      const isSun = dow === 0;
      const isHol = holidaySet.has(ds);
      if (!isSun && !isHol) workingDays++;
      const rec = allAttendance.find((r) => r.date === ds);
      if (rec) {
        if (rec.status === "full_day") fullDays++;
        else if (rec.status === "half_day") halfDays++;
        else if (!isSun && !isHol) absentDays++;
        if (rec.production_hours > 0) {
          totalProdHours += parseFloat(rec.production_hours);
          prodCount++;
        }
      } else if (!isSun && !isHol) absentDays++;
    }

    const score =
      workingDays > 0
        ? Math.round(((fullDays + halfDays * 0.5) / workingDays) * 100)
        : 0;
    const avgHours =
      prodCount > 0 ? (totalProdHours / prodCount).toFixed(1) : "0.0";
    const grade =
      score >= 95
        ? "Excellent"
        : score >= 80
          ? "Good"
          : score >= 60
            ? "Average"
            : "Needs Improvement";
    const gradeClass =
      score >= 95
        ? "excellent"
        : score >= 80
          ? "good"
          : score >= 60
            ? "average"
            : "poor";
    const hint =
      score >= 95
        ? "Perfect attendance!"
        : score >= 80
          ? "Room to improve"
          : "Attendance needs attention";
    const gaugeColor =
      score >= 95
        ? CALENDAR_STATUS_COLORS.present.border
        : score >= 80
          ? CALENDAR_STATUS_COLORS.half_day.border
          : score >= 60
            ? CALENDAR_STATUS_COLORS.late.border
            : CALENDAR_STATUS_COLORS.absent.border;

    const today = new Date().toISOString().slice(0, 10);
    let currentStreak = 0;
    const sorted = [...allAttendance].sort((a, b) => b.date.localeCompare(a.date));
    for (const rec of sorted) {
      if (rec.date > today) continue;
      if (rec.status === "full_day") currentStreak++;
      else break;
    }

    const rate =
      workingDays > 0
        ? Math.round(((fullDays + halfDays * 0.5) / workingDays) * 100)
        : 0;
    const approvedDays = allLeaves
      .filter((l) => l.status === "approved")
      .reduce((s, l) => s + Number(l.requested_days ?? l.days ?? 0), 0);
    const leaveBalance = Math.max(0, 24 - approvedDays);
    const lateCount = allAttendance.filter(
      (r) => (r.late_minutes || 0) > 0 && r.status !== "absent"
    ).length;

    return {
      workingDays,
      fullDays,
      halfDays,
      absentDays,
      score,
      avgHours,
      grade,
      gradeClass,
      hint,
      gaugeColor,
      gaugeOffset: GAUGE_CIRCUMFERENCE - GAUGE_CIRCUMFERENCE * (score / 100),
      currentStreak,
      rate,
      leaveBalance,
      lateCount,
      holidayCount: holidayList.length,
    };
  }, [allAttendance, allLeaves, holidayList, monthMeta]);

  const lateTracker = useMemo(() => {
    const lateRecs = allAttendance.filter(
      (r) => (r.late_minutes || 0) > 0 && r.status !== "absent"
    );
    const lateCount = lateRecs.length;
    const remaining = Math.max(0, LATE_MAX - lateCount);
    let info;
    if (lateCount === 0) {
      info = (
        <>
          <strong style={{ color: "var(--green)" }}>
            No late logins this month.
          </strong>{" "}
          All 6 grace logins available.
        </>
      );
    } else if (lateCount < LATE_MAX) {
      info = (
        <>
          <strong>
            {lateCount} late login{lateCount > 1 ? "s" : ""} used
          </strong>{" "}
          · {remaining} remaining before half-day deduction.
        </>
      );
    } else {
      info = (
        <>
          <strong style={{ color: "var(--red)" }}>Grace limit reached!</strong>{" "}
          Further late logins count as half days.
        </>
      );
    }
    return { lateRecs, lateCount, remaining, info };
  }, [allAttendance]);

  const todayCard = useMemo(() => {
    const d = todayData;
    let statusText = "Absent";
    let statusCls = "absent";
    if (d?.status === "full_day") {
      statusText = "Present";
      statusCls = "present";
    } else if (d?.status === "half_day") {
      statusText = "Half Day";
      statusCls = "halfday";
    } else if (d?.late_minutes > 0) {
      statusText = "Late";
      statusCls = "late";
    }
    return {
      checkIn: d?.check_in_time?.slice(0, 5) || "—",
      checkOut: d?.check_out_time?.slice(0, 5) || "—",
      late: d?.late_minutes || 0,
      statusText,
      statusCls,
    };
  }, [todayData]);

  const calendarDays = useMemo(() => {
    const { y, m, mm, lastDay } = monthMeta;
    const holidaySet = new Set(
      holidayList.map((h) => {
        const d = h.date;
        return typeof d === "string" ? d.slice(0, 10) : d?.toISOString?.()?.slice(0, 10);
      })
    );
    const attendanceByDate = new Map(
      allAttendance.map((rec) => {
        const dateKey =
          typeof rec.date === "string" ? rec.date.slice(0, 10) : rec.date?.toISOString?.()?.slice(0, 10);
        return [dateKey, rec];
      })
    );
    const firstDayOffset = new Date(y, m, 1).getDay();
    const cells = Array.from({ length: firstDayOffset }, (_, i) => ({
      key: `blank-${i}`,
      blank: true,
    }));

    for (let d = 1; d <= lastDay; d++) {
      const ds = `${y}-${mm}-${String(d).padStart(2, "0")}`;
      const dow = new Date(y, m, d).getDay();
      const rec = attendanceByDate.get(ds);
      const isHoliday = holidaySet.has(ds);
      const isSunday = dow === 0;
      let status = "No record";
      let className = "no-record calendar-empty";

      if (isHoliday || isSunday) {
        status = isSunday ? "Sunday" : "Holiday";
        className = "holiday calendar-holiday";
      } else if (rec) {
        if (isPaidLeaveDay(rec)) {
          status = "Paid Leave";
          className = "paid-leave calendar-paid-leave";
        } else if (isUnpaidLeaveDay(rec)) {
          status = "Unpaid Leave";
          className = "unpaid-leave calendar-unpaid-leave";
        } else if (rec.status === "absent") {
          status = "Absent";
          className = "absent calendar-absent";
        } else if (rec.status === "half_day") {
          status = "Half Day";
          className = "halfday calendar-halfday";
        } else if ((rec.late_minutes || 0) > 0) {
          status = "Late";
          className = "late calendar-late";
        } else if (rec.status === "full_day" || rec.status === "present") {
          status = "Present";
          className = "present calendar-present";
        }
      }

      cells.push({
        key: ds,
        day: d,
        status,
        className,
      });
    }

    return cells;
  }, [allAttendance, holidayList, monthMeta]);

  const detailRows = useMemo(() => {
    const { y, m, mm, lastDay } = monthMeta;
    const holidaySet = new Set(
      holidayList.map((h) => {
        const d = h.date;
        return typeof d === "string" ? d.slice(0, 10) : d?.toISOString?.()?.slice(0, 10);
      })
    );
    const rows = [];
    for (let d = 1; d <= lastDay; d++) {
      const ds = `${y}-${mm}-${String(d).padStart(2, "0")}`;
      const dow = new Date(ds).getDay();
      if (dow === 0 || holidaySet.has(ds)) continue;
      const rec = allAttendance.find((r) => r.date === ds);
      let statusNode = (
        <span style={{ color: "var(--muted)" }}>No Record</span>
      );
      if (rec) {
        const cls =
          rec.status === "full_day"
            ? "present"
            : rec.status === "half_day"
              ? "halfday"
              : "absent";
        const txt =
          rec.status === "full_day"
            ? "Present"
            : rec.status === "half_day"
              ? "Half Day"
              : "Absent";
        statusNode = (
          <>
            <span className={`status-chip ${cls}`}>{txt}</span>
            {rec.late_minutes > 0 && rec.status !== "absent" && (
              <span
                style={{
                  fontSize: ".68rem",
                  color: "var(--amber)",
                  marginLeft: 6,
                }}
              >
                +{rec.late_minutes}m late
              </span>
            )}
          </>
        );
      }
      rows.push({
        key: ds,
        date: ds,
        day: WEEK_DAYS[dow],
        in: rec?.check_in_time?.slice(0, 5) || "—",
        out: rec?.check_out_time?.slice(0, 5) || "—",
        status: statusNode,
      });
    }
    return rows;
  }, [allAttendance, holidayList, monthMeta]);

  const monthLabel = `${monthMeta.y}-${monthMeta.mm}`;
  const analyticsSubTitle = `${viewDate.toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  })} · Personal Report`;
  const todayDateLabel = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const changeMonth = (delta) => {
    setViewDate((prev) => {
      const next = new Date(prev);
      next.setMonth(next.getMonth() + delta);
      return next;
    });
  };

  return (
    <div className="layout employee-dashboard">
      <EmployeeSidebar activePage="dashboard" />
      <div className="main">
        <div className="welcome-banner">
          <div className="banner-inner">
            <div>
              <div className="welcome-title">{greetingMsg}</div>
              <div className="welcome-sub">Here&apos;s your snapshot for today.</div>
            </div>
            <div className="live-pill">
              <span className="live-dot" />
              <span className="live-time">{liveDateTime}</span>
            </div>
          </div>
        </div>

        <div className="info-strip">
          <div className="info-cell">
            <div className="info-icon gold">
              <i className="fas fa-envelope" />
            </div>
            <div>
              <div className="info-label">Email</div>
              <div className="info-value">{userProfile.email || "—"}</div>
            </div>
          </div>
          <div className="info-cell">
            <div className="info-icon blue">
              <i className="fas fa-briefcase" />
            </div>
            <div>
              <div className="info-label">Department</div>
              <div className="info-value">{userProfile.department || "—"}</div>
            </div>
          </div>
          <div className="info-cell">
            <div className="info-icon green">
              <i className="fas fa-map-marker-alt" />
            </div>
            <div>
              <div className="info-label">Location</div>
              <div className="info-value">{userProfile.branch || "—"}</div>
            </div>
          </div>
          <div className="info-cell">
            <div className="info-icon purple">
              <i className="fas fa-id-badge" />
            </div>
            <div>
              <div className="info-label">Employee ID</div>
              <div className="info-value">{userProfile.employee_code}</div>
            </div>
          </div>
        </div>

        <div className="content">
          <div className="analytics-head">
            <div>
              <div className="analytics-head-title">Attendance Analytics</div>
              <div className="analytics-head-sub">{analyticsSubTitle}</div>
            </div>
            <div className="month-nav">
              <button type="button" onClick={() => changeMonth(-1)}>
                <i className="fas fa-chevron-left" />
              </button>
              <span>{monthLabel}</span>
              <button type="button" onClick={() => changeMonth(1)}>
                <i className="fas fa-chevron-right" />
              </button>
            </div>
          </div>

          <div className="today-card dashboard-snapshot">
            <div className="today-header">
              <div className="today-title">Today&apos;s Snapshot</div>
              <span className="today-date">{todayDateLabel}</span>
            </div>
            <div className="today-grid">
              <div>
                <div className="ti-label">Check In</div>
                <div className="ti-val">{todayCard.checkIn}</div>
              </div>
              <div>
                <div className="ti-label">Check Out</div>
                <div className="ti-val">{todayCard.checkOut}</div>
              </div>
              <div>
                <div className="ti-label">Late (min)</div>
                <div className="ti-val">{todayCard.late}</div>
              </div>
              <div>
                <div className="ti-label">Status</div>
                <div style={{ marginTop: 4 }}>
                  <span className={`status-chip ${todayCard.statusCls}`}>
                    {todayCard.statusText}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="tabs">
            {["overview", "details"].map((tab) => (
              <button
                key={tab}
                type="button"
                className={`tab${activeTab === tab ? " active" : ""}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {activeTab === "overview" && (
            <div className="tab-content active">
              <div className="overview-grid">
                <div className="perf-card">
                  <div className="perf-card-title">Monthly Performance</div>
                  <div className="score-row">
                    <div className="gauge-wrap">
                      <svg width="90" height="90" viewBox="0 0 90 90">
                        <circle className="gauge-bg" cx="45" cy="45" r="36" />
                        <circle
                          className="gauge-fill"
                          cx="45"
                          cy="45"
                          r="36"
                          strokeDasharray={GAUGE_CIRCUMFERENCE}
                          strokeDashoffset={analytics.gaugeOffset}
                          stroke={analytics.gaugeColor}
                        />
                      </svg>
                      <div className="gauge-center">
                        <span className="gauge-val">{analytics.score}</span>
                        <span className="gauge-max">/100</span>
                      </div>
                    </div>
                    <div className="score-info">
                      <div className="score-label">Attendance Score</div>
                      <div className={`score-grade ${analytics.gradeClass}`}>
                        {analytics.grade}
                      </div>
                      <div className="score-hint">{analytics.hint}</div>
                    </div>
                  </div>
                  <div className="perf-stats">
                    <div>
                      <div className="psi-label">Work Days</div>
                      <div className="psi-val">{analytics.workingDays}</div>
                    </div>
                    <div>
                      <div className="psi-label">Avg Hours</div>
                      <div className="psi-val">{analytics.avgHours}h</div>
                    </div>
                    <div>
                      <div className="psi-label">Holidays</div>
                      <div className="psi-val">{analytics.holidayCount}</div>
                    </div>
                    <div>
                      <div className="psi-label">Paid Leave</div>
                      <div className="psi-val">1</div>
                    </div>
                  </div>
                </div>

                <div className="metric-card green-top">
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                    }}
                  >
                    <div className="metric-label">Full Days</div>
                    <span className="metric-icon green">
                      <i className="fas fa-check-circle" />
                    </span>
                  </div>
                  <div className="metric-value">{analytics.fullDays}</div>
                  <div className="metric-sub green">
                    {analytics.workingDays
                      ? `${Math.round((analytics.fullDays / analytics.workingDays) * 100)}% of workdays`
                      : "—"}
                  </div>
                </div>

                <div className="metric-card amber-top">
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                    }}
                  >
                    <div className="metric-label">Half Days</div>
                    <span className="metric-icon amber">
                      <i className="fas fa-adjust" />
                    </span>
                  </div>
                  <div className="metric-value">{analytics.halfDays}</div>
                  <div className="metric-sub amber">Partial attendance</div>
                </div>

                <div className="metric-card red-top">
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                    }}
                  >
                    <div className="metric-label">Absent</div>
                    <span className="metric-icon red">
                      <i className="fas fa-times-circle" />
                    </span>
                  </div>
                  <div className="metric-value">{analytics.absentDays}</div>
                  <div className="metric-sub red">
                    {analytics.absentDays === 1
                      ? "1 day missed"
                      : `${analytics.absentDays} days missed`}
                  </div>
                </div>
              </div>

              <div className="attendance-calendar-card">
                <div className="calendar-header">
                  <div>
                    <div className="calendar-title">Monthly Attendance Calendar</div>
                    <div className="calendar-subtitle">
                      {viewDate.toLocaleDateString("en-IN", {
                        month: "long",
                        year: "numeric",
                      })}
                    </div>
                  </div>
                  <div className="calendar-legend">
                    <span><i className="legend-dot present" />Present</span>
                    <span><i className="legend-dot late" />Late</span>
                    <span><i className="legend-dot halfday" />Half Day</span>
                    <span><i className="legend-dot holiday" />Holiday</span>
                    <span><i className="legend-dot absent" />Absent</span>
                    <span><i className="legend-dot paid-leave" />Paid Leave</span>
                    <span><i className="legend-dot unpaid-leave" />Unpaid Leave</span>
                    <span><i className="legend-dot no-record" />No record</span>
                  </div>
                </div>
                <div className="calendar-weekdays">
                  {WEEK_DAYS.map((day) => (
                    <div key={day}>{day}</div>
                  ))}
                </div>
                <div className="attendance-calendar-grid">
                  {calendarDays.map((cell) =>
                    cell.blank ? (
                      <div key={cell.key} className="calendar-cell blank" />
                    ) : (
                      <div key={cell.key} className={`calendar-cell ${cell.className}`}>
                        <div className="calendar-day">{cell.day}</div>
                        <div className="calendar-status">{cell.status}</div>
                      </div>
                    )
                  )}
                </div>
              </div>

              <div className="streak-card">
                <div className="streak-left">
                  <div className="streak-icon">⚡</div>
                  <div>
                    <div className="streak-label">Current Streak</div>
                    <div className="streak-val">
                      {analytics.currentStreak} full day
                      {analytics.currentStreak !== 1 ? "s" : ""}
                    </div>
                  </div>
                </div>
                <button type="button" className="streak-btn">
                  Keep going
                </button>
              </div>

              <div className="late-card">
                <div className="late-header">
                  <div className="late-title">
                    Late Login Usage{" "}
                    <span
                      style={{
                        color: "var(--muted)",
                        fontWeight: 400,
                        fontSize: "0.72rem",
                      }}
                    >
                      (grace: 6 per month)
                    </span>
                  </div>
                  <span className="late-badge">
                    {lateTracker.lateCount}/{LATE_MAX}
                  </span>
                </div>
                <div className="late-track">
                  {Array.from({ length: LATE_MAX }, (_, i) => {
                    if (i < lateTracker.lateCount) {
                      const rec = lateTracker.lateRecs[i];
                      return (
                        <div
                          key={i}
                          className="late-dot used"
                          title={`${rec?.date}: ${rec?.late_minutes || 0}min late`}
                        >
                          {i + 1}
                        </div>
                      );
                    }
                    return (
                      <div key={i} className="late-dot available">
                        {i + 1}
                      </div>
                    );
                  })}
                </div>
                <div className="late-info">{lateTracker.info}</div>
              </div>

            </div>
          )}

          {activeTab === "details" && (
            <div className="tab-content active">
              <div
                style={{
                  background: "var(--card2)",
                  border: "1px solid var(--gold-dim)",
                  borderRadius: 22,
                  padding: 22,
                }}
              >
                <div
                  style={{
                    fontSize: ".82rem",
                    fontWeight: 700,
                    marginBottom: 16,
                    color: "var(--gold)",
                    borderLeft: "3px solid var(--gold)",
                    paddingLeft: 10,
                  }}
                >
                  Monthly Attendance Details
                </div>
                <div style={{ overflowX: "auto" }}>
                  <table className="detail-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Day</th>
                        <th>In</th>
                        <th>Out</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailRows.length ? (
                        detailRows.map((row) => (
                          <tr key={row.key}>
                            <td>{row.date}</td>
                            <td style={{ color: "var(--muted)" }}>{row.day}</td>
                            <td>{row.in}</td>
                            <td>{row.out}</td>
                            <td>{row.status}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            colSpan={5}
                            style={{
                              textAlign: "center",
                              padding: 24,
                              color: "var(--muted)",
                            }}
                          >
                            No records found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
