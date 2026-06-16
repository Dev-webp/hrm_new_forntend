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
  const totalAbsent = employees?.reduce(
    (sum, employee) => sum + Number(employee.absent_days || 0),
    0
  );
  const highRiskEmployees = employees?.filter(
    (employee) =>
      Number(employee.absent_days || 0) >= 3 ||
      Number(employee.late_days || 0) >= 5
  );
  const bestAttendance = [...(employees || [])].sort((a, b) => {
    const scoreA = Number(a.present_days || 0) - Number(a.absent_days || 0);
    const scoreB = Number(b.present_days || 0) - Number(b.absent_days || 0);
    return scoreB - scoreA;
  })[0];

  const branchKpis = kpi
    ? [
        { label: "Present", value: kpi.total_present || 0, icon: "fa-user-check", tone: "success", caption: "Recorded attendance" },
        { label: "Late", value: kpi.total_late || 0, icon: "fa-clock", tone: "warning", caption: "Requires monitoring" },
        { label: "Absent", value: totalAbsent || 0, icon: "fa-user-xmark", tone: "danger", caption: "Across selected period" },
        { label: "Leave", value: kpi.total_leave || kpi.total_leaves || 0, icon: "fa-calendar-minus", tone: "info", caption: "Approved leave records" },
        { label: "Best Attendance", value: bestAttendance?.full_name || "—", icon: "fa-award", tone: "primary", caption: bestAttendance ? `${bestAttendance.present_days || 0} present days` : "No employee data" },
        { label: "High Risk Employees", value: highRiskEmployees?.length || 0, icon: "fa-triangle-exclamation", tone: "danger", caption: "High absence or late count" },
      ]
    : [];

  return (
    <div id="branchView">
      <AttendanceAnalysisCards items={branchKpis} loading={loading} />
      <div className="analysis-toolbar">
        <div>
          <strong>Workforce attendance overview</strong>
          <span>Review trends and employees needing attention.</span>
        </div>
        <button type="button" className="export-btn" onClick={onToggleTrends}>
          <i className={`fas ${showTrends ? "fa-eye-slash" : "fa-chart-line"}`} />
          {showTrends ? "Hide Trends" : "Show 6 Month Trends"}
        </button>
      </div>

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
