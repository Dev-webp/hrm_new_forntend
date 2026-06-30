import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  addHoliday,
  fetchAttendanceForDate,
  fetchAttendanceRange,
  fetchHolidaysForMonth,
} from "../../services/calendarApi";

import {
  fetchEmployees,
  fetchEmployeeCalendar,
  updateEmployeeCalendarDay,
} from "../../services/employeeCalendarApi";

import {
  transformAttendanceRangeRecord,
  monthRangeBounds,
} from "../../utils/calendarHelper";
import { CALENDAR_STATUS_COLORS } from "../../utils/calendarStatusColors";
import {
  formatProductionHours,
  formatTime12Hour,
} from "../../utils/timeFormat";
import { getStoredUser } from "../../utils/auth";

import "../../styles/adminCalendar.css";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getRecordTime(record = {}, keys = []) {
  for (const key of keys) {
    const value = record[key];
    if (value && value !== "--") return String(value).slice(0, 5);
  }
  return "";
}

function getRecordHours(record = {}) {
  return Number(
    record.production_hours ??
    record.work_hours ??
    record.workHours ??
    record.hours ??
    0
  );
}

function normalizeAttendanceStatus(status = "") {
  const value = String(status).trim().toLowerCase().replace(/\s+/g, "_");
  if (value === "present" || value === "full_day") return "present";
  if (value === "half_day") return "half_day";
  if (value === "late") return "late";
  if (value === "absent") return "absent";
  if (value === "paid_leave") return "paid_leave";
  if (value === "unpaid_leave") return "unpaid_leave";
  if (value === "leave") return "leave";
  if (value === "holiday") return "holiday";
  return value || "no_record";
}

function hasValidAttendance(record = {}) {
  const inTime = getRecordTime(record, ["office_in", "check_in", "login_time", "checkIn"]);
  const outTime = getRecordTime(record, ["office_out", "check_out", "logout_time", "checkOut"]);
  const hours = getRecordHours(record);

  return (
    inTime &&
    outTime &&
    inTime !== "00:00" &&
    outTime !== "00:00" &&
    hours >= 4
  );
}

function hasApprovedLeave(record = {}) {
  const status = normalizeAttendanceStatus(record.status || record.day_status);
  const leaveStatus = String(record.leave_status || record.leaveStatus || "").toLowerCase();
  const leaveType = String(record.leave_type || record.leaveType || record.leave_category || record.leaveCategory || "").toLowerCase();

  return (
    status === "paid_leave" ||
    status === "unpaid_leave" ||
    status === "leave" ||
    leaveStatus === "approved" ||
    leaveType === "paid" ||
    leaveType === "unpaid" ||
    Number(record.paid_days || record.paidDays || 0) > 0 ||
    Number(record.unpaid_days || record.unpaidDays || 0) > 0 ||
    Boolean(record.leave_request_id || record.leaveRequestId)
  );
}

function resolveEmployeeCalendarStatus(record, { isSunday, isHoliday, isHalfDayHoliday, dateStr, todayStr } = {}) {
  if (isSunday) return "sunday";
  if (isHoliday) return "holiday";
  if (isHalfDayHoliday && !record) return "half_day";
  if (!record) return dateStr && todayStr && dateStr <= todayStr ? "absent" : "no_record";

  const status = normalizeAttendanceStatus(record.status || record.day_status);
  const hours = getRecordHours(record);
  const lateMinutes = Number(record.lateMinutes ?? record.late_minutes ?? 0);

  if (status === "full_day") return "present";
  if (status === "half_day") return "half_day";

  if (hasValidAttendance(record)) {
    if ((status === "late" || lateMinutes > 0) && hours >= 8) return "late";
    if (status === "absent" && hours < 4) return "absent";
    if (hours >= 8) return "present";
    return "absent";
  }

  if (hasApprovedLeave(record)) {
    if (
      status === "paid_leave" ||
      record.is_paid_leave === true ||
      record.isPaidLeave === true ||
      Number(record.paid_days || record.paidDays || 0) > 0
    ) {
      return "paid_leave";
    }

    return "unpaid_leave";
  }

  if (status === "absent") return "absent";
  if (status === "holiday") return "holiday";

  return "no_record";
}

function isPaidLeaveDay(rec = {}) {
  const safe = rec || {};
  const status = String(safe.status || safe.day_status || "").toLowerCase();
  const leaveType = String(safe.leave_type || safe.leaveType || safe.leave_category || safe.leaveCategory || "").toLowerCase();
  return (
    !hasValidAttendance(safe) &&
    hasApprovedLeave(safe) &&
    (
      safe.is_paid_leave === true ||
      safe.isPaidLeave === true ||
      status === "paid_leave" ||
      leaveType === "paid" ||
      Number(safe.paid_days || safe.paidDays || 0) > 0
    )
  );
}

