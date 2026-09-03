function TableSkeleton({ rows = 8, cols = 8 }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, ri) => (
        <tr key={ri}>
          {Array.from({ length: cols }).map(
            (__, ci) => (
              <td key={ci}>
                <div className="table-skeleton-cell" />
              </td>
            )
          )}
        </tr>
      ))}
    </>
  );
}

function DepartmentAnalyticsTable({
  employees,
  loading,
  error,
  branch,
  month,
  onViewFullAnalysis,
}) {
  const handleViewFullAnalysis = (employee) => {
    if (!employee?.user_id) {
      return;
    }

    if (typeof onViewFullAnalysis === "function") {
      onViewFullAnalysis(
        employee.user_id,
        branch,
        month
      );
    }
  };

  return (
    <div className="analysis-table-wrap">
      <table
        className="data-table"
        id="summaryTable"
      >
        <thead>
          <tr>
            <th>Employee</th>
            <th>Dept</th>
            <th>Present</th>
            <th>Late</th>
            <th>Absent</th>
            <th>Avg Break</th>
            <th>Exceeded 60m</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          {loading ? (
            <TableSkeleton />
          ) : error ? (
            <tr>
              <td
                colSpan={8}
                style={{
                  color: "#DC2626",
                  textAlign: "center",
                }}
              >
                Load failed
              </td>
            </tr>
          ) : !employees?.length ? (
            <tr>
              <td
                colSpan={8}
                style={{
                  color: "#64748B",
                  textAlign: "center",
                }}
              >
                No data
              </td>
            </tr>
          ) : (
            employees.map((e) => {
              const highAbsence =
                Number(e.absent_days || 0) >= 3;

              const highLate =
                Number(e.late_days || 0) >= 5;

              return (
                <tr
                  key={e.user_id}
                  className={
                    highAbsence || highLate
                      ? "risk-row"
                      : ""
                  }
                >
                  <td>
                    <div className="analysis-employee-cell">
                      <span className="analysis-avatar">
                        {e.full_name
                          ?.slice(0, 2)
                          ?.toUpperCase()}
                      </span>

                      <span>
                        <strong>{e.full_name}</strong>
                        <small>{e.department}</small>
                      </span>
                    </div>
                  </td>

                  <td>{e.department}</td>

                  <td>
                    <span className="metric-chip good">
                      {e.present_days}
                    </span>
                  </td>

                  <td>
                    <span
                      className={`metric-chip ${
                        highLate ? "risk" : "warn"
                      }`}
                    >
                      {e.late_days}
                    </span>
                  </td>

                  <td>
                    <span
                      className={`metric-chip ${
                        highAbsence
                          ? "risk"
                          : "neutral"
                      }`}
                    >
                      {e.absent_days}
                    </span>
                  </td>

                  <td>{e.avg_break_mins}m</td>

                  <td>{e.break_exceeded_days}</td>

                  <td>
                    <button
                      type="button"
                      className="export-btn"
                      onClick={() =>
                        handleViewFullAnalysis(e)
                      }
                      title={`View full attendance analysis for ${e.full_name}`}
                    >
                      View Full Analysis
                      <i
                        className="fas fa-arrow-right"
                        style={{ marginLeft: 8 }}
                      />
                    </button>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

export default DepartmentAnalyticsTable;