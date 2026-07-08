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
  normalizeAttendanceStatusValue,
} from "../../utils/attendanceHelpers";
import "../../styles/EmployeeAttendance.css";

function getStatusBadgeClass(status, lateMins) {
  status = normalizeAttendanceStatusValue(status);
  if (status === "in_progress" || status === "working") return "badge-working";
  if (status === "missing_checkout") return "badge-late";
  if (status === "full_day") return "badge-present";
  if (status === "present") return "badge-present";
  if (status === "half_day") return "badge-halfday";
  if (status === "leave") return "badge-leave";
  if (status === "holiday") return "badge-leave";
  if (status === "late" || (lateMins > 0 && status !== "absent")) return "badge-late";
  return "badge-absent";
}

function getStatusText(status, lateMins) {
  status = normalizeAttendanceStatusValue(status);
  if (status === "in_progress" || status === "working") return "Working";
  if (status === "missing_checkout") return "Missing Checkout";
  if (status === "full_day") return "Present";
  if (status === "present") return "Present";
  if (status === "half_day") return "Half Day";
  if (status === "leave") return "On Leave";
  if (status === "holiday") return "Holiday";
  if (status === "late" || (lateMins > 0 && status !== "absent")) {
    return `Late${lateMins ? ` (${lateMins}m)` : ""}`;
  }
  if (status === "absent") return "Absent";
  return status || "—";
}

function normalizeAttendanceRecord(record) {
  if (!record) return null;
  return {
    ...record,
    status: normalizeAttendanceStatusValue(record.status),
  };
}

function isPresentCalendarStatus(status) {
  return ["full_day", "present", "half_day", "late"].includes(
    normalizeAttendanceStatusValue(status)
  );
}

function getDateKey(value) {
  if (!value) return "";
  if (typeof value === "string") return value.slice(0, 10);
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  return String(value).slice(0, 10);
}

function isObjectMap(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

function getStoredToken() {
  if (typeof window === "undefined") return "";
  return window.localStorage?.getItem("token") || "";
}

function getSafeMonthDate(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return new Date(value.getFullYear(), value.getMonth(), 1);
  }
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function getSafeLastDay(year, month) {
  const fallback = getSafeMonthDate();
  const safeYear = Number.isFinite(year) ? year : fallback.getFullYear();
  const safeMonth = Number.isFinite(month) ? month : fallback.getMonth();
  return new Date(safeYear, safeMonth + 1, 0).getDate();
}

function safeText(value, fallback = "") {
  if (value === null || value === undefined || value === "") return fallback;
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return String(value);
  }
  return fallback;
}

function safeFormatTime(value) {
  try {
    return formatTime12(safeText(value, ""));
  } catch {
    return "--";
  }
}

function safeStatusText(status, lateMins = 0) {
  try {
    return safeText(getStatusText(status, lateMins), "No Record");
  } catch {
    return "No Record";
  }
}

