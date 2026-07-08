
import {
  isPresentLikeStatus,
  normalizeAttendanceStatusValue,
} from "./attendanceHelpers";

export function getInitials(name) {
  if (!name) return "??";

  return name
    .trim()
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function monthDays(year, month) {
  return new Date(year, month, 0).getDate();
}

export function buildDateStr(year, month, day) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function isSunday(dateStr) {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day).getDay() === 0;
}

export function isGraceLateAttendanceRecord(record = {}) {
  const raw = record.check_in_time || record.office_in || record.checkIn;
  if (!raw) return false;

  const [h, m] = String(raw).slice(0, 5).split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return false;

  const minutes = h * 60 + m;
  return minutes >= 10 * 60 + 15 && minutes < 10 * 60 + 30;
}

export function hasAttendanceCheckIn(record = {}) {
  return Boolean(record?.check_in_time || record?.office_in || record?.checkIn);
}

export function hasAttendanceCheckOut(record = {}) {
  return Boolean(record?.check_out_time || record?.office_out || record?.checkOut);
}

export function getLiveAttendanceStatus(record) {
  if (!record) return "absent";

  const status = normalizeAttendanceStatusValue(record.status);
  const hasCheckIn = hasAttendanceCheckIn(record);
  const hasCheckOut = hasAttendanceCheckOut(record);

  if (hasCheckIn && !hasCheckOut && status !== "holiday" && status !== "leave") {
    return status === "absent" ? "working" : status;
  }

  return status;
}

export function isLivePresentRecord(record) {
  return isPresentLikeStatus(getLiveAttendanceStatus(record));
}

export function isLiveAbsentRecord(record) {
  if (!record) return true;
  if (hasAttendanceCheckIn(record) && !hasAttendanceCheckOut(record)) return false;
  return getLiveAttendanceStatus(record) === "absent";
}

export function getDashboardAttendanceStatus(record, isToday = false) {
  return isToday ? getLiveAttendanceStatus(record) : normalizeAttendanceStatusValue(record?.status);
}

export function isDashboardPresentRecord(record, isToday = false) {
  return isPresentLikeStatus(getDashboardAttendanceStatus(record, isToday));
}

export function isDashboardAttendancePresentRecord(record, isToday = false) {
  const status = getDashboardAttendanceStatus(record, isToday);
  return ["full_day", "present", "in_progress", "working"].includes(status);
}

export function isDashboardHalfDayRecord(record, isToday = false) {
  return getDashboardAttendanceStatus(record, isToday) === "half_day";
}

export function isDashboardLeaveRecord(record, isToday = false) {
  const status = getDashboardAttendanceStatus(record, isToday);
  const leaveStatus = String(record?.leave_status || record?.leaveStatus || "").toLowerCase();
  return status === "leave" && (!leaveStatus || leaveStatus === "approved");
}

export function isDashboardAbsentRecord(record, isToday = false) {
  if (isToday) return isLiveAbsentRecord(record);
  return !record || getDashboardAttendanceStatus(record, false) === "absent";
}

export function computeMonthStats(year, month, holidaySet) {
  const total = monthDays(year, month);
  let sundays = 0;
  let holidays = 0;
  let working = 0;

  for (let day = 1; day <= total; day += 1) {
    const dateStr = buildDateStr(year, month, day);

    if (isSunday(dateStr)) {
      sundays += 1;
      continue;
    }

    if (holidaySet.has(dateStr)) {
      holidays += 1;
      continue;
    }

    working += 1;
  }

  return { total, sundays, holidays, working };
}

export function computeEmpStats(
  employeeId,
  year,
  month,
  attendanceMap,
  holidaySet,
  todayStr
) {
  const records = attendanceMap.get(employeeId) || [];
  const recordMap = new Map(
    records.map((record) => [record.date ? record.date.slice(0, 10) : "", record])
  );

  const total = monthDays(year, month);
  let workingDays = 0;
  let present = 0;
  let late = 0;
  let absent = 0;
  let half = 0;
  let leave = 0;

  const today = new Date();
  const isCurrentMonth =
    year === today.getFullYear() && month === today.getMonth() + 1;

  for (let day = 1; day <= total; day += 1) {
    const dateStr = buildDateStr(year, month, day);

    if (isCurrentMonth && dateStr > todayStr) break;

    if (isSunday(dateStr) || holidaySet.has(dateStr)) continue;

    workingDays += 1;

    const record = recordMap.get(dateStr);

    const isToday = dateStr === todayStr;
    const status = getDashboardAttendanceStatus(record, isToday);
    if (isGraceLateAttendanceRecord(record)) late += 1;

    if (isDashboardLeaveRecord(record, isToday)) {
      leave += 1;
      continue;
    }

    if (isDashboardAbsentRecord(record, isToday)) {
      absent += 1;
      continue;
    }

    if (status === "half_day") {
      half += 1;
      continue;
    }

    if (isPresentLikeStatus(status)) {
      present += 1;
    }
  }

  const effectivePresent = present + half * 0.5;
  const attendanceDenominator = effectivePresent + absent;
  const attPct =
    attendanceDenominator > 0
      ? Math.round((effectivePresent / attendanceDenominator) * 100)
      : 0;

  return { present: effectivePresent, fullDays: present, half, absent, leave, late, workingDays, attPct };
}

export function attPctColor(pct) {
  if (pct >= 90) {
    return { color: "#16A34A", ring: "#16A34A", cls: "pct-excellent" };
  }

  if (pct >= 75) {
    return { color: "#86efac", ring: "#86efac", cls: "pct-good" };
  }

  if (pct >= 50) {
    return { color: "#FF8C00", ring: "#FF8C00", cls: "pct-average" };
  }

  return { color: "#DC2626", ring: "#DC2626", cls: "pct-poor" };
}

export function getGreeting(hour) {
  if (hour < 12) return "Morning";
  if (hour < 17) return "Afternoon";
  return "Evening";
}

export const BRANCH_LABELS = {
  all: "All Branches",
  Hyderabad: "🏢 Hyderabad",
  Bangalore: "💻 Bangalore",
};
