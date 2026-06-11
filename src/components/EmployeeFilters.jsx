import { DEPARTMENTS, ROLE_OPTIONS, STATUS_OPTIONS } from "../utils/employeeHelpers";

function EmployeeFilters({
  search,
  onSearchChange,
  department,
  onDepartmentChange,
  roleFilter,
  onRoleFilterChange,
  statusFilter,
  onStatusFilterChange,
}) {
  return (
    <div className="filter-bar">
      <div className="search-box">
        <i className="fas fa-search" />
        <input
          type="text"
          placeholder="Search by name, department, email..."
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
        />
      </div>

      <div className="filter-group">
        <select
          className="filter-select"
          value={roleFilter}
          onChange={(event) => onRoleFilterChange(event.target.value)}
          aria-label="Filter by role"
        >
          {ROLE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <select
          className="filter-select"
          value={statusFilter}
          onChange={(event) => onStatusFilterChange(event.target.value)}
          aria-label="Filter by status"
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="dept-filters">
        <button
          type="button"
          className={`filter-chip${department === "all" ? " active" : ""}`}
          onClick={() => onDepartmentChange("all")}
        >
          All Departments
        </button>

        {DEPARTMENTS.map((dept) => (
          <button
            key={dept}
            type="button"
            className={`filter-chip${department === dept ? " active" : ""}`}
            onClick={() => onDepartmentChange(dept)}
          >
            {dept === "Digital Marketing Team" ? "Digital Marketing" : dept}
          </button>
        ))}
      </div>
    </div>
  );
}

export default EmployeeFilters;