function AttendanceStateCard({ title, message, actionLabel, onAction, loading = false }) {
  return (
    <div className="detailed-section" role={loading ? "status" : "alert"} aria-live="polite">
      <div style={{ textAlign: "center", padding: "34px 20px" }}>
        {loading && <span className="loading-spinner" aria-hidden="true" />}
        <h3 style={{ color: "var(--gold)", marginTop: loading ? 14 : 0, marginBottom: 8 }}>
          {title}
        </h3>
        <p style={{ color: "var(--text-muted)", marginBottom: actionLabel ? 18 : 0 }}>
          {message}
        </p>
        {actionLabel && (
          <button type="button" className="history-btn" onClick={onAction}>
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
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
  const [token, setToken] = useState(getStoredToken);
  const detailedRef = useRef(null);

  const [currentDate, setCurrentDate] = useState(
    () => getSafeMonthDate()
  );
  const [holidayMap, setHolidayMap] = useState({});
  const [personalData, setPersonalData] = useState({});
  const [currentWeek, setCurrentWeek] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoadedMonth, setHasLoadedMonth] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [isAttendanceActionLoading, setIsAttendanceActionLoading] = useState(false);
  const [todayStatus, setTodayStatus] = useState(null);
  const [toast, setToast] = useState({ msg: "", visible: false });

  useEffect(() => {
    const storedToken = getStoredToken();
    setToken(storedToken);
    if (!storedToken) {
      setIsLoading(false);
      navigate("/login");
    }
  }, [navigate]);

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
          const d = getDateKey(h?.date);
          if (d) {
            map[d.slice(5, 10)] = {
              name: safeText(h?.name, "Holiday"),
              type: safeText(h?.type, "holiday"),
            };
          }
        });
        setHolidayMap(map);
        return map;
      } catch (err) {
        setHolidayMap({});
        throw new Error(err?.message || "Unable to load holidays", { cause: err });
      }
    },
    [apiFetch]
  );

  const fetchPersonalMonth = useCallback(
    async (year, month) => {
      const mm = String(month + 1).padStart(2, "0");
      const start = `${year}-${mm}-01`;
      const lastDay = getSafeLastDay(year, month);
      const end = `${year}-${mm}-${String(lastDay).padStart(2, "0")}`;
      try {
        const records = normalizeArray(
          await apiFetch(`/attendance/self/history?start=${start}&end=${end}`)
        );
        const map = {};
        records.forEach((r) => {
          const record = normalizeAttendanceRecord(r);
          const dateKey = getDateKey(record?.date);
          if (dateKey) map[dateKey] = { ...record, date: dateKey };
        });
        setPersonalData(map);
        return map;
      } catch (err) {
        setPersonalData({});
        throw new Error(err?.message || "Unable to load attendance history", { cause: err });
      }
    },
    [apiFetch]
  );

  const fetchTodayStatus = useCallback(async () => {
    try {
      const data = await apiFetch("/attendance/self/today");
      setTodayStatus(data?.id ? normalizeAttendanceRecord(data) : null);
    } catch {
      setTodayStatus(null);
    }
  }, [apiFetch]);

  const loadMonth = useCallback(async () => {
    if (!token) {
      setHolidayMap({});
      setPersonalData({});
      setHasLoadedMonth(false);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setLoadError("");
    const safeDate = getSafeMonthDate(currentDate);
    const year = safeDate.getFullYear();
    const month = safeDate.getMonth();
    try {
      await Promise.all([
        fetchHolidays(year, month),
        fetchPersonalMonth(year, month),
      ]);
      setHasLoadedMonth(true);
    } catch (err) {
      setHolidayMap({});
      setPersonalData({});
      setHasLoadedMonth(false);
      setLoadError(err?.message || "Unable to load attendance data");
    } finally {
      setIsLoading(false);
    }
  }, [currentDate, fetchHolidays, fetchPersonalMonth, token]);

  useEffect(() => {
    loadMonth();
  }, [loadMonth]);

  useEffect(() => {
    if (!token) return undefined;
    fetchTodayStatus();
    const id = setInterval(() => {
      fetchTodayStatus();
      loadMonth();
    }, 60000);
    return () => clearInterval(id);
  }, [fetchTodayStatus, loadMonth, token]);

  const checkIn = async () => {
    setIsAttendanceActionLoading(true);
    try {
      const data = await apiFetch("/employee/check-in", { method: "POST" });
      const record = normalizeAttendanceRecord(data?.record || data);
      if (record?.id) setTodayStatus(record);
      showToast("✅ Checked in successfully");
      await Promise.all([fetchTodayStatus(), loadMonth()]);
    } catch (e) {
      showToast(`Check-in failed: ${e.message}`);
    } finally {
      setIsAttendanceActionLoading(false);
    }
  };

  const checkOut = async () => {
    setIsAttendanceActionLoading(true);
    try {
      const data = await apiFetch("/employee/check-out", { method: "POST" });
      const record = normalizeAttendanceRecord(data?.record || data);
      if (record?.id) {
        setTodayStatus(record);
        setPersonalData((prev) => ({
          ...prev,
          [String(record.date || todayStr).slice(0, 10)]: record,
        }));
      }
      showToast("✅ Checked out successfully");
      await Promise.all([fetchTodayStatus(), loadMonth()]);
    } catch (e) {
      showToast(`Check-out failed: ${e.message}`);
    } finally {
      setIsAttendanceActionLoading(false);
    }
  };

  const changeMonth = (delta) => {
    setCurrentDate((prev) => {
      const safePrev = getSafeMonthDate(prev);
      let y = safePrev.getFullYear();
      let m = safePrev.getMonth() + delta;
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

  const safeCurrentDate = getSafeMonthDate(currentDate);
  const year = safeCurrentDate.getFullYear();
  const month = safeCurrentDate.getMonth();
  const mm = String(month + 1).padStart(2, "0");
  const todayStr = new Date().toISOString().slice(0, 10);
  const safeHolidayMap = useMemo(
    () => (isObjectMap(holidayMap) ? holidayMap : {}),
    [holidayMap]
  );
  const safePersonalData = useMemo(
    () => (isObjectMap(personalData) ? personalData : {}),
    [personalData]
  );
  const safeWeekDays = useMemo(
    () => (Array.isArray(WEEK_DAYS) ? WEEK_DAYS : []),
    []
  );
  const safeMonthName = MONTH_NAMES?.[month] || "";
  const isInitialPageLoading = isLoading && !hasLoadedMonth;
  const canRenderAttendance = hasLoadedMonth && !loadError && !isInitialPageLoading;

  const monthStats = useMemo(() => {
    const lastDay = getSafeLastDay(year, month);
    let holidayCount = 0;
    let halfDayHolidayCount = 0;
    let sundayCount = 0;
    let presentCount = 0;
    let absentCount = 0;
    let lateCount = 0;

    for (let d = 1; d <= lastDay; d++) {
      const dateKey = `${mm}-${String(d).padStart(2, "0")}`;
      const dateStr = `${year}-${dateKey}`;
      const entry = safeHolidayMap[dateKey];
      const isSunday = new Date(year, month, d).getDay() === 0;
      if (isSunday && !entry) sundayCount++;
      if (entry?.type === "holiday") holidayCount++;
      if (entry?.type === "halfday") halfDayHolidayCount++;

      const rec = safePersonalData[dateStr];
      if (!isSunday && !entry) {
        if (rec) {
          const s = normalizeAttendanceStatusValue(rec.status);
          if (isPresentCalendarStatus(s)) presentCount++;
          else if (s === "absent") absentCount++;
          if (isGraceLateLogin(rec)) lateCount++;
        }
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
  }, [year, month, mm, safeHolidayMap, safePersonalData]);

  const calDays = useMemo(() => {
    const lastDay = getSafeLastDay(year, month);
    const firstWday = new Date(year, month, 1).getDay();
    const cells = [];

    for (let i = 0; i < firstWday; i++) {
      cells.push({ key: `empty-${i}`, empty: true });
    }

    for (let d = 1; d <= lastDay; d++) {
      const dateKey = `${mm}-${String(d).padStart(2, "0")}`;
      const dateStr = `${year}-${dateKey}`;
      const entry = safeHolidayMap[dateKey];
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
            🎉 {safeText(entry.name, "Holiday")}
          </div>
        );
        tooltip = (
          <div className="tooltip-card">
            <div className="tt-title">🎉 {safeText(entry.name, "Holiday")}</div>
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
            🌓 {safeText(entry.name, "Half Day")}
          </div>
        );
        tooltip = (
          <div className="tooltip-card">
            <div className="tt-title">🌓 {safeText(entry.name, "Half Day")}</div>
            <div>Company Half Day</div>
          </div>
        );
      }

      if (isToday) dayClass += " is-today";

      const rec = safePersonalData[dateStr];
      if (!isSunday && !entry) {
        if (rec) {
          const s = normalizeAttendanceStatusValue(rec.status);
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
          } else if (s === "full_day" || s === "present") {
            dayClass += " p-present calendar-present";
            miniHtml = (
              <div className="day-mini-stats">
                <div className="mini-row">✅ Present</div>
              </div>
            );
          } else if (s === "late") {
            dayClass += " p-late calendar-late";
            miniHtml = (
              <div className="day-mini-stats">
                <div className="mini-row">Late {rec.late_minutes || 0}m</div>
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
          } else if (s === "absent") {
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
                {safeMonthName} {d}
              </div>
              <div className="tt-row">
                <span>Status</span>
                <span className="tv">
                  {safeStatusText(s, rec.late_minutes)}
                </span>
              </div>
              {rec.check_in_time && (
                <div className="tt-row">
                  <span>In</span>
                  <span className="tv">{safeFormatTime(rec.check_in_time)}</span>
                </div>
              )}
              {rec.check_out_time && (
                <div className="tt-row">
                  <span>Out</span>
                  <span className="tv">{safeFormatTime(rec.check_out_time)}</span>
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
        } else if (dateStr === todayStr && isAttendanceActionLoading) {
          dayClass += " calendar-empty";
          miniHtml = (
            <div className="day-mini-stats">
              <div className="mini-row">Updating</div>
            </div>
          );
          tooltip = (
            <div className="tooltip-card">
              <div className="tt-title">
                {safeMonthName} {d}
              </div>
              <div>Updating attendance</div>
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
                {safeMonthName} {d}
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
  }, [year, month, mm, safeHolidayMap, safePersonalData, todayStr, isAttendanceActionLoading, safeMonthName]);

  const detailRows = useMemo(() => {
    const lastDay = getSafeLastDay(year, month);
    const rows = [];
    for (let d = 1; d <= lastDay; d++) {
      const dateKey = `${mm}-${String(d).padStart(2, "0")}`;
      const dateStr = `${year}-${dateKey}`;
      const entry = safeHolidayMap[dateKey];
      const isSunday = new Date(year, month, d).getDay() === 0;
      let weekNum = Math.ceil(d / 7);
      if (weekNum > 5) weekNum = 5;
      if (currentWeek !== "all" && weekNum !== parseInt(currentWeek, 10))
        continue;

      const dayName = safeWeekDays[new Date(year, month, d).getDay()] || "";
      let checkIn = "—";
      let checkOut = "—";
      let lateMin = 0;
      let statusLabel;
      let statusClass;

      if (isSunday) {
        statusLabel = "Sunday";
        statusClass = "badge-sunday";
      } else if (entry) {
        statusLabel =
          entry.type === "holiday" ? "Holiday" : "Half Day (Company)";
        statusClass = "badge-holiday";
      } else {
        const rec = safePersonalData[dateStr];
        if (rec) {
          checkIn = safeFormatTime(rec.check_in_time);
          checkOut = safeFormatTime(rec.check_out_time);
          lateMin = Number(rec.late_minutes) || 0;
          statusLabel = safeStatusText(rec.status, lateMin);
          statusClass = getStatusBadgeClass(rec.status, lateMin);
        } else if (dateStr === todayStr && isAttendanceActionLoading) {
          statusLabel = "Updating";
          statusClass = "badge-no-record";
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
        statusLabel: statusLabel || "No Record",
        statusClass: statusClass || "badge-no-record",
        lateMin,
      });
    }
    return rows;
  }, [year, month, mm, safeHolidayMap, safePersonalData, currentWeek, isAttendanceActionLoading, safeWeekDays, todayStr]);

  const bottomTables = useMemo(() => {
    const holidays = [];
    const halfDays = [];
    const sundays = [];
    const lastDay = getSafeLastDay(year, month);
    for (let d = 1; d <= lastDay; d++) {
      const dk = `${mm}-${String(d).padStart(2, "0")}`;
      const entry = safeHolidayMap[dk];
      const disp = `${month + 1}/${d}`;
      if (entry?.type === "holiday")
        holidays.push({ date: disp, name: safeText(entry.name, "Holiday") });
      if (entry?.type === "halfday")
        halfDays.push({ date: disp, name: safeText(entry.name, "Half Day") });
      if (new Date(year, month, d).getDay() === 0)
        sundays.push({ date: disp });
    }
    return { holidays, halfDays, sundays };
  }, [year, month, mm, safeHolidayMap]);

  const safeBottomTables = {
    holidays: Array.isArray(bottomTables?.holidays) ? bottomTables.holidays : [],
    halfDays: Array.isArray(bottomTables?.halfDays) ? bottomTables.halfDays : [],
    sundays: Array.isArray(bottomTables?.sundays) ? bottomTables.sundays : [],
  };

  const todayUi = useMemo(() => {
    const data = todayStatus;
    if (data?.id) {
      const status = normalizeAttendanceStatusValue(data?.status || "absent");
      let statusText = status.toUpperCase();
      if (status === "full_day" || status === "present") statusText = "FULL DAY";
      else if (status === "half_day") statusText = "HALF DAY";
      else if (status === "missing_checkout") statusText = "MISSING CHECKOUT";
      else if (status === "late") statusText = "LATE";
      const color =
        status === "full_day" || status === "present"
          ? "#16A34A"
          : status === "half_day"
            ? "#FBB824"
            : status === "late" || status === "missing_checkout"
              ? "#EA580C"
              : "#64748B";
      return {
        statusHtml: statusText,
        color,
        timings: `In: ${safeFormatTime(data.check_in_time)} | Out: ${safeFormatTime(data.check_out_time)}`,
        checkInDisabled: isAttendanceActionLoading || !!data.check_in_time,
        checkOutDisabled: isAttendanceActionLoading || !data.check_in_time || !!data.check_out_time,
      };
    }
    return {
      statusHtml: isAttendanceActionLoading ? "UPDATING" : "NOT CHECKED IN",
      color: "#64748B",
      timings: isAttendanceActionLoading ? "Finalizing attendance" : "No active session",
      checkInDisabled: isAttendanceActionLoading,
      checkOutDisabled: true,
    };
  }, [todayStatus, isAttendanceActionLoading]);

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

        {isInitialPageLoading ? (
          <AttendanceStateCard
            title="Loading attendance"
            message="Preparing your attendance calendar."
            loading
          />
        ) : loadError ? (
          <AttendanceStateCard
            title="Unable to load attendance"
            message={loadError}
            actionLabel="Retry"
            onAction={loadMonth}
          />
        ) : !canRenderAttendance ? (
          <AttendanceStateCard
            title="No attendance data"
            message="No Record"
          />
        ) : (
          <>
        <div className="month-nav">
          <button type="button" onClick={() => changeMonth(-1)}>
            <i className="fas fa-chevron-left" /> Prev
          </button>
          <span className="month-label">
            {safeMonthName} {year}
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
          {safeWeekDays.map((d) => (
            <div key={d} className="cal-weekday">
              {d}
            </div>
          ))}
          {isLoading ? (
            <div className="grid-loader">
              <span className="loading-spinner" />
            </div>
          ) : (
            (Array.isArray(calDays) ? calDays : []).map((cell) =>
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
                  (Array.isArray(detailRows) ? detailRows : []).map((row) => (
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
                {safeBottomTables.holidays.length ? (
                  safeBottomTables.holidays.map((h) => (
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
                {safeBottomTables.halfDays.length ? (
                  safeBottomTables.halfDays.map((h) => (
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
                {safeBottomTables.sundays.length ? (
                  safeBottomTables.sundays.map((s) => (
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
          </>
        )}
      </main>

      <div className={`toast${toast.visible ? " show" : ""}`}>{toast.msg}</div>
    </div>
  );
}


