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
     
    </div>
  );
}

export default AttendanceKpis;
