/** Attendance admin page — shared constants and display helpers (from adminadentendance.html) */

export const ATTENDANCE_DEPARTMENTS = [
  { value: "all", label: "All Departments" },
  { value: "Branch Manager", label: "Branch Manager" },
  { value: "Reception", label: "Reception" },
  { value: "Sales Team", label: "Sales Team" },
  { value: "Process Team", label: "Process Team" },
  { value: "Accounts", label: "Accounts" },
  { value: "Digital Marketing Team", label: "Digital Marketing Team" },
  { value: "IT", label: "IT" },
];

export const ATTENDANCE_BRANCH_MENU = [
  { value: "all", label: "🌍 All Branches (Consolidated)" },
  { value: "Bangalore", label: "💻 Bangalore Tech Hub" },
  { value: "Hyderabad", label: "🐘 Hyderabad Centre" },
];

export function branchDisplayLabel(branch) {
  if (branch === "all") return "All Branches";
  return branch;
}

export function branchSelectorLabel(branch) {
  if (branch === "all") return "🌍 All Branches";
  if (branch === "Bangalore") return "💻 Bangalore Tech Hub";
  if (branch === "Hyderabad") return "🐘 Hyderabad Centre";
  return branch;
}

export function formatTimeShort(time) {
  if (!time) return "--";
  return String(time).substring(0, 5);
}

export function isSundayDate(dateStr) {
  return new Date(dateStr).getDay() === 0;
}

export function getStatusMeta(status) {
  const s = (status || "absent").toLowerCase();
  if (s === "full_day") {
    return {
      label: "FULL DAY",
      style: { background: "rgba(74,222,128,0.2)", color: "#4ADE80" },
    };
  }
  if (s === "half_day") {
    return {
      label: "HALF DAY",
      style: { background: "rgba(255,160,0,0.2)", color: "#FFB347" },
    };
  }
  return {
    label: "ABSENT",
    className: "badge badge-absent",
  };
}

export function getLatePillMeta(emp) {
  const status = (emp.status || "absent").toLowerCase();
  if (status === "absent") {
    return {
      label: "Absent",
      style: {
        background: "rgba(255,70,70,0.15)",
        color: "#FF6B6B",
        padding: "6px 12px",
        borderRadius: "30px",
        fontWeight: 700,
        fontSize: "12px",
      },
    };
  }
  if ((emp.late_minutes || 0) > 0) {
    return {
      label: `🔴 ${emp.late_minutes} min`,
      style: {
        background: "rgba(255,70,70,0.18)",
        color: "#FF6B6B",
        padding: "6px 12px",
        borderRadius: "30px",
        fontWeight: 700,
        fontSize: "12px",
        display: "inline-block",
        minWidth: "75px",
        textAlign: "center",
        border: "1px solid rgba(255,70,70,0.3)",
      },
    };
  }
  return {
    label: "On Time",
    style: {
      background: "rgba(74,222,128,0.15)",
      color: "#4ADE80",
      padding: "6px 12px",
      borderRadius: "30px",
      fontWeight: 600,
      fontSize: "12px",
    },
  };
}

export function getLateEmployeeStatusMeta(status) {
  const finalStatus = (status || "absent").toLowerCase();
  if (finalStatus === "full_day") {
    return { label: "FULL DAY", color: "#4ADE80", bg: "rgba(74,222,128,0.2)" };
  }
  if (finalStatus === "half_day") {
    return { label: "HALF DAY", color: "#FFB347", bg: "rgba(255,160,0,0.2)" };
  }
  return { label: "ABSENT", color: "#FF6B6B", bg: "rgba(255,70,70,0.2)" };
}

export function filterAttendanceRows(records, deptFilter, search) {
  const q = search.trim().toLowerCase();
  return (records || []).filter((emp) => {
    const dept =
      emp.department || emp.user_department || "";
    const deptMatch =
      deptFilter === "all" || dept === deptFilter;
    const searchMatch =
      !q ||
      (emp.full_name || "").toLowerCase().includes(q) ||
      dept.toLowerCase().includes(q);
    return deptMatch && searchMatch;
  });
}

const TIME_RE = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;

export function validateTimeHHMM(value) {
  return TIME_RE.test(value);
}
