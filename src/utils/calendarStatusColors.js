export const CALENDAR_STATUS_COLORS = {
  present: {
    background: "#C8F2D6",
    border: "#16A34A",
    text: "#0F5132",
  },
  absent: {
    background: "#FFCBCB",
    border: "#DC2626",
    text: "#8B0000",
  },
  sandwich_absent: {
    background: "#FFB3B3",
    border: "#B91C1C",
    text: "#7F1D1D",
  },
  late: {
    background: "#FFD29B",
    border: "#EA580C",
    text: "#9A2E00",
  },
  half_day: {
    background: "#FFE066",
    border: "#D4A300",
    text: "#7A5800",
  },
  holiday: {
    background: "#B3CEFB",
    border: "#2563EB",
    text: "#0F2E8C",
  },
  paid_leave: {
    background: "#F5F3FF",
    border: "#7C3AED",
    text: "#6D28D9",
  },
  unpaid_leave: {
    background: "#FEE2E2",
    border: "#EF4444",
    text: "#991B1B",
  },
  no_record: {
    background: "#E2E8F0",
    border: "#94A3B8",
    text: "#334155",
  },
};

export const CALENDAR_STATUS_PRIORITY = [
  "holiday",
  "paid_leave",
  "unpaid_leave",
  "sandwich_absent",
  "absent",
  "half_day",
  "late",
  "present",
  "no_record",
];

export const STATUS_LABELS = {
  present: "Present",
  absent: "Absent",
  sandwich_absent: "Absent (Sandwich)",
  late: "Late",
  half_day: "Half Day",
  holiday: "Holiday",
  paid_leave: "Paid Leave",
  unpaid_leave: "Unpaid Leave",
  no_record: "No Record",
};

export function getCalendarStatusColor(status = "no_record") {
  return CALENDAR_STATUS_COLORS[status] || CALENDAR_STATUS_COLORS.no_record;
}

export function getCalendarStatusStyle(status = "no_record") {
  const color = getCalendarStatusColor(status);
  return {
    background: color.background,
    borderColor: color.border,
    color: color.text,
  };
}

