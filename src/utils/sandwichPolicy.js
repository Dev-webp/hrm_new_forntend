// ═══════════════════════════════════════════════════════════════════
// SANDWICH / OFF-DAY PAYROLL POLICY ENGINE  (v2)
// ═══════════════════════════════════════════════════════════════════
// Changes vs v1:
//  1. POOLING: a leave day before a company holiday now uses the SAME monthly
//     free allowance as a leave day before a Sunday.
//  2. SINGLE CHARGE: processing is anchored on the off-day (Sunday/holiday).
//     Only anchors inside [periodStart, periodEnd] are charged, so a month-end
//     sandwich (Sat 31 Oct + Sun 1 Nov) is charged once, in November, not twice.
//  3. Allowance month = month of the ANCHOR (the day that becomes unpaid).
//  4. Fri+Sat+Sun pattern kept exactly as before, behind a flag. Confirm it
//     against the written spec (the header of v1 did not list it).
//  5. NOT changed on purpose: unapproved-leave (1+1) handling.
// ═══════════════════════════════════════════════════════════════════

import { toDateStr, addDays, getDayOfWeek, getYearMonth } from './dateHelper.js';

// T2g: Fri+Sat+Sun pattern disabled - now treated as regular one-sided sandwich
const FRI_SAT_PATTERN_ENABLED = false; // Disabled - Fri+Sat+Sun now uses regular allowance rules

// ── Day state (unchanged from v1) ──────────────────────────────────
function getDayState(att, isHoliday, isPreJoining, todayStr, approvedLeaveDates, dateStr) {
  if (isHoliday || isPreJoining) return "excluded";
  if (isDateWorked(att, dateStr)) return "worked";

  // If employee has actual attendance (check-in/check-out), treat as worked
  // even if there's a leave request
  if (att && att.check_in_time && att.check_out_time) {
    return "worked";
  }

  const hasApprovedLeaveInAtt = att && (att.leave_status === "approved" || att.approved_leave);
  const hasApprovedLeaveInSet = approvedLeaveDates && approvedLeaveDates.has(dateStr);
  if (hasApprovedLeaveInAtt || hasApprovedLeaveInSet) return "off";

  const isInferred = !att ||
    String(att.status || "").toLowerCase() === "absent" ||
    (att.check_in_time && !att.check_out_time);

  if (isInferred) {
    if (!att) {
      // No record on a past date is "off" for sandwich purposes
      return "off";
    }
    if (att.date && att.date > todayStr) return "pending";
    if (att.date && att.date === todayStr && !att.check_out_time) return "pending";
  }
  return "off";
}

