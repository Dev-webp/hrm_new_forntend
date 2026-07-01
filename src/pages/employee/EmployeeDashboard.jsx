import { useCallback, useEffect, useMemo, useState } from "react";
import EmployeeSidebar from "../../components/EmployeeSidebar";
import { useEmployeeApi } from "../../hooks/useEmployeeApi";
import { parseJwt } from "../../utils/parseJwt";
import {
  formatProductionHours,
  formatTime12Hour,
} from "../../utils/timeFormat";
import { MONTH_NAMES, normalizeArray, WEEK_DAYS } from "./employeeUtils";
import "../../styles/EmployeeDashboard.css";

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

export default function EmployeeDashboard({ embedded = false }) {
  const { apiFetch, navigate } = useEmployeeApi();
  const token = localStorage.getItem("token");
  const [profileData, setProfileData] = useState(null);

  const userProfile = useMemo(() => {
    const decoded = parseJwt(token) || {};
    let storedUser = {};
    try {
      storedUser = JSON.parse(localStorage.getItem("user") || "null") || {};
    } catch {
      storedUser = {};
    }
    const source = { ...decoded, ...storedUser, ...(profileData || {}) };
    const employeeCode =
      source.employee_code ||
      source.employeeId ||
      localStorage.getItem("employee_code") ||
      "—";
    return {
      full_name: source.full_name || "Employee",
      department: source.department || "",
      branch: source.branch || "Hyderabad",
      email: source.email || "",
      role: source.role || "",
      employee_code: employeeCode,
      firstName: (source.full_name || "Employee").split(" ")[0],
    };
  }, [token, profileData]);

  const [viewDate, setViewDate] = useState(() => new Date());
  const [allAttendance, setAllAttendance] = useState([]);
  const [allLeaves, setAllLeaves] = useState([]);
  const [todayData, setTodayData] = useState(null);
  const [holidayList, setHolidayList] = useState([]);
  const [activeTab, setActiveTab] = useState("overview");
  const [policyExpanded, setPolicyExpanded] = useState(false);
  const [greetingMsg, setGreetingMsg] = useState("");
  const [liveDateLabel, setLiveDateLabel] = useState("—");
  const [liveTimeLabel, setLiveTimeLabel] = useState("—");

  const safeAttendance = useMemo(
    () => (Array.isArray(allAttendance) ? allAttendance.filter(Boolean) : []),
    [allAttendance]
  );
  const safeLeaves = useMemo(
    () => (Array.isArray(allLeaves) ? allLeaves.filter(Boolean) : []),
    [allLeaves]
  );

  useEffect(() => {
    if (!token) navigate("/login");
  }, [token, navigate]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    apiFetch("/employee/profile")
      .then((profile) => {
        if (cancelled || !profile) return;
        setProfileData(profile);
        let storedUser = {};
        try {
          storedUser = JSON.parse(localStorage.getItem("user") || "null") || {};
        } catch {
          storedUser = {};
        }
        const nextUser = { ...storedUser, ...profile };
        localStorage.setItem("user", JSON.stringify(nextUser));
        if (profile.employee_code) {
          localStorage.setItem("employee_code", profile.employee_code);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [apiFetch, token]);

  const updateDateTime = useCallback(() => {
    const now = new Date();
    setGreetingMsg(`${getGreeting()}, ${userProfile.firstName}`);
    setLiveDateLabel(
      now.toLocaleDateString("en-IN", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    );
    setLiveTimeLabel(
      now.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
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
    let totalBreakMinutes = 0;
    let breakCount = 0;
    let lateMinutes = 0;

    for (let d = 1; d <= lastDay; d++) {
      const ds = `${y}-${mm}-${String(d).padStart(2, "0")}`;
      const dow = new Date(ds).getDay();
      const isSun = dow === 0;
      const isHol = holidaySet.has(ds);
      if (!isSun && !isHol) workingDays++;
      const rec = safeAttendance.find((r) => r?.date === ds);
      if (rec) {
        const status = String(rec?.status || "").toLowerCase();
        if (["full_day", "present", "in_progress", "working", "leave"].includes(status)) fullDays++;
        else if (status === "half_day") halfDays++;
        else if (!isSun && !isHol) absentDays++;
        lateMinutes += Number(rec?.late_minutes || 0);
        if (Number(rec?.production_hours || 0) > 0) {
          totalProdHours += parseFloat(rec?.production_hours || 0);
          prodCount++;
        }
        if (Number(rec?.total_break_minutes || 0) > 0) {
          totalBreakMinutes += Number(rec?.total_break_minutes || 0);
          breakCount++;
        }
      } else if (!isSun && !isHol) absentDays++;
    }

    const score =
      workingDays > 0
        ? Math.round(((fullDays + halfDays * 0.5) / workingDays) * 100)
        : 0;
    const avgHours = prodCount > 0 ? totalProdHours / prodCount : 0;
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

    const today = new Date().toISOString().slice(0, 10);
    let currentStreak = 0;
    const sorted = [...safeAttendance]
      .sort((a, b) => String(b?.date || "").localeCompare(String(a?.date || "")));
    for (const rec of sorted) {
      if (rec?.date > today) continue;
      if (rec?.status === "full_day") currentStreak++;
      else break;
    }

    const rate =
      workingDays > 0
        ? Math.round(((fullDays + halfDays * 0.5) / workingDays) * 100)
        : 0;
    const approvedDays = safeLeaves
      .filter((l) => l?.status === "approved")
      .reduce((s, l) => s + Number(l.requested_days ?? l.days ?? 0), 0);
    const leaveBalance = Math.max(0, 24 - approvedDays);
    const lateCount = Math.min(safeAttendance.filter(isGraceLateLogin).length, LATE_MAX);

    return {
      workingDays,
      fullDays,
      halfDays,
      absentDays,
      score,
      avgHours,
      avgBreakMinutes: breakCount > 0 ? Math.round(totalBreakMinutes / breakCount) : 0,
      grade,
      gradeClass,
      hint,
      currentStreak,
      rate,
      leaveBalance,
      approvedLeaveDays: approvedDays,
      lateCount,
      lateMinutes,
      holidayCount: holidayList.length,
      totalDays: lastDay,
      sundays: Array.from({ length: lastDay }, (_, index) => index + 1).filter(
        (day) => new Date(y, m, day).getDay() === 0
      ).length,
      leaveRequests: safeLeaves.length,
    };
  }, [safeAttendance, safeLeaves, holidayList, monthMeta]);

  const lateTracker = useMemo(() => {
    const lateRecs = safeAttendance.filter(isGraceLateLogin);
    const lateCount = Math.min(lateRecs.length, LATE_MAX);
    const remaining = Math.max(0, LATE_MAX - lateCount);
    let info;
    if (lateCount === 0) {
      info = (
        <>
          <strong style={{ color: "var(--green)" }}>
            No late logins this month.
          </strong>{" "}
          All 6 monthly late allowances are available.
        </>
      );
    } else if (lateCount < LATE_MAX) {
      info = (
        <>
          <strong>
            {lateCount} late login{lateCount > 1 ? "s" : ""} used
          </strong>{" "}
          Â· {remaining} remaining before half-day deduction.
        </>
      );
    } else {
      info = (
        <>
          <strong style={{ color: "var(--red)" }}>Monthly late allowance reached!</strong>{" "}
          Further check-ins after 10:15 AM follow Half Day or Absent policy.
        </>
      );
    }
    return { lateRecs, lateCount, remaining, info };
  }, [safeAttendance]);

  const todayCard = useMemo(() => {
    const d = todayData;
    let statusText = "Not Available";
    let statusCls = "absent";
    if (d?.status === "half_day") {
      statusText = "Half Day";
      statusCls = "halfday";
    } else if (d?.status === "leave") {
      statusText = "Leave";
      statusCls = "leave";
    } else if (isGraceLateLogin(d) && d?.status !== "absent") {
      statusText = "Late";
      statusCls = "late";
    } else if (d?.status === "full_day") {
      statusText = "Present";
      statusCls = "present";
    } else if (d?.status === "present" || d?.status === "in_progress" || d?.status === "working") {
      statusText = d?.status === "in_progress" || d?.status === "working" ? "Working" : "Present";
      statusCls = "present";
    }
    return {
      checkIn: formatTime12Hour(d?.check_in_time) || "—",
      checkOut: formatTime12Hour(d?.check_out_time) || "—",
      late: Number(d?.late_minutes || 0),
      productionHours: formatProductionHours(Number(d?.production_hours || 0)),
      statusText,
      statusCls,
      message:
        d?.status === "absent" || !d
          ? "Attendance not completed."
            : isGraceLateLogin(d)
            ? `You are late by ${Number(d?.late_minutes || 0)} minutes.`
            : "Great! You are on time today.",
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
      safeAttendance.map((rec) => {
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
      const todayStr = new Date().toISOString().slice(0, 10);

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
        } else if (rec?.status === "absent") {
          status = "Absent";
          className = "absent calendar-absent";
        } else if (rec?.status === "half_day") {
          status = "Half Day";
          className = "halfday calendar-halfday";
        } else if (isGraceLateLogin(rec)) {
          status = "Late";
          className = "late calendar-late";
        } else if (rec?.status === "full_day" || rec?.status === "present") {
          status = "Present";
          className = "present calendar-present";
        }
      } else if (ds <= todayStr) {
        status = "Absent";
        className = "absent calendar-absent";
      }

      cells.push({
        key: ds,
        day: d,
        status,
        className,
      });
    }

    return cells;
  }, [safeAttendance, holidayList, monthMeta]);

  const detailRows = useMemo(() => {
    const { y, m, mm, lastDay } = monthMeta;
    const holidaySet = new Set(
      holidayList.map((h) => {
        const d = h.date;
        return typeof d === "string" ? d.slice(0, 10) : d?.toISOString?.()?.slice(0, 10);
      })
    );
    const rows = [];
    const todayStr = new Date().toISOString().slice(0, 10);
    for (let d = 1; d <= lastDay; d++) {
      const ds = `${y}-${mm}-${String(d).padStart(2, "0")}`;
      const dow = new Date(ds).getDay();
      if (dow === 0 || holidaySet.has(ds)) continue;
      const rec = safeAttendance.find((r) => r?.date === ds);
      let statusNode = ds <= todayStr ? (
        <span className="status-chip absent">Absent</span>
      ) : (
        <span style={{ color: "var(--muted)" }}>No Record</span>
      );
      let statusText = ds <= todayStr ? "Absent" : "No Record";
      if (rec) {
        const safeStatus = String(rec?.status || "").toLowerCase();
        const cls =
          ["full_day", "present", "in_progress", "working", "leave"].includes(safeStatus)
            ? "present"
            : safeStatus === "half_day"
              ? "halfday"
              : "absent";
        const txt =
          safeStatus === "in_progress" || safeStatus === "working"
            ? "Working"
            : safeStatus === "leave"
              ? "Leave"
            : ["full_day", "present", "leave"].includes(safeStatus)
            ? "Present"
            : safeStatus === "half_day"
              ? "Half Day"
              : "Absent";
        statusText = txt;
        statusNode = (
          <>
            <span className={`status-chip ${cls}`}>{txt}</span>
            {isGraceLateLogin(rec) && rec?.status !== "absent" && (
              <span
                style={{
                  fontSize: ".68rem",
                  color: "var(--amber)",
                  marginLeft: 6,
                }}
              >
                +{Number(rec?.late_minutes || 0)}m late
              </span>
            )}
          </>
        );
      }
      rows.push({
        key: ds,
        date: ds,
        day: WEEK_DAYS[dow],
        in: formatTime12Hour(rec?.check_in_time),
        out: formatTime12Hour(rec?.check_out_time),
        status: statusNode,
        statusText,
      });
    }
    return rows;
  }, [safeAttendance, holidayList, monthMeta]);

  const monthLabel = `${monthMeta.y}-${monthMeta.mm}`;
  const analyticsSubTitle = `${viewDate.toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  })} Â· Personal Report`;
  const todayDateLabel = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const overviewItems = [
    { label: "Total Days", value: analytics.totalDays, icon: "fa-calendar-days", tone: "blue" },
    { label: "Working Days", value: analytics.workingDays, icon: "fa-briefcase", tone: "success" },
    { label: "Sundays", value: analytics.sundays, icon: "fa-sun", tone: "purple" },
    { label: "Total Present", value: analytics.fullDays, icon: "fa-user-check", tone: "success" },
    { label: "Late Logins", value: analytics.lateCount, icon: "fa-business-time", tone: "warning" },
    { label: "Absences", value: analytics.absentDays, icon: "fa-user-slash", tone: "danger" },
  ];

  const actionBase = userProfile.role === "SUB_ADMIN" ? "/sub-admin" : "/employee";
  const quickActions = [
    { label: "Apply Leave", subtitle: "Request time off", icon: "fa-paper-plane", path: `${actionBase}/leave` },
    { label: "My Attendance", subtitle: "View daily logs", icon: "fa-calendar-check", path: userProfile.role === "SUB_ADMIN" ? "/sub-admin/calendar" : "/employee/attendance" },
    { label: "Breaks", subtitle: "Manage break time", icon: "fa-mug-hot", path: `${actionBase}/breaks` },
    { label: "Payslip", subtitle: "Salary documents", icon: "fa-file-invoice-dollar", path: `${actionBase}/payslip` },
    { label: "Messages", subtitle: "Contact HR team", icon: "fa-envelope", path: userProfile.role === "SUB_ADMIN" ? "/sub-admin/help-center" : "/employee/messages" },
  ];

  const monthlySummaryCards = [
    { label: "Present Days", value: analytics.fullDays, max: analytics.workingDays, tone: "success", icon: "fa-user-check" },
    { label: "Absent Days", value: analytics.absentDays, max: analytics.workingDays, tone: "danger", icon: "fa-user-xmark" },
    { label: "Late Logins", value: analytics.lateCount, max: LATE_MAX, tone: "warning", icon: "fa-clock" },
    { label: "Leave Requests", value: analytics.leaveRequests, max: Math.max(analytics.leaveRequests, 6), tone: "purple", icon: "fa-umbrella-beach" },
    { label: "Attendance %", value: `${analytics.rate}%`, rawValue: analytics.rate, max: 100, tone: "blue", icon: "fa-chart-simple" },
  ];

  const detailFields = [
    ["Email", userProfile.email || "—"],
    ["Department", userProfile.department || "—"],
    ["Location", userProfile.branch || "—"],
    ["Employee ID", userProfile.employee_code],
  ];

  const performanceMetrics = [
    {
      cls: "blue",
      icon: "fa-percent",
      label: "Attendance %",
      value: `${analytics.rate}%`,
      note: analytics.grade,
      noteClass: `score-grade ${analytics.gradeClass}`,
    },
    {
      cls: "success",
      icon: "fa-business-time",
      label: "Avg Working Hours",
      value: formatProductionHours(analytics.avgHours),
      note: analytics.hint,
    },
    {
      cls: "purple",
      icon: "fa-mug-hot",
      label: "Avg Break Time",
      value: `${analytics.avgBreakMinutes}m`,
      note: "Daily average",
    },
    {
      cls: "warning",
      icon: "fa-clock",
      label: "Late Minutes (Monthly)",
      value: analytics.lateMinutes,
      note: `${analytics.lateCount} late logins`,
    },
  ];

  const changeMonth = (delta) => {
    setViewDate((prev) => {
      const next = new Date(prev);
      next.setMonth(next.getMonth() + delta);
      return next;
    });
  };

  return (
    <div className={embedded ? "employee-dashboard" : "layout employee-dashboard"}>
      {!embedded && <EmployeeSidebar activePage="dashboard" />}
      <div className="main">
        <div className="content">
          <section className="employee-top-card">
            <div className="employee-greeting">
              <div className="welcome-kicker">{getGreeting()},</div>
              <div className="welcome-title">{userProfile.full_name}</div>
              <div className="employee-date-row">
                <span><i className="fas fa-calendar-day" /> {liveDateLabel}</span>
                <span><i className="fas fa-clock" /> {liveTimeLabel}</span>
              </div>
            </div>
            <div className="employee-details-card">
              {detailFields.map(([label, value]) => (
                <div key={label}>
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
          </section>

          <section className="monthly-overview-card">
            <div className="monthly-overview-head">
              <div>
                <h2>{viewDate.toLocaleDateString("en-IN", { month: "long", year: "numeric" })} Overview</h2>
                <p>Month-to-date attendance summary</p>
              </div>
              <div className="month-nav">
                <button type="button" onClick={() => changeMonth(-1)} aria-label="Previous month">
                  <i className="fas fa-chevron-left" />
                </button>
                <span>{monthLabel}</span>
                <button type="button" onClick={() => changeMonth(1)} aria-label="Next month">
                  <i className="fas fa-chevron-right" />
                </button>
              </div>
            </div>
            <div className="overview-kpi-row">
              {overviewItems.map((item) => (
                <div className="overview-kpi" key={item.label}>
                  <span className={`dash-icon mini ${item.tone}`}>
                    <i className={`fas ${item.icon}`} />
                  </span>
                  <strong>{item.value}</strong>
                  <small>{item.label}</small>
                </div>
              ))}
            </div>
          </section>

          <div className="employee-main-grid">
            <section className="today-card dashboard-snapshot">
              <div className="today-header">
                <div>
                  <div className="today-title">Today&apos;s Attendance</div>
                  <span className="today-date">{todayDateLabel}</span>
                </div>
                <span className={`status-chip ${todayCard.statusCls}`}>{todayCard.statusText}</span>
              </div>
              <div className="today-grid">
                <div>
                  <i className="fas fa-right-to-bracket ti-icon" />
                  <div className="ti-label">Check In</div>
                  <div className="ti-val">{todayCard.checkIn}</div>
                </div>
                <div>
                  <i className="fas fa-right-from-bracket ti-icon" />
                  <div className="ti-label">Check Out</div>
                  <div className="ti-val">{todayCard.checkOut}</div>
                </div>
                <div>
                  <i className="fas fa-clock ti-icon" />
                  <div className="ti-label">Late Minutes</div>
                  <div className="ti-val">{todayCard.late} min</div>
                </div>
                <div>
                  <i className="fas fa-id-badge ti-icon" />
                  <div className="ti-label">Status</div>
                  <div className="ti-val">{todayCard.statusText}</div>
                </div>
              </div>
              <div className={`attendance-message ${todayCard.statusCls}`}>
                <i className={`fas ${todayCard.statusCls === "absent" ? "fa-circle-xmark" : todayCard.statusCls === "late" ? "fa-triangle-exclamation" : "fa-circle-check"}`} />
                {todayCard.message}
              </div>
            </section>
          </div>

          <section className="quick-actions-card">
            <div className="section-title">Quick Actions</div>
            <div className="quick-actions-grid">
              {quickActions.map((action) => (
                <button key={action.label} type="button" onClick={() => navigate(action.path)}>
                  <span><i className={`fas ${action.icon}`} /></span>
                  <div>
                    <strong>{action.label}</strong>
                    <small>{action.subtitle}</small>
                  </div>
                  <i className="fas fa-arrow-right action-arrow" />
                </button>
              ))}
            </div>
          </section>

          <section className="monthly-summary-card">
            {monthlySummaryCards.map((item) => {
              const rawValue = item.rawValue ?? Number(item.value || 0);
              const percent = item.max > 0 ? Math.min(100, Math.round((rawValue / item.max) * 100)) : 0;
              return (
                <div className={`summary-progress-card ${item.tone}`} key={item.label}>
                  <i className={`fas ${item.icon} summary-icon`} />
                  <strong>{item.value}</strong>
                  <span>{item.label}</span>
                  <small>{percent}%</small>
                  <div className="summary-progress-track">
                    <div style={{ width: `${percent}%` }} />
                  </div>
                </div>
              );
            })}
          </section>

          <section className="performance-section single">
            <div className="performance-card-simple">
              <div className="performance-head">
                <div>
                  <div className="section-title">Performance Overview</div>
                  <div className="analytics-head-sub">{analyticsSubTitle}</div>
                </div>
              </div>
              <div className="perf-stats simple">
                {performanceMetrics.map((metric) => (
                  <div className={`performance-metric ${metric.cls}`} key={metric.label}>
                    <span><i className={`fas ${metric.icon}`} /> {metric.label}</span>
                    <strong>{metric.value}</strong>
                    <small className={metric.noteClass}>{metric.note}</small>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </div>
      <button
        type="button"
        className="employee-help-floating-btn"
        onClick={() => navigate(userProfile.role === "SUB_ADMIN" ? "/sub-admin/help-center" : "/employee/help-center")}
        aria-label={userProfile.role === "SUB_ADMIN" ? "Open sub admin help center" : "Open employee help center"}
        style={embedded && userProfile.role !== "SUB_ADMIN" ? { display: "none" } : undefined}
      >
        <span>🎧</span>
        Need Help
      </button>
    </div>
  );
}

function isGraceLateLogin(rec) {
  if (!rec?.check_in_time && !rec?.office_in && !rec?.checkIn) return false;
  const raw = rec?.check_in_time || rec?.office_in || rec?.checkIn;
  const out = rec?.check_out_time || rec?.office_out || rec?.checkOut;
  if (!raw || !out) return false;
  const [h, m] = String(raw).slice(0, 5).split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return false;
  const minutes = h * 60 + m;
  return minutes > 10 * 60 && minutes <= 10 * 60 + 15;
}



