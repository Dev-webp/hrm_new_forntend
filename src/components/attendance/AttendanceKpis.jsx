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

  const absentCount = records.filter((record) =>
    String(record.status || "").toLowerCase().includes("absent")
  ).length;
  const productionHours = records.reduce(
    (sum, record) => sum + Number(record.production_hours || 0),
    0
  );

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
    <div className="kpi-grid">
      <div className="kpi info">
        <div className="kpi-title">
          <i className="fas fa-users" /> Total Employees
        </div>
        <div className="kpi-value">{stats.totalActive ?? records.length}</div>
        <div className="trend-up">
          <i className="fas fa-calendar-day" /> selected workforce
        </div>
      </div>
      <div className="kpi success">
        <div className="kpi-title">
          <i className="fas fa-users" /> Present
        </div>
        <div className="kpi-value">{stats.dailyPresent ?? 0}</div>
        <div className="trend-up">of {stats.totalActive ?? 0} active</div>
      </div>
      <div className="kpi danger">
        <div className="kpi-title">
          <i className="fas fa-user-xmark" /> Absent
        </div>
        <div className="kpi-value">{absentCount}</div>
        <div className="trend-up">selected date</div>
      </div>
      <div className="kpi warning">
        <div className="kpi-title">
          <i className="fas fa-hourglass-start" /> Late Arrivals
        </div>
        <div className="kpi-value">{stats.lateToday ?? 0}</div>
        <div className="trend-up">
          <i className="fas fa-chart-line" /> real-time
        </div>
      </div>
      <div className="kpi primary">
        <div className="kpi-title">
          <i className="fas fa-business-time" /> Production Hours
        </div>
        <div className="kpi-value">{formatProductionHours(productionHours)}</div>
        <div className="trend-up">{stats.attendanceRate ?? 0}% attendance rate</div>
      </div>
    </div>
  );
}

export default AttendanceKpis;
