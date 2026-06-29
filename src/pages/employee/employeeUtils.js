import { formatTime12Hour } from "../../utils/timeFormat";

export function escapeHtml(str) {
  if (!str) return "";
  return String(str).replace(
    /[&<>]/g,
    (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[m]
  );
}

export function formatTime12(timeStr) {
  return formatTime12Hour(timeStr);
}

export const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export const WEEK_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function normalizeArray(raw) {
  if (Array.isArray(raw)) return raw;
  if (raw?.data && Array.isArray(raw.data)) return raw.data;
  return [];
}
