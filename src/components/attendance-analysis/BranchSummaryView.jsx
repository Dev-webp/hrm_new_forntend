import AttendanceAnalysisCards from "./AttendanceAnalysisCards";
import DepartmentAnalyticsTable from "./DepartmentAnalyticsTable";
import { BranchTrendsChart } from "./AttendanceTrendChart";
import { monthLabel } from "../../utils/attendanceAnalysisHelpers";

function BranchSummaryView({
  monthStr,
  branch,
  kpi,
  employees,
  trends,
  loading,
  error,
  showTrends,
  onToggleTrends,
  onViewFullAnalysis,
}) {
  const totalAbsent = employees?.reduce(
    (sum, employee) =>
      sum + Number(employee.absent_days || 0),
    0
  );

  const highRiskEmployees = employees?.filter(
    (employee) =>
      Number(employee.absent_days || 0) >= 3 ||
      Number(employee.late_days || 0) >= 5
  );

  const bestAttendance = [...(employees || [])].sort(
    (a, b) => {
      const scoreA =
        Number(a.present_days || 0) -
        Number(a.absent_days || 0);

      const scoreB =
        Number(b.present_days || 0) -
        Number(b.absent_days || 0);

      return scoreB - scoreA;
    }
  )[0];



  return (
    <div id="branchView">
     
      <div className="analysis-toolbar">
        <div>
          <strong>Workforce attendance overview</strong>
          <span>
            Review trends and employees needing attention.
          </span>
        </div>

   
      </div>

      {showTrends && trends?.length > 0 && (
        <div className="card">
          <div className="card-title">
            Attendance Trends — Present / Late / Absent
            (6 months)
          </div>

          <div className="chart-trends-wrap">
            <BranchTrendsChart trends={trends} />
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-title">
          Employee Summary —{" "}
          <span id="summaryMonthSpan">
            {monthLabel(monthStr)}
          </span>
        </div>

        <DepartmentAnalyticsTable
          employees={employees}
          loading={loading}
          error={error}
          branch={branch}
          month={monthStr}
          onViewFullAnalysis={onViewFullAnalysis}
        />
      </div>
    </div>
  );
}

export default BranchSummaryView;