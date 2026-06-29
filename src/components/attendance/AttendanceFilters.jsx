function AttendanceFilters({
  deptFilter,
  onDeptFilterChange,
  departments = [{ value: "all", label: "All Departments" }],
  search,
  onSearchChange,
  lateStatusFilter = "all",
  onLateStatusFilterChange,
}) {
  const lateStatusOptions = [
    { value: "all", label: "All Late Status" },
    { value: "on_time", label: "On Time" },
    { value: "within_grace", label: "Late Within Grace" },
    { value: "beyond_grace", label: "Late Beyond Grace" },
    { value: "limit_exceeded", label: "Limit Exceeded" },
  ];

  return (
    <div className="filter-bar">
      {departments.map((dept) => (
        <button
          key={dept.value || dept}
          type="button"
          className={`filter-btn${deptFilter === (dept.value || dept) ? " active" : ""}`}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDeptFilterChange(dept.value || dept);
          }}
        >
          {dept.label || dept}
        </button>
      ))}

      {onLateStatusFilterChange && (
        <select
          className="search-input late-status-select"
          value={lateStatusFilter}
          onChange={(e) => onLateStatusFilterChange(e.target.value)}
        >
          {lateStatusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )}

      <input
        type="text"
        className="search-input"
        placeholder="🔍 Search employee..."
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
      />
    </div>
  );
}

export default AttendanceFilters;
