import { computeSandwich } from "./sandwhichService.js";
import { toDateStr } from "./dateHelper.js";

export function hasAppliedSandwichPenalty(policyEntries = []) {
  if (!Array.isArray(policyEntries)) return false;
  return policyEntries.some((entry) => entry && entry.applied === true);
}

export function getSandwichCellClass(baseClassName = "", policyEntries = []) {
  const safeBaseClass = String(baseClassName || "").trim();
  if (!hasAppliedSandwichPenalty(policyEntries)) return safeBaseClass;
  return [safeBaseClass, "sandwich-lop"].filter(Boolean).join(" ");
}

function mapResultsByDate(results = [], month) {
  const byDate = new Map();
  for (const result of results) {
    const date = toDateStr(result?.date);
    if (!date || !date.startsWith(`${month}-`)) continue;
    const entries = byDate.get(date) || [];
    entries.push(result);
    byDate.set(date, entries);
  }
  return byDate;
}

export function computeEmployeeSandwichByDate({
  attendance = [],
  leaves = [],
  holidays = [],
  joiningDate,
  month,
  todayStr,
}) {
  if (!/^\d{4}-\d{2}$/.test(String(month || ""))) return new Map();
  const [year, monthNumber] = month.split("-").map(Number);
  const { sandwichResults } = computeSandwich({
    attendance,
    leaves,
    holidays,
    joiningDate: toDateStr(joiningDate),
    year,
    month: monthNumber,
    todayStr,
  });
  return mapResultsByDate(sandwichResults, month);
}

export function computeHeatmapSandwichByEmployee(employees = [], month) {
  const byEmployee = new Map();
  for (const employee of employees) {
    if (employee?.id === null || employee?.id === undefined) continue;
    byEmployee.set(
      String(employee.id),
      computeEmployeeSandwichByDate({ ...employee, month })
    );
  }
  return byEmployee;
}
