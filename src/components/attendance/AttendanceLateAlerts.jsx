import {
  formatTimeShort,
  getLateEmployeeStatusMeta,
} from "../../utils/attendanceHelpers";
import { isGraceLateAttendanceRecord } from "../../utils/dashboardHelpers";
import { formatProductionHours } from "../../utils/timeFormat";

function AttendanceLateAlerts({
  records,
  visible,
  onToggle,
  loading,
}) {
  const lateEmployees = (records || []).filter(
    isGraceLateAttendanceRecord
  );

  const countLabel = `${lateEmployees.length} Employee${
    lateEmployees.length !== 1 ? "s" : ""
  } Late`;

  if (!visible) return null;

  return (
    <div className="late-alerts-card">
      <div className="late-alerts-header">
        <div className="late-alerts-title">
          <i className="fas fa-triangle-exclamation" /> Late Employee Alerts
          <span className="late-alerts-count">{countLabel}</span>
        </div>
        <button type="button" className="late-alerts-toggle-btn" onClick={onToggle}>
          <i className="fas fa-eye-slash" /> Hide
        </button>
      </div>

      {loading ? (
        <div style={{ padding: 20, textAlign: "center", color: "#536985" }}>
          Loading late employees...
        </div>
      ) : !lateEmployees.length ? (
        <div className="no-late-employees">
          <i className="fas fa-circle-check" /> No late employees today
        </div>
      ) : (
        lateEmployees.map((emp) => {
          const statusMeta = getLateEmployeeStatusMeta(emp.status);
          const initials = emp.full_name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);
          return (
            <div key={emp.user_id} className="late-employee-item">
              <div className="late-employee-avatar">{initials}</div>
              <div className="late-employee-info">
                <div className="late-employee-name">{emp.full_name}</div>
                <div className="late-employee-details">
                  <span>
                    <i className="fas fa-building" /> {emp.department || "-"}
                  </span>
                  <span className="late-employee-badge">
                    <i className="fas fa-clock" /> Late by {emp.late_minutes} min
                  </span>
                  <span>Check-in: {formatTimeShort(emp.check_in_time)}</span>
                  <span style={{ color: "#FF8C00" }}>
                    Production: {formatProductionHours(emp.production_hours)}
                  </span>
                </div>
              </div>
              <div className={`late-employee-status ${emp.status === "late" ? "late" : "on-time"}`}>
                {statusMeta.label}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

export default AttendanceLateAlerts;
