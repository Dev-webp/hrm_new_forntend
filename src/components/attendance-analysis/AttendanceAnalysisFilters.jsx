import { BRANCH_FILTER_OPTIONS } from "../../utils/attendanceAnalysisHelpers";

function AttendanceAnalysisFilters({
  branch,
  onBranchChange,
  month,
  onMonthChange,
  employees,
  selectedEmployeeId,
  onEmployeeChange,
  onLoad,
  loading,
}) {
  return (
    <div className="filter-card">
      <div className="filter-group">
        <label htmlFor="branchFilter">Branch</label>
        <select
          id="branchFilter"
          value={branch}
          onChange={(e) => onBranchChange(e.target.value)}
          autoComplete="off"
        >
          {BRANCH_FILTER_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className="filter-group">
        <label htmlFor="monthPicker">Month</label>
        <input
          type="month"
          id="monthPicker"
          value={month}
          onChange={(e) => onMonthChange(e.target.value)}
        />
      </div>

      <div className="filter-group">
        <label htmlFor="empSelect">Employee</label>
        <select
          id="empSelect"
          value={selectedEmployeeId}
          onChange={(e) => onEmployeeChange(e.target.value)}
        >
          <option value="all">📊 All Employees (Branch Summary)</option>
          {employees.map((e) => (
            <option key={e.id} value={String(e.id)}>
              {e.name} · {e.dept}
            </option>
          ))}
        </select>
      </div>

      <button
        type="button"
        className="load-btn"
        id="loadBtn"
        onClick={onLoad}
        disabled={loading}
      >
        <i className="fas fa-chart-simple" />{" "}
        {loading ? "Loading…" : "Load Data"}
      </button>
    </div>
  );
}

export default AttendanceAnalysisFilters;
