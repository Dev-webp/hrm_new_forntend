/** Transform GET /attendance/range row → heatmap record shape */
export function transformAttendanceRangeRecord(r) {
  const date =
    typeof r.date === "string"
      ? r.date.slice(0, 10)
      : r.date?.toISOString?.()?.slice(0, 10) ?? r.date;

  const checkIn = r.check_in_time
    ? String(r.check_in_time).slice(0, 5)
    : "--";
  const checkOut = r.check_out_time
    ? String(r.check_out_time).slice(0, 5)
    : "--";

  return {
    date,
    status: r.status,
    checkIn,
    checkOut,
    lateMinutes: r.late_minutes ?? 0,
    workHours: parseFloat(r.production_hours) || 0,
    breaks: r.total_break_minutes ?? 0,
    breakMins: { b1: 0, lunch: 0, b2: 0, b3: 0 },
    breakDetails: {
      b1: { in: "--", out: "--" },
      lunch: { in: "--", out: "--" },
      b2: { in: "--", out: "--" },
      b3: { in: "--", out: "--" },
    },
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
