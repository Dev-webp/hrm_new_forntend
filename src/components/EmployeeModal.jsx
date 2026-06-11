import {
  DEPARTMENTS,
  FORM_BRANCH_OPTIONS,
  FORM_ROLE_OPTIONS,
  buildAutoEmail,
  formatAadhar,
  formatDate,
} from "../utils/employeeHelpers";

function EmployeeFormModal({
  open,
  mode,
  form,
  formError,
  saving,
  onClose,
  onChange,
  onSave,
}) {
  if (!open) return null;

  const title =
    mode === "edit" ? (
      <>
        <i className="fas fa-edit" /> Edit Employee
      </>
    ) : (
      <>
        <i className="fas fa-user-plus" /> Add New Employee
      </>
    );

  const handleNameChange = (value) => {
    if (mode === "add" && value.trim()) {
      onChange({
        ...form,
        name: value,
        loginEmail: buildAutoEmail(value),
      });
      return;
    }

    onChange({ ...form, name: value });
  };

  return (
    <div
      className="employee-modal-overlay"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="employee-modal-content"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <h3>{title}</h3>

        {formError && <div className="form-error">{formError}</div>}

        <div className="form-row">
          <div className="form-group" style={{ flex: 2 }}>
            <label htmlFor="empName">Full Name</label>
            <input
              id="empName"
              type="text"
              placeholder="e.g., John Doe"
              value={form.name}
              onChange={(event) => handleNameChange(event.target.value)}
            />
          </div>
          <div className="form-group">
            <label htmlFor="empDesignation">Designation</label>
            <input
              id="empDesignation"
              type="text"
              placeholder="e.g., Team Lead"
              value={form.designation}
              onChange={(event) =>
                onChange({ ...form, designation: event.target.value })
              }
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="empDept">Department</label>
            <select
              id="empDept"
              value={form.department}
              onChange={(event) =>
                onChange({ ...form, department: event.target.value })
              }
            >
              {DEPARTMENTS.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="empBranch">Branch</label>
            <select
              id="empBranch"
              value={form.branch}
              onChange={(event) =>
                onChange({ ...form, branch: event.target.value })
              }
            >
              {FORM_BRANCH_OPTIONS.map((branch) => (
                <option key={branch.value} value={branch.value}>
                  {branch.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="empRole">Role</label>
            <select
              id="empRole"
              value={form.role}
              onChange={(event) =>
                onChange({ ...form, role: event.target.value })
              }
            >
              {FORM_ROLE_OPTIONS.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="empId">Employee ID</label>
            <input
              id="empId"
              type="text"
              placeholder="Unique ID (e.g., VJC1234)"
              value={form.employeeCode}
              onChange={(event) =>
                onChange({ ...form, employeeCode: event.target.value })
              }
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="empSalary">Salary (USD)</label>
            <input
              id="empSalary"
              type="number"
              placeholder="e.g., 50000"
              value={form.salary}
              onChange={(event) =>
                onChange({ ...form, salary: event.target.value })
              }
            />
          </div>
          <div className="form-group">
            <label htmlFor="empJoiningDate">Joining Date</label>
            <input
              id="empJoiningDate"
              type="date"
              value={form.joiningDate}
              onChange={(event) =>
                onChange({ ...form, joiningDate: event.target.value })
              }
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="empLoginEmail">HRMS Login Email</label>
          <input
            id="empLoginEmail"
            type="email"
            placeholder="auto@company.com"
            value={form.loginEmail}
            onChange={(event) =>
              onChange({ ...form, loginEmail: event.target.value })
            }
          />
        </div>

        <div className="form-group">
          <label htmlFor="empAadhar">Aadhar Number (12 digits)</label>
          <input
            id="empAadhar"
            type="text"
            placeholder="123456789012"
            maxLength={12}
            value={form.aadharNumber}
            onChange={(event) =>
              onChange({
                ...form,
                aadharNumber: event.target.value.replace(/\D/g, ""),
              })
            }
          />
        </div>

        <div className="form-group" style={{ marginTop: "8px" }}>
          <label style={{ fontWeight: 700, color: "#FF8C00" }}>
            Bank Details
          </label>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="empBankName">Bank Name</label>
            <input
              id="empBankName"
              type="text"
              placeholder="e.g., HDFC Bank"
              value={form.bankName}
              onChange={(event) =>
                onChange({ ...form, bankName: event.target.value })
              }
            />
          </div>
          <div className="form-group">
            <label htmlFor="empAccountNo">Account Number</label>
            <input
              id="empAccountNo"
              type="text"
              placeholder="Account Number"
              value={form.bankAccount}
              onChange={(event) =>
                onChange({ ...form, bankAccount: event.target.value })
              }
            />
          </div>
          <div className="form-group">
            <label htmlFor="empIfsc">IFSC Code</label>
            <input
              id="empIfsc"
              type="text"
              placeholder="IFSC Code"
              value={form.bankIfsc}
              onChange={(event) =>
                onChange({ ...form, bankIfsc: event.target.value })
              }
            />
          </div>
        </div>

        <div className="form-group">
          <label style={{ fontWeight: 700, color: "#FF8C00" }}>
            Change Password (optional)
          </label>
          <input
            type="password"
            placeholder="Enter new password to reset"
            value={form.password}
            onChange={(event) =>
              onChange({ ...form, password: event.target.value })
            }
          />
          <div className="form-note">
            Leave blank to keep current password. Plain password will be visible
            in details (Super Admin only).
          </div>
        </div>

        <div className="modal-actions">
          <button type="button" className="modal-btn cancel" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="modal-btn"
            onClick={onSave}
            disabled={saving}
          >
            {saving ? "Saving…" : "Save Employee"}
          </button>
        </div>
      </div>
    </div>
  );
}

function EmployeeDetailsModal({ open, employee, onClose, onCopyPassword }) {
  if (!open || !employee) return null;

  return (
    <div
      className="employee-modal-overlay"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="employee-modal-content wide"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <h3>
          <i className="fas fa-id-card" /> Full Employee Details
        </h3>

        <div className="details-grid">
          <div className="section-title">
            <i className="fas fa-user-circle" /> Personal Information
          </div>

          <div className="detail-item">
            <div className="detail-icon">
              <i className="fas fa-user" />
            </div>
            <div className="detail-content">
              <div className="detail-label">Full Name</div>
              <div className="detail-value">{employee.name}</div>
            </div>
          </div>

          <div className="detail-item">
            <div className="detail-icon">
              <i className="fas fa-briefcase" />
            </div>
            <div className="detail-content">
              <div className="detail-label">Designation</div>
              <div className="detail-value">
                {employee.designation || "—"}
              </div>
            </div>
          </div>

          <div className="detail-item">
            <div className="detail-icon">
              <i className="fas fa-id-card" />
            </div>
            <div className="detail-content">
              <div className="detail-label">Employee ID</div>
              <div className="detail-value">{employee.empId}</div>
            </div>
          </div>

          <div className="detail-item">
            <div className="detail-icon">
              <i className="fas fa-envelope" />
            </div>
            <div className="detail-content">
              <div className="detail-label">HRMS Email</div>
              <div className="detail-value">{employee.email}</div>
            </div>
          </div>

          <div className="detail-item">
            <div className="detail-icon">
              <i className="fas fa-fingerprint" />
            </div>
            <div className="detail-content">
              <div className="detail-label">Aadhar Number</div>
              <div className="detail-value">
                {formatAadhar(employee.aadharNumber)}
                <span className="sensitive-badge">Sensitive</span>
              </div>
            </div>
          </div>

          <div className="detail-item">
            <div className="detail-icon">
              <i className="fas fa-venus-mars" />
            </div>
            <div className="detail-content">
              <div className="detail-label">Role</div>
              <div className="detail-value">{employee.role}</div>
            </div>
          </div>

          <div className="detail-item">
            <div className="detail-icon">
              <i className="fas fa-circle" />
            </div>
            <div className="detail-content">
              <div className="detail-label">Status</div>
              <div className="detail-value">
                {employee.status === "active" ? (
                  <span style={{ color: "#16A34A" }}>● Active</span>
                ) : (
                  <span style={{ color: "#F87171" }}>● Inactive</span>
                )}
              </div>
            </div>
          </div>

          <div className="section-title">
            <i className="fas fa-building" /> Employment &amp; Branch
          </div>

          <div className="detail-item">
            <div className="detail-icon">
              <i className="fas fa-store" />
            </div>
            <div className="detail-content">
              <div className="detail-label">Branch</div>
              <div className="detail-value">{employee.branch}</div>
            </div>
          </div>

          <div className="detail-item">
            <div className="detail-icon">
              <i className="fas fa-chalkboard-user" />
            </div>
            <div className="detail-content">
              <div className="detail-label">Department</div>
              <div className="detail-value">{employee.department}</div>
            </div>
          </div>

          <div className="detail-item">
            <div className="detail-icon">
              <i className="fas fa-dollar-sign" />
            </div>
            <div className="detail-content">
              <div className="detail-label">Salary (USD)</div>
              <div className="detail-value">
                ${employee.salary.toLocaleString()}
              </div>
            </div>
          </div>

          <div className="detail-item">
            <div className="detail-icon">
              <i className="fas fa-calendar-alt" />
            </div>
            <div className="detail-content">
              <div className="detail-label">Joining Date</div>
              <div className="detail-value">
                {formatDate(employee.joiningDate)}
              </div>
            </div>
          </div>

          <div className="section-title">
            <i className="fas fa-university" /> Bank Details
          </div>

          <div className="detail-item">
            <div className="detail-icon">
              <i className="fas fa-university" />
            </div>
            <div className="detail-content">
              <div className="detail-label">Bank Name</div>
              <div className="detail-value">{employee.bankName || "—"}</div>
            </div>
          </div>

          <div className="detail-item">
            <div className="detail-icon">
              <i className="fas fa-credit-card" />
            </div>
            <div className="detail-content">
              <div className="detail-label">Account Number</div>
              <div className="detail-value">{employee.bankAccount || "—"}</div>
            </div>
          </div>

          <div className="detail-item">
            <div className="detail-icon">
              <i className="fas fa-code-branch" />
            </div>
            <div className="detail-content">
              <div className="detail-label">IFSC Code</div>
              <div className="detail-value">{employee.bankIfsc || "—"}</div>
            </div>
          </div>

          <div className="section-title">
            <i className="fas fa-laptop" /> HRMS Credentials
          </div>

          <div className="detail-item">
            <div className="detail-icon">
              <i className="fas fa-key" />
            </div>
            <div className="detail-content">
              <div className="detail-label">HRMS Password</div>
              <div className="detail-value">
                {employee.visiblePassword ? (
                  <button
                    type="button"
                    className="password-copy"
                    onClick={() => onCopyPassword(employee.visiblePassword)}
                  >
                    {employee.visiblePassword}{" "}
                    <i className="fas fa-copy" />
                  </button>
                ) : (
                  "••••••••"
                )}
                <span className="sensitive-badge">Admin only</span>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-actions">
          <button type="button" className="modal-btn cancel" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function EmployeeModal({
  formOpen,
  formMode,
  form,
  formError,
  saving,
  detailsOpen,
  selectedEmployee,
  onFormClose,
  onFormChange,
  onFormSave,
  onDetailsClose,
  onCopyPassword,
}) {
  return (
    <>
      <EmployeeFormModal
        open={formOpen}
        mode={formMode}
        form={form}
        formError={formError}
        saving={saving}
        onClose={onFormClose}
        onChange={onFormChange}
        onSave={onFormSave}
      />

      <EmployeeDetailsModal
        open={detailsOpen}
        employee={selectedEmployee}
        onClose={onDetailsClose}
        onCopyPassword={onCopyPassword}
      />
    </>
  );
}

export default EmployeeModal;
