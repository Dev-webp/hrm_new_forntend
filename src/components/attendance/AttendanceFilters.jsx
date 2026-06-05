import { ATTENDANCE_DEPARTMENTS } from "../../utils/attendanceHelpers";

function AttendanceFilters({
  deptFilter,
  onDeptFilterChange,
  search,
  onSearchChange,
}) {
  return (
    <div className="filter-bar">
      {ATTENDANCE_DEPARTMENTS.map((dept) => (
        <button
          key={dept.value}
          type="button"
          className={`filter-btn${deptFilter === dept.value ? " active" : ""}`}
          onClick={() => onDeptFilterChange(dept.value)}
        >
          {dept.label}
        </button>
      ))}
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
