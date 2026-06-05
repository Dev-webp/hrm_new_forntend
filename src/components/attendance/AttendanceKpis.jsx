function AttendanceKpis({ stats, loading, error }) {
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
      <div className="kpi">
        <div className="kpi-title">
          <i className="fas fa-chart-line" /> Attendance Rate
        </div>
        <div className="kpi-value">{stats.attendanceRate ?? 0}%</div>
        <div className="trend-up">
          <i className="fas fa-calendar-day" /> selected date
        </div>
      </div>
      <div className="kpi">
        <div className="kpi-title">
          <i className="fas fa-users" /> Present
        </div>
        <div className="kpi-value">{stats.dailyPresent ?? 0}</div>
        <div className="trend-up">of {stats.totalActive ?? 0} active</div>
      </div>
      <div className="kpi">
        <div className="kpi-title">
          <i className="fas fa-hourglass-start" /> Late Arrivals
        </div>
        <div className="kpi-value">{stats.lateToday ?? 0}</div>
        <div className="trend-up">
          <i className="fas fa-chart-line" /> real-time
        </div>
      </div>
    </div>
  );
}

export default AttendanceKpis;
