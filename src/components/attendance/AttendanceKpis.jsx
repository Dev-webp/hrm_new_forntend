import { formatProductionHours } from "../../utils/timeFormat";

function AttendanceKpis({ stats, records = [], loading, error }) {
  if (loading && !stats) {
    return (
      <div className="kpi-grid">
        <div className="kpi">
          <div className="kpi-title">Loading stats...</div>
          <span className="loading-spinner" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="kpi-grid">
        <div className="kpi">
          <div className="kpi-title">Error loading data</div>
          <div className="trend-up">{error}</div>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const normalizedStatus = (record) =>
    String(record.status || "absent").trim().toLowerCase().replace(/[\s-]+/g, "_");
  const presentCount = records.filter((record) =>
    ["full_day", "present"].includes(normalizedStatus(record))
  ).length;
  const halfDayCount = records.filter((record) => normalizedStatus(record) === "half_day").length;
  const workingCount = records.filter((record) =>
    ["working", "in_progress"].includes(normalizedStatus(record))
  ).length;
  const absentCount = records.filter((record) => normalizedStatus(record) === "absent").length;
  const productiveRecords = records.filter((record) => Number(record.production_hours || 0) > 0);
  const productionHours = productiveRecords.reduce(
    (sum, record) => sum + Number(record.production_hours || 0),
    0
  );
  const averageProductionHours = productiveRecords.length
    ? productionHours / productiveRecords.length
    : 0;

  if (stats.isSunday) {
    return (
      <div className="kpi-grid">
        <div className="kpi kpi-sunday">
          <div className="kpi-title">📆 Sunday</div>
          <div className="kpi-value" style={{ fontSize: "1.8rem" }}>
            Day Off
          </div>
          <div className="trend-up" style={{ color: "#FFB4B4" }}>
            No attendance data for Sundays
          </div>
        </div>
      </div>
    );
  }

  if (stats.isHoliday) {
    return (
      <div className="kpi-grid">
        <div className="kpi kpi-holiday">
          <div className="kpi-title">🎉 Company Holiday</div>
          <div className="kpi-value" style={{ fontSize: "1.8rem" }}>
            Holiday
          </div>
          <div className="trend-up">Office Closed</div>
        </div>
      </div>
    );
  }

  return (
    <div className="kpi-grid attendance-summary-grid">
      <div className="kpi attendance-summary-card success">
        <div className="kpi-title">
          <i className="fas fa-circle-check" /> Present
        </div>
        <div className="kpi-value">{stats.dailyPresent ?? presentCount}</div>
        <div className="trend-up">Employees</div>
      </div>
      <div className="kpi attendance-summary-card warning">
        <div className="kpi-title">
          <i className="fas fa-clock" /> Half Day
        </div>
        <div className="kpi-value">{halfDayCount}</div>
        <div className="trend-up">Employees</div>
      </div>
      <div className="kpi attendance-summary-card info">
        <div className="kpi-title">
          <i className="fas fa-signal" /> Working
        </div>
        <div className="kpi-value">{workingCount}</div>
        <div className="trend-up">Employees</div>
      </div>
      <div className="kpi attendance-summary-card danger">
        <div className="kpi-title">
          <i className="fas fa-user-xmark" /> Absent
        </div>
        <div className="kpi-value">{absentCount}</div>
        <div className="trend-up">Employees</div>
      </div>
      <div className="kpi attendance-summary-card late">
        <div className="kpi-title">
          <i className="fas fa-hourglass-start" /> Late Arrivals
        </div>
        <div className="kpi-value">{stats.lateToday ?? 0}</div>
        <div className="trend-up">Employees</div>
      </div>
      <div className="kpi attendance-summary-card primary">
        <div className="kpi-title">
          <i className="fas fa-business-time" /> Average Production
        </div>
        <div className="kpi-value">{formatProductionHours(averageProductionHours)}</div>
        <div className="trend-up">{stats.attendanceRate ?? 0}% attendance rate</div>
      </div>
    </div>
  );
}

export default AttendanceKpis;
