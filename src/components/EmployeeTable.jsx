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
      <div className="employee-table-shell" aria-busy="true">
        <div className="table-skeleton">
          {Array.from({ length: 7 }).map((_, index) => (
            <div key={index} className="table-skeleton-row">
              <span className="skeleton-block skeleton-avatar" />
              <span className="skeleton-block" />
              <span className="skeleton-block" />
              <span className="skeleton-block" />
              <span className="skeleton-block" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (employees.length === 0) {
    return (
      <div className="employee-table-shell">
        <div className="empty-state enterprise-empty-state">
          <div className="empty-state-icon"><i className="fas fa-user-group" /></div>
          <h3>No employees found</h3>
          <p>Try adjusting your search or workforce filters.</p>
        </div>
      </div>
    );
  }

  const startIndex = (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(currentPage * pageSize, totalCount);

  return (
    <div className="employee-table-shell">
      <div className="employee-table-scroll">
        <table className="employee-data-table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Employee ID</th>
              <th>Department</th>
              <th>Designation</th>
              <th>Branch</th>
              <th>Status</th>
              <th>Joining Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((employee) => (
              <tr key={employee.id}>
                <td>
                  <div className="employee-cell">
                    <div className="table-avatar">{employee.initials}</div>
                    <div>
                      <button type="button" className="employee-name-link" onClick={() => onViewDetails(employee.id)}>
                        {employee.name}
                      </button>
                      <span className="employee-email">{employee.email}</span>
                    </div>
                  </div>
                </td>
                <td><span className="employee-id-chip">{employee.empId || "—"}</span></td>
                <td>{employee.department || "—"}</td>
                <td>{employee.designation || employee.role || "Employee"}</td>
                <td>{employee.branch || "—"}</td>
                <td>
                  <span className={`status-badge ${employee.status === "active" ? "active" : "inactive"}`}>
                    <span className="status-dot" />
                    {employee.status === "active" ? "Active" : "Inactive"}
                  </span>
                </td>
                <td>{employee.joiningDate || employee.joining_date || "—"}</td>
                <td>
                  <div className="table-actions">
                    <button type="button" className="action-icon" onClick={() => onViewDetails(employee.id)} aria-label={`View ${employee.name}`}><i className="fas fa-eye" /></button>
                    <button type="button" className="action-icon" onClick={() => onEdit(employee.id)} aria-label={`Edit ${employee.name}`}><i className="fas fa-pencil-alt" /></button>
                    <button type="button" className="action-icon delete-icon" onClick={() => onDelete(employee.id)} aria-label={`Delete ${employee.name}`}><i className="fas fa-trash-alt" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="employee-table-footer">
        <span>Showing {startIndex}-{endIndex} of {totalCount} employees</span>
        {totalPages > 1 && (
          <div className="pagination">
            <button type="button" className="pagination-btn" disabled={currentPage <= 1} onClick={() => onPageChange(currentPage - 1)} aria-label="Previous page"><i className="fas fa-chevron-left" /></button>
            {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
              <button key={page} type="button" className={`pagination-btn${page === currentPage ? " active" : ""}`} onClick={() => onPageChange(page)}>{page}</button>
            ))}
            <button type="button" className="pagination-btn" disabled={currentPage >= totalPages} onClick={() => onPageChange(currentPage + 1)} aria-label="Next page"><i className="fas fa-chevron-right" /></button>
          </div>
        )}
      </div>
    </div>
  );
}

export default EmployeeTable;
