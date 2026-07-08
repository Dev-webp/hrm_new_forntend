import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import { clearAuthSession } from "../../utils/auth";
import {
  formatProductionHours,
  formatTime12Hour,
} from "../../utils/timeFormat";
import { isGraceLateAttendanceRecord } from "../../utils/dashboardHelpers";
import "../../styles/ManagerCalendar.css";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function fmt12(timeStr) {
  return formatTime12Hour(timeStr);
}

function TooltipSunday() {
  return (
    <div className="tooltip-card">
      <div className="tt-title">Sunday</div>
      <div>📆 Weekly Off</div>
    </div>
  );
}

function TooltipHoliday({ name }) {
  return (
    <div className="tooltip-card">
      <div className="tt-title">🎉 {name}</div>
      <div>Office Closed</div>
    </div>
  );
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

export default function ManagerCalendar() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const branch = localStorage.getItem("branch") || "Hyderabad";
  const fullName = localStorage.getItem("full_name") || "Manager";

  const branchCacheRef = useRef({});
  const personalCacheRef = useRef({});

  const [viewMode, setViewMode] = useState("personal");
  const [currentDate, setCurrentDate] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  );
  const [holidayMap, setHolidayMap] = useState({});
  const [branchMonthData, setBranchMonthData] = useState({});
  const [personalMonthData, setPersonalMonthData] = useState({});
  const [monthStats, setMonthStats] = useState({
    totalDays: 0,
    workingDays: 0,
    holidays: 0,
    halfDays: 0,
    sundays: 0,
  });
  const [personalStats, setPersonalStats] = useState({
    present: 0,
    absent: 0,
    late: 0,
    halfDay: 0,
    leave: 0,
  });
  const [bottomTableData, setBottomTableData] = useState({
    holidays: [],
    halfDays: [],
    sundays: [],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState({ msg: "", type: "", visible: false });

  const apiFetch = useCallback(
    async (url, opts = {}) => {
      try {
        const response = await api.request({
          url,
          method: opts.method || "GET",
          data:
            opts.body && typeof opts.body === "string"
              ? JSON.parse(opts.body)
              : opts.body,
        });
        return response.data;
      } catch (err) {
        const status = err.response?.status;
        if (status === 401 || status === 403) {
          clearAuthSession();
          navigate("/");
          throw new Error("Unauthorized");
        }
        throw new Error(
          err.response?.data?.message || err.message || `API ${status}`
        );
      }
    },
    [navigate]
  );

  const showToast = useCallback((msg, dur = 2200) => {
    setToast({ msg, type: "", visible: true });
    window.setTimeout(() => {
      setToast({ msg: "", type: "", visible: false });
    }, dur);
  }, []);

  const fetchHolidays = useCallback(
    async (year, month) => {
      try {
        const data = await apiFetch(`/holidays?year=${year}&month=${month}`);
        const map = {};
        (Array.isArray(data) ? data : []).forEach((h) => {
          const dateStr =
            typeof h.date === "string"
              ? h.date
              : h.date?.toISOString?.().slice(0, 10) || "";
          if (dateStr) {
            map[dateStr.slice(5, 10)] = { name: h.name, type: h.type };
          }
        });
        setHolidayMap(map);
        return map;
      } catch (e) {
        console.warn("Holiday fetch failed:", e.message);
        setHolidayMap({});
        return {};
      }
    },
    [apiFetch]
  );

  const fetchBranchMonthData = useCallback(
    async (year, month) => {
      const key = `${year}-${String(month + 1).padStart(2, "0")}`;
      if (branchCacheRef.current[key]) return branchCacheRef.current[key];

      const mm = String(month + 1).padStart(2, "0");
      const lastDay = new Date(year, month + 1, 0).getDate();
      const start = `${year}-${mm}-01`;
      const end = `${year}-${mm}-${String(lastDay).padStart(2, "0")}`;

      try {
        const rows = await apiFetch(
          `/attendance/range/summary?start=${start}&end=${end}&branch=${encodeURIComponent(branch)}`
        );
        const map = {};
        (Array.isArray(rows) ? rows : []).forEach((r) => {
          map[r.date] = r;
        });
        for (let d = 1; d <= lastDay; d += 1) {
          const ds = `${year}-${mm}-${String(d).padStart(2, "0")}`;
          if (!map[ds]) {
            map[ds] = {
              present: 0,
              halfDay: 0,
              absent: 0,
              leave: 0,
              late: 0,
              total: 0,
            };
          }
        }
        branchCacheRef.current[key] = map;
        return map;
      } catch (e) {
        try {
          const records = await apiFetch(
            `/attendance/range?start=${start}&end=${end}&branch=${encodeURIComponent(branch)}`
          );
          const map = {};
          for (let d = 1; d <= lastDay; d += 1) {
            const ds = `${year}-${mm}-${String(d).padStart(2, "0")}`;
            map[ds] = {
              present: 0,
              halfDay: 0,
              absent: 0,
              leave: 0,
              late: 0,
              total: 0,
            };
          }
          (Array.isArray(records) ? records : []).forEach((rec) => {
            const ds =
              typeof rec.date === "string"
                ? rec.date.slice(0, 10)
                : rec.date?.toISOString?.().slice(0, 10);
            const s = map[ds];
            if (!s) return;
            const st = (rec.status || "absent").toLowerCase();
            if (st !== "holiday") s.total += 1;
            if (st === "full_day") s.present += 1;
            else if (st === "half_day") s.halfDay += 1;
            else if (st === "absent") s.absent += 1;
            else if (st === "leave") s.leave += 1;
            if (isGraceLateAttendanceRecord(rec)) {
              s.late += 1;
            }
          });
          branchCacheRef.current[key] = map;
          return map;
        } catch (e2) {
          console.warn("Branch range fetch failed:", e2.message);
          return {};
        }
      }
    },
    [apiFetch, branch]
  );

  const fetchPersonalMonthData = useCallback(
    async (year, month) => {
      const key = `${year}-${String(month + 1).padStart(2, "0")}`;
      if (personalCacheRef.current[key]) return personalCacheRef.current[key];

      const mm = String(month + 1).padStart(2, "0");
      const lastDay = new Date(year, month + 1, 0).getDate();
      const start = `${year}-${mm}-01`;
      const end = `${year}-${mm}-${String(lastDay).padStart(2, "0")}`;

      try {
        const records = await apiFetch(
          `/attendance/self/history?start=${start}&end=${end}`
        );
        const map = {};
        (Array.isArray(records) ? records : []).forEach((rec) => {
          const ds =
            typeof rec.date === "string"
              ? rec.date.slice(0, 10)
              : rec.date?.toISOString?.().slice(0, 10);
          map[ds] = {
            status: (rec.status || "absent").toLowerCase(),
            checkIn: rec.check_in_time || null,
            checkOut: rec.check_out_time || null,
            lateMinutes: rec.late_minutes || 0,
            prodHours: rec.production_hours || 0,
            breakMinutes: rec.total_break_minutes || 0,
          };
        });
        personalCacheRef.current[key] = map;
        return map;
      } catch (e) {
        console.warn("Personal history fetch failed:", e.message);
        return {};
      }
    },
    [apiFetch]
  );

  const buildBottomTables = useCallback((year, month, lastDay, mm, hMap) => {
    const holidays = [];
    const halfDays = [];
    const sundays = [];

    for (let d = 1; d <= lastDay; d += 1) {
      const dk = `${mm}-${String(d).padStart(2, "0")}`;
      const entry = hMap[dk];
      const disp = `${month + 1}/${d}`;
      if (entry?.type === "holiday") holidays.push({ date: disp, name: entry.name });
      if (entry?.type === "halfday") halfDays.push({ date: disp, name: entry.name });
      if (new Date(year, month, d).getDay() === 0) sundays.push({ date: disp });
    }

    setBottomTableData({ holidays, halfDays, sundays });
  }, []);

  const renderCalendarDays = useCallback(
    (year, month, hMap, branchData, personalData) => {
      const mm = String(month + 1).padStart(2, "0");
      const today = new Date().toISOString().slice(0, 10);
      const lastDay = new Date(year, month + 1, 0).getDate();
      const firstWday = new Date(year, month, 1).getDay();

      let holidayCount = 0;
      let halfDayCount = 0;
      let sundayCount = 0;
      let pPresent = 0;
      let pAbsent = 0;
      let pLate = 0;
      let pHalfDay = 0;
      let pLeave = 0;

      const days = [];

      for (let i = 0; i < firstWday; i += 1) {
        days.push({ type: "empty", key: `empty-${i}` });
      }

      for (let d = 1; d <= lastDay; d += 1) {
        const dateKey = `${mm}-${String(d).padStart(2, "0")}`;
        const dateStr = `${year}-${dateKey}`;
        const entry = hMap[dateKey] || null;
        const isToday = dateStr === today;
        const wday = new Date(year, month, d).getDay();
        const isSun = wday === 0;

        let cssClasses = "cal-day";
        let badgeContent = null;
        let miniStatsContent = null;
        let tooltipContent = null;

        if (isSun && !entry) {
          cssClasses += " is-sunday calendar-holiday";
          sundayCount += 1;
          badgeContent = (
            <div
              className="day-badge"
              style={{
                background: "rgba(185,28,28,0.25)",
                color: "#ff8a8a",
              }}
            >
              📆 Sunday
            </div>
          );
        } else if (entry?.type === "holiday") {
          cssClasses += " is-holiday calendar-holiday";
          holidayCount += 1;
          badgeContent = (
            <div
              className="day-badge"
              style={{
                background: "rgba(255, 140, 0,0.25)",
                color: "#e8c84a",
              }}
            >
              🎉 {entry.name}
            </div>
          );
        } else if (entry?.type === "halfday") {
          cssClasses += " is-halfday-holiday calendar-halfday";
          halfDayCount += 1;
          badgeContent = (
            <div
              className="day-badge"
              style={{
                background: "rgba(139,92,246,0.25)",
                color: "#b89fef",
              }}
            >
              🌓 {entry.name || "Half Day"}
            </div>
          );
        }

        if (isToday) cssClasses += " is-today";

        if (viewMode === "personal") {
          const rec = personalData[dateStr];
          const st = rec ? rec.status : null;

          if (st) {
            if (st === "full_day") pPresent += 1;
            else if (st === "in_progress" || st === "working") pPresent += 1;
            else if (st === "absent") pAbsent += 1;
            else if (st === "half_day") pHalfDay += 1;
            else if (st === "leave") pLeave += 1;
            if (isGraceLateAttendanceRecord(rec)) pLate += 1;
          } else if (!isSun && !entry && dateStr <= today) {
            pAbsent += 1;
          }

          if (!isSun && !entry && rec) {
            if (isPaidLeaveDay(rec)) cssClasses += " p-leave calendar-paid-leave paid-leave";
            else if (isUnpaidLeaveDay(rec)) cssClasses += " p-leave calendar-unpaid-leave unpaid-leave";
            else if (st === "full_day") cssClasses += " p-present calendar-present";
            else if (st === "in_progress" || st === "working") cssClasses += " p-present calendar-present working";
            else if (st === "missing_checkout") cssClasses += " p-late calendar-late";
            else if (st === "half_day") cssClasses += " p-halfday calendar-halfday";
            else if (st === "leave") cssClasses += " p-leave";
            else if (st === "absent") cssClasses += " p-absent calendar-absent";
          }
          if (!isSun && !entry && rec && isGraceLateAttendanceRecord(rec) && !["absent", "half_day", "full_day"].includes(st) && !isPaidLeaveDay(rec) && !isUnpaidLeaveDay(rec)) {
            cssClasses = cssClasses.replace(" p-present", "");
            cssClasses = cssClasses.replace(" calendar-present", "");
            cssClasses += " p-late calendar-late";
          }

          if (rec && !isSun) {
            let statusLabel = {
              full_day: "✅ Present",
              absent: "❌ Absent",
              half_day: "🌓 Half Day",
              leave: "🏖️ Leave",
              holiday: "🎉 Holiday",
            }[st] || "—";

            if (st === "in_progress" || st === "working") statusLabel = "Working";
            if (st === "missing_checkout") statusLabel = "Missing Checkout";
            if (isPaidLeaveDay(rec)) statusLabel = "Paid Leave";
            if (isUnpaidLeaveDay(rec)) statusLabel = "Unpaid Leave";

            miniStatsContent = (
              <div className="day-mini-stats">
                <div className="mini-row">
                  <span>{statusLabel}</span>
                </div>
                {isGraceLateAttendanceRecord(rec) && !isPaidLeaveDay(rec) ? (
                  <div className="mini-row">
                    <span style={{ color: "#FF8C00", fontSize: "0.62rem" }}>
                      ⏰ Late {rec.lateMinutes}m
                    </span>
                  </div>
                ) : null}
              </div>
            );

            if (isSun) {
              tooltipContent = <TooltipSunday />;
            } else if (entry?.type === "holiday") {
              tooltipContent = <TooltipHoliday name={entry.name} />;
            } else {
              tooltipContent = (
                <div className="tooltip-card">
                  <div className="tt-title">
                    {MONTH_NAMES[month]} {d}, {year}
                  </div>
                  <div className="tt-row">
                    <span>Status</span>
                    <span className="tv">{statusLabel}</span>
                  </div>
                  {rec.checkIn ? (
                    <div className="tt-row">
                      <span>Check-in</span>
                      <span className="tv" style={{ color: "var(--c-present)" }}>
                        {fmt12(rec.checkIn)}
                      </span>
                    </div>
                  ) : null}
                  {rec.checkOut ? (
                    <div className="tt-row">
                      <span>Check-out</span>
                      <span className="tv">{fmt12(rec.checkOut)}</span>
                    </div>
                  ) : null}
                  {isGraceLateAttendanceRecord(rec) ? (
                    <div className="tt-row">
                      <span>Late by</span>
                      <span className="tv" style={{ color: "var(--c-late)" }}>
                        {rec.lateMinutes} min
                      </span>
                    </div>
                  ) : null}
                  {rec.prodHours ? (
                    <div className="tt-row">
                      <span>Production</span>
                      <span className="tv">{formatProductionHours(rec.prodHours)}</span>
                    </div>
                  ) : null}
                  {rec.breakMinutes > 0 ? (
                    <div className="tt-row">
                      <span>Break</span>
                      <span className="tv">{rec.breakMinutes} min</span>
                    </div>
                  ) : null}
                </div>
              );
            }
          } else {
            if (isSun) tooltipContent = <TooltipSunday />;
            else if (entry?.type === "holiday") {
              tooltipContent = <TooltipHoliday name={entry.name} />;
            } else if (dateStr <= today) {
              cssClasses += " p-absent calendar-absent";
              miniStatsContent = (
                <div className="day-mini-stats">
                  <div className="mini-row">Absent</div>
                </div>
              );
              tooltipContent = (
                <div className="tooltip-card">
                  <div className="tt-title">
                    {MONTH_NAMES[month]} {d}
                  </div>
                  <div style={{ color: "var(--c-absent)" }}>Absent</div>
                </div>
              );
            } else {
              cssClasses += " calendar-empty";
              tooltipContent = (
                <div className="tooltip-card">
                  <div className="tt-title">
                    {MONTH_NAMES[month]} {d}
                  </div>
                  <div style={{ color: "#64748B" }}>No record</div>
                </div>
              );
            }
          }
        } else {
          const bstats = branchData[dateStr] || {
            present: 0,
            halfDay: 0,
            absent: 0,
            leave: 0,
            late: 0,
            total: 0,
          };

          if (!isSun && !entry) {
            miniStatsContent = (
              <div className="day-mini-stats">
                <div className="mini-row">
                  <span style={{ color: "var(--c-present)" }}>
                    ✓ {bstats.present}
                  </span>
                  <span style={{ color: "var(--c-absent)" }}>
                    ✗ {bstats.absent}
                  </span>
                </div>
                {bstats.late > 0 ? (
                  <div className="mini-row">
                    <span style={{ color: "var(--c-late)" }}>⏰ {bstats.late}</span>
                  </div>
                ) : null}
              </div>
            );
          }

          if (isSun) {
            tooltipContent = <TooltipSunday />;
          } else if (entry?.type === "holiday") {
            tooltipContent = <TooltipHoliday name={entry.name} />;
          } else {
            tooltipContent = (
              <div className="tooltip-card">
                <div className="tt-title">
                  {MONTH_NAMES[month]} {d}, {year}
                </div>
                {entry?.type === "halfday" ? (
                  <div
                    style={{
                      color: "var(--c-halfday)",
                      fontSize: "0.7em",
                      marginBottom: "4px",
                    }}
                  >
                    🌓 {entry.name}
                  </div>
                ) : null}
                <div className="tt-row">
                  <span>✅ Present</span>
                  <span className="tv" style={{ color: "var(--c-present)" }}>
                    {bstats.present}
                  </span>
                </div>
                <div className="tt-row">
                  <span>❌ Absent</span>
                  <span className="tv" style={{ color: "var(--c-absent)" }}>
                    {bstats.absent}
                  </span>
                </div>
                <div className="tt-row">
                  <span>⏰ Late</span>
                  <span className="tv" style={{ color: "var(--c-late)" }}>
                    {bstats.late}
                  </span>
                </div>
                <div className="tt-row">
                  <span>🌓 Half Day</span>
                  <span className="tv" style={{ color: "var(--c-halfday)" }}>
                    {bstats.halfDay}
                  </span>
                </div>
                <div className="tt-row">
                  <span>🏖️ Leave</span>
                  <span className="tv" style={{ color: "var(--c-leave)" }}>
                    {bstats.leave}
                  </span>
                </div>
                <div className="tt-divider" />
                <div className="tt-row">
                  <span>📋 Total Records</span>
                  <span className="tv">{bstats.total}</span>
                </div>
              </div>
            );
          }
        }

        days.push({
          type: "day",
          key: dateStr,
          dateStr,
          dayNum: d,
          cssClasses,
          badgeContent,
          miniStatsContent,
          tooltipContent,
        });
      }

      const totalCells = firstWday + lastDay;
      const pad = Math.ceil(totalCells / 7) * 7 - totalCells;
      for (let i = 0; i < pad; i += 1) {
        days.push({ type: "pad", key: `pad-${i}` });
      }

      const workingDays = lastDay - sundayCount - holidayCount - halfDayCount;

      return {
        days,
        monthStats: {
          totalDays: lastDay,
          workingDays,
          holidays: holidayCount,
          halfDays: halfDayCount,
          sundays: sundayCount,
        },
        personalStats: {
          present: pPresent,
          absent: pAbsent,
          late: pLate,
          halfDay: pHalfDay,
          leave: pLeave,
        },
      };
    },
    [viewMode]
  );

  const loadCalendar = useCallback(async () => {
    setIsLoading(true);
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const mm = String(month + 1).padStart(2, "0");
    const lastDay = new Date(year, month + 1, 0).getDate();

    const hMap = await fetchHolidays(year, month + 1);

    const [branchData, personalData] = await Promise.all([
      viewMode === "branch"
        ? fetchBranchMonthData(year, month)
        : Promise.resolve({}),
      viewMode === "personal"
        ? fetchPersonalMonthData(year, month)
        : Promise.resolve({}),
    ]);

    setBranchMonthData(branchData);
    setPersonalMonthData(personalData);

    const result = renderCalendarDays(year, month, hMap, branchData, personalData);
    setMonthStats(result.monthStats);
    setPersonalStats(result.personalStats);
    buildBottomTables(year, month, lastDay, mm, hMap);

    setIsLoading(false);
  }, [
    buildBottomTables,
    currentDate,
    fetchBranchMonthData,
    fetchHolidays,
    fetchPersonalMonthData,
    renderCalendarDays,
    viewMode,
  ]);

  useEffect(() => {
    if (!token) {
      navigate("/");
      return;
    }
    loadCalendar();
  }, [token, navigate, loadCalendar]);

  const calDays = useMemo(() => {
    if (isLoading) return [];
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    return renderCalendarDays(
      year,
      month,
      holidayMap,
      branchMonthData,
      personalMonthData
    ).days;
  }, [
    isLoading,
    currentDate,
    holidayMap,
    branchMonthData,
    personalMonthData,
    renderCalendarDays,
  ]);

  const changeMonth = useCallback(
    (delta) => {
      setCurrentDate((prev) => {
        let y = prev.getFullYear();
        let m = prev.getMonth() + delta;
        if (m < 0) {
          m = 11;
          y -= 1;
        }
        if (m > 11) {
          m = 0;
          y += 1;
        }
        const key = `${y}-${String(m + 1).padStart(2, "0")}`;
        delete branchCacheRef.current[key];
        delete personalCacheRef.current[key];
        setHolidayMap({});
        return new Date(y, m, 1);
      });
    },
    []
  );

  const setView = useCallback(
    (mode) => {
      setViewMode(mode);
      showToast(
        mode === "personal"
          ? "👤 Showing your personal attendance"
          : "🏢 Showing branch summary"
      );
    },
    [showToast]
  );

  const headerSubtitle =
    viewMode === "personal"
      ? `My attendance · ${branch} branch · Read-only`
      : `Branch summary · ${branch} · Read-only`;

  const monthLabel = `${MONTH_NAMES[currentDate.getMonth()]} ${currentDate.getFullYear()}`;

  return (
    <>
      <main className="main-content manager-calendar-page manager-portal-page">
        <div className="page-header">
          <div className="title">
            <h1>
              <i className="fas fa-calendar-alt" /> Attendance Calendar
            </h1>
            <p id="headerSubtitle">{headerSubtitle}</p>
          </div>
          <div className="page-header-actions">
            <div className="view-toggle">
              <button
                type="button"
                className={`toggle-btn${viewMode === "personal" ? " active" : ""}`}
                onClick={() => setView("personal")}
              >
                <i className="fas fa-user" /> My Attendance
              </button>
              <button
                type="button"
                className={`toggle-btn${viewMode === "branch" ? " active" : ""}`}
                onClick={() => setView("branch")}
              >
                <i className="fas fa-building" /> Branch Attendance
              </button>
            </div>
            <div className="readonly-badge">
              <i className="fas fa-eye" /> View Only
            </div>
          </div>
        </div>

        <div className="month-nav">
          <button type="button" onClick={() => changeMonth(-1)}>
            <i className="fas fa-chevron-left" /> Prev
          </button>
          <span className="month-label">{monthLabel}</span>
          <button type="button" onClick={() => changeMonth(1)}>
            Next <i className="fas fa-chevron-right" />
          </button>
        </div>

        <div className="month-stats" id="monthStats">
          <div className="stat-pill">
            <div className="sv">{isLoading ? "—" : monthStats.totalDays}</div>
            <div className="sl">Total Days</div>
          </div>
          <div className="stat-pill">
            <div className="sv">{isLoading ? "—" : monthStats.workingDays}</div>
            <div className="sl">Working Days</div>
          </div>
          <div className="stat-pill">
            <div className="sv">{isLoading ? "—" : monthStats.holidays}</div>
            <div className="sl">Holidays</div>
          </div>
          <div className="stat-pill">
            <div className="sv">{isLoading ? "—" : monthStats.halfDays}</div>
            <div className="sl">Half Days</div>
          </div>
          <div className="stat-pill">
            <div className="sv">{isLoading ? "—" : monthStats.sundays}</div>
            <div className="sl">Sundays</div>
          </div>
        </div>

        <div
          className={`personal-summary${viewMode === "personal" ? " visible" : ""}`}
          id="personalSummary"
        >
          <div className="ps-card ps-present">
            <div className="pv">{isLoading ? "—" : personalStats.present}</div>
            <div className="pl">Present</div>
          </div>
          <div className="ps-card ps-absent">
            <div className="pv">{isLoading ? "—" : personalStats.absent}</div>
            <div className="pl">Absent</div>
          </div>
          <div className="ps-card ps-late">
            <div className="pv">{isLoading ? "—" : personalStats.late}</div>
            <div className="pl">Late Days</div>
          </div>
          <div className="ps-card ps-halfday">
            <div className="pv">{isLoading ? "—" : personalStats.halfDay}</div>
            <div className="pl">Half Days</div>
          </div>
          <div className="ps-card ps-leave">
            <div className="pv">{isLoading ? "—" : personalStats.leave}</div>
            <div className="pl">On Leave</div>
          </div>
        </div>

        <div
          className={`legend${viewMode === "personal" ? " personal-legend" : " branch-legend"}`}
          id="legend"
        >
          <div className="legend-item personal-only">
            <div className="ldot present" /> My Present
          </div>
          <div className="legend-item personal-only">
            <div className="ldot absent" /> My Absent
          </div>
          <div className="legend-item personal-only">
            <div className="ldot late" /> My Late
          </div>
          <div className="legend-item personal-only">
            <div className="ldot halfday" /> Half Day
          </div>
          <div className="legend-item personal-only">
            <div className="ldot leave" /> Paid Leave
          </div>
          <div className="legend-item personal-only">
            <div className="ldot unpaid-leave" /> Unpaid Leave
          </div>
          <div className="legend-item branch-only">
            <div className="ldot present" /> Present
          </div>
          <div className="legend-item branch-only">
            <div className="ldot absent" /> Absent
          </div>
          <div className="legend-item branch-only">
            <div className="ldot late" /> Late
          </div>
          <div className="legend-item branch-only">
            <div className="ldot halfday" /> Half Day
          </div>
          <div className="legend-item branch-only">
            <div className="ldot leave" /> Paid Leave
          </div>
          <div className="legend-item branch-only">
            <div className="ldot unpaid-leave" /> Unpaid Leave
          </div>
          <div className="legend-item">
            <div className="ldot holiday" /> Holiday
          </div>
          <div className="legend-item">
            <div className="ldot sunday" /> Sunday
          </div>
        </div>

        <div className="calendar-grid" id="calGrid">
          {WEEKDAYS.map((d) => (
            <div key={d} className="cal-weekday">
              {d}
            </div>
          ))}

          {isLoading ? (
            <div className="grid-loader">
              <span className="loading-spinner" />
            </div>
          ) : (
            calDays.map((day) => {
              if (day.type === "empty") {
                return (
                  <div key={day.key} className="cal-day cal-day-empty" />
                );
              }
              if (day.type === "pad") {
                return <div key={day.key} className="cal-day cal-day-pad" />;
              }
              return (
                <div
                  key={day.key}
                  className={day.cssClasses}
                  data-date={day.dateStr}
                >
                  <div className="day-num">{day.dayNum}</div>
                  {day.badgeContent}
                  {day.miniStatsContent}
                  {day.tooltipContent}
                </div>
              );
            })
          )}
        </div>

        <div className="bottom-tables" id="bottomTables">
          <div className="info-table">
            <h3>
              <i className="fas fa-umbrella" /> Holidays This Month
            </h3>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Name</th>
                </tr>
              </thead>
              <tbody>
                {bottomTableData.holidays.length ? (
                  bottomTableData.holidays.map((h) => (
                    <tr key={`${h.date}-${h.name}`}>
                      <td>{h.date}</td>
                      <td>{h.name}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={2} style={{ color: "#64748B" }}>
                      No holidays
                    </td>
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
                {bottomTableData.halfDays.length ? (
                  bottomTableData.halfDays.map((h) => (
                    <tr key={`${h.date}-${h.name}`}>
                      <td>{h.date}</td>
                      <td>{h.name}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={2} style={{ color: "#64748B" }}>
                      None
                    </td>
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
                {bottomTableData.sundays.length ? (
                  bottomTableData.sundays.map((s) => (
                    <tr key={s.date}>
                      <td>{s.date}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td style={{ color: "#64748B" }}>None</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <div className={`mgr-cal-toast${toast.visible ? " show" : ""}`}>
        {toast.msg}
      </div>
    </>
  );
}