function isUnpaidLeaveDay(rec = {}) {
  const safe = rec || {};
  const status = String(safe.status || safe.day_status || "").toLowerCase();
  const leaveType = String(safe.leave_type || safe.leaveType || safe.leave_category || safe.leaveCategory || "").toLowerCase();
  return (
    !hasValidAttendance(safe) &&
    hasApprovedLeave(safe) &&
    (
      safe.is_paid_leave === false ||
      safe.isPaidLeave === false ||
      status === "unpaid_leave" ||
      leaveType === "unpaid" ||
      Number(safe.unpaid_days || safe.unpaidDays || 0) > 0
    )
  );
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function AdminCalendar() {
  const today = new Date();
  const currentUser = useMemo(() => getStoredUser(), []);
  const isOperationalManager = currentUser?.role === "OPERATIONAL_MANAGER";
  const canManageCalendar = currentUser?.role === "SUPER_ADMIN";

  const [currentDate, setCurrentDate] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1)
  );
  const [calendarMode, setCalendarMode] = useState(
    isOperationalManager ? "my" : "branch"
  );
  const [currentBranch, setCurrentBranch] = useState("all");
  const [monthlyStatsCache, setMonthlyStatsCache] = useState({});
  const [calendarDaysCache, setCalendarDaysCache] = useState({});
  const [customEntries, setCustomEntries] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [branchMenuOpen, setBranchMenuOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [toast, setToast] = useState({ show: false, message: "" });

  const [monthStats, setMonthStats] = useState({
    totalDays: 0,
    workingDays: 0,
    holidaysCount: 0,
    halfDaysCount: 0,
    sundaysCount: 0,
  });

  const [calendarDays, setCalendarDays] = useState([]);
  const [bottomTables, setBottomTables] = useState({
    holidays: [],
    sundays: [],
    halfDays: [],
  });

  // --- NEW: Employee mode states ---
  const [employees, setEmployees] = useState([]);
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("all");
  const [employeeRecordsMap, setEmployeeRecordsMap] = useState(new Map());
  const [selectedDayRecord, setSelectedDayRecord] = useState(null);
  const [editRecord, setEditRecord] = useState(null);
  const [editError, setEditError] = useState("");

  const branchDropdownRef = useRef(null);
  const monthChangeTimerRef = useRef(null);

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

  const showToast = useCallback((message) => {
    setToast({ show: true, message });
    setTimeout(() => setToast({ show: false, message: "" }), 2200);
  }, []);

  const clearCaches = useCallback(() => {
    setMonthlyStatsCache({});
    setCalendarDaysCache({});
    setCustomEntries({});
  }, []);

  // --- NEW: Load employees when branch changes ---
  useEffect(() => {
    async function loadEmployees() {
      try {
        const data = await fetchEmployees(currentBranch);
        setEmployees(data);
        if (calendarMode === "my" && currentUser?.id) {
          setSelectedEmployeeId(String(currentUser.id));
        } else {
          setSelectedEmployeeId("all");
        }
      } catch (err) {
        console.error("Failed to load employees:", err);
        setEmployees([]);
      }
    }

    loadEmployees();
  }, [calendarMode, currentBranch, currentUser?.id]);

  useEffect(() => {
    setCalendarDaysCache({});
    setMonthlyStatsCache({});
    setEmployeeRecordsMap(new Map());
    setSelectedDayRecord(null);
    setEditRecord(null);

    if (calendarMode === "my" && currentUser?.id) {
      setSelectedEmployeeId(String(currentUser.id));
      setDepartmentFilter("all");
    } else if (calendarMode === "branch") {
      setSelectedEmployeeId("all");
    }

    setRefreshKey((prev) => prev + 1);
  }, [calendarMode, currentUser?.id]);

  const departmentOptions = useMemo(
    () => [
      "all",
      ...new Set(employees.map((emp) => emp.department).filter(Boolean)),
    ],
    [employees]
  );

  const filteredEmployees = useMemo(() => {
    if (departmentFilter === "all") return employees;
    return employees.filter((emp) => emp.department === departmentFilter);
  }, [departmentFilter, employees]);

  const fetchHolidays = useCallback(async (year, month) => {
    try {
      const data = await fetchHolidaysForMonth(year, month);

      const entries = {};

      data.forEach((h) => {
        const dateStr = String(h.date).slice(0, 10);
        const key = dateStr.slice(5, 10);

        entries[key] = {
          type: h.type,
          name: h.name,
        };
      });

      setCustomEntries(entries);
      return entries;
    } catch (e) {
      console.error("Failed to load holidays", e);
      setCustomEntries({});
      return {};
    }
  }, []);

  const fetchMonthStatsRange = useCallback(async (year, month, branch) => {
    const mm = String(month + 1).padStart(2, "0");
    const lastDay = new Date(year, month + 1, 0).getDate();
    const start = `${year}-${mm}-01`;
    const end = `${year}-${mm}-${String(lastDay).padStart(2, "0")}`;

    try {
      const records = await fetchAttendanceRange(start, end, branch);

      const statsMap = new Map();

      for (let d = 1; d <= lastDay; d++) {
        const dateStr = `${year}-${mm}-${String(d).padStart(2, "0")}`;
        statsMap.set(dateStr, {
          present: 0,
          absent: 0,
          late: 0,
          halfDay: 0,
          leave: 0,
          total: 0,
        });
      }

      for (const rec of records) {
        const dateStr = String(rec.date).slice(0, 10);

        statsMap.set(dateStr, {
          present: Number(rec.present) || 0,
          absent: Number(rec.absent) || 0,
          late: Number(rec.late) || 0,
          halfDay: Number(rec.halfDay ?? rec.half_day) || 0,
          leave: Number(rec.leave) || 0,
          total: Number(rec.total) || 0,
        });
      }

      return statsMap;
    } catch (err) {
      console.error("Summary range fetch failed:", err);
      return null;
    }
  }, []);

  const fetchStatsForDate = useCallback(async (dateStr, branch) => {
    let records = [];

    try {
      if (branch === "all") {
        const [hyd, bang] = await Promise.all([
          fetchAttendanceForDate(dateStr, "Hyderabad"),
          fetchAttendanceForDate(dateStr, "Bangalore"),
        ]);

        records = [...hyd, ...bang];
      } else {
        records = await fetchAttendanceForDate(dateStr, branch);
      }
    } catch (e) {
      return {
        present: 0,
        absent: 0,
        late: 0,
        halfDay: 0,
        leave: 0,
        total: 0,
      };
    }

    let present = 0;
    let absent = 0;
    let late = 0;
    let halfDay = 0;
    let leave = 0;

    for (const r of records) {
      const st = (r.status || "absent").toLowerCase();

      if (st === "full_day") present++;
      else if (st === "half_day") halfDay++;
      else if (st === "leave") leave++;
      else if (st === "absent") absent++;

      if ((r.late_minutes || 0) > 0 && st !== "absent") late++;
    }

    return {
      present,
      absent,
      late,
      halfDay,
      leave,
      total: records.length,
    };
  }, []);

  const fetchMonthStats = useCallback(
    async (year, month, branch) => {
      const fast = await fetchMonthStatsRange(year, month, branch);
      if (fast) return fast;

      const statsMap = new Map();
      const lastDay = new Date(year, month + 1, 0).getDate();
      const mm = String(month + 1).padStart(2, "0");

      for (let d = 1; d <= lastDay; d++) {
        const dateStr = `${year}-${mm}-${String(d).padStart(2, "0")}`;
        statsMap.set(dateStr, await fetchStatsForDate(dateStr, branch));
      }

      const cacheKey = `${year}-${month}|${branch}`;

      setMonthlyStatsCache((prev) => ({
        ...prev,
        [cacheKey]: statsMap,
      }));

      return statsMap;
    },
    [fetchMonthStatsRange, fetchStatsForDate]
  );

  const updateMonthStatsFromEntries = useCallback((year, month, entries) => {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const mm = String(month + 1).padStart(2, "0");

    let holidayCount = 0;
    let halfDayCount = 0;
    let sundayCount = 0;
    let workingDays = 0;

    for (let d = 1; d <= daysInMonth; d++) {
      const dateKey = `${mm}-${String(d).padStart(2, "0")}`;
      const entry = entries[dateKey] || null;
      const isSun = new Date(year, month, d).getDay() === 0;

      if (isSun) {
        sundayCount++;
        continue;
      }

      if (entry?.type === "holiday") {
        holidayCount++;
      } else if (entry?.type === "halfday") {
        halfDayCount++;
        workingDays += 0.5;
      } else {
        workingDays++;
      }
    }

    setMonthStats({
      totalDays: daysInMonth,
      workingDays: workingDays % 1 === 0 ? workingDays : workingDays.toFixed(1),
      holidaysCount: holidayCount,
      halfDaysCount: halfDayCount,
      sundaysCount: sundayCount,
    });
  }, []);

  const renderBottomTablesFromEntries = useCallback((year, month, entries) => {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const mm = String(month + 1).padStart(2, "0");

    const holidays = [];
    const halfDays = [];
    const sundays = [];

    for (let d = 1; d <= daysInMonth; d++) {
      const dateKey = `${mm}-${String(d).padStart(2, "0")}`;
      const entry = entries[dateKey] || null;
      const display = `${month + 1}/${d}`;

      if (entry?.type === "holiday") {
        holidays.push({ date: display, name: entry.name });
      }

      if (entry?.type === "halfday") {
        halfDays.push({ date: display, name: entry.name });
      }

      if (new Date(year, month, d).getDay() === 0) {
        sundays.push({ date: display });
      }
    }

    setBottomTables({ holidays, sundays, halfDays });
  }, []);

  // --- NEW: Fetch employee records for selected month ---
  const fetchSelectedEmployeeRecords = useCallback(
    async (year, month) => {
      if (selectedEmployeeId === "all") {
        setEmployeeRecordsMap(new Map());
        return new Map();
      }

      const monthStr = `${year}-${String(month + 1).padStart(2, "0")}`;
      const { start, end } = monthRangeBounds(monthStr);

      const data = await fetchEmployeeCalendar(selectedEmployeeId, start, end);

      const map = new Map();

      data.forEach((row) => {
        const rec = transformAttendanceRangeRecord(row);
        map.set(rec.date, rec);
      });

      setEmployeeRecordsMap(map);
      return map;
    },
    [selectedEmployeeId]
  );

  const renderCalendar = useCallback(async () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const mm = String(month + 1).padStart(2, "0");
    const cacheKey = `${year}-${mm}|${currentBranch}|${refreshKey}`;
    const todayStr = new Date().toISOString().slice(0, 10);

    setLoading(true);
    setError("");

    try {
      const holidayEntries = await fetchHolidays(year, month + 1);

      // --- UPDATED: branch vs employee mode ---
      let statsMap = null;
      let employeeMap = new Map();

      if (selectedEmployeeId === "all") {
        statsMap = await fetchMonthStats(year, month, currentBranch);
      } else {
        employeeMap = await fetchSelectedEmployeeRecords(year, month);
      }

      const lastDay = new Date(year, month + 1, 0).getDate();
      const firstWeekday = new Date(year, month, 1).getDay();

      const days = [];

      WEEKDAYS.forEach((day) => {
        days.push({ type: "weekday", label: day });
      });

      for (let i = 0; i < firstWeekday; i++) {
        days.push({ type: "empty" });
      }

      for (let d = 1; d <= lastDay; d++) {
        const dateKey = `${mm}-${String(d).padStart(2, "0")}`;
        const dateStr = `${year}-${dateKey}`;
        const entry = holidayEntries[dateKey] || null;
        const weekday = new Date(year, month, d).getDay();
        const isSun = weekday === 0;

        // --- NEW: employee record for this day ---
        const employeeRecord = employeeMap.get(dateStr) || null;

        let dayClass = "calendar-day";
        let statusLabel = "";
        let tooltipContent;

        // --- NEW: Employee mode rendering ---
        if (selectedEmployeeId !== "all") {
          const st = employeeRecord?.status || null;
          const isLate = Number(employeeRecord?.lateMinutes || 0) > 0;
          const isCompanyHoliday = entry?.type === "holiday";
          const isCompanyHalfDay = entry?.type === "halfday";
          const statusKey = resolveEmployeeCalendarStatus(employeeRecord, {
            isSunday: isSun,
            isHoliday: isCompanyHoliday,
            isHalfDayHoliday: isCompanyHalfDay,
            dateStr,
            todayStr,
          });
          const normalizedStatus = normalizeAttendanceStatus(st);
          const lateMinutes = Number(employeeRecord?.lateMinutes || employeeRecord?.late_minutes || 0);

          dayClass += " employee-day";

          if (statusKey === "sunday" || statusKey === "holiday") {
            dayClass += " calendar-holiday";
          } else if (statusKey === "paid_leave") {
            dayClass += " calendar-paid-leave paid-leave";
          } else if (statusKey === "unpaid_leave") {
            dayClass += " calendar-unpaid-leave unpaid-leave";
          } else if (statusKey === "absent") {
            dayClass += " calendar-absent";
          } else if (statusKey === "half_day") {
            dayClass += " calendar-halfday";
          } else if (statusKey === "late") {
            dayClass += " calendar-late";
          } else if (statusKey === "present") {
            dayClass += " calendar-present";
          } else {
            dayClass += " calendar-empty";
          }

          if (normalizedStatus && normalizedStatus !== "no_record") {
            dayClass += ` ${normalizedStatus}`;
          }

          if (statusKey === "late") {
            dayClass += " late-day";
          }

          const labelText = (() => {
            if (statusKey === "sunday") return "Sunday";
            if (statusKey === "holiday") return entry.name || "Holiday";
            if (statusKey === "paid_leave") return "Paid Leave";
            if (statusKey === "unpaid_leave") return "Unpaid Leave";
            if (statusKey === "absent") return "Absent";
            if (statusKey === "half_day") return "Half Day";
            if (statusKey === "late") return `Late ${lateMinutes}m`;
            if (statusKey === "present") return "Present";
            return "No Record";
          })();

          statusLabel = (
            <div className="status-label">
              {st === "full_day" && "✅ Full Day"}
              {st === "half_day" && "🌓 Half Day"}
              {st === "absent" && "❌ Absent"}
              {st === "leave" && "🏖️ Leave"}
              {st === "holiday" && "🎉 Holiday"}
              {isLate && st !== "absent" ? ` 🔴 Late ${employeeRecord.lateMinutes}m` : ""}
            </div>
          );

          statusLabel = <div className="status-label">{labelText}</div>;

          tooltipContent = (
            <div className="tooltip-card">
              <div className="tooltip-title">{dateStr}</div>
              <div className="tooltip-row">Status: {labelText}</div>
              <div className="tooltip-row">Login: {formatTime12Hour(employeeRecord?.checkIn)}</div>
              <div className="tooltip-row">Logout: {formatTime12Hour(employeeRecord?.checkOut)}</div>
              <div className="tooltip-row">Hours: {formatProductionHours(employeeRecord?.workHours)}</div>
              {employeeRecord?.half_day_effective_minutes !== undefined && employeeRecord?.half_day_effective_minutes !== null ? (
                <div className="tooltip-row">
                  Half-Day Effective: {Math.floor(Number(employeeRecord.half_day_effective_minutes || 0) / 60)}h {Number(employeeRecord.half_day_effective_minutes || 0) % 60}m
                </div>
              ) : null}
              {employeeRecord?.half_day_slot_checked ? (
                <div className="tooltip-row">Slot Checked: {employeeRecord.half_day_slot_checked}</div>
              ) : null}
              {employeeRecord?.half_day_invalid_reason ? (
                <div className="tooltip-row">Reason: {employeeRecord.half_day_invalid_reason}</div>
              ) : null}
              <div className="tooltip-row">Late: {employeeRecord?.lateMinutes || 0} min</div>
            </div>
          );

          days.push({
            type: "day",
            dayNumber: d,
            dateStr,
            record: employeeRecord,
            className: dayClass,
            statusLabel,
            tooltipContent,
          });

          continue;
        }

        // --- EXISTING: Company summary mode rendering ---
        const stats = statsMap.get(dateStr) || {
          present: 0,
          absent: 0,
          late: 0,
          halfDay: 0,
          leave: 0,
          total: 0,
        };

        const isCompanyHoliday = entry?.type === "holiday";
        const isCompanyHalfDay = entry?.type === "halfday";

        if (isSun && !entry) {
          dayClass += " sunday";
          statusLabel = (
            <div
              className="status-label"
              style={{ background: "rgba(185,28,28,0.3)" }}
            >
              📆 Sunday
            </div>
          );
        } else if (isCompanyHoliday) {
          dayClass += " holiday";
          statusLabel = (
            <div
              className="status-label"
              style={{ background: "rgba(255, 140, 0,0.3)" }}
            >
              🎉 {entry.name}
            </div>
          );
        } else if (isCompanyHalfDay) {
          dayClass += " halfday";
          statusLabel = (
            <div
              className="status-label"
              style={{ background: "rgba(139,92,246,0.3)" }}
            >
              🌓 {entry.name}
            </div>
          );
        } else {
          dayClass += " working";
        }

        if (isSun && !entry) {
          tooltipContent = (
            <div className="tooltip-card">
              <div className="tooltip-title">
                Sunday – {MONTH_NAMES[month]} {d}
              </div>
              <div className="tooltip-row">📆 Weekly Off</div>
            </div>
          );
        } else if (isCompanyHoliday) {
          tooltipContent = (
            <div className="tooltip-card">
              <div className="tooltip-title">🎉 {entry.name}</div>
              <div className="tooltip-row">Office Closed</div>
            </div>
          );
        } else {
          tooltipContent = (
            <div className="tooltip-card">
              <div className="tooltip-title">
                {MONTH_NAMES[month]} {d}, {year}
              </div>

              {isCompanyHalfDay && (
                <div
                  className="tooltip-row"
                  style={{ color: "#8B5CF6", fontSize: "0.7em" }}
                >
                  🌓 Company half-day: {entry.name}
                </div>
              )}

              <div className="tooltip-row">
                <span>✅ Present</span>
                <span style={{ color: CALENDAR_STATUS_COLORS.present.text }}>{stats.present}</span>
              </div>

              <div className="tooltip-row">
                <span>❌ Absent</span>
                <span style={{ color: CALENDAR_STATUS_COLORS.absent.text }}>{stats.absent}</span>
              </div>

              <div className="tooltip-row">
                <span>🔴 Late</span>
                <span style={{ color: CALENDAR_STATUS_COLORS.late.text }}>{stats.late}</span>
              </div>

              <div className="tooltip-row">
                <span>🌓 Half Day</span>
                <span style={{ color: "#8B5CF6" }}>{stats.halfDay}</span>
              </div>

              <div className="tooltip-row">
                <span>🏖️ Leave</span>
                <span style={{ color: CALENDAR_STATUS_COLORS.paid_leave.text }}>{stats.leave}</span>
              </div>

              <div
                className="tooltip-row"
                style={{
                  borderTop: "1px solid rgba(255, 140, 0,0.2)",
                  marginTop: "4px",
                  paddingTop: "4px",
                }}
              >
                <span>📋 Total Records</span>
                <span style={{ fontWeight: "700" }}>{stats.total}</span>
              </div>
            </div>
          );
        }

        days.push({
          type: "day",
          dayNumber: d,
          dateStr,
          className: dayClass,
          statusLabel,
          tooltipContent,
        });
      }

      const totalCells = firstWeekday + lastDay;
      const remaining = Math.ceil(totalCells / 7) * 7 - totalCells;

      for (let i = 0; i < remaining; i++) {
        days.push({ type: "empty" });
      }

      setCalendarDays(days);
      setCalendarDaysCache((prev) => ({ ...prev, [cacheKey]: days }));

      updateMonthStatsFromEntries(year, month, holidayEntries);
      renderBottomTablesFromEntries(year, month, holidayEntries);
    } catch (err) {
      const message =
        err.response?.data?.message || err.message || "Failed to load data";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [
    currentDate,
    currentBranch,
    selectedEmployeeId,
    refreshKey,
    fetchHolidays,
    fetchMonthStats,
    fetchSelectedEmployeeRecords,
    updateMonthStatsFromEntries,
    renderBottomTablesFromEntries,
  ]);

  useEffect(() => {
    renderCalendar();
  }, [renderCalendar]);

  const changeMonth = (delta) => {
    if (monthChangeTimerRef.current) {
      clearTimeout(monthChangeTimerRef.current);
    }

    monthChangeTimerRef.current = setTimeout(() => {
      let y = currentDate.getFullYear();
      let m = currentDate.getMonth() + delta;

      if (m < 0) {
        m = 11;
        y--;
      }

      if (m > 11) {
        m = 0;
        y++;
      }

      setCurrentDate(new Date(y, m, 1));
      showToast(`Switched to ${MONTH_NAMES[m]} ${y}`);
    }, 200);
  };

  const handleBranchSelect = (branch) => {
    setCurrentBranch(branch);
    setDepartmentFilter("all");
    setSelectedEmployeeId("all");
    setBranchMenuOpen(false);
    setCalendarDaysCache({});
    setMonthlyStatsCache({});

    showToast(`Filtering: ${branch === "all" ? "All Branches" : branch}`);
  };

  const handleAddHoliday = async () => {
    const date = prompt("Enter date (YYYY-MM-DD):\nExample: 2026-06-15");
    if (!date) return;

    const cleanDate = date.trim();

    if (!/^\d{4}-\d{2}-\d{2}$/.test(cleanDate)) {
      showToast("❌ Date must be YYYY-MM-DD format");
      return;
    }

    const name = prompt("Enter holiday / half-day label:\nExample: Diwali");
    if (!name || !name.trim()) {
      showToast("❌ Name cannot be empty");
      return;
    }

    const cleanName = name.trim();

    const isHalfDay = confirm(
      "Click OK for Half Day\nClick Cancel for Full Holiday"
    );

    const type = isHalfDay ? "halfday" : "holiday";

    try {
      const savedHoliday = await addHoliday(cleanDate, cleanName, type);
      console.log("✅ SAVED HOLIDAY:", savedHoliday);

      const [y, m] = cleanDate.split("-").map(Number);

      setCalendarDaysCache({});
      setMonthlyStatsCache({});
      setCustomEntries({});

      setCurrentDate(new Date(y, m - 1, 1));

      setRefreshKey((prev) => prev + 1);

      showToast(`✅ "${cleanName}" added for ${cleanDate}`);
    } catch (e) {
      showToast("❌ Network error: " + (e.response?.data?.message || e.message));
      console.error(e);
    }
  };

  const branchDisplay =
    currentBranch === "all"
      ? "All Branches"
      : currentBranch === "Hyderabad"
      ? "🐘 Hyderabad Centre"
      : "💻 Bangalore Tech Hub";

  return (
    <div className="admin-calendar-page admin-portal-page">
      <div className="page-header">
        <div className="title">
          <h1>
            <i className="fas fa-calendar-alt"></i> Attendance Calendar
          </h1>
          <p>
            {calendarMode === "my"
              ? "Your monthly attendance, leave, break, and production summary"
              : "Live from attendance_records table | Hover for real stats"}
          </p>
          {isOperationalManager && (
            <div className="calendar-mode-toggle" aria-label="Attendance calendar mode">
              <button
                type="button"
                className={calendarMode === "my" ? "active" : ""}
                onClick={() => setCalendarMode("my")}
              >
                My Attendance
              </button>
              <button
                type="button"
                className={calendarMode === "branch" ? "active" : ""}
                onClick={() => setCalendarMode("branch")}
              >
                Branch Attendance
              </button>
            </div>
          )}
        </div>

        <div
          style={{
            display: "flex",
            gap: "12px",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          {canManageCalendar && (
            <button
              onClick={handleAddHoliday}
              style={{
                background: "#FF8C00",
                border: "none",
                padding: "10px 22px",
                borderRadius: "40px",
                fontWeight: "600",
                cursor: "pointer",
                color: "#1A2B4B",
              }}
            >
              + Add Holiday
            </button>
          )}

          {/* --- NEW: Employee dropdown --- */}
          {calendarMode === "branch" && (
            <>
              <select
                value={departmentFilter}
                onChange={(e) => {
                  setDepartmentFilter(e.target.value);
                  setSelectedEmployeeId("all");
                  setCalendarDaysCache({});
                  setMonthlyStatsCache({});
                  setRefreshKey((prev) => prev + 1);
                }}
                style={{
                  background: "#FFFFFF",
                  color: "#0D47A1",
                  border: "1px solid #DBE7F3",
                  padding: "10px 16px",
                  borderRadius: "30px",
                  fontWeight: "600",
                }}
              >
                {departmentOptions.map((department) => (
                  <option key={department} value={department}>
                    {department === "all" ? "All Departments" : department}
                  </option>
                ))}
              </select>

              <select
                value={selectedEmployeeId}
                onChange={(e) => {
                  setSelectedEmployeeId(e.target.value);
                  setCalendarDaysCache({});
                  setMonthlyStatsCache({});
                  setRefreshKey((prev) => prev + 1);
                }}
                style={{
                  background: "#FFFFFF",
                  color: "#0D47A1",
                  border: "1px solid #DBE7F3",
                  padding: "10px 16px",
                  borderRadius: "30px",
                  fontWeight: "600",
                }}
              >
                <option value="all">All Employees</option>
                {filteredEmployees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.full_name} - {emp.department}
                  </option>
                ))}
              </select>
            </>
          )}

          {calendarMode === "branch" && (
          <div className="branch-dropdown" ref={branchDropdownRef}>
            <button
              type="button"
              className="branch-selector"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setBranchMenuOpen((open) => !open);
              }}
            >
              <i className="fas fa-store"></i>
              <span>{branchDisplay}</span>
              <i className="fas fa-chevron-down"></i>
            </button>

            {branchMenuOpen && (
              <div
                className="branch-menu"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  className="branch-menu-item"
                  onClick={() => handleBranchSelect("all")}
                >
                  🌍 All Branches
                </button>

                <button
                  type="button"
                  className="branch-menu-item"
                  onClick={() => handleBranchSelect("Bangalore")}
                >
                  💻 Bangalore Tech Hub
                </button>

                <button
                  type="button"
                  className="branch-menu-item"
                  onClick={() => handleBranchSelect("Hyderabad")}
                >
                  🐘 Hyderabad Centre
                </button>
              </div>
            )}
          </div>
          )}
        </div>
      </div>

      <div className="month-nav">
        <button onClick={() => changeMonth(-1)}>
          <i className="fas fa-chevron-left"></i> Prev
        </button>

        <span>
          {MONTH_NAMES[currentDate.getMonth()]} {currentDate.getFullYear()}
        </span>

        <button onClick={() => changeMonth(1)}>
          Next <i className="fas fa-chevron-right"></i>
        </button>
      </div>

      <div className="month-stats">
        <div className="stat-card">
          <div className="stat-value">{monthStats.totalDays}</div>
          <div className="stat-label">Total Days</div>
        </div>

        <div className="stat-card">
          <div className="stat-value">{monthStats.workingDays}</div>
          <div className="stat-label">Working Days</div>
        </div>

        <div className="stat-card">
          <div className="stat-value">{monthStats.holidaysCount}</div>
          <div className="stat-label">Holidays</div>
        </div>

        <div className="stat-card">
          <div className="stat-value">{monthStats.halfDaysCount}</div>
          <div className="stat-label">Half Days</div>
        </div>

        <div className="stat-card">
          <div className="stat-value">{monthStats.sundaysCount}</div>
          <div className="stat-label">Sundays</div>
        </div>
      </div>

      <div className="legend">
        <div className="legend-item">
          <div className="color-dot present"></div>
          <span>Present</span>
        </div>

        <div className="legend-item">
          <div className="color-dot absent"></div>
          <span>Absent</span>
        </div>

        <div className="legend-item">
          <div className="color-dot late"></div>
          <span>Late</span>
        </div>

        <div className="legend-item">
          <div className="color-dot halfday"></div>
          <span>Half Day (company)</span>
        </div>

        <div className="legend-item">
          <div className="color-dot leave"></div>
          <span>Paid Leave</span>
        </div>

        <div className="legend-item">
          <div className="color-dot unpaid-leave"></div>
          <span>Unpaid Leave</span>
        </div>

        <div className="legend-item">
          <div className="color-dot holiday"></div>
          <span>Holiday</span>
        </div>

        <div className="legend-item">
          <div className="color-dot sunday"></div>
          <span>Sunday</span>
        </div>
      </div>

      <div className="calendar-grid" style={{ position: "relative" }}>
        {loading && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(3,3,3,0.55)",
              zIndex: 10,
              backdropFilter: "blur(2px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div className="loading-spinner"></div>
          </div>
        )}

        {error ? (
          <div style={{ textAlign: "center", padding: "40px" }}>
            Failed to load calendar: {error}
          </div>
        ) : (
          calendarDays.map((item, index) => {
            if (item.type === "weekday") {
              return (
                <div key={`weekday-${index}`} className="calendar-weekday">
                  {item.label}
                </div>
              );
            }

            if (item.type === "empty") {
              return (
                <div
                  key={`empty-${index}`}
                  className="calendar-day"
                  style={{
                    opacity: "0.3",
                    background: "#F5F7FA",
                    pointerEvents: "none",
                  }}
                >
                  <div className="day-number"></div>
                </div>
              );
            }

            return (
              // --- UPDATED: click handler for employee mode ---
              <div
                key={`day-${index}`}
                className={item.className}
                onClick={() => {
                  if (selectedEmployeeId !== "all") {
                    setSelectedDayRecord(
                      item.record || {
                        date: item.dateStr,
                        status: "no_record",
                        checkIn: "--",
                        checkOut: "--",
                        lateMinutes: 0,
                        workHours: 0,
                        breakDetails: {
                          b1: { in: "--", out: "--" },
                          lunch: { in: "--", out: "--" },
                          b2: { in: "--", out: "--" },
                        },
                      }
                    );
                  }
                }}
              >
                <div className="day-number">{item.dayNumber}</div>
                {item.statusLabel}
                {item.tooltipContent}
              </div>
            );
          })
        )}
      </div>

      {/* --- NEW: View popup --- */}
      {selectedDayRecord && (
        <div className="attendance-modal">
          <div className="attendance-modal-card">
            <h2>Attendance Details</h2>

            <p><b>Date:</b> {selectedDayRecord.date}</p>
            <p><b>Status:</b> {selectedDayRecord.status}</p>
            <p><b>Login:</b> {formatTime12Hour(selectedDayRecord.checkIn)}</p>
            <p><b>Logout:</b> {formatTime12Hour(selectedDayRecord.checkOut)}</p>
            <p><b>Late:</b> {selectedDayRecord.lateMinutes} minutes</p>
            <p><b>Production:</b> {formatProductionHours(selectedDayRecord.workHours)}</p>

            <hr />

            <p><b>Break 1:</b> {selectedDayRecord.breakDetails?.b1?.in || "--"} → {selectedDayRecord.breakDetails?.b1?.out || "--"}</p>
            <p><b>Lunch:</b> {selectedDayRecord.breakDetails?.lunch?.in || "--"} → {selectedDayRecord.breakDetails?.lunch?.out || "--"}</p>
            <p><b>Break 2:</b> {selectedDayRecord.breakDetails?.b2?.in || "--"} → {selectedDayRecord.breakDetails?.b2?.out || "--"}</p>

            {canManageCalendar && (
              <button
                onClick={() => {
                  setEditError("");
                  setEditRecord(selectedDayRecord);
                }}
              >
                Edit Attendance
              </button>
            )}

            <button onClick={() => setSelectedDayRecord(null)}>
              Close
            </button>
          </div>
        </div>
      )}

      {/* --- NEW: Edit popup --- */}
      {editRecord && (
        <div className="attendance-modal">
          <div className="attendance-modal-card">
            <h2>Edit Attendance</h2>

            <label>Status</label>
            <select id="editStatus" defaultValue={editRecord.status || "auto"}>
              <option value="auto">Auto Calculate</option>
              <option value="full_day">Full Day</option>
              <option value="half_day">Half Day</option>
              <option value="absent">Absent</option>
              <option value="leave">Leave</option>
            </select>

            <label>Login Time</label>
            <input id="editLogin" type="time" defaultValue={editRecord.checkIn !== "--" ? editRecord.checkIn : ""} />

            <label>Logout Time</label>
            <input id="editLogout" type="time" defaultValue={editRecord.checkOut !== "--" ? editRecord.checkOut : ""} />

            <label>Break 1 In</label>
            <input id="editB1In" type="time" defaultValue={editRecord.breakDetails?.b1?.in !== "--" ? editRecord.breakDetails?.b1?.in : ""} />

            <label>Break 1 Out</label>
            <input id="editB1Out" type="time" defaultValue={editRecord.breakDetails?.b1?.out !== "--" ? editRecord.breakDetails?.b1?.out : ""} />

            <label>Lunch In</label>
            <input id="editLunchIn" type="time" defaultValue={editRecord.breakDetails?.lunch?.in !== "--" ? editRecord.breakDetails?.lunch?.in : ""} />

            <label>Lunch Out</label>
            <input id="editLunchOut" type="time" defaultValue={editRecord.breakDetails?.lunch?.out !== "--" ? editRecord.breakDetails?.lunch?.out : ""} />

            <label>Break 2 In</label>
            <input id="editB2In" type="time" defaultValue={editRecord.breakDetails?.b2?.in !== "--" ? editRecord.breakDetails?.b2?.in : ""} />

            <label>Break 2 Out</label>
            <input id="editB2Out" type="time" defaultValue={editRecord.breakDetails?.b2?.out !== "--" ? editRecord.breakDetails?.b2?.out : ""} />

            <label>Reason <span style={{ color: "#DC2626" }}>*</span></label>
            <textarea
              id="editReason"
              rows={3}
              placeholder="Enter the reason for this calendar attendance edit"
              style={{
                resize: "vertical",
                minHeight: "82px",
                border: editError ? "1px solid #DC2626" : "1px solid #DBE7F3",
              }}
            />
            {editError && (
              <div style={{ color: "#DC2626", fontSize: "0.8rem", marginTop: "-6px" }}>
                {editError}
              </div>
            )}

            <button
              onClick={async () => {
                const status = document.getElementById("editStatus").value;
                const reason = document.getElementById("editReason").value.trim();

                if (!reason) {
                  setEditError("Reason is required before saving attendance changes.");
                  return;
                }

                try {
                  await updateEmployeeCalendarDay(selectedEmployeeId, {
                    date: editRecord.date,
                    source: "calendar",
                    reason,
                    status: status === "auto" ? null : status,
                    check_in_time: document.getElementById("editLogin").value || null,
                    check_out_time: document.getElementById("editLogout").value || null,
                    break1_in: document.getElementById("editB1In").value || null,
                    break1_out: document.getElementById("editB1Out").value || null,
                    break3_in: document.getElementById("editLunchIn").value || null,
                    break3_out: document.getElementById("editLunchOut").value || null,
                    break2_in: document.getElementById("editB2In").value || null,
                    break2_out: document.getElementById("editB2Out").value || null,
                  });

                  setEditError("");
                  setEditRecord(null);
                  setSelectedDayRecord(null);
                  setEmployeeRecordsMap(new Map());
                  setCalendarDaysCache({});
                  setMonthlyStatsCache({});
                  setRefreshKey((prev) => prev + 1);
                  showToast("Attendance updated successfully");
                } catch (err) {
                  setEditError(
                    err?.response?.data?.message ||
                    "Unable to update attendance. Please try again."
                  );
                }
              }}
            >
              Save
            </button>

            <button
              onClick={() => {
                setEditError("");
                setEditRecord(null);
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="bottom-tables">
        <div className="info-table">
          <h3>
            <i className="fas fa-calendar-times"></i> Holidays
          </h3>

          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Name</th>
              </tr>
            </thead>

            <tbody>
              {bottomTables.holidays.length === 0 ? (
                <tr>
                  <td colSpan="2">No holidays</td>
                </tr>
              ) : (
                bottomTables.holidays.map((h, index) => (
                  <tr key={`holiday-${index}`}>
                    <td>{h.date}</td>
                    <td>{escapeHtml(h.name)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="info-table">
          <h3>
            <i className="fas fa-sun"></i> Sundays
          </h3>

          <table>
            <thead>
              <tr>
                <th>Date</th>
              </tr>
            </thead>

            <tbody>
              {bottomTables.sundays.length === 0 ? (
                <tr>
                  <td>No Sundays</td>
                </tr>
              ) : (
                bottomTables.sundays.map((s, index) => (
                  <tr key={`sunday-${index}`}>
                    <td>{s.date}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="info-table">
          <h3>
            <i className="fas fa-adjust"></i> Half Days (Company)
          </h3>

          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Name</th>
              </tr>
            </thead>

            <tbody>
              {bottomTables.halfDays.length === 0 ? (
                <tr>
                  <td colSpan="2">No half days</td>
                </tr>
              ) : (
                bottomTables.halfDays.map((h, index) => (
                  <tr key={`halfday-${index}`}>
                    <td>{h.date}</td>
                    <td>{escapeHtml(h.name)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div
        className={`toast ${toast.show ? "show" : ""}`}
        style={{
          position: "fixed",
          bottom: "20px",
          right: "20px",
          background: "#FFF4E5",
          borderLeft: "4px solid #FF8C00",
          padding: "10px 20px",
          borderRadius: "40px",
          color: "#FFF4E5",
          zIndex: "2000",
          opacity: toast.show ? "1" : "0",
          transition: "0.2s",
          pointerEvents: "none",
        }}
      >
        {toast.message}
      </div>
    </div>
  );
}

export default AdminCalendar;
