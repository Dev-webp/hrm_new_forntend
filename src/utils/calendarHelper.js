// ─────────────────────────────────────────────────────────────────────────────
// src/utils/calendarHelpers.js
//
// Shared helpers used by AdminCalendar (employee calendar mode).
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Given a month string like "2026-06", returns the first and last date
 * of that month as ISO date strings.
 *
 * @param {string} monthStr  "YYYY-MM"
 * @returns {{ start: string, end: string }}  e.g. { start: "2026-06-01", end: "2026-06-30" }
 */
export function monthRangeBounds(monthStr) {
  const [year, month] = monthStr.split("-").map(Number);

  const mm = String(month).padStart(2, "0");

  const lastDay = new Date(year, month, 0).getDate(); // day 0 of next month = last day of current
  const dd = String(lastDay).padStart(2, "0");

  return {
    start: `${year}-${mm}-01`,
    end: `${year}-${mm}-${dd}`,
  };
}

/**
 * Transforms a raw attendance row returned by
 * GET /attendance/employee/:userId  (or any similar endpoint)
 * into the normalised shape expected by AdminCalendar's employee mode.
 *
 * Raw row shape (from backend):
 * {
 *   date:               "YYYY-MM-DD",
 *   check_in_time:      "HH:MM:SS" | null,
 *   check_out_time:     "HH:MM:SS" | null,
 *   status:             "full_day" | "half_day" | "absent" | "leave" | "holiday" | null,
 *   late_minutes:       number | null,
 *   production_hours:   number | null,
 *   total_break_minutes:number | null,
 * }
 *
 * Normalised output shape:
 * {
 *   date:        "YYYY-MM-DD",
 *   status:      string,
 *   checkIn:     "HH:MM" | "--",
 *   checkOut:    "HH:MM" | "--",
 *   workHours:   number,
 *   lateMinutes: number,
 *   breakDetails: {
 *     b1:    { in: "--", out: "--" },
 *     lunch: { in: "--", out: "--" },
 *     b2:    { in: "--", out: "--" },
 *   },
 * }
 *
 * @param {object} row  Raw row from the API
 * @returns {object}    Normalised record
 */
export function transformAttendanceRangeRecord(row) {
  if (!row) return null;

  // Trim seconds from "HH:MM:SS" → "HH:MM", or return "--"
  function fmtTime(t) {
    if (!t || t === "--") return "--";
    const s = String(t).trim();
    // Already "HH:MM" (5 chars) or "HH:MM:SS" (8 chars)
    return s.length >= 5 ? s.slice(0, 5) : s;
  }

  const dateStr = row.date
    ? String(row.date).slice(0, 10)
    : null;

  return {
    date:        dateStr,
    status:      row.status || "absent",
    checkIn:     fmtTime(row.check_in_time),
    checkOut:    fmtTime(row.check_out_time),
    workHours:   parseFloat(row.production_hours) || 0,
    lateMinutes: parseInt(row.late_minutes, 10) || 0,
    office_in: fmtTime(row.office_in || row.check_in_time || row.check_in || row.login_time),
    office_out: fmtTime(row.office_out || row.check_out_time || row.check_out || row.logout_time),
    check_in: fmtTime(row.check_in || row.check_in_time),
    check_out: fmtTime(row.check_out || row.check_out_time),
    login_time: fmtTime(row.login_time),
    logout_time: fmtTime(row.logout_time),
    production_hours: row.production_hours,
    work_hours: row.work_hours,
    hours: row.hours,
    is_paid_leave: row.is_paid_leave,
    isPaidLeave: row.isPaidLeave,
    leave_type: row.leave_type,
    leaveType: row.leaveType,
    leave_category: row.leave_category,
    leaveCategory: row.leaveCategory,
    leave_status: row.leave_status,
    leaveStatus: row.leaveStatus,
    leave_request_id: row.leave_request_id,
    leaveRequestId: row.leaveRequestId,
    paid_days: row.paid_days,
    paidDays: row.paidDays,
    unpaid_days: row.unpaid_days,
    unpaidDays: row.unpaidDays,

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
    },
  };
}
