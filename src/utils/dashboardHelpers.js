
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

  const today = new Date();
  const isCurrentMonth =
    year === today.getFullYear() && month === today.getMonth() + 1;

  for (let day = 1; day <= total; day += 1) {
    const dateStr = buildDateStr(year, month, day);

    if (isCurrentMonth && dateStr > todayStr) break;

    if (isSunday(dateStr) || holidaySet.has(dateStr)) continue;

    workingDays += 1;

    const record = recordMap.get(dateStr);

    if (!record || record.status === "absent") {
      absent += 1;
      continue;
    }

    if (record.status === "half_day") {
      half += 1;
      if ((record.late_minutes || 0) > 0) late += 1;
      continue;
    }

    if (record.status === "full_day") {
      present += 1;
      if ((record.late_minutes || 0) > 0) late += 1;
    }
  }

  const effectivePresent = present + half * 0.5;
  const attPct =
    workingDays > 0 ? Math.round((effectivePresent / workingDays) * 100) : 0;

  return { present, half, absent, late, workingDays, attPct };
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