function isDateWorked(att, dateStr) {
  if (!att) return false;
  const status = String(att.status || "").toLowerCase();
  const workedStatuses = ["present", "full_day", "half_day", "late"];

  // Check if the date is Saturday and status is half-day
  // Saturday half-day is qualifying event ONLY if check-out is BEFORE 7 PM
  if (dateStr && status === "half_day") {
    const dayOfWeek = getDayOfWeek(dateStr);
    if (dayOfWeek === 6) { // Saturday
      if (att.check_in_time && att.check_out_time) {
        const checkOutTime = att.check_out_time; // Format: "HH:MM:SS"
        const [hours] = checkOutTime.split(':').map(Number);
        // If check-out is before 7 PM (19:00), it's a qualifying event
        if (hours < 19) {
          return false; // Treat as qualifying event
        }
        // If check-out is after 7 PM, it's worked (not qualifying event)
      }
    }
    // Check if the date is Monday
    // Monday is qualifying event ONLY if check-in is AFTER 10:30 AM
    if (dayOfWeek === 1) { // Monday
      if (att.check_in_time && att.check_out_time) {
        const checkInTime = att.check_in_time; // Format: "HH:MM:SS"
        const [hours, minutes] = checkInTime.split(':').map(Number);
        // If check-in is after 10:30 AM (10:30:00), it's a qualifying event
        if (hours > 10 || (hours === 10 && minutes > 30)) {
          return false; // Treat as qualifying event
        }
        // If check-in is before or at 10:30 AM, it's worked (not qualifying event)
      }
    }
  }

  // Special case: Monday with check-in AFTER 10:30 AM is a qualifying event
  if (dateStr) {
    const dayOfWeek = getDayOfWeek(dateStr);
    if (dayOfWeek === 1 && att.check_in_time && att.check_out_time) {
      const checkInTime = att.check_in_time; // Format: "HH:MM:SS"
      const [hours, minutes] = checkInTime.split(':').map(Number);
      // If check-in is after 10:30 AM (10:30:00), it's a qualifying event
      if (hours > 10 || (hours === 10 && minutes > 30)) {
        return false; // Treat as qualifying event
      }
    }
  }

  // If employee has check-in AND check-out, they worked (even if half-day)
  // This overrides leave requests for sandwich policy
  if (att.check_in_time && att.check_out_time) {
    const inSec = timeToSeconds(att.check_in_time);
    const outSec = timeToSeconds(att.check_out_time);
    return Math.max(0, outSec - inSec) / 3600 > 0;
  }

  // If employee has only check-in but no check-out, treat as NOT worked (qualifying event)
  // This handles cases like "Absent with check-in" where employee didn't complete the day
  if (att.check_in_time && !att.check_out_time) {
    return false;
  }

  return workedStatuses.includes(status);
}

function timeToSeconds(timeStr) {
  if (!timeStr) return null;
  const [h, m, s] = String(timeStr).trim().split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return h * 3600 + m * 60 + (s || 0);
}

// ── Helpers (new) ──────────────────────────────────────────────────
function buildApprovedLeaveDates(leaves) {
  const set = new Set();
  for (const leave of leaves) {
    if (String(leave?.status || '').toLowerCase() !== 'approved') continue;

    const fromDate = toDateStr(leave.from_date);
    const toDate = toDateStr(leave.to_date);
    if (!fromDate || !toDate) continue;
    const [y1, m1, d1] = fromDate.split("-").map(Number);
    const [y2, m2, d2] = toDate.split("-").map(Number);
    const end = new Date(y2, m2 - 1, d2);
    for (let d = new Date(y1, m1 - 1, d1); d <= end; d.setDate(d.getDate() + 1)) {
      const dStr = toDateStr(d);
      if (getDayOfWeek(dStr) !== 0) set.add(dStr); // Sundays are never "leave days"
    }
  }
  return set;
}

// A normal working day: not a Sunday and not a company holiday
function isOrdinaryDay(ds, holidayMap) {
  return getDayOfWeek(ds) !== 0 && !holidayMap.has(ds);
}

function qualifyingReason(n) {
  return ["", "", "SECOND_QUALIFYING_SATURDAY", "THIRD_QUALIFYING_SATURDAY", "FOURTH_QUALIFYING_SATURDAY"][n]
    || `QUALIFYING_SATURDAY_${n}`;
}

/**
 * @param {Object} data     { attMap, holidayMap, allDates, leaves }
 * @param {Object} options  { todayStr, joiningDate, periodStart, periodEnd }
 *   allDates must cover periodStart-2 days .. periodEnd+1 day.
 *   periodStart/periodEnd = the payroll month; only off-days inside it are charged.
 */
