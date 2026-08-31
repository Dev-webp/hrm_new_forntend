/** Transform GET /attendance/range row → heatmap record shape */
function timeToMinutes(value) {
  if (!value || value === "--") return null;
  const [h, m] = String(value).slice(0, 5).split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return h * 60 + m;
}

function overlapMinutes(startA, endA, startB, endB) {
  return Math.max(0, Math.min(endA, endB) - Math.max(startA, startB));
}

function halfDayEffectiveMinutes(row, slot) {
  const checkIn = timeToMinutes(row.check_in_time);
  const checkOut = timeToMinutes(row.check_out_time);
  if (checkIn === null || checkOut === null) return 0;

  const slotStart = slot === "afternoon" ? 14 * 60 + 30 : 10 * 60;
  const slotEnd = slot === "afternoon" ? 19 * 60 : 14 * 60 + 30;
  if (checkIn > slotStart) return 0;

  const workStart = Math.max(checkIn, slotStart);
  const workEnd = Math.min(checkOut, slotEnd);
  if (workEnd <= workStart) return 0;

  const breakPairs = [
    [row.break1_in, row.break1_out],
    [row.lunch_in, row.lunch_out],
    [row.break2_in, row.break2_out],
  ];
  const breakMinutes = breakPairs.reduce((sum, [rawStart, rawEnd]) => {
    const start = timeToMinutes(rawStart);
    const end = timeToMinutes(rawEnd);
    if (start === null || end === null || end <= start) return sum;
    return sum + overlapMinutes(start, end, workStart, workEnd);
  }, 0);

  return Math.max(0, workEnd - workStart - breakMinutes);
}

function getHalfDayDetails(row) {
  const checkIn = timeToMinutes(row.check_in_time);
  const checkOut = timeToMinutes(row.check_out_time);
  const morning = halfDayEffectiveMinutes(row, "morning");
  const afternoon = halfDayEffectiveMinutes(row, "afternoon");
  const validMorning = checkIn !== null && checkIn <= 10 * 60 && morning >= 240;
  const validAfternoon = checkIn !== null && checkIn <= 14 * 60 + 30 && afternoon >= 240;

  if (validMorning) return { effective: morning, slotChecked: "MORNING", invalidReason: "" };
  if (validAfternoon) return { effective: afternoon, slotChecked: "AFTERNOON", invalidReason: "" };
  if (checkIn === null || checkOut === null) {
    return { effective: 0, slotChecked: "INVALID", invalidReason: "Missing login or logout" };
  }
  if (checkIn > 14 * 60 + 30) {
    return { effective: Math.max(morning, afternoon), slotChecked: "AFTERNOON", invalidReason: "Afternoon half-day login must be on or before 2:30 PM" };
  }
  if (checkIn > 10 * 60 && checkOut <= 14 * 60 + 30) {
    return { effective: Math.max(morning, afternoon), slotChecked: "MORNING", invalidReason: "Morning half-day login must be on or before 10:00 AM" };
  }
  return {
    effective: Math.max(morning, afternoon),
    slotChecked: afternoon > 0 ? "AFTERNOON" : "MORNING",
    invalidReason: `${afternoon > 0 ? "Afternoon" : "Morning"} half-day effective production is below 4 hours`,
  };
}



export function buildCalendarCacheKey(branch, userId, monthStr) {
  return `${branch}|${userId ?? "all"}|${monthStr}`;
}

export function monthRangeBounds(monthStr) {
  const [y, m] = monthStr.split("-").map(Number);
  const mm = String(m).padStart(2, "0");
  const lastDay = new Date(y, m, 0).getDate();
  return {
    start: `${y}-${mm}-01`,
    end: `${y}-${mm}-${String(lastDay).padStart(2, "0")}`,
  };
}
