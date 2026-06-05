function KpiSkeleton({ count = 4 }) {
  return (
    <div className="kpi-grid">
      {Array.from({ length: count }).map((_, i) => (
        <div className="kpi-tile" key={i}>
          <div className="label">Loading</div>
          <div className="kpi-skeleton-bar" />
        </div>
      ))}
    </div>
  );
}

function AttendanceAnalysisCards({ items, loading }) {
  if (loading && !items?.length) {
    return <KpiSkeleton count={items?.length || 4} />;
  }

  if (!items?.length) {
    return (
      <div className="kpi-grid">
        <div className="kpi-tile">
          <div className="label">No data</div>
          <div className="value" style={{ fontSize: "1.2rem" }}>
            —
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="kpi-grid">
      {items.map((item) => (
        <div className="kpi-tile" key={item.label}>
          <div className="label">{item.label}</div>
          <div
            className="value"
            style={item.valueStyle}
          >
            {item.value}
          </div>
        </div>
      ))}
    </div>
  );
}

export { KpiSkeleton, AttendanceAnalysisCards };
export default AttendanceAnalysisCards;
