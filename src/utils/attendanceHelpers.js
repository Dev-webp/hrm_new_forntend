/** Attendance admin page — shared constants and display helpers (from adminadentendance.html) */
import { CALENDAR_STATUS_COLORS } from "./calendarStatusColors";
import { formatTime12Hour } from "./timeFormat";

const LATE_LOGIN_START_MINUTES = 10 * 60 + 15;

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
  return formatTime12Hour(time);
}

export function isSundayDate(dateStr) {
  return new Date(dateStr).getDay() === 0;
}

export function normalizeAttendanceStatusValue(status) {
  const normalized = String(status || "absent")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

  if (normalized === "present_working") return "working";
  if (normalized === "present") return "present";
  if (normalized === "full_day") return "full_day";
  if (normalized === "half_day") return "half_day";
  if (normalized === "in_progress") return "in_progress";
  if (normalized === "working") return "working";
  if (normalized === "leave" || normalized === "paid_leave") return "leave";
  if (normalized === "holiday") return "holiday";
  if (normalized === "late") return "late";
  if (normalized === "absent") return "absent";
  return normalized || "absent";
}

export function isWorkingStatus(status) {
  return ["in_progress", "working"].includes(normalizeAttendanceStatusValue(status));
}

export function isPresentLikeStatus(status) {
  return ["full_day", "half_day", "leave", "present", "in_progress", "working"].includes(
    normalizeAttendanceStatusValue(status)
  );
}

function isGraceLateRecord(record = {}) {
  const raw = record.check_in_time || record.office_in || record.checkIn;
  if (!raw) return false;
  const [h, m] = String(raw).slice(0, 5).split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return false;
  const minutes = h * 60 + m;
  return minutes >= LATE_LOGIN_START_MINUTES;
}

const WORKING_BADGE_STYLE = {
  background: "#DBEAFE",
  border: "1px solid #93C5FD",
  color: "#1D4ED8",
};

export function getStatusMeta(status) {
  const s = normalizeAttendanceStatusValue(status);
  if (isWorkingStatus(s)) {
    return {
      label: "WORKING",
      style: WORKING_BADGE_STYLE,
    };
  }
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
  if (s === "present") {
    return {
      label: "PRESENT",
      style: {
        background: CALENDAR_STATUS_COLORS.present.background,
        border: `1px solid ${CALENDAR_STATUS_COLORS.present.border}`,
        color: CALENDAR_STATUS_COLORS.present.text,
      },
    };
  }
  if (s === "leave") {
    return {
      label: "LEAVE",
      style: {
        background: CALENDAR_STATUS_COLORS.paid_leave.background,
        border: `1px solid ${CALENDAR_STATUS_COLORS.paid_leave.border}`,
        color: CALENDAR_STATUS_COLORS.paid_leave.text,
      },
    };
  }
  if (s === "holiday") {
    return {
      label: "HOLIDAY",
      style: {
        background: CALENDAR_STATUS_COLORS.holiday.background,
        border: `1px solid ${CALENDAR_STATUS_COLORS.holiday.border}`,
        color: CALENDAR_STATUS_COLORS.holiday.text,
      },
    };
  }
  if (s === "late") {
    return {
      label: "LATE",
      style: {
        background: CALENDAR_STATUS_COLORS.late.background,
        border: `1px solid ${CALENDAR_STATUS_COLORS.late.border}`,
        color: CALENDAR_STATUS_COLORS.late.text,
      },
    };
  }
  return {
    label: "ABSENT",
    className: "badge badge-absent",
  };
}

export function getLatePillMeta(emp) {
  const status = normalizeAttendanceStatusValue(emp.status);
  if (isWorkingStatus(status)) {
    return {
      label: "Working",
      style: {
        ...WORKING_BADGE_STYLE,
        padding: "6px 12px",
        borderRadius: "30px",
        fontWeight: 700,
        fontSize: "12px",
        display: "inline-block",
        minWidth: "75px",
        textAlign: "center",
      },
    };
  }
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
  if (isGraceLateRecord(emp)) {
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

export function getLateLoginStatus(record = {}) {
  if (["Late", "On Time", "Half Day", "Absent", "Working", "Present"].includes(record.late_login_status)) {
    return record.late_login_status;
  }

  const checkIn = String(record.check_in_time || "");
  if (!checkIn) return "No Login";

  const [h, m] = checkIn.slice(0, 5).split(":").map(Number);
  const loginMinutes = Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : null;
  if (loginMinutes !== null && loginMinutes >= LATE_LOGIN_START_MINUTES) {
    return "Late";
  }

  return "On Time";
}

export function formatLateLoginCount(recordOrCount = 0) {
  const count =
    typeof recordOrCount === "object"
      ? Number(recordOrCount.late_login_count || 0)
      : Number(recordOrCount || 0);
  return String(count);
}

export function getRemainingGraceLateLogins(recordOrCount = 0) {
  return null;
}

export function getLateLoginStatusClass(status) {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "monthly warning") return "late-login-status caution";
  if (normalized === "within limit") return "late-login-status good";
  if (normalized === "late") return "late-login-status caution";
  if (normalized === "half day" || normalized === "absent") return "late-login-status warning";
  if (normalized === "working" || normalized === "present") return "late-login-status good";
  if (normalized === "on time") return "late-login-status good";
  return "late-login-status muted";
}

export function getLateEmployeeStatusMeta(status) {
  const finalStatus = normalizeAttendanceStatusValue(status);
  if (isWorkingStatus(finalStatus)) {
    return { label: "WORKING", color: "#1D4ED8", bg: "#DBEAFE" };
  }
  if (finalStatus === "full_day") {
    return { label: "FULL DAY", color: CALENDAR_STATUS_COLORS.present.text, bg: CALENDAR_STATUS_COLORS.present.background };
  }
  if (finalStatus === "half_day") {
    return { label: "HALF DAY", color: CALENDAR_STATUS_COLORS.half_day.text, bg: CALENDAR_STATUS_COLORS.half_day.background };
  }
  return { label: "ABSENT", color: CALENDAR_STATUS_COLORS.absent.text, bg: CALENDAR_STATUS_COLORS.absent.background };
}

export function filterAttendanceRows(records, deptFilter, search, lateStatusFilter = "all") {
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
    const lateStatus = getLateLoginStatus(emp);
    const lateStatusMatch =
      lateStatusFilter === "all" ||
      (lateStatusFilter === "on_time" && lateStatus === "On Time") ||
      (lateStatusFilter === "late" && lateStatus === "Late");
    return deptMatch && searchMatch && lateStatusMatch;
  });
}

const TIME_RE = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;

export function validateTimeHHMM(value) {
  return TIME_RE.test(value);
}
