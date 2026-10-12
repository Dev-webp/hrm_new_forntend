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
  if (isDateWorked(att)) return "worked";

  const hasApprovedLeaveInAtt = att && (att.leave_status === "approved" || att.approved_leave);
  const hasApprovedLeaveInSet = approvedLeaveDates && approvedLeaveDates.has(dateStr);
  if (hasApprovedLeaveInAtt || hasApprovedLeaveInSet) return "off";

  const isInferred = !att ||
    String(att.status || "").toLowerCase() === "absent" ||
    (att.check_in_time && !att.check_out_time);

  if (isInferred) {
    if (!att) return "pending";
    if (att.date && att.date > todayStr) return "pending";
    if (att.date && att.date === todayStr && !att.check_out_time) return "pending";
  }
  return "off";
}

function isDateWorked(att) {
  if (!att) return false;
  const status = String(att.status || "").toLowerCase();
  const workedStatuses = ["present", "full_day", "half_day", "late"];
  const hasPunch = att.check_in_time || att.check_out_time;

  if (hasPunch) {
    if (status === "half_day") return true;
    if (att.check_in_time && att.check_out_time) {
      const inSec = timeToSeconds(att.check_in_time);
      const outSec = timeToSeconds(att.check_out_time);
      return Math.max(0, outSec - inSec) / 3600 > 0;
    }
    return true;
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

  // Anchors = Sundays and company holidays inside the payroll month, in date order
  const anchors = [...allDates].sort()
    .filter((ds) => inPeriod(ds) && (getDayOfWeek(ds) === 0 || holidayMap.has(ds)));

  for (const anchor of anchors) {
    const isSunday = getDayOfWeek(anchor) === 0;
    const anchorType = isSunday ? "SUNDAY" : "HOLIDAY";
    const prefix = isSunday ? "" : "HOLIDAY_";
    const add = (date, applied, reason) =>
      sandwichResults.push({ date, applied, reason: prefix + reason, anchorType });

    // POLICY CHANGE: Company holidays are now subject to sandwich evaluation
    // Sunday that is also a holiday: evaluate sandwich conditions (can become sandwich)
    // if (isSunday && holidayMap.has(anchor)) continue;        // REMOVED: holidays now participate in sandwich
    if (joiningDate && anchor < joiningDate) continue;       // before joining

    // The day before the anchor must be an ordinary day that is "off"
    const before = addDays(anchor, -1);
    if (!isOrdinaryDay(before, holidayMap)) {
      if (holidayMap.has(before)) add(before, false, "HOLIDAY_EXCLUDED");
      continue;
    }
    const beforeState = stateOf(before);
    if (beforeState === "worked")   { add(before, false, "SATURDAY_WORKED");  continue; }
    if (beforeState === "excluded") { add(before, false, "HOLIDAY_EXCLUDED"); continue; }
    if (beforeState !== "off")      { add(before, false, "SATURDAY_PENDING"); continue; }

    // Actual attendance on the off-day always wins
    if (isDateWorked(attMap.get(anchor))) {
      const r = isSunday ? "SUNDAY_WORKED" : "WORKED";
      add(before, false, r);
      add(anchor, false, r);
      continue;
    }

    // Two-sided (before + after both off) or Fri+Sat+Sun: charge anchor, NO allowance used
    const after = addDays(anchor, 1);
    const twoSided = isOff(after);
    const friSat = !twoSided && isSunday && FRI_SAT_PATTERN_ENABLED && isOff(addDays(before, -1));
    if (twoSided || friSat) {
      add(anchor, true, twoSided ? "TWO_SIDED_NON_WORKING" : "FRI_SAT_SUN_NON_WORKING");
      add(before, false, twoSided ? "TWO_SIDED_EXCEPTION_NO_ALLOWANCE" : "FRI_SAT_PATTERN_NO_ALLOWANCE");
      continue;
    }

    // One-sided: shared monthly free allowance (Sundays AND holidays pooled)
    const { year, month } = getYearMonth(anchor);
    const key = `:${year}:${month}`;
    const used = (allowanceUsage.get(key) || 0) + 1;
    allowanceUsage.set(key, used);

    if (used === 1) {
      add(before, false, "FIRST_QUALIFYING_SATURDAY");
      add(anchor, false, "SATURDAY_ALLOWANCE");
    } else {
      const reason = qualifyingReason(used);
      add(before, false, reason);
      add(anchor, true, reason);
    }
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