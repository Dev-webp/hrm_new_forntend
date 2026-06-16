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
        <div className={`kpi-tile ${item.tone || ""}`} key={item.label}>
          <div className="kpi-tile-head">
            <div className="label">{item.label}</div>
            <div className="kpi-tile-icon">
              <i className={`fas ${item.icon || "fa-chart-simple"}`} />
            </div>
          </div>
          <div
            className="value"
            style={item.valueStyle}
          >
            {item.value}
          </div>
          {item.caption ? <div className="kpi-caption">{item.caption}</div> : null}
        </div>
      ))}
    </div>
  );
}

export { KpiSkeleton, AttendanceAnalysisCards };
export default AttendanceAnalysisCards;