function normalizeStatus(value) {
  return String(value || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
}

export function isCalendarGraceLateLogin(record = {}) {
  const raw = record.check_in_time || record.office_in || record.checkIn;
  if (!raw) return false;
  const [hours, minutes] = String(raw).slice(0, 5).split(":").map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return false;
  const loginMinutes = hours * 60 + minutes;
  return loginMinutes >= 10 * 60 + 15 && loginMinutes < 10 * 60 + 30;
}

export function resolveCalendarStatus(
  record,
  { dateStr, isSunday = false, isHoliday = false, isHalfDayHoliday = false } = {}
) {
  const rawStatus = normalizeStatus(
    record?.status || record?.day_status || record?.attendance_status
  );
  const hasPunch = Boolean(
    record?.check_in_time ||
    record?.check_out_time ||
    record?.office_in ||
    record?.office_out ||
    record?.checkIn ||
    record?.checkOut
  );
  const workedStatuses = new Set([
    "full_day",
    "present",
    "in_progress",
    "working",
    "missing_checkout",
    "half_day",
    "late",
  ]);
  const recordWithoutSandwich = record
    ? { ...record, sandwich: [] }
    : null;

  if (record && (hasPunch || workedStatuses.has(rawStatus))) {
    const actualStatus = getCalendarAttendanceStatus(recordWithoutSandwich);
    return actualStatus === "no_record" ? rawStatus || "no_record" : actualStatus;
  }

  const sandwichResult = record?.sandwich?.find(
    (item) => item?.date === dateStr
  );
  if (sandwichResult?.applied === true) {
    return "sandwich_absent";
  }

  if (isHoliday) return "holiday";
  if (isSunday) return "sunday";
  if (isHalfDayHoliday) return "half_day";

  if (record) {
    return getCalendarAttendanceStatus(recordWithoutSandwich);
  }

  return "no_record";
}

export function getCalendarStatusLabel(status, record = {}, options = {}) {
  const normalizedStatus = normalizeStatus(status);
  if (normalizedStatus === "sandwich_absent") return "Absent (Sandwich)";
  if (normalizedStatus === "sunday") return "📆 Sunday";
  if (normalizedStatus === "holiday") return options.holidayName || "Holiday";
  if (normalizedStatus === "present" || normalizedStatus === "full_day") return "Present";
  if (normalizedStatus === "working" || normalizedStatus === "in_progress") return "Working";
  if (normalizedStatus === "missing_checkout") return "Missing Checkout";
  if (normalizedStatus === "half_day") {
    const hasLeaveContext =
      Boolean(record.leave_request_id || record.leaveRequestId) ||
      (record.policy_flags || []).includes("leave_period");
    if (hasLeaveContext) {
      const isPaid = record.is_paid_leave === true || record.isPaidLeave === true;
      return `Half Day ${isPaid ? "(Paid Leave)" : "(Unpaid Leave)"}`;
    }
    return "Half Day";
  }
  if (normalizedStatus === "paid_leave") return "Paid Leave";
  if (normalizedStatus === "unpaid_leave") return "Unpaid Leave";
  if (normalizedStatus === "mixed_leave") return "Mixed Leave";
  if (normalizedStatus === "leave") return "On Leave";
  if (normalizedStatus === "absent") return "Absent";
  if (normalizedStatus === "late") {
    const lateMinutes = Number(options.lateMinutes ?? record.late_minutes ?? record.lateMinutes ?? 0);
    return lateMinutes > 0 ? `Late ${lateMinutes}m` : "Late";
  }
  if (normalizedStatus === "no_record") return "No Record";
  return normalizedStatus.replace(/_/g, " ") || "No Record";
}

export function getCalendarStatusClassNames(status) {
  const normalizedStatus = normalizeStatus(status);
  if (["present", "full_day", "working", "in_progress"].includes(normalizedStatus)) {
    return "calendar-present";
  }
  if (["absent", "sandwich_absent"].includes(normalizedStatus)) {
    return "calendar-absent";
  }
  if (normalizedStatus === "late" || normalizedStatus === "missing_checkout") {
    return "calendar-late";
  }
  if (normalizedStatus === "half_day") return "calendar-halfday";
  if (normalizedStatus === "paid_leave") return "calendar-paid-leave paid-leave";
  if (normalizedStatus === "unpaid_leave") return "calendar-unpaid-leave unpaid-leave";
  if (normalizedStatus === "mixed_leave") return "calendar-mixed-leave";
  if (normalizedStatus === "leave") return "calendar-leave";
  if (normalizedStatus === "sunday" || normalizedStatus === "holiday") {
    return "calendar-holiday";
  }
  return "calendar-empty";
}

// Attendance rows are the single source of truth for a calendar day. Legacy
// generic leave rows remain readable, but no UI derives a split from a request.
export function getCalendarAttendanceStatus(record) {
  // Handle null, undefined, false, or invalid values safely
  if (!record || typeof record !== "object") {
    return "no_record";
  }

  // ============================================================
  // SANDWICH POLICY CHECK
  // ============================================================
  // Check if this date has sandwich penalty applied
  if (record.sandwich && Array.isArray(record.sandwich) && record.sandwich.length > 0) {
    // If any sandwich entry has applied: true, return sandwich_absent
    const hasSandwich = record.sandwich.some(s => s.applied === true);
    if (hasSandwich) {
      return "sandwich_absent";
    }
  }

  const status = normalizeStatus(
    record.status ||
    record.day_status ||
    record.attendance_status
  );

  const halfDaySlot = record.half_day_slot || record.halfDaySlot;
  const leaveDurationType = normalizeStatus(
    record.leave_duration_type ||
    record.leaveDurationType
  );
  const isHalfDay = leaveDurationType === "half_day" || Boolean(halfDaySlot);

  // ============================================================
  // PUNCH DATA IS AUTHORITATIVE
  // ============================================================
  // If the record has punch data (check_in_time or check_out_time),
  // use the actual status from the backend which is based on work hours.
  // Leave metadata is preserved for payroll purposes only.
  // ============================================================
  
  const hasPunch = Boolean(record.check_in_time || record.check_out_time || 
                          record.office_in || record.office_out);
  
  if (hasPunch) {
    // Use the status directly from the backend (computed based on punch data)
    if (status === "half_day") {
      return "half_day";
    }
    if (status === "full_day" || status === "present" || status === "working") {
      return "present";
    }
    if (status === "absent") {
      return "absent";
    }
    if (status === "late") {
      return "late";
    }
    // Return the status as-is if it's a valid attendance status
    if (status && status !== "no_record") {
      return status;
    }
  }

  if (status === "absent" || status === "no_record") {
    return status;
  }

  // ============================================================
  // NO PUNCH DATA - USE LEAVE STATUS
  // ============================================================
  // If no punch data exists, use leave status from leave request
  // ============================================================

  // Highest priority: explicit per-day attendance status
  if (status === "paid_leave") return isHalfDay ? "half_day" : "paid_leave";
  if (status === "unpaid_leave") return isHalfDay ? "half_day" : "unpaid_leave";

  const leaveType = normalizeStatus(
    record.leave_type ||
    record.leaveType
  );

  // Leave type fallback
  if (
    leaveType === "paid_leave" ||
    leaveType === "paid"
  ) {
    return isHalfDay ? "half_day" : "paid_leave";
  }

  if (
    leaveType === "unpaid_leave" ||
    leaveType === "unpaid"
  ) {
    return isHalfDay ? "half_day" : "unpaid_leave";
  }

  // Backward compatibility for generic leave records
  if (
    status === "leave" ||
    normalizeStatus(
      record.leave_status ||
      record.leaveStatus
    ) === "approved"
  ) {
    if (
      record.is_paid_leave === true ||
      record.isPaidLeave === true
    ) {
      return isHalfDay ? "half_day" : "paid_leave";
    }

    if (
      record.is_paid_leave === false ||
      record.isPaidLeave === false
    ) {
      return isHalfDay ? "half_day" : "unpaid_leave";
    }
  }

  return status || "no_record";
}
