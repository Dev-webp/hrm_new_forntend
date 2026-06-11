function TableSkeleton({ rows = 8, cols = 7 }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, ri) => (
        <tr key={ri}>
          {Array.from({ length: cols }).map((__, ci) => (
            <td key={ci}>
              <div className="table-skeleton-cell" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

function DepartmentAnalyticsTable({ employees, loading, error }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table className="data-table" id="summaryTable">
        <thead>
          <tr>
            <th>Employee</th>
            <th>Dept</th>
            <th>Present</th>
            <th>Late</th>
            <th>Absent</th>
            <th>Avg Break</th>
            <th>Exceeded 60m</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <TableSkeleton />
          ) : error ? (
            <tr>
              <td colSpan={7} style={{ color: "#DC2626", textAlign: "center" }}>
                Load failed
              </td>
            </tr>
          ) : !employees?.length ? (
            <tr>
              <td colSpan={7} style={{ color: "#64748B", textAlign: "center" }}>
                No data
              </td>
            </tr>
          ) : (
            employees.map((e) => (
              <tr key={e.user_id}>
                <td>
                  <strong>{e.full_name}</strong>
                  <br />
                  <span style={{ fontSize: 10 }}>{e.department}</span>
                </td>
                <td>{e.department}</td>
                <td style={{ color: "#16A34A" }}>{e.present_days}</td>
                <td style={{ color: "#FF8C00" }}>{e.late_days}</td>
                <td style={{ color: "#DC2626" }}>{e.absent_days}</td>
                <td>{e.avg_break_mins}m</td>
                <td>{e.break_exceeded_days}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default DepartmentAnalyticsTable;
