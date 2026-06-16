import {
  filterAttendanceRows,
  formatTimeShort,
  getLatePillMeta,
  getStatusMeta,
  isSundayDate,
} from "../../utils/attendanceHelpers";

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

function AttendanceTable({
  records,
  dateStr,
  deptFilter,
  search,
  loading,
  onEdit,
}) {
  if (loading) {
    return (
      <tbody>
        <tr>
          <td colSpan={9}>
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
            colSpan={9}
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
          <td colSpan={9} className="attendance-empty-state">
            <i className="fas fa-calendar-xmark" />
            <strong>No attendance records</strong>
            <span>No records found for this date.</span>
          </td>
        </tr>
      </tbody>
    );
  }

  const filtered = filterAttendanceRows(records, deptFilter, search);

  if (!filtered.length) {
    return (
      <tbody>
        <tr>
          <td colSpan={9} className="attendance-empty-state">
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
          <td style={{ color: "#FF8C00", fontWeight: 600 }}>
            {emp.production_hours || "0.00"} hrs
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
                  checkIn: emp.check_in_time
                    ? formatTimeShort(emp.check_in_time)
                    : "",
                  checkOut: emp.check_out_time
                    ? formatTimeShort(emp.check_out_time)
                    : "",
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
