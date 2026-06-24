/** Attendance admin page — shared constants and display helpers (from adminadentendance.html) */
import { CALENDAR_STATUS_COLORS } from "./calendarStatusColors";

export const ATTENDANCE_DEPARTMENTS = [
  { value: "all", label: "All Departments" },
  { value: "Branch Manager", label: "Branch Manager" },
  { value: "Reception", label: "Reception" },
  { value: "Sales Team", label: "Sales Team" },
  { value: "Process Team", label: "Process Team" },
  { value: "Accounts", label: "Accounts" },
  { value: "Digital Marketing Team", label: "Digital Marketing Team" },
  { value: "IT", label: "IT" },
];

export const ATTENDANCE_BRANCH_MENU = [
  { value: "all", label: "🌍 All Branches (Consolidated)" },
  { value: "Bangalore", label: "💻 Bangalore Tech Hub" },
  { value: "Hyderabad", label: "🐘 Hyderabad Centre" },
];

export function branchDisplayLabel(branch) {
  if (branch === "all") return "All Branches";
  return branch;
}

export function branchSelectorLabel(branch) {
  if (branch === "all") return "🌍 All Branches";
  if (branch === "Bangalore") return "💻 Bangalore Tech Hub";
  if (branch === "Hyderabad") return "🐘 Hyderabad Centre";
  return branch;
}

export function formatTimeShort(time) {
  if (!time) return "--";
  return String(time).substring(0, 5);
}

export function isSundayDate(dateStr) {
  return new Date(dateStr).getDay() === 0;
}

export function getStatusMeta(status) {
  const s = (status || "absent").toLowerCase();
  if (s === "full_day") {
    return {
      label: "PRESENT",
      style: {
        background: CALENDAR_STATUS_COLORS.present.background,
        border: `1px solid ${CALENDAR_STATUS_COLORS.present.border}`,
        color: CALENDAR_STATUS_COLORS.present.text,
      },
    };
  }
  if (s === "half_day") {
    return {
      label: "HALF DAY",
      style: {
        background: CALENDAR_STATUS_COLORS.half_day.background,
        border: `1px solid ${CALENDAR_STATUS_COLORS.half_day.border}`,
        color: CALENDAR_STATUS_COLORS.half_day.text,
      },
    };
  }
  return {
    label: "ABSENT",
    className: "badge badge-absent",
  };
}

export function getLatePillMeta(emp) {
  const status = (emp.status || "absent").toLowerCase();
  if (status === "absent") {
    return {
      label: "Absent",
      style: {
        background: CALENDAR_STATUS_COLORS.absent.background,
        color: CALENDAR_STATUS_COLORS.absent.text,
        border: `1px solid ${CALENDAR_STATUS_COLORS.absent.border}`,
        padding: "6px 12px",
        borderRadius: "30px",
        fontWeight: 700,
        fontSize: "12px",
      },
    };
  }
  if ((emp.late_minutes || 0) > 0) {
    return {
      label: `${emp.late_minutes} min late`,
      style: {
        background: CALENDAR_STATUS_COLORS.late.background,
        color: CALENDAR_STATUS_COLORS.late.text,
        padding: "6px 12px",
        borderRadius: "30px",
        fontWeight: 700,
        fontSize: "12px",
        display: "inline-block",
        minWidth: "75px",
        textAlign: "center",
        border: `1px solid ${CALENDAR_STATUS_COLORS.late.border}`,
      },
    };
  }
  return {
    label: "On Time",
    style: {
      background: CALENDAR_STATUS_COLORS.present.background,
      color: CALENDAR_STATUS_COLORS.present.text,
      border: `1px solid ${CALENDAR_STATUS_COLORS.present.border}`,
      padding: "6px 12px",
      borderRadius: "30px",
      fontWeight: 600,
      fontSize: "12px",
    },
  };
}

export function getLateEmployeeStatusMeta(status) {
  const finalStatus = (status || "absent").toLowerCase();
  if (finalStatus === "full_day") {
    return { label: "FULL DAY", color: CALENDAR_STATUS_COLORS.present.text, bg: CALENDAR_STATUS_COLORS.present.background };
  }
  if (finalStatus === "half_day") {
    return { label: "HALF DAY", color: CALENDAR_STATUS_COLORS.half_day.text, bg: CALENDAR_STATUS_COLORS.half_day.background };
  }
  return { label: "ABSENT", color: CALENDAR_STATUS_COLORS.absent.text, bg: CALENDAR_STATUS_COLORS.absent.background };
}

export function filterAttendanceRows(records, deptFilter, search) {
  const q = search.trim().toLowerCase();
  return (records || []).filter((emp) => {
    const dept =
      emp.department || emp.user_department || "";
    const deptMatch =
      deptFilter === "all" || dept === deptFilter;
    const searchMatch =
      !q ||
      (emp.full_name || "").toLowerCase().includes(q) ||
      dept.toLowerCase().includes(q);
    return deptMatch && searchMatch;
  });
}

const TIME_RE = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;

export function validateTimeHHMM(value) {
  return TIME_RE.test(value);
}
