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
  "half_day",
  "paid_leave",
  "unpaid_leave",
  "absent",
  "late",
  "present",
  "no_record",
];

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

// Attendance rows are the single source of truth for a calendar day. Legacy
// generic leave rows remain readable, but no UI derives a split from a request.
export function getCalendarAttendanceStatus(record) {
  // Handle null, undefined, false, or invalid values safely
  if (!record || typeof record !== "object") {
    return "no_record";
  }

  const status = normalizeStatus(
    record.status ||
    record.day_status ||
    record.attendance_status
  );

  const halfDaySlot = record.half_day_slot || record.halfDaySlot;
  const isHalfDay = Boolean(halfDaySlot && halfDaySlot !== 'INVALID');
  const hasAttendance = Boolean(
    record.check_in_time ||
    record.check_out_time ||
    record.office_in ||
    record.office_out ||
    record.checkIn ||
    record.checkOut
  );
  const leaveDurationType = normalizeStatus(
    record.leave_duration_type ||
    record.leaveDurationType
  );

  // A half-day leave slot is a request, not an attendance result. Without
  // punches it must not turn the day into paid leave or a worked half day.
  if (
    !hasAttendance &&
    (
      isHalfDay ||
      leaveDurationType === "half_day" ||
      record.half_day_session ||
      record.halfDaySession
    )
  ) {
    return "no_record";
  }

  // Explicit day-level status wins over leave-request metadata.
  if (status && status !== "leave") {
    if (status === "paid") return "paid_leave";
    if (status === "unpaid") return "unpaid_leave";
    return status;
  }

  if (hasAttendance) return status || "no_record";

  const leaveType = normalizeStatus(
    record.leave_type ||
    record.leaveType
  );

  // Leave metadata is a fallback for rows without an attendance result.
  if (leaveType === "paid_leave" || leaveType === "paid") {
    return "paid_leave";
  }

  if (leaveType === "unpaid_leave" || leaveType === "unpaid") {
    return "unpaid_leave";
  }

  // Backward compatibility for generic leave records
  if (
    status === "leave" ||
    normalizeStatus(
      record.leave_status ||
      record.leaveStatus
    ) === "approved"
  ) {
    if (record.is_paid_leave === true || record.isPaidLeave === true) {
      return "paid_leave";
    }

    if (record.is_paid_leave === false || record.isPaidLeave === false) {
      return "unpaid_leave";
    }
  }

  return status || "no_record";
}
