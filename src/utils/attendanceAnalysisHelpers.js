/** Attendance analysis — date/format/compute helpers (from adminAttendanceAnalysis.html) */

export const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export const BRANCH_FILTER_OPTIONS = [
  { value: "all", label: "All Branches" },
  { value: "Hyderabad", label: "Hyderabad" },
  { value: "Bangalore", label: "Bangalore" },
];

export const ANALYSIS_TABS = [
  { id: "overview", label: "📅 Monthly Overview" },
  { id: "weekly", label: "📆 Weekly Deep Dive" },
  { id: "dailylog", label: "📋 Day Log" },
  { id: "breakanalytics", label: "☕ Break Analytics" },
  { id: "leavesalary", label: "🌿 Leave & Salary" },
];

export const WEEK_FILTER_OPTIONS = [
  { value: "all", label: "All" },
  { value: "1", label: "Week1" },
  { value: "2", label: "Week2" },
  { value: "3", label: "Week3" },
  { value: "4", label: "Week4" },
  { value: "5", label: "Week5" },
];

export function parseLocalDate(s) {
  const [y, m, d] = s.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function formatDateReadable(s) {
  const [, m, d] = s.slice(0, 10).split("-").map(Number);
  return `${MONTH_NAMES[m - 1]} ${d}`;
}

export function formatDateYMD(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function dayName(s) {
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][
    parseLocalDate(s).getDay()
  ];
}

export function formatTimeDisplay(t) {
  if (!t || t === "--" || t === "—") return "--";
  const [h, mi] = String(t).split(":").map(Number);
  return `${h % 12 || 12}:${String(mi).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

export function monthLabel(yearMonth) {
  const [yr, mo] = yearMonth.split("-");
  return `${MONTH_NAMES[parseInt(mo, 10) - 1]} ${yr}`;
}

export function mapEmployeeOption(e) {
  return {
    id: e.id,
    name: e.full_name,
    dept: e.department,
    branch: e.branch,
    initials: (e.full_name?.split(" ").map((n) => n[0]).join("").slice(0, 2) || "EM").toUpperCase(),
  };
}

export function getAttendanceStyle(rec) {
  if (!rec) return { className: "cal-absent", numClass: "red-num" };
if (rec.status === "sunday") {
  return { className: "cal-sunday", numClass: "blue-num" };
}
  if (rec.status === "holiday") return { className: "cal-holiday", numClass: "default-num" };
  if (rec.status === "absent") return { className: "cal-absent", numClass: "red-num" };
  if (rec.lateMinutes > 0) return { className: "cal-late", numClass: "orange-num" };
  if (rec.status === "full_day") return { className: "cal-present", numClass: "green-num" };
  if (rec.status === "half_day") return { className: "cal-halfday", numClass: "yellow-num" };
  return { className: "cal-holiday", numClass: "default-num" };
}

export function getWeekNumber(dateStr) {
  const d = parseLocalDate(dateStr);
  const first = new Date(d.getFullYear(), d.getMonth(), 1);
  return Math.ceil(
    (d.getDate() + (first.getDay() === 0 ? 6 : first.getDay() - 1)) / 7
  );
}

export function buildWeeksCache(monthStr) {
  const [y, m] = monthStr.split("-").map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  const weeks = [];
  let startDay = 1;
  while (startDay <= lastDay) {
    weeks.push({
      start: new Date(y, m - 1, startDay),
      end: new Date(y, m - 1, Math.min(startDay + 6, lastDay)),
    });
    startDay += 7;
  }
  return weeks;
}

export function computeOverviewStats(records) {
  const workDays = records.filter(
    (r) => !["absent", "sunday", "holiday"].includes(r.status)
  );
  const presentDays = records.filter((r) => r.status === "full_day").length;
  const lateDays = records.filter((r) => r.lateMinutes > 0).length;
  const halfDays = records.filter((r) => r.status === "half_day").length;
  const absent = records.filter((r) => r.status === "absent").length;
  const totalDays = records.filter(
    (r) => !["sunday", "holiday"].includes(r.status)
  ).length;
  const attRate = totalDays
    ? Math.round(((presentDays + halfDays) / totalDays) * 100)
    : 0;
  const avgBreak = workDays.length
    ? Math.round(workDays.reduce((s, r) => s + r.breaks, 0) / workDays.length)
    : 0;
  const exceed = workDays.filter((r) => r.breaks > 60).length;

  return {
    workDays,
    presentDays,
    lateDays,
    halfDays,
    absent,
    totalDays,
    attRate,
    avgBreak,
    exceed,
  };
}

export function getDailyLogStatus(rec) {
  if (rec.status === "absent") return { label: "Absent", badge: "b-absent" };
  if (rec.status === "half_day") return { label: "Half Day", badge: "b-halfday" };
  if (rec.status === "sunday") return { label: "Sunday", badge: "b-absent" };
  if (rec.status === "holiday") return { label: "Holiday", badge: "b-absent" };
  if (rec.lateMinutes > 0) return { label: "Late", badge: "b-late" };
  return { label: "Present", badge: "b-present" };
}

export function downloadCSV(rows, filename) {
  const csv = rows
    .map((r) => (Array.isArray(r) ? r : [r]).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}
