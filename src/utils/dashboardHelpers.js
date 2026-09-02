
import {
  isPresentLikeStatus,
  normalizeAttendanceStatusValue,
} from "./attendanceHelpers";

/*
|--------------------------------------------------------------------------
| BASIC HELPERS
|--------------------------------------------------------------------------
*/

export function getInitials(name) {
  if (!name) return "??";

  return name
    .trim()
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function monthDays(year, month) {
  return new Date(year, month, 0).getDate();
}

export function buildDateStr(year, month, day) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(
    2,
    "0"
  )}`;
}

export function isSunday(dateStr) {
  const [year, month, day] = dateStr.split("-").map(Number);

  return new Date(year, month - 1, day).getDay() === 0;
}

/*
|--------------------------------------------------------------------------
| ATTENDANCE RECORD HELPERS
|--------------------------------------------------------------------------
*/

export function hasAttendanceCheckIn(record = {}) {
  return Boolean(
    record?.check_in_time ||
      record?.office_in ||
      record?.checkIn
  );
}

export function hasAttendanceCheckOut(record = {}) {
  return Boolean(
    record?.check_out_time ||
      record?.office_out ||
      record?.checkOut
  );
}

/*
|--------------------------------------------------------------------------
| LATE STATUS
|--------------------------------------------------------------------------
|
| IMPORTANT:
| Prefer backend-computed is_late when available.
|
| The frontend must NOT create a different late policy from the backend.
|--------------------------------------------------------------------------
*/

export function isGraceLateAttendanceRecord(record = {}) {
  if (typeof record?.is_late === "boolean") {
    return record.is_late;
  }

  if (typeof record?.isLate === "boolean") {
    return record.isLate;
  }

  const raw =
    record?.check_in_time ||
    record?.office_in ||
    record?.checkIn;

  if (!raw) return false;

  const [h, m] = String(raw)
    .slice(0, 5)
    .split(":")
    .map(Number);

  if (Number.isNaN(h) || Number.isNaN(m)) {
    return false;
  }

  const minutes = h * 60 + m;

  /*
   * Fallback only.
   *
   * Official late calculation should come from backend.
   */
  return (
    minutes >= 10 * 60 + 15 &&
    minutes < 10 * 60 + 30
  );
}

/*
|--------------------------------------------------------------------------
| NORMALIZED STATUS
|--------------------------------------------------------------------------
|
| Backend-normalized status must always take priority.
|
| Expected backend statuses:
|
| full_day
| half_day
| leave
| absent
| holiday
|
| Legacy statuses are still supported for backward compatibility.
|--------------------------------------------------------------------------
*/

export function getNormalizedRecordStatus(record) {
  if (!record) return "absent";

  const rawStatus =
    record.computed_status ||
    record.computedStatus ||
    record.display_status ||
    record.displayStatus ||
    record.status;

  return normalizeAttendanceStatusValue(rawStatus);
}

/*
|--------------------------------------------------------------------------
| LIVE STATUS
|--------------------------------------------------------------------------
*/

export function getLiveAttendanceStatus(record) {
  if (!record) return "absent";

  const status = getNormalizedRecordStatus(record);

  /*
   * These statuses must NEVER become working/present simply because
   * a check-in field exists.
   */
  if (
    [
      "holiday",
      "leave",
      "paid_leave",
      "unpaid_leave",
    ].includes(status)
  ) {
    return status;
  }

  /*
   * If backend already supplied an official normalized status,
   * trust it.
   */
  if (
    [
      "full_day",
      "half_day",
      "absent",
      "holiday",
      "leave",
    ].includes(status)
  ) {
    return status;
  }

  const hasCheckIn = hasAttendanceCheckIn(record);
  const hasCheckOut = hasAttendanceCheckOut(record);

  /*
   * Employee checked in but has not checked out yet.
   */
  if (hasCheckIn && !hasCheckOut) {
    return "working";
  }

  return status;
}

/*
|--------------------------------------------------------------------------
| PRESENT / ABSENT
|--------------------------------------------------------------------------
*/

export function isLivePresentRecord(record) {
  if (!record) return false;

  /*
   * Backend explicit flag has highest priority.
   */
  if (typeof record.is_present === "boolean") {
    return record.is_present;
  }

  if (typeof record.isPresent === "boolean") {
    return record.isPresent;
  }

  const status = getLiveAttendanceStatus(record);

  /*
   * Late is PRESENT.
   *
   * This fixes the previous inconsistency where backend could count
   * Late as Present but the dashboard helper did not.
   */
  return (
    isPresentLikeStatus(status) ||
    [
      "full_day",
      "present",
      "working",
      "in_progress",
      "late",
    ].includes(status)
  );
}

export function isLiveAbsentRecord(record) {
  if (!record) return true;

  /*
   * Backend explicit flag has highest priority.
   */
  if (typeof record.is_absent === "boolean") {
    return record.is_absent;
  }

  if (typeof record.isAbsent === "boolean") {
    return record.isAbsent;
  }

  if (isLivePresentRecord(record)) {
    return false;
  }

  return getLiveAttendanceStatus(record) === "absent";
}

/*
|--------------------------------------------------------------------------
| DASHBOARD STATUS
|--------------------------------------------------------------------------
*/

export function getDashboardAttendanceStatus(record, isToday = false) {
  if (!record) return "absent";

  /*
   * Always trust backend-normalized status first.
   */
  const normalized = getNormalizedRecordStatus(record);

  /*
   * For today's live records, support active check-in sessions.
   */
  if (isToday) {
    return getLiveAttendanceStatus(record);
  }

  return normalized;
}

export function isDashboardPresentRecord(record, isToday = false) {
  if (!record) return false;

  if (typeof record.is_present === "boolean") {
    return record.is_present;
  }

  if (typeof record.isPresent === "boolean") {
    return record.isPresent;
  }

  const status = getDashboardAttendanceStatus(record, isToday);

  /*
   * Late employees are employees who are PRESENT.
   */
  return (
    isPresentLikeStatus(status) ||
    [
      "full_day",
      "present",
      "working",
      "in_progress",
      "late",
    ].includes(status)
  );
}

/*
|--------------------------------------------------------------------------
| BACKWARD COMPATIBILITY
|--------------------------------------------------------------------------
|
| Existing AdminDashboard.jsx may import this function.
|--------------------------------------------------------------------------
*/

export function isDashboardAttendancePresentRecord(
  record,
  isToday = false
) {
  return isDashboardPresentRecord(record, isToday);
}

export function isDashboardHalfDayRecord(record, isToday = false) {
  if (!record) return false;

  if (typeof record.is_half_day === "boolean") {
    return record.is_half_day;
  }

  if (typeof record.isHalfDay === "boolean") {
    return record.isHalfDay;
  }

  return (
    getDashboardAttendanceStatus(record, isToday) === "half_day"
  );
}

export function isDashboardLeaveRecord(record, isToday = false) {
  if (!record) return false;

  if (typeof record.is_leave === "boolean") {
    return record.is_leave;
  }

  if (typeof record.isLeave === "boolean") {
    return record.isLeave;
  }

  const status = getDashboardAttendanceStatus(record, isToday);

  /*
   * Support legacy paid/unpaid leave statuses too.
   */
  return [
    "leave",
    "paid_leave",
    "unpaid_leave",
  ].includes(status);
}

export function isDashboardAbsentRecord(record, isToday = false) {
  if (!record) return true;

  if (typeof record.is_absent === "boolean") {
    return record.is_absent;
  }

  if (typeof record.isAbsent === "boolean") {
    return record.isAbsent;
  }

  /*
   * A present employee must never become absent.
   */
  if (isDashboardPresentRecord(record, isToday)) {
    return false;
  }

  /*
   * Half-day and leave must never become absent.
   */
  if (isDashboardHalfDayRecord(record, isToday)) {
    return false;
  }

  if (isDashboardLeaveRecord(record, isToday)) {
    return false;
  }

  return (
    getDashboardAttendanceStatus(record, isToday) === "absent"
  );
}

/*
|--------------------------------------------------------------------------
| MONTH STATISTICS
|--------------------------------------------------------------------------
*/

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

    if (holidaySet?.has?.(dateStr)) {
      holidays += 1;
      continue;
    }

    working += 1;
  }

  return {
    total,
    sundays,
    holidays,
    working,
  };
}

/*
|--------------------------------------------------------------------------
| EMPLOYEE STATISTICS
|--------------------------------------------------------------------------
|
| IMPORTANT:
|
| This function no longer redefines attendance policy.
|
| It consumes backend-normalized records.
|--------------------------------------------------------------------------
*/

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
    records
      .filter((record) => record?.date)
      .map((record) => [
        String(record.date).slice(0, 10),
        record,
      ])
  );

  const total = monthDays(year, month);

  let workingDays = 0;
  let present = 0;
  let late = 0;
  let absent = 0;
  let half = 0;
  let leave = 0;

  /*
   * Use the supplied dashboard date instead of UTC conversion.
   */
  const currentDateStr = todayStr || "";

  for (let day = 1; day <= total; day += 1) {
    const dateStr = buildDateStr(year, month, day);

    /*
     * Do not calculate future days in the current selected month.
     */
    if (currentDateStr && dateStr > currentDateStr) {
      break;
    }

    /*
     * Sundays are non-working days.
     */
    if (isSunday(dateStr)) {
      continue;
    }

    /*
     * Holidays are non-working days.
     */
    if (holidaySet?.has?.(dateStr)) {
      continue;
    }

    const record = recordMap.get(dateStr);

    /*
     * If backend sends an explicit holiday record,
     * do not count it as working.
     */
    const status = getDashboardAttendanceStatus(
      record,
      dateStr === currentDateStr
    );

    if (status === "holiday") {
      continue;
    }

    workingDays += 1;

    /*
     * LEAVE
     */
    if (isDashboardLeaveRecord(record)) {
      leave += 1;
      continue;
    }

    /*
     * HALF DAY
     */
    if (isDashboardHalfDayRecord(record)) {
      half += 1;

      if (isGraceLateAttendanceRecord(record)) {
        late += 1;
      }

      continue;
    }

    /*
     * PRESENT
     *
     * Late employees remain PRESENT.
     */
    if (isDashboardPresentRecord(record)) {
      present += 1;

      if (isGraceLateAttendanceRecord(record)) {
        late += 1;
      }

      continue;
    }

    /*
     * ABSENT
     */
    if (isDashboardAbsentRecord(record)) {
      absent += 1;
    }
  }

  /*
   * Attendance units:
   *
   * Full Day = 1
   * Half Day = 0.5
   */
  const effectivePresent = present + half * 0.5;

  /*
   * Leave is intentionally excluded from the attendance denominator.
   */
  const attendanceDenominator =
    effectivePresent + absent;

  const attPct =
    attendanceDenominator > 0
      ? Math.round(
          (effectivePresent / attendanceDenominator) * 100
        )
      : 0;

  return {
    present: effectivePresent,
    fullDays: present,
    half,
    absent,
    leave,
    late,
    workingDays,
    attPct,
  };
}

/*
|--------------------------------------------------------------------------
| ATTENDANCE PERCENTAGE COLORS
|--------------------------------------------------------------------------
*/

export function attPctColor(pct) {
  if (pct >= 90) {
    return {
      color: "#16A34A",
      ring: "#16A34A",
      cls: "pct-excellent",
    };
  }

  if (pct >= 75) {
    return {
      color: "#86efac",
      ring: "#86efac",
      cls: "pct-good",
    };
  }

  if (pct >= 50) {
    return {
      color: "#FF8C00",
      ring: "#FF8C00",
      cls: "pct-average",
    };
  }

  return {
    color: "#DC2626",
    ring: "#DC2626",
    cls: "pct-poor",
  };
}

/*
|--------------------------------------------------------------------------
| GREETING
|--------------------------------------------------------------------------
*/

export function getGreeting(hour) {
  if (hour < 12) return "Morning";

  if (hour < 17) return "Afternoon";

  return "Evening";
}

/*
|--------------------------------------------------------------------------
| BRANCH LABELS
|--------------------------------------------------------------------------
*/

export const BRANCH_LABELS = {
  all: "All Branches",
  Hyderabad: "🏢 Hyderabad",
  Bangalore: "💻 Bangalore",
};

