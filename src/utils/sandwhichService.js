// ═══════════════════════════════════════════════════════════════════
// SANDWICH SERVICE LAYER
// ═══════════════════════════════════════════════════════════════════
// Provides service-level functions for sandwich processing
// Builds on top of sandwichPolicy.js with additional helper functions
// ═══════════════════════════════════════════════════════════════════

import { applySandwichPolicy } from './sandwichPolicy.js';
import { toDateStr, addDays, getDayOfWeek, getYearMonth } from './dateHelper.js';

/**
 * Get current date as YYYY-MM-DD string in IST (Asia/Kolkata)
 * @returns {string} YYYY-MM-DD string
 */
export function todayIST() {
  return toDateStr(new Date());
}

/**
 * Shift a date by a number of days
 * @param {string} dateStr - Date string (YYYY-MM-DD)
 * @param {number} days - Days to shift (can be negative)
 * @returns {string} New date string (YYYY-MM-DD)
 */
export function shiftDate(dateStr, days) {
  return addDays(dateStr, days);
}

/**
 * Get month bounds (first and last day) for a given year and month
 * @param {number} year - Year
 * @param {number} month - Month (1-12)
 * @returns {Object} { start: YYYY-MM-DD, end: YYYY-MM-DD }
 */
export function monthBounds(year, month) {
  const start = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { start, end };
}

/**
 * Enumerate all dates in a range (inclusive)
 * @param {string} startDate - Start date string (YYYY-MM-DD)
 * @param {string} endDate - End date string (YYYY-MM-DD)
 * @returns {string[]} Array of date strings
 */
export function eachDate(startDate, endDate) {
  const dates = [];
  let current = startDate;
  while (current <= endDate) {
    dates.push(current);
    current = addDays(current, 1);
  }
  return dates;
}

/**
 * Get all months in a date range
 * @param {string} startDate - Start date string (YYYY-MM-DD)
 * @param {string} endDate - End date string (YYYY-MM-DD)
 * @returns {Array<{year, month}>} Array of {year, month} objects
 */
export function monthsInRange(startDate, endDate) {
  const start = getYearMonth(startDate);
  const end = getYearMonth(endDate);
  
  const months = [];
  let currentYear = start.year;
  let currentMonth = start.month;
  
  while (currentYear < end.year || (currentYear === end.year && currentMonth <= end.month)) {
    months.push({ year: currentYear, month: currentMonth });
    
    currentMonth++;
    if (currentMonth > 12) {
      currentMonth = 1;
      currentYear++;
    }
  }
  
  return months;
}

/**
 * Compute sandwich results for a single user/month
 * @param {Object} params - Sandwich computation parameters
 * @param {Array} params.attendance - Attendance records for the user
 * @param {Array} params.leaves - Approved leave requests for the user
 * @param {Array} params.holidays - Company holidays for the month
 * @param {string} params.joiningDate - User's joining date (YYYY-MM-DD)
 * @param {number} params.year - Year
 * @param {number} params.month - Month (1-12)
 * @param {string} params.todayStr - Today's date string (YYYY-MM-DD)
 * @returns {Object} Sandwich results with applied charges and allowance usage
 */
export function computeSandwich({
  attendance = [],
  leaves = [],
  holidays = [],
  joiningDate,
  year,
  month,
  todayStr = todayIST()
}) {
  const { start: periodStart, end: periodEnd } = monthBounds(year, month);
  const windowStart = addDays(periodStart, -2);
  const windowEnd = addDays(periodEnd, 1);

  // Build holiday dates map for the payroll month plus adjacent context days.
  const holidayMap = new Map();
  for (const holiday of holidays) {
    const date = toDateStr(holiday.date);
    holidayMap.set(date, holiday);
  }

  // Build attendance map keyed by date; later records win for the same day.
  const attMap = new Map();
  for (const att of attendance) {
    const date = toDateStr(att.date);
    if (!date) continue;
    attMap.set(date, att);
  }

  const allDates = eachDate(windowStart, windowEnd);

  const results = applySandwichPolicy(
    {
      attMap,
      holidayMap,
      allDates,
      leaves,
    },
    {
      joiningDate,
      periodStart,
      periodEnd,
      todayStr,
    }
  );

  return results;
}

/**
 * Get sandwich results for multiple users in a specific month
 * @param {Object} pool - PostgreSQL pool or client
 * @param {Array<number>} userIds - Array of user IDs
 * @param {number} year - Year
 * @param {number} month - Month (1-12)
 * @returns {Promise<Object>} Sandwich results keyed by user_id
 */
export async function getSandwichForUsersMonth(pool, userIds, year, month) {
  const { start: periodStart, end: periodEnd } = monthBounds(year, month);
  
  const windowStart = addDays(periodStart, -2);
  const windowEnd = addDays(periodEnd, 1);

  const attendanceQuery = `
    SELECT * FROM attendance_records
    WHERE user_id = ANY($1)
      AND date >= $2 AND date <= $3
    ORDER BY user_id, date
  `;
  const attendanceRes = await pool.query(attendanceQuery, [userIds, windowStart, windowEnd]);

  const extendedStart = windowStart;
  const extendedEnd = windowEnd;
  
  const leavesQuery = `
    SELECT * FROM leave_requests
    WHERE user_id = ANY($1)
      AND status = 'approved'
      AND to_date >= $2 AND from_date <= $3
    ORDER BY user_id, from_date
  `;
  const leavesRes = await pool.query(leavesQuery, [userIds, extendedStart, extendedEnd]);
  
  // Fetch holidays for the surrounding window (branch-aware if possible)
  const holidaysQuery = `
    SELECT * FROM company_holidays
    WHERE date >= $2 AND date <= $3
    ORDER BY date
  `;
  const holidaysRes = await pool.query(holidaysQuery, [windowStart, windowEnd]);
  
  // Fetch joining dates for all users
  const usersQuery = `
    SELECT id, joining_date FROM users WHERE id = ANY($1)
  `;
  const usersRes = await pool.query(usersQuery, [userIds]);
  const userJoiningDates = new Map();
  for (const row of usersRes.rows) {
    userJoiningDates.set(row.id, toDateStr(row.joining_date));
  }
  
  // Group attendance by user
  const attendanceByUser = new Map();
  for (const att of attendanceRes.rows) {
    if (!attendanceByUser.has(att.user_id)) {
      attendanceByUser.set(att.user_id, []);
    }
    attendanceByUser.get(att.user_id).push(att);
  }
  
  // Group leaves by user
  const leavesByUser = new Map();
  for (const leave of leavesRes.rows) {
    if (!leavesByUser.has(leave.user_id)) {
      leavesByUser.set(leave.user_id, []);
    }
    leavesByUser.get(leave.user_id).push(leave);
  }
  
  // Compute sandwich for each user
  const results = new Map();
  for (const userId of userIds) {
    const userAttendance = attendanceByUser.get(userId) || [];
    const userLeaves = leavesByUser.get(userId) || [];
    const joiningDate = userJoiningDates.get(userId);
    
    const sandwichResult = computeSandwich({
      attendance: userAttendance,
      leaves: userLeaves,
      holidays: holidaysRes.rows,
      joiningDate,
      year,
      month,
      todayStr: todayIST()
    });
    
    results.set(userId, sandwichResult);
  }
  
  return results;
}

export default {
  computeSandwich,
  getSandwichForUsersMonth,
  shiftDate,
  eachDate,
  todayIST,
  monthBounds,
  monthsInRange
};
