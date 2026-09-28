// ─────────────────────────────────────────────────────────────────────────────
// src/utils/calendarHelpers.js
// Shared helpers used by AdminCalendar
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns the first and last date of a month.
 *
 * Example:
 * "2026-08"
 *
 * Returns:
 * {
 *   start: "2026-08-01",
 *   end: "2026-08-31"
 * }
 */
export function monthRangeBounds(monthStr) {
  const [year, month] = monthStr.split("-").map(Number);

  const mm = String(month).padStart(2, "0");

  const lastDay = new Date(year, month, 0).getDate();

  return {
    start: `${year}-${mm}-01`,
    end: `${year}-${mm}-${String(lastDay).padStart(2, "0")}`,
  };
}

/**
 * Build cache key for calendar data.
 */
export function buildCalendarCacheKey(branch, userId, monthStr) {
  return `${branch}|${userId ?? "all"}|${monthStr}`;
}

/**
 * Convert HH:MM or HH:MM:SS into minutes.
 */
function timeToMinutes(value) {
  if (!value || value === "--") return null;

  const [hours, minutes] = String(value)
    .slice(0, 5)
    .split(":")
    .map(Number);

  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return null;
  }

  return hours * 60 + minutes;
}

/**
 * Calculate overlap between two time ranges.
 */
function overlapMinutes(startA, endA, startB, endB) {
  return Math.max(
    0,
    Math.min(endA, endB) - Math.max(startA, startB)
  );
}

/**
 * Calculate effective half-day minutes.
 */
function halfDayEffectiveMinutes(row, slot) {
  const checkIn = timeToMinutes(
    row.check_in_time || row.check_in || row.login_time
  );

  const checkOut = timeToMinutes(
    row.check_out_time || row.check_out || row.logout_time
  );

  if (checkIn === null || checkOut === null) {
    return 0;
  }

  const slotStart =
    slot === "afternoon"
      ? 14 * 60 + 30
      : 10 * 60;

  const slotEnd =
    slot === "afternoon"
      ? 19 * 60
      : 14 * 60 + 30;

  if (checkIn > slotStart) {
    return 0;
  }

  const workStart = Math.max(checkIn, slotStart);
  const workEnd = Math.min(checkOut, slotEnd);

  if (workEnd <= workStart) {
    return 0;
  }

  const breakPairs = [
    [row.break1_in, row.break1_out],
    [row.lunch_in, row.lunch_out],
    [row.break2_in, row.break2_out],
  ];

  const breakMinutes = breakPairs.reduce(
    (sum, [rawStart, rawEnd]) => {
      const start = timeToMinutes(rawStart);
      const end = timeToMinutes(rawEnd);

      if (
        start === null ||
        end === null ||
        end <= start
      ) {
        return sum;
      }

      return (
        sum +
        overlapMinutes(
          start,
          end,
          workStart,
          workEnd
        )
      );
    },
    0
  );

  return Math.max(
    0,
    workEnd - workStart - breakMinutes
  );
}

/**
 * Calculate half-day validation details.
 */