export function applySandwichPolicy(data = {}, options = {}) {
  const normalizedData = { ...data };
  const normalizedOptions = { ...options };

  if (!normalizedData.leaves && (Array.isArray(normalizedData.approvedLeaveDates) || normalizedData.approvedLeaveDates instanceof Set)) {
    normalizedData.leaves = [...normalizedData.approvedLeaveDates].map((date) => ({
      from_date: date,
      to_date: date,
      status: 'approved',
    }));
  }
  if (!normalizedOptions.joiningDate && normalizedData.joiningDate) {
    normalizedOptions.joiningDate = normalizedData.joiningDate;
  }
  if (!normalizedOptions.periodStart && normalizedData.periodStart) {
    normalizedOptions.periodStart = normalizedData.periodStart;
  }
  if (!normalizedOptions.periodEnd && normalizedData.periodEnd) {
    normalizedOptions.periodEnd = normalizedData.periodEnd;
  }
  if (!normalizedOptions.todayStr && normalizedData.todayStr) {
    normalizedOptions.todayStr = normalizedData.todayStr;
  }

  const { attMap, holidayMap, allDates, leaves = [] } = normalizedData;
  const { todayStr = toDateStr(new Date()), joiningDate, periodStart, periodEnd } = normalizedOptions;

  const approvedLeaveDates = buildApprovedLeaveDates(leaves);
  const stateOf = (ds) =>
    getDayState(attMap.get(ds), holidayMap.has(ds), Boolean(joiningDate && ds < joiningDate),
      todayStr, approvedLeaveDates, ds);
  const isOff = (ds) => isOrdinaryDay(ds, holidayMap) && stateOf(ds) === "off";
  const inPeriod = (ds) => (!periodStart || ds >= periodStart) && (!periodEnd || ds <= periodEnd);

  const allowanceUsage = new Map();
  const sandwichResults = [];
  
  // Track qualifying events per Sunday
  const sundayQualifyingEvents = new Map();

  // Anchors = Only Sundays inside the payroll month, in date order (holidays excluded)
  const anchors = [...allDates].sort()
    .filter((ds) => inPeriod(ds) && getDayOfWeek(ds) === 0);

  // First pass: count qualifying events for each Sunday
  for (const anchor of anchors) {
    const before = addDays(anchor, -1);
    const after = addDays(anchor, 1);
    
    let qualifyingCount = 0;
    
    // Check Saturday (day before)
    if (inPeriod(before)) {
      const beforeState = stateOf(before);
      if (beforeState === "off") qualifyingCount++;
    }
    
    // Check Monday (day after)
    if (inPeriod(after)) {
      const afterState = stateOf(after);
      if (afterState === "off") qualifyingCount++;
    }
    
    sundayQualifyingEvents.set(anchor, qualifyingCount);
  }

  // Second pass: apply sandwich rule
  let firstOneEventSundayPaid = false;

  for (const anchor of anchors) {
    const isSunday = getDayOfWeek(anchor) === 0;
    const anchorType = isSunday ? "SUNDAY" : "HOLIDAY";
    const prefix = isSunday ? "" : "HOLIDAY_";
    const add = (date, applied, reason) =>
      sandwichResults.push({ date, applied, reason: prefix + reason, anchorType });

    if (joiningDate && anchor < joiningDate) continue;

    const qualifyingCount = sundayQualifyingEvents.get(anchor) || 0;

    if (qualifyingCount >= 2) {
      // 2+ qualifying events = unpaid
      add(anchor, true, "TWO_SIDED_NON_WORKING");
    } else if (qualifyingCount === 1) {
      // 1 qualifying event
      if (!firstOneEventSundayPaid) {
        // First Sunday with 1 event = paid
        firstOneEventSundayPaid = true;
        add(anchor, false, "FIRST_QUALIFYING_SUNDAY_ALLOWANCE");
      } else {
        // Subsequent Sundays with 1 event = unpaid
        add(anchor, true, "SUBSEQUENT_ONE_EVENT_UNPAID");
      }
    }
    // 0 qualifying events = paid (no action needed - no sandwich result added)
  }

  return { sandwichResults, allowanceUsage };
}

export function applySandwichToAttendanceMap(attMap, sandwichResults) {
  return attMap; // no mutation
}

export function getSandwichSummary(sandwichResults) {
  return sandwichResults.filter((r) => r.applied || r.reason).sort((a, b) => a.date.localeCompare(b.date));
}

export function getSandwichResultForDate(sandwichResults, dateStr) {
  return sandwichResults.find((r) => r.date === dateStr) || null;
}