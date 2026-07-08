/** Attendance analysis — date/format/compute helpers (from adminAttendanceAnalysis.html) */
import { formatTime12Hour } from "./timeFormat";
import { isGraceLateAttendanceRecord } from "./dashboardHelpers";

export { isGraceLateAttendanceRecord };

export const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export const BRANCH_FILTER_OPTIONS = [
  { value: "all", label: "All Branches" },
  { value: "Hyderabad", label: "Hyderabad" },
  { value: "Bangalore", label: "Bangalore" },
];

export const ANALYSIS_TABS = [
  { id: "overview", label: "📅 Monthly Overview" },
  { id: "weekly", label: "📆 Weekly Deep Dive" },
  { id: "dailylog", label: "📋 Day Log" },
  { id: "breakanalytics", label: "☕ Break Analytics" },
  { id: "leavesalary", label: "🌿 Leave & Salary" },
];

export const WEEK_FILTER_OPTIONS = [
  { value: "all", label: "All" },
  { value: "1", label: "Week1" },
  { value: "2", label: "Week2" },
  { value: "3", label: "Week3" },
  { value: "4", label: "Week4" },
  { value: "5", label: "Week5" },
];

export function parseLocalDate(s) {
  const [y, m, d] = String(s || "").slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function formatDateReadable(s) {
  if (!s) return "";
  const [, m, d] = String(s).slice(0, 10).split("-").map(Number);
  return `${MONTH_NAMES[m - 1]} ${d}`;
}

export function formatDateYMD(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function dayName(s) {
  if (!s) return "";
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][
    parseLocalDate(s).getDay()
  ];
}

export function formatTimeDisplay(t) {
  if (!t || t === "--" || t === "—") return "--";
  return formatTime12Hour(t);
}

export function monthLabel(yearMonth) {
  const [yr, mo] = yearMonth.split("-");
  return `${MONTH_NAMES[parseInt(mo, 10) - 1]} ${yr}`;
}

export function mapEmployeeOption(e) {
  return {
    id: e.id,
    name: e.full_name,
    dept: e.department,
    branch: e.branch,
    initials: (e.full_name?.split(" ").map((n) => n[0]).join("").slice(0, 2) || "EM").toUpperCase(),
    salary: e.salary,
    monthly_salary: e.monthly_salary,
    daily_salary: e.daily_salary,
    paid_leave_balance: e.paid_leave_balance,
    paidLeaveBalance: e.paidLeaveBalance,
    leave_balance: e.leave_balance,
    leaveBalance: e.leaveBalance,
    available_paid_leaves: e.available_paid_leaves,
    availablePaidLeaves: e.availablePaidLeaves,
    earned_leave_balance: e.earned_leave_balance,
    earnedLeaveBalance: e.earnedLeaveBalance,
  };
}

export function safeNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

export function getLeaveDays(leave = {}) {
  return safeNumber(leave?.days ?? leave?.requested_days ?? leave?.requestedDays ?? 0);
}

export function getLeavePaidDays(leave = {}) {
  const explicit = leave?.paid_days ?? leave?.paidDays;
  if (explicit !== undefined && explicit !== null && explicit !== "") {
    return safeNumber(explicit);
  }
  const type = String(leave?.leave_type || leave?.leaveType || leave?.leave_category || leave?.leaveCategory || "").toLowerCase();
  const status = String(leave?.status || leave?.day_status || "").toLowerCase();
  return type === "paid" || status === "paid_leave" ? getLeaveDays(leave) : 0;
}

export function getLeaveUnpaidDays(leave = {}) {
  const explicit = leave?.unpaid_days ?? leave?.unpaidDays;
  if (explicit !== undefined && explicit !== null && explicit !== "") {
    return safeNumber(explicit);
  }
  const type = String(leave?.leave_type || leave?.leaveType || leave?.leave_category || leave?.leaveCategory || "").toLowerCase();
  const status = String(leave?.status || leave?.day_status || "").toLowerCase();
  return type === "unpaid" || status === "unpaid_leave" ? getLeaveDays(leave) : 0;
}

export function getAvailablePaidLeaves(employee = {}) {
  return safeNumber(
    employee?.paid_leave_balance ??
      employee?.paidLeaveBalance ??
      employee?.leave_balance ??
      employee?.leaveBalance ??
      employee?.available_paid_leaves ??
      employee?.availablePaidLeaves ??
      employee?.earned_leave_balance ??
      employee?.earnedLeaveBalance ??
      0
  );
}

export function getEmployeeDailySalary(employee = {}) {
  const directDaily = safeNumber(employee?.daily_salary ?? employee?.dailySalary ?? 0);
  if (directDaily > 0) return directDaily;
  const monthlySalary = safeNumber(
    employee?.salary ??
      employee?.monthly_salary ??
      employee?.monthlySalary ??
      employee?.base_salary ??
      employee?.monthly_ctc ??
      employee?.monthlyCTC ??
      0
  );
  return monthlySalary > 0 ? monthlySalary / 30 : 0;
}

export function formatLeaveNumber(value) {
  const num = safeNumber(value);
  return Number.isInteger(num) ? String(num) : num.toFixed(1);
}

export function calculateLeaveSalaryImpact(leaves = [], employee = {}) {
  const totalLeaves = (leaves || []).reduce(
    (total, leave) => total + getLeaveDays(leave),
    0
  );
  const paidLeavesLeft = getAvailablePaidLeaves(employee);
  const extraDays = Math.max(0, totalLeaves - paidLeavesLeft);
  const employeeDailySalary = getEmployeeDailySalary(employee);
  const salaryDeduction = extraDays * employeeDailySalary;

  return {
    totalLeaves,
    paidLeavesLeft,
    extraDays,
    salaryDeduction,
  };
}

export function isPaidLeaveRecord(rec = {}) {
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

export function isUnpaidLeaveRecord(rec = {}) {
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

export function normalizeAttendanceAnalysisRecord(rec, fallbackDate = "") {
  const safe = rec || {};
  const date = safe.date || fallbackDate || "";
  const today = new Date().toISOString().slice(0, 10);
  const defaultStatus = date && date > today ? "no_record" : "absent";
  const breakMins = safe.breakMins || {
    b1: 0,
    lunch: 0,
    b2: 0,
    b3: 0,
    b3Count: 0,
    b3History: [],
  };
  const breakDetails = safe.breakDetails || {
    b1: { in: "--", out: "--" },
    lunch: { in: "--", out: "--" },
    b2: { in: "--", out: "--" },
    b3: { in: "--", out: "--" },
  };

  return {
    ...safe,
    date,
    status: safe.status || safe.day_status || defaultStatus,
    checkIn: safe.checkIn ?? safe.check_in_time ?? "--",
    checkOut: safe.checkOut ?? safe.check_out_time ?? "--",
    lateMinutes: Number(safe.lateMinutes ?? safe.late_minutes ?? 0) || 0,
    workHours: parseFloat(safe.workHours ?? safe.production_hours) || 0,
    production_hours: parseFloat(safe.production_hours ?? safe.workHours) || 0,
    breaks:
      Number(
        safe.breaks ??
          safe.total_break_minutes ??
          safe.totalBreakMinutes ??
          ((breakMins.b1 || 0) +
            (breakMins.lunch || 0) +
            (breakMins.b2 || 0) +
            (breakMins.b3 || 0))
      ) || 0,
    breakMins: {
      b1: Number(breakMins.b1) || 0,
      lunch: Number(breakMins.lunch) || 0,
      b2: Number(breakMins.b2) || 0,
      b3: Number(breakMins.b3) || 0,
      b3Count: Number(breakMins.b3Count) || 0,
      b3History: Array.isArray(breakMins.b3History) ? breakMins.b3History : [],
    },
    breakDetails: {
      b1: {
        in: breakDetails.b1?.in || "--",
        out: breakDetails.b1?.out || "--",
      },
      lunch: {
        in: breakDetails.lunch?.in || "--",
        out: breakDetails.lunch?.out || "--",
      },
      b2: {
        in: breakDetails.b2?.in || "--",
        out: breakDetails.b2?.out || "--",
      },
      b3: {
        in: breakDetails.b3?.in || "--",
        out: breakDetails.b3?.out || "--",
      },
    },
    employee_name: safe.employee_name || safe.full_name || "Unknown Employee",
    reason: safe.reason || "",
  };
}

export function normalizeAttendanceAnalysisRecords(records = []) {
  return (records || [])
    .filter(Boolean)
    .map((rec) => normalizeAttendanceAnalysisRecord(rec));
}

export function getAttendanceStyle(rec) {
  const safe = normalizeAttendanceAnalysisRecord(rec);
if (safe.status === "sunday") {
  return { className: "cal-sunday", numClass: "blue-num" };
}
  if (safe.status === "holiday") return { className: "cal-holiday", numClass: "default-num" };
  if (isPaidLeaveRecord(safe)) return { className: "cal-paid-leave paid-leave", numClass: "white-num" };
  if (isUnpaidLeaveRecord(safe)) return { className: "cal-unpaid-leave unpaid-leave", numClass: "default-num" };
  if (safe.status === "absent") return { className: "cal-absent", numClass: "red-num" };
  if (safe.status === "half_day") return { className: "cal-halfday", numClass: "yellow-num" };
  if (safe.status === "full_day") return { className: "cal-present", numClass: "green-num" };
  if (isGraceLateAttendanceRecord(safe)) return { className: "cal-late", numClass: "orange-num" };
  if (safe.status === "no_record") return { className: "cal-no-record", numClass: "default-num" };
  return { className: "cal-absent", numClass: "red-num" };
}

export function getWeekNumber(dateStr) {
  const d = parseLocalDate(dateStr);
  const first = new Date(d.getFullYear(), d.getMonth(), 1);
  return Math.ceil(
    (d.getDate() + (first.getDay() === 0 ? 6 : first.getDay() - 1)) / 7
  );
}

export function buildWeeksCache(monthStr) {
  const [y, m] = monthStr.split("-").map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  const weeks = [];
  let startDay = 1;
  while (startDay <= lastDay) {
    weeks.push({
      start: new Date(y, m - 1, startDay),
      end: new Date(y, m - 1, Math.min(startDay + 6, lastDay)),
    });
    startDay += 7;
  }
  return weeks;
}

export function computeOverviewStats(records) {
  const safeRecords = normalizeAttendanceAnalysisRecords(records);
  const workDays = safeRecords.filter(
    (r) => !["absent", "leave", "sunday", "holiday"].includes(r.status)
  );
  const presentDays = safeRecords.filter((r) => r.status === "full_day").length;
  const lateDays = safeRecords.filter(isGraceLateAttendanceRecord).length;
  const halfDays = safeRecords.filter((r) => r.status === "half_day").length;
  const absent = safeRecords.filter((r) => r.status === "absent").length;
  const leaveDays = safeRecords.filter((r) => r.status === "leave").length;
  const totalDays = safeRecords.filter(
    (r) => !["sunday", "holiday"].includes(r.status)
  ).length;
  const effectivePresent = presentDays + halfDays * 0.5;
  const attRate = effectivePresent + absent
    ? Math.round((effectivePresent / (effectivePresent + absent)) * 100)
    : 0;
  const avgBreak = workDays.length
    ? Math.round(workDays.reduce((s, r) => s + r.breaks, 0) / workDays.length)
    : 0;
  const exceed = workDays.filter((r) => r.breaks > 60).length;

  return {
    workDays,
    presentDays,
    lateDays,
    halfDays,
    absent,
    leaveDays,
    totalDays,
    attRate,
    avgBreak,
    exceed,
  };
}

export function getDailyLogStatus(rec) {
  const safe = normalizeAttendanceAnalysisRecord(rec);
  if (isPaidLeaveRecord(safe)) return { label: "Paid Leave", badge: "b-paid-leave" };
  if (isUnpaidLeaveRecord(safe)) return { label: "Unpaid Leave", badge: "b-unpaid-leave" };
  if (safe.status === "absent") return { label: "Absent", badge: "b-absent" };
  if (safe.status === "half_day") return { label: "Half Day", badge: "b-halfday" };
  if (safe.status === "sunday") return { label: "Sunday", badge: "b-absent" };
  if (safe.status === "holiday") return { label: "Holiday", badge: "b-absent" };
  if (safe.status === "no_record") return { label: "No Record", badge: "b-neutral" };
  if (isGraceLateAttendanceRecord(safe)) return { label: "Late", badge: "b-late" };
  return { label: "Present", badge: "b-present" };
}

export function downloadCSV(rows, filename) {
  const csv = rows
    .map((r) => (Array.isArray(r) ? r : [r]).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}