function getHalfDayDetails(row) {
  const checkIn = timeToMinutes(
    row.check_in_time || row.check_in || row.login_time
  );

  const checkOut = timeToMinutes(
    row.check_out_time || row.check_out || row.logout_time
  );

  const morning = halfDayEffectiveMinutes(row, "morning");

  const afternoon = halfDayEffectiveMinutes(
    row,
    "afternoon"
  );

  const validMorning =
    checkIn !== null &&
    checkIn <= 10 * 60 &&
    morning >= 240;

  const validAfternoon =
    checkIn !== null &&
    checkIn <= 14 * 60 + 30 &&
    afternoon >= 240;

  if (validMorning) {
    return {
      effective: morning,
      slotChecked: "MORNING",
      invalidReason: "",
    };
  }

  if (validAfternoon) {
    return {
      effective: afternoon,
      slotChecked: "AFTERNOON",
      invalidReason: "",
    };
  }

  if (checkIn === null || checkOut === null) {
    return {
      effective: 0,
      slotChecked: "INVALID",
      invalidReason: "Missing login or logout",
    };
  }

  if (checkIn > 14 * 60 + 30) {
    return {
      effective: Math.max(morning, afternoon),
      slotChecked: "AFTERNOON",
      invalidReason:
        "Afternoon half-day login must be on or before 2:30 PM",
    };
  }

  if (
    checkIn > 10 * 60 &&
    checkOut <= 14 * 60 + 30
  ) {
    return {
      effective: Math.max(morning, afternoon),
      slotChecked: "MORNING",
      invalidReason:
        "Morning half-day login must be on or before 10:00 AM",
    };
  }

  return {
    effective: Math.max(morning, afternoon),
    slotChecked:
      afternoon > 0
        ? "AFTERNOON"
        : "MORNING",
    invalidReason:
      `${
        afternoon > 0
          ? "Afternoon"
          : "Morning"
      } half-day effective production is below 4 hours`,
  };
}

/**
 * Transform attendance API data into Calendar format.
 *
 * IMPORTANT:
 * Paid Leave information is preserved.
 */
