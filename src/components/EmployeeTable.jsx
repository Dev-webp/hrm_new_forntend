function EmployeeTable({
  employees,
  loading,
  currentPage,
  totalPages,
  pageSize,
  totalCount,
  onEdit,
  onDelete,
  onViewDetails,
  onPageChange,
}) {
  if (loading) {
    return (
      <div className="employees-grid">
        <div className="loading-state">
          <i className="fas fa-spinner fa-spin" /> Loading employees…
        </div>
      </div>
    );
  }

  if (employees.length === 0) {
    return (
      <div className="employees-grid">
        <div className="empty-state">
          No employees match the current filters
        </div>
      </div>
    );
  }

  const startIndex = (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(currentPage * pageSize, totalCount);

  return (
    <>
      <div className="employees-grid">
        {employees.map((employee) => (
          <div key={employee.id} className="employee-card">
            <div className="card-actions">
              <button
                type="button"
                className="action-icon"
                onClick={() => onEdit(employee.id)}
                aria-label={`Edit ${employee.name}`}
              >
                <i className="fas fa-pencil-alt" />
              </button>
              <button
                type="button"
                className="action-icon delete-icon"
                onClick={() => onDelete(employee.id)}
                aria-label={`Delete ${employee.name}`}
              >
                <i className="fas fa-trash-alt" />
              </button>
            </div>

            <div className="card-header">
              <div className="avatar">{employee.initials}</div>
              <div className="employee-info">
                <h4>
                  {employee.name}
                  <span className="role-badge">
                    {employee.role || "Employee"}
                  </span>
                  <span
                    className={`status-badge ${employee.status === "active" ? "active" : "inactive"}`}
                  >
                    {employee.status === "active" ? "Active" : "Inactive"}
                  </span>
                </h4>
                <div className="employee-dept">
                  {employee.designation || employee.role}
                </div>
              </div>
            </div>

            <div className="employee-details">
              <div>
                <i className="fas fa-building" /> {employee.department}
              </div>
              <div>
                <i className="fas fa-id-card" /> ID: {employee.empId}
              </div>
              <div>
                <i className="fas fa-envelope" /> {employee.email}
              </div>
            </div>

            <div className="extra-details">
              <button
                type="button"
                className="full-details-btn"
                onClick={() => onViewDetails(employee.id)}
              >
                📄 Full Details (Aadhar &amp; Password)
              </button>
            </div>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <button
            type="button"
            className="pagination-btn"
            disabled={currentPage <= 1}
            onClick={() => onPageChange(currentPage - 1)}
          >
            <i className="fas fa-chevron-left" /> Prev
          </button>

          {Array.from({ length: totalPages }, (_, index) => index + 1).map(
            (page) => (
              <button
                key={page}
                type="button"
                className={`pagination-btn${page === currentPage ? " active" : ""}`}
                onClick={() => onPageChange(page)}
              >
                {page}
              </button>
            )
          )}

          <button
            type="button"
            className="pagination-btn"
            disabled={currentPage >= totalPages}
            onClick={() => onPageChange(currentPage + 1)}
          >
            Next <i className="fas fa-chevron-right" />
          </button>

          <span className="pagination-info">
            Showing {startIndex}–{endIndex} of {totalCount}
          </span>
        </div>
      )}
    </>
  );
}

export default EmployeeTable;
