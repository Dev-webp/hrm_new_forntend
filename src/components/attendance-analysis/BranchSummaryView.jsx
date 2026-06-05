import AttendanceAnalysisCards from "./AttendanceAnalysisCards";
import DepartmentAnalyticsTable from "./DepartmentAnalyticsTable";
import { BranchTrendsChart } from "./AttendanceTrendChart";
import { monthLabel } from "../../utils/attendanceAnalysisHelpers";

function BranchSummaryView({
  monthStr,
  kpi,
  employees,
  trends,
  loading,
  error,
  showTrends,
  onToggleTrends,
}) {
  const branchKpis = kpi
    ? [
        { label: "Employees", value: employees?.length ?? 0 },
        { label: "Total Present", value: kpi.total_present || 0 },
        { label: "Total Late", value: kpi.total_late || 0 },
        { label: "Break Exceeded", value: kpi.total_exceeded || 0 },
      ]
    : [];

  return (
    <div id="branchView">
      <AttendanceAnalysisCards items={branchKpis} loading={loading} />
      <button
  type="button"
  className="export-btn"
  onClick={onToggleTrends}
>
  <i className={`fas ${showTrends ? "fa-eye-slash" : "fa-chart-line"}`} />
  {showTrends ? " Hide 6 Months Trends" : " Show Last 6 Months Trends"}
</button>

      {showTrends && trends?.length > 0 && (
        <div className="card">
          <div className="card-title">
            Attendance Trends — Present / Late / Absent (6 months)
          </div>
          <div className="chart-trends-wrap">
            <BranchTrendsChart trends={trends} />
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-title">
          Employee Summary —{" "}
          <span id="summaryMonthSpan">{monthLabel(monthStr)}</span>
        </div>
        <DepartmentAnalyticsTable
          employees={employees}
          loading={loading}
          error={error}
        />
      </div>
    </div>
  );
}

export default BranchSummaryView;
