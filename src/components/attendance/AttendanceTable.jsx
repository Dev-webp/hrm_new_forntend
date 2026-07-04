import {
  filterAttendanceRows,
  formatTimeShort,
  formatLateLoginCount,
  getLateLoginStatus,
  isSundayDate,
  normalizeAttendanceStatusValue,
} from "../../utils/attendanceHelpers";
import { formatProductionHours } from "../../utils/timeFormat";

function formatTimeForInput(time) {
  return time ? String(time).slice(0, 5) : "";
}

function timeToMinutes(time) {
  const raw = formatTimeForInput(time);
  if (!raw) return null;
  const [h, m] = raw.split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return h * 60 + m;
}

function getProductionMinutes(value) {
  const hours = Number(value || 0);
  return Math.max(0, Math.round(hours * 60));
}

function getInitials(name = "") {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "--";
  return parts.map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

function getStatusConfig(status) {
  const normalized = normalizeAttendanceStatusValue(status);
  if (["full_day", "present"].includes(normalized)) {
    return { key: "present", label: "Present", icon: "fa-circle-check" };
  }
  if (normalized === "half_day") {
    return { key: "half-day", label: "Half Day", icon: "fa-clock" };
  }
  if (["in_progress", "working"].includes(normalized)) {
    return { key: "working", label: "Working", icon: "fa-signal" };
  }
  if (normalized === "leave") {
    return { key: "leave", label: "Leave", icon: "fa-umbrella-beach" };
  }
  if (normalized === "holiday") {
    return { key: "holiday", label: "Holiday", icon: "fa-calendar-check" };
  }
  return { key: "absent", label: "Absent", icon: "fa-circle-xmark" };
}

function getStatusReason(emp) {
  const status = normalizeAttendanceStatusValue(emp.status);
  const checkInMinutes = timeToMinutes(emp.check_in_time);
  const breakMinutes = Number(emp.total_break_minutes || 0);
  const productionMinutes = getProductionMinutes(emp.production_hours);

  if (["in_progress", "working"].includes(status)) return "Checked In • In Progress";
  if (status === "absent") return emp.check_in_time ? "Missing Checkout" : "No Login";
  if (status === "leave") return "Approved Leave";
  if (status === "holiday") return "Company Holiday";

  if (status === "half_day") {
    if (checkInMinutes !== null && checkInMinutes >= 10 * 60 + 30) return "Late Login (10:30+)";
    if (breakMinutes > 60) return `Break Exceeded (${breakMinutes} min)`;
    if (productionMinutes > 0) return `Worked ${formatProductionHours(emp.production_hours)}`;
    return "Required hours not completed";
  }

  if (["full_day", "present"].includes(status)) return "Completed 9 Hours";

  return "No Login";
}

function getHalfDayTooltip(emp) {
  const reason = getStatusReason(emp);
  let detail = "Required hours not completed";
  if (reason.startsWith("Late Login")) detail = "Login after 10:30 AM";
  if (reason.startsWith("Break Exceeded")) detail = "Break exceeded 60 minutes";
  if (reason.startsWith("Worked")) detail = "Required hours not completed";
  return `Half Day\nReason:\n• ${detail}`;
}

function StatusBadge({ emp }) {
  const config = getStatusConfig(emp.status);
  const reason = getStatusReason(emp);
  const title = config.key === "half-day" ? getHalfDayTooltip(emp) : `${config.label}\n${reason}`;
  return (
    <div className="attendance-status-cell">
      <span className={`attendance-status-badge status-${config.key}`} title={title}>
        <i className={`fas ${config.icon}`} />
        {config.label}
      </span>
      <span className="attendance-status-reason">{reason}</span>
    </div>
  );
}

function LatePill({ emp }) {
  const status = getLateLoginStatus(emp);
  const lateMinutes = Number(emp.late_minutes || 0);
  if (status === "Late") {
    return (
      <div className="attendance-late-cell late">
        <span><i className="fas fa-circle-exclamation" /> Late</span>
        <strong>{lateMinutes} min</strong>
      </div>
    );
  }
  if (normalizeAttendanceStatusValue(emp.status) === "absent" && !emp.check_in_time) {
    return <div className="attendance-late-cell muted">—</div>;
  }
  return (
    <div className="attendance-late-cell on-time">
      <span><i className="fas fa-circle-check" /> On Time</span>
    </div>
  );
}

function LateLoginCountCell({ emp }) {
  const count = Number(formatLateLoginCount(emp)) || 0;
  return (
    <div className="late-login-count-cell">
      {count > 0 ? (
        <strong><i className="fas fa-diamond" /> {count} Late Login{count === 1 ? "" : "s"}</strong>
      ) : (
        <strong className="no-late-logins">No Late Logins</strong>
      )}
    </div>
  );
}

function ProductionCell({ hours }) {
  if (!hours || Number(hours) <= 0) {
    return (
      <div className="attendance-production-cell empty">
        <strong>—</strong>
        <small>No Work Recorded</small>
      </div>
    );
  }

  const minutes = getProductionMinutes(hours);
  const percent = Math.min(100, Math.round((minutes / (9 * 60)) * 100));
  return (
    <div className="attendance-production-cell">
      <strong>{formatProductionHours(hours)}</strong>
      <div className="production-meter" aria-label={`${percent}% production`}>
        <span style={{ width: `${percent}%` }} />
      </div>
      <small>{percent}%</small>
    </div>
  );
}

function BreakCell({ minutes }) {
  const value = Number(minutes || 0);
  if (value <= 0) {
    return (
      <div className="attendance-break-cell empty">
        <strong>—</strong>
        <span>No Work</span>
      </div>
    );
  }

  const exceeded = value > 60;
  return (
    <div className="attendance-break-cell">
      <strong><i className="fas fa-mug-hot" /> {value} min</strong>
      <span className={exceeded ? "break-exceeded" : "break-ok"}>
        <i className={`fas ${exceeded ? "fa-circle-xmark" : "fa-circle-check"}`} />
        {exceeded ? "Exceeded" : "Within Limit"}
      </span>
    </div>
  );
}

function getRowClass(emp) {
  return `attendance-row row-${getStatusConfig(emp.status).key}`;
}

export function AttendanceStatusLegend() {
  return (
    <div className="attendance-status-legend" aria-label="Attendance status legend">
      <span><i className="fas fa-circle-check present" /> Present</span>
      <span><i className="fas fa-clock half-day" /> Half Day</span>
      <span><i className="fas fa-signal working" /> Working</span>
      <span><i className="fas fa-circle-xmark absent" /> Absent</span>
    </div>
  );
}

function AttendanceTable({
  records,
  dateStr,
  deptFilter,
  search,
  lateStatusFilter = "all",
  loading,
  onEdit,
  onViewHistory,
}) {
  if (loading) {
    return (
      <tbody>
        <tr>
          <td colSpan={11}>
            <span className="loading-spinner" /> Loading...
          </td>
        </tr>
      </tbody>
    );
  }

  if (isSundayDate(dateStr)) {
    return (
      <tbody>
        <tr>
          <td
            colSpan={11}
            style={{ textAlign: "center", padding: 40, color: "#B91C1C" }}
          >
            📆 <strong>Sunday</strong> — No attendance records are recorded.
          </td>
        </tr>
      </tbody>
    );
  }

  if (!records?.length) {
    return (
      <tbody>
        <tr>
          <td colSpan={11} className="attendance-empty-state">
            <i className="fas fa-calendar-xmark" />
            <strong>No attendance records</strong>
            <span>No records found for this date.</span>
          </td>
        </tr>
      </tbody>
    );
  }

  const filtered = filterAttendanceRows(records, deptFilter, search, lateStatusFilter);

  if (!filtered.length) {
    return (
      <tbody>
        <tr>
          <td colSpan={11} className="attendance-empty-state">
            <i className="fas fa-user-slash" />
            <strong>No matching employees</strong>
            <span>Try changing the department filter or search.</span>
          </td>
        </tr>
      </tbody>
    );
  }

  return (
    <tbody>
      {filtered.map((emp) => (
        <tr key={emp.user_id || emp.id} className={getRowClass(emp)}>
          <td>
            <div className="attendance-avatar" aria-label={`${emp.full_name} initials`}>
              {getInitials(emp.full_name)}
            </div>
          </td>
          <td className="attendance-employee-cell">
            <span>{emp.full_name}</span>
          </td>
          <td>{emp.department || emp.user_department || "-"}</td>
          <td>{formatTimeShort(emp.check_in_time)}</td>
          <td>{formatTimeShort(emp.check_out_time)}</td>
          <td>
            <StatusBadge emp={emp} />
          </td>
          <td>
            <LatePill emp={emp} />
          </td>
          <td>
            <LateLoginCountCell emp={emp} />
          </td>
          <td>
            <ProductionCell hours={emp.production_hours} />
          </td>
          <td>
            <BreakCell minutes={emp.total_break_minutes} />
          </td>
          <td>
            <div className="attendance-actions">
              <button
                type="button"
                className="attendance-icon-btn"
                title="Edit attendance"
                aria-label={`Edit attendance for ${emp.full_name}`}
                onClick={() =>
                  onEdit({
                    userId: emp.user_id,
                    name: emp.full_name,
                    initialValues: {
                      check_in_time: formatTimeForInput(emp.check_in_time),
                      check_out_time: formatTimeForInput(emp.check_out_time),
                      break1_in: formatTimeForInput(emp.break1_in),
                      break1_out: formatTimeForInput(emp.break1_out),
                      lunch_in: formatTimeForInput(emp.lunch_in),
                      lunch_out: formatTimeForInput(emp.lunch_out),
                      break2_in: formatTimeForInput(emp.break2_in),
                      break2_out: formatTimeForInput(emp.break2_out),
                    },
                  })
                }
              >
                <i className="fas fa-pen" />
              </button>
              <button
                type="button"
                className="attendance-icon-btn"
                title="View details"
                aria-label={`View attendance history for ${emp.full_name}`}
                onClick={() =>
                  onViewHistory?.({
                    userId: emp.user_id,
                    name: emp.full_name,
                  })
                }
              >
                <i className="fas fa-eye" />
              </button>
              <button type="button" className="attendance-icon-btn" title="More actions" aria-label="More actions">
                <i className="fas fa-ellipsis-vertical" />
              </button>
            </div>
          </td>
        </tr>
      ))}
    </tbody>
  );
}

export default AttendanceTable;
