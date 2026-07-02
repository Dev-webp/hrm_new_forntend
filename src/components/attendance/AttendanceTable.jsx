import {
  filterAttendanceRows,
  formatTimeShort,
  formatLateLoginCount,
  getLateLoginStatus,
  getLateLoginStatusClass,
  getLatePillMeta,
  getStatusMeta,
  isSundayDate,
} from "../../utils/attendanceHelpers";
import { formatProductionHours } from "../../utils/timeFormat";

function formatTimeForInput(time) {
  return time ? String(time).slice(0, 5) : "";
}

function StatusBadge({ status }) {
  const meta = getStatusMeta(status);
  if (meta.className) {
    return <span className={meta.className}>{meta.label}</span>;
  }
  return (
    <span className="badge" style={meta.style}>
      {meta.label}
    </span>
  );
}

function LatePill({ emp }) {
  const meta = getLatePillMeta(emp);
  return <span style={meta.style}>{meta.label}</span>;
}

function LateLoginCountCell({ emp }) {
  const status = getLateLoginStatus(emp);
  return (
    <div className="late-login-count-cell">
      <strong>{formatLateLoginCount(emp)}</strong>
      <span className={getLateLoginStatusClass(status)}>{status}</span>
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
}) {
  if (loading) {
    return (
      <tbody>
        <tr>
          <td colSpan={10}>
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
            colSpan={10}
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
          <td colSpan={10} className="attendance-empty-state">
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
          <td colSpan={10} className="attendance-empty-state">
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
        <tr key={emp.user_id}>
          <td>
            <i className="fas fa-user-circle" /> {emp.full_name}
          </td>
          <td>{emp.department || emp.user_department || "-"}</td>
          <td>{formatTimeShort(emp.check_in_time)}</td>
          <td>{formatTimeShort(emp.check_out_time)}</td>
          <td>
            <StatusBadge status={emp.status} />
          </td>
          <td>
            <LatePill emp={emp} />
          </td>
          <td>
            <LateLoginCountCell emp={emp} />
          </td>
          <td style={{ color: "#FF8C00", fontWeight: 600 }}>
            {formatProductionHours(emp.production_hours)}
          </td>
          <td style={{ color: "#64748B" }}>
            {emp.total_break_minutes || 0} min
          </td>
          <td>
            <button
              type="button"
              className="edit-attend-btn"
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
              <i className="fas fa-edit" /> Edit
            </button>
          </td>
        </tr>
      ))}
    </tbody>
  );
}

export default AttendanceTable;
