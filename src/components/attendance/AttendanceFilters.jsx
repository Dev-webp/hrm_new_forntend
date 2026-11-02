function AttendanceFilters({
  deptFilter,
  onDeptFilterChange,
  departments = [{ value: "all", label: "All Departments" }],
  search,
  onSearchChange,
  lateStatusFilter = "all",
  onLateStatusFilterChange,
  onToggleLateEmployees,
  lateAlertsVisible = false,
}) {
  const lateStatusOptions = [
    { value: "all", label: "All Status" },
    { value: "on_time", label: "On Time" },
    { value: "late", label: "Late" },
  ];

  return (
    <>
      <div className="department-filter-row">
        {departments.map((dept) => (
          <button
            key={dept.value || dept}
            type="button"
            className={`dept-filter-btn${deptFilter === (dept.value || dept) ? " active" : ""}`}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDeptFilterChange(dept.value || dept);
            }}
          >
            {dept.label || dept}
          </button>
        ))}
      </div>

      <div className="filter-toolbar">
        <div className="search-container">
          <i className="fas fa-search search-icon"></i>
          <input
            type="text"
            className="search-input"
            placeholder="Search employee..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        <button
          type="button"
          className={`late-employees-btn${lateAlertsVisible ? " active" : ""}`}
          onClick={() => onToggleLateEmployees && onToggleLateEmployees()}
        >
          <i className="fas fa-users"></i>
          Late Employees
        </button>

        {onLateStatusFilterChange && (
          <div className="late-status-wrapper">
            <i className="fas fa-filter filter-icon"></i>
            <select
              className="late-status-select"
              value={lateStatusFilter}
              onChange={(e) => onLateStatusFilterChange(e.target.value)}
            >
              {lateStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <i className="fas fa-chevron-down dropdown-icon"></i>
          </div>
        )}
      </div>
    </>
  );
}

export default AttendanceFilters;
