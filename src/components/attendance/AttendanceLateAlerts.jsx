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

  return (
    <div className="card">
      <div className="card-header">
        <span>
          <i className="fas fa-triangle-exclamation" /> Late Employee Alerts
        </span>
        <div>
          <span style={{ marginRight: 15 }}>{countLabel}</span>
          <button type="button" className="toggle-btn" onClick={onToggle}>
            {visible ? (
              <>
                <i className="fas fa-eye" /> Hide
              </>
            ) : (
              <>
                <i className="fas fa-eye-slash" /> Show
              </>
            )}
          </button>
        </div>
      </div>

      {visible && (
        <div className="dept-leaderboard">
          {loading ? (
            <div className="dept-row">Loading late employees...</div>
          ) : !lateEmployees.length ? (
            <div style={{ padding: 20, color: "#16A34A" }}>
              <i className="fas fa-circle-check" /> No late employees today
            </div>
          ) : (
            lateEmployees.map((emp) => {
              const statusMeta = getLateEmployeeStatusMeta(emp.status);
              return (
                <div
                  key={emp.user_id}
                  className="late-feed-item"
                >
                  <div className="late-feed-icon">
                    <i className="fas fa-user-clock" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>
                      {emp.full_name}
                    </div>
                    <div
                      style={{
                        marginTop: 6,
                        display: "flex",
                        gap: 10,
                        flexWrap: "wrap",
                        fontSize: 12,
                        color: "#64748B",
                      }}
                    >
                      <span className="branch-tag">
                        {emp.branch || emp.user_branch || "-"}
                      </span>
                      <span>
                        <i className="fas fa-building" />{" "}
                        {emp.department || "-"}
                      </span>
                      <span
                        style={{
                          background: "rgba(255,70,70,0.18)",
                          color: "#DC2626",
                          padding: "4px 10px",
                          borderRadius: 30,
                          fontWeight: 700,
                          border: "1px solid rgba(255,70,70,0.3)",
                        }}
                      >
                        <i className="fas fa-clock" /> Late by{" "}
                        {emp.late_minutes} min
                      </span>
                      <span>
                        Check-in: {formatTimeShort(emp.check_in_time)}
                      </span>
                      <span style={{ color: "#FF8C00" }}>
                        Production: {formatProductionHours(emp.production_hours)}
                      </span>
                    </div>
                  </div>
                  <div>
                    <span
                      className="badge"
                      style={{
                        background: statusMeta.bg,
                        color: statusMeta.color,
                      }}
                    >
                      {statusMeta.label}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

export default AttendanceLateAlerts;