export function transformAttendanceRangeRecord(row) {
  if (!row) return null;

  // ─────────────────────────────────────────────
  // FORMAT TIME
  // ─────────────────────────────────────────────
  function fmtTime(value) {
    if (!value || value === "--") return "--";

    const str = String(value).trim();

    return str.length >= 5 ? str.slice(0, 5) : str;
  }

  // ─────────────────────────────────────────────
  // NORMALIZE VALUES
  // Examples:
  // "Paid Leave" → "paid_leave"
  // "paid-leave" → "paid_leave"
  // "PAID_LEAVE" → "paid_leave"
  // ─────────────────────────────────────────────
  function normalizeValue(value) {
    if (value === null || value === undefined) return "";

    return String(value)
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, "_");
  }

  // ─────────────────────────────────────────────
  // DATE
  // ─────────────────────────────────────────────
  const date =
    typeof row.date === "string"
      ? row.date.slice(0, 10)
      : row.date?.toISOString?.()?.slice(0, 10) ??
        row.date ??
        null;

  // ─────────────────────────────────────────────
  // HALF DAY DETAILS
  // ─────────────────────────────────────────────
  const halfDay = getHalfDayDetails(row);

  // ─────────────────────────────────────────────
  // RAW ATTENDANCE STATUS
  // ─────────────────────────────────────────────
  const rawStatus = normalizeValue(
    row.status ??
    row.attendance_status ??
    row.attendanceStatus ??
    row.raw_status
  );

  // ─────────────────────────────────────────────
  // LEAVE TYPE
  //
  // IMPORTANT:
  // Supports BOTH:
  // request_leave_type
  // requested_leave_type
  // ─────────────────────────────────────────────
  const leaveType = normalizeValue(
    row.leave_type ??
    row.leaveType ??
    row.leave_category ??
    row.leaveCategory ??
    row.request_leave_type ??
    row.requestLeaveType ??
    row.requested_leave_type ??
    row.requestedLeaveType ??
    row.request_leave_category ??
    row.requestLeaveCategory
  );

  // ─────────────────────────────────────────────
  // LEAVE APPROVAL STATUS
  // ─────────────────────────────────────────────
  const leaveStatus = normalizeValue(
    row.leave_status ??
    row.leaveStatus ??
    row.request_status ??
    row.requestStatus ??
    row.leave_request_status ??
    row.leaveRequestStatus
  );

  // ─────────────────────────────────────────────
  // PAID / UNPAID DAYS
  // ─────────────────────────────────────────────
  const paidDays = Number(
    row.paid_days ??
    row.paidDays ??
    0
  );

  const unpaidDays = Number(
    row.unpaid_days ??
    row.unpaidDays ??
    0
  );

  // ─────────────────────────────────────────────
  // BOOLEAN NORMALIZATION
  // Handles:
  // true
  // "true"
  // 1
  // "1"
  // ─────────────────────────────────────────────
  const normalizeBoolean = (value) =>
    value === true ||
    value === 1 ||
    value === "1" ||
    String(value).toLowerCase() === "true";

  const backendPaidLeave =
    normalizeBoolean(row.is_paid_leave) ||
    normalizeBoolean(row.isPaidLeave);

  const backendUnpaidLeave =
    normalizeBoolean(row.is_unpaid_leave) ||
    normalizeBoolean(row.isUnpaidLeave);

  // ─────────────────────────────────────────────
  // APPROVED LEAVE CHECK
  // ─────────────────────────────────────────────
  const isApprovedLeave =
    !leaveStatus ||
    leaveStatus === "approved" ||
    leaveStatus === "approve";

  // ─────────────────────────────────────────────
  // PAID LEAVE DETECTION
  // ─────────────────────────────────────────────
  const isPaidLeave =
    isApprovedLeave &&
    (
      rawStatus === "paid_leave" ||
      rawStatus === "paidleave" ||

      leaveType === "paid_leave" ||
      leaveType === "paidleave" ||
      leaveType === "paid" ||
      leaveType === "pl" ||

      backendPaidLeave ||

      paidDays > 0
    );

  // ─────────────────────────────────────────────
  // UNPAID LEAVE DETECTION
  // ─────────────────────────────────────────────
  const isUnpaidLeave =
    isApprovedLeave &&
    !isPaidLeave &&
    (
      rawStatus === "unpaid_leave" ||
      rawStatus === "unpaidleave" ||
      rawStatus === "loss_of_pay" ||
      rawStatus === "lop" ||

      leaveType === "unpaid_leave" ||
      leaveType === "unpaidleave" ||
      leaveType === "unpaid" ||
      leaveType === "loss_of_pay" ||
      leaveType === "lop" ||

      backendUnpaidLeave ||

      unpaidDays > 0
    );

  // ─────────────────────────────────────────────
  // FINAL CALENDAR STATUS
  //
  // LEAVE HAS HIGHEST PRIORITY
  // ─────────────────────────────────────────────
  let status = rawStatus || "no_record";

  if (isPaidLeave) {
    status = "paid_leave";
  } else if (isUnpaidLeave) {
    status = "unpaid_leave";
  }

  // ─────────────────────────────────────────────
  // RETURN NORMALIZED RECORD
  // ─────────────────────────────────────────────
  return {
    date,

    // FINAL STATUS USED BY CALENDAR
    status,

    // DEBUGGING VALUES
    raw_status:
      row.status ??
      row.attendance_status ??
      null,

    normalized_status: rawStatus,

    detected_leave_type: leaveType,

    detected_leave_status: leaveStatus,

    // ─────────────────────────────────────────
    // ATTENDANCE TIMES
    // ─────────────────────────────────────────
    checkIn: fmtTime(
      row.check_in_time ??
      row.check_in ??
      row.login_time
    ),

    checkOut: fmtTime(
      row.check_out_time ??
      row.check_out ??
      row.logout_time
    ),

    office_in: fmtTime(
      row.office_in ??
      row.check_in_time ??
      row.check_in ??
      row.login_time
    ),

    office_out: fmtTime(
      row.office_out ??
      row.check_out_time ??
      row.check_out ??
      row.logout_time
    ),

    check_in: fmtTime(
      row.check_in ??
      row.check_in_time
    ),

    check_out: fmtTime(
      row.check_out ??
      row.check_out_time
    ),

    login_time: fmtTime(row.login_time),

    logout_time: fmtTime(row.logout_time),

    // ─────────────────────────────────────────
    // WORK HOURS
    // ─────────────────────────────────────────
    workHours:
      parseFloat(
        row.production_hours ??
        row.work_hours ??
        row.hours ??
        0
      ) || 0,

    production_hours:
      row.production_hours ?? 0,

    work_hours:
      row.work_hours ?? 0,

    hours:
      row.hours ?? 0,

    // ─────────────────────────────────────────
    // LATE MINUTES
    // ─────────────────────────────────────────
    lateMinutes:
      parseInt(row.late_minutes, 10) || 0,

    // ─────────────────────────────────────────
    // BREAKS
    // ─────────────────────────────────────────
    breaks:
      Number(row.total_break_minutes ?? 0),

    total_break_minutes:
      Number(row.total_break_minutes ?? 0),

    // ─────────────────────────────────────────
    // PAID LEAVE
    // ─────────────────────────────────────────
    is_paid_leave: isPaidLeave,

    isPaidLeave,

    // ─────────────────────────────────────────
    // UNPAID LEAVE
    // ─────────────────────────────────────────
    is_unpaid_leave: isUnpaidLeave,

    isUnpaidLeave,

    // ─────────────────────────────────────────
    // LEAVE TYPE
    // ─────────────────────────────────────────
    leave_type:
      row.leave_type ??
      row.leaveType ??
      row.request_leave_type ??
      row.requestLeaveType ??
      row.requested_leave_type ??
      row.requestedLeaveType ??
      null,

    leaveType:
      row.leave_type ??
      row.leaveType ??
      row.request_leave_type ??
      row.requestLeaveType ??
      row.requested_leave_type ??
      row.requestedLeaveType ??
      null,

    leave_category:
      row.leave_category ??
      row.leaveCategory ??
      row.request_leave_category ??
      row.requestLeaveCategory ??
      null,

    leaveCategory:
      row.leave_category ??
      row.leaveCategory ??
      row.request_leave_category ??
      row.requestLeaveCategory ??
      null,

    // ─────────────────────────────────────────
    // LEAVE STATUS
    // ─────────────────────────────────────────
    leave_status:
      row.leave_status ??
      row.leaveStatus ??
      row.request_status ??
      row.requestStatus ??
      row.leave_request_status ??
      row.leaveRequestStatus ??
      null,

    leaveStatus:
      row.leave_status ??
      row.leaveStatus ??
      row.request_status ??
      row.requestStatus ??
      row.leave_request_status ??
      row.leaveRequestStatus ??
      null,

    // ─────────────────────────────────────────
    // LEAVE REQUEST ID
    // ─────────────────────────────────────────
    leave_request_id:
      row.leave_request_id ??
      row.leaveRequestId ??
      null,

    leaveRequestId:
      row.leave_request_id ??
      row.leaveRequestId ??
      null,

    // ─────────────────────────────────────────
    // PAID / UNPAID DAYS
    // ─────────────────────────────────────────
    paid_days: paidDays,

    paidDays,

    unpaid_days: unpaidDays,

    unpaidDays,

    // ─────────────────────────────────────────
    // HALF DAY
    // ─────────────────────────────────────────
    half_day_effective_minutes:
      halfDay.effective,

    half_day_slot_checked:
      halfDay.slotChecked,

    half_day_invalid_reason:
      halfDay.invalidReason,

    // ─────────────────────────────────────────
    // BREAK DETAILS
    // ─────────────────────────────────────────
    breakMins: {
      b1: 0,
      lunch: 0,
      b2: 0,
      b3: 0,
    },

    breakDetails: {
      b1: {
        in: fmtTime(row.break1_in),
        out: fmtTime(row.break1_out),
      },

      lunch: {
        in: fmtTime(row.lunch_in),
        out: fmtTime(row.lunch_out),
      },

      b2: {
        in: fmtTime(row.break2_in),
        out: fmtTime(row.break2_out),
      },

      b3: {
        in: fmtTime(row.break3_in),
        out: fmtTime(row.break3_out),
      },
    },
  };
}