
import { useEffect, useState } from "react";
import api from "../services/api";

import {
  FORM_BRANCH_OPTIONS,
  FORM_ROLE_OPTIONS,
  buildAutoEmail,
  formatAadhar,
  formatDate,
} from "../utils/employeeHelpers";


// ============================================================
// EMPLOYEE FORM MODAL
// ============================================================

function EmployeeFormModal({
  open,
  mode,
  form,
  formError,
  saving,
  departments = [],
  onClose,
  onChange,
  onSave,
}) {
  if (!open) return null;

  const departmentOptions = Array.from(
    new Set([form.department, ...departments].filter(Boolean))
  );

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

    onChange({
      ...form,
      name: value,
    });
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

        {formError && (
          <div className="form-error">
            {formError}
          </div>
        )}

        {/* ====================================================
            PERSONAL INFORMATION
        ==================================================== */}

        <div className="form-row">

          <div
            className="form-group"
            style={{ flex: 2 }}
          >
            <label htmlFor="empName">
              Full Name
            </label>

            <input
              id="empName"
              type="text"
              placeholder="e.g., John Doe"
              value={form.name}
              onChange={(event) =>
                handleNameChange(event.target.value)
              }
            />
          </div>


          <div className="form-group">

            <label htmlFor="empDesignation">
              Designation
            </label>

            <input
              id="empDesignation"
              type="text"
              placeholder="e.g., Team Lead"
              value={form.designation}
              onChange={(event) =>
                onChange({
                  ...form,
                  designation: event.target.value,
                })
              }
            />

          </div>

        </div>


        {/* ====================================================
            DEPARTMENT / BRANCH
        ==================================================== */}

        <div className="form-row">

          <div className="form-group">

            <label htmlFor="empDept">
              Department
            </label>

            <select
              id="empDept"
              value={form.department}
              onChange={(event) =>
                onChange({
                  ...form,
                  department: event.target.value,
                })
              }
            >
              {departmentOptions.map((dept) => (
                <option
                  key={dept}
                  value={dept}
                >
                  {dept}
                </option>
              ))}
            </select>

          </div>


          <div className="form-group">

            <label htmlFor="empDeptCode">
              Department Code
            </label>

            <input
              id="empDeptCode"
              type="text"
              placeholder="e.g., SALES"
              value={form.departmentCode}
              onChange={(event) =>
                onChange({
                  ...form,

                  departmentCode: event.target.value
                    .replace(/[^A-Za-z0-9_-]/g, "")
                    .slice(0, 30)
                    .toUpperCase(),
                })
              }
            />

          </div>


          <div className="form-group">

            <label htmlFor="empBranch">
              Primary Branch
            </label>

            <select
              id="empBranch"
              value={form.branch}
              onChange={(event) =>
                onChange({
                  ...form,
                  branch: event.target.value,
                })
              }
            >
              {FORM_BRANCH_OPTIONS.map((branch) => (
                <option
                  key={branch.value}
                  value={branch.value}
                >
                  {branch.label}
                </option>
              ))}
            </select>

          </div>

        </div>


        {/* ====================================================
            ROLE / EMPLOYEE ID
        ==================================================== */}

        <div className="form-row">

          <div className="form-group">

            <label htmlFor="empRole">
              Role
            </label>

            <select
              id="empRole"
              value={form.role}
              onChange={(event) =>
                onChange({
                  ...form,
                  role: event.target.value,
                })
              }
            >
              {FORM_ROLE_OPTIONS.map((role) => (
                <option
                  key={role.value}
                  value={role.value}
                >
                  {role.label}
                </option>
              ))}
            </select>

          </div>


          <div className="form-group">

            <label htmlFor="empId">
              Employee ID
            </label>

            <input
              id="empId"
              type="text"
              placeholder="Auto-generated after save"
              value={
                mode === "add"
                  ? "Auto-generated"
                  : form.employeeCode
              }
              readOnly
            />

          </div>

        </div>


        {/* ====================================================
            SALARY / JOINING DATE
        ==================================================== */}

        <div className="form-row">

          <div className="form-group">

            <label htmlFor="empSalary">
              Salary (INR)
            </label>

            <input
              id="empSalary"
              type="number"
              placeholder="e.g., 50000"
              value={form.salary}
              onChange={(event) =>
                onChange({
                  ...form,
                  salary: event.target.value,
                })
              }
            />

          </div>


          <div className="form-group">

            <label htmlFor="empJoiningDate">
              Joining Date
            </label>

            <input
              id="empJoiningDate"
              type="date"
              value={form.joiningDate || ""}
              onChange={(event) =>
                onChange({
                  ...form,
                  joiningDate: event.target.value,
                })
              }
            />

          </div>

        </div>


        {/* ====================================================
            LOGIN EMAIL
        ==================================================== */}

        <div className="form-group">

          <label htmlFor="empLoginEmail">
            HRMS Login Email
          </label>

          <input
            id="empLoginEmail"
            type="email"
            placeholder="employee@vjcoverseas.com"
            value={form.loginEmail}
            onChange={(event) =>
              onChange({
                ...form,
                loginEmail: event.target.value,
              })
            }
          />

        </div>


        {/* ====================================================
            AADHAR
        ==================================================== */}

        <div className="form-group">

          <label htmlFor="empAadhar">
            Aadhar Number (12 digits)
          </label>

          <input
            id="empAadhar"
            type="text"
            placeholder="123456789012"
            maxLength={12}
            value={form.aadharNumber}
            onChange={(event) =>
              onChange({
                ...form,

                aadharNumber:
                  event.target.value.replace(/\D/g, ""),
              })
            }
          />

        </div>


        {/* ====================================================
            BANK DETAILS
        ==================================================== */}

        <div
          className="form-group"
          style={{ marginTop: "8px" }}
        >

          <label
            style={{
              fontWeight: 700,
              color: "#FF8C00",
            }}
          >
            Bank Details
          </label>

        </div>


        <div className="form-row">

          <div className="form-group">

            <label htmlFor="empBankName">
              Bank Name
            </label>

            <input
              id="empBankName"
              type="text"
              placeholder="e.g., HDFC Bank"
              value={form.bankName}
              onChange={(event) =>
                onChange({
                  ...form,
                  bankName: event.target.value,
                })
              }
            />

          </div>


          <div className="form-group">

            <label htmlFor="empAccountNo">
              Account Number
            </label>

            <input
              id="empAccountNo"
              type="text"
              placeholder="Account Number"
              value={form.bankAccount}
              onChange={(event) =>
                onChange({
                  ...form,
                  bankAccount: event.target.value,
                })
              }
            />

          </div>


          <div className="form-group">

            <label htmlFor="empIfsc">
              IFSC Code
            </label>

            <input
              id="empIfsc"
              type="text"
              placeholder="IFSC Code"
              value={form.bankIfsc}
              onChange={(event) =>
                onChange({
                  ...form,
                  bankIfsc: event.target.value,
                })
              }
            />

          </div>

        </div>


        {/* ====================================================
            PASSWORD
        ==================================================== */}

        <div className="form-group">

          <label
            style={{
              fontWeight: 700,
              color: "#FF8C00",
            }}
          >
            Change Password (optional)
          </label>

          <input
            type="password"
            placeholder="Enter new password to reset"
            value={form.password}
            onChange={(event) =>
              onChange({
                ...form,
                password: event.target.value,
              })
            }
          />

          <div className="form-note">
            Leave blank to keep the current password.
          </div>

        </div>


        {/* ====================================================
            SAVE EMPLOYEE
        ==================================================== */}

        <div className="modal-actions">

          <button
            type="button"
            className="modal-btn cancel"
            onClick={onClose}
          >
            Cancel
          </button>


          <button
            type="button"
            className="modal-btn"
            onClick={onSave}
            disabled={saving}
          >
            {saving
              ? "Saving…"
              : "Save Employee"}
          </button>

        </div>

      </div>
    </div>
  );
}


// ============================================================
// LOGIN ACCESS CONTROL MODAL
// ============================================================

function LoginAccessModal({ open, employee, onClose }) {
  const [loading, setLoading] = useState(false);
  const [savingAccess, setSavingAccess] = useState(false);

  const [loginAccessType, setLoginAccessType] = useState("OFFICE");
  const [allowedBranches, setAllowedBranches] = useState([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!open || !employee?.id) return;

    const loadLoginAccess = async () => {
      setLoading(true);
      setMessage("");

      try {
        const response = await api.get(
          `/admin/employees/${employee.id}/login-access`
        );

        const data = response.data;

        setLoginAccessType(
          data.employee?.loginAccessType || "OFFICE"
        );

        setAllowedBranches(
          data.allowedBranches || []
        );
      } catch (error) {
        setMessage(
          error.response?.data?.message ||
          "Failed to load employee login access."
        );
      } finally {
        setLoading(false);
      }
    };

    loadLoginAccess();
  }, [open, employee?.id]);

  const toggleBranch = (branchName) => {
    setAllowedBranches((previous) => {
      if (previous.includes(branchName)) {
        return previous.filter(
          (branch) => branch !== branchName
        );
      }

      return [...previous, branchName];
    });
  };

  const handleSaveLoginAccess = async () => {
    setMessage("");

    if (
      loginAccessType === "OFFICE" &&
      allowedBranches.length === 0
    ) {
      setMessage(
        "Please select at least one office location."
      );
      return;
    }

    setSavingAccess(true);

    try {
      await api.put(
        `/admin/employees/${employee.id}/login-access`,
        {
          loginAccessType,
          allowedBranches:
            loginAccessType === "REMOTE"
              ? []
              : allowedBranches,
        }
      );

      setMessage("Login access updated successfully.");

      setTimeout(() => {
        onClose();
      }, 1000);

    } catch (error) {
      setMessage(
        error.response?.data?.message ||
        "Failed to update login access."
      );
    } finally {
      setSavingAccess(false);
    }
  };

  if (!open || !employee) return null;

  return (
    <div
      className="employee-modal-overlay"
      onClick={onClose}
    >
      <div
        className="employee-modal-content login-access-modal"
        onClick={(event) => event.stopPropagation()}
      >

        {/* HEADER */}

        <div className="login-access-header">
          <div className="login-access-title">
            <div className="login-access-icon">
              <i className="fas fa-shield-alt" />
            </div>

            <div>
              <h3>Login Access Control</h3>
              <p>
                Configure where this employee can access HRMS.
              </p>
            </div>
          </div>

          <button
            type="button"
            className="login-access-close"
            onClick={onClose}
          >
            ×
          </button>
        </div>


        {/* EMPLOYEE INFO */}

        <div className="login-employee-info">
          <div className="login-employee-avatar">
            {employee.initials ||
              employee.name
                ?.split(" ")
                .map((word) => word[0])
                .join("")
                .slice(0, 2)}
          </div>

          <div>
            <h4>{employee.name}</h4>

            <p>
              Primary Branch:
              <strong>
                {" "}
                {employee.branch || "Not Assigned"}
              </strong>
            </p>
          </div>
        </div>


        {loading ? (

          <div className="login-access-loading">
            <i className="fas fa-spinner fa-spin" />
            Loading login access...
          </div>

        ) : (

          <>
            {/* LOGIN TYPE */}

            <div className="login-access-section">

              <div className="login-section-label">
                <i className="fas fa-key" />
                Login Access Type
              </div>

              <div className="login-access-options">

                {/* OFFICE */}

                <button
                  type="button"
                  className={`login-access-card ${
                    loginAccessType === "OFFICE"
                      ? "selected office"
                      : ""
                  }`}
                  onClick={() =>
                    setLoginAccessType("OFFICE")
                  }
                >
                  <div className="access-radio">
                    {loginAccessType === "OFFICE" && (
                      <span />
                    )}
                  </div>

                  <div className="access-card-icon">
                    🏢
                  </div>

                  <div className="access-card-content">
                    <h4>Office Login</h4>

                    <p>
                      Employee can login only from
                      assigned office locations.
                    </p>
                  </div>
                </button>


                {/* REMOTE */}

                <button
                  type="button"
                  className={`login-access-card ${
                    loginAccessType === "REMOTE"
                      ? "selected remote"
                      : ""
                  }`}
                  onClick={() =>
                    setLoginAccessType("REMOTE")
                  }
                >
                  <div className="access-radio">
                    {loginAccessType === "REMOTE" && (
                      <span />
                    )}
                  </div>

                  <div className="access-card-icon">
                    🌐
                  </div>

                  <div className="access-card-content">
                    <h4>Remote Login</h4>

                    <p>
                      Employee can securely login
                      from any location.
                    </p>
                  </div>
                </button>

              </div>
            </div>


            {/* OFFICE LOCATIONS */}

            {loginAccessType === "OFFICE" && (

              <div className="login-access-section">

                <div className="login-section-label">
                  <i className="fas fa-map-marker-alt" />
                  Allowed Office Locations
                </div>

                <p className="login-section-description">
                  Select all office locations where this
                  employee is allowed to login.
                </p>


                <div className="office-location-grid">

                  {/* HYDERABAD */}

                  <button
                    type="button"
                    className={`office-location-card ${
                      allowedBranches.includes("Hyderabad")
                        ? "selected"
                        : ""
                    }`}
                    onClick={() =>
                      toggleBranch("Hyderabad")
                    }
                  >

                    <div className="location-check">
                      {allowedBranches.includes("Hyderabad") && (
                        <i className="fas fa-check" />
                      )}
                    </div>

                    <div className="location-icon">
                      🏢
                    </div>

                    <div className="location-content">
                      <h4>Hyderabad Office</h4>

                      <p>
                        Allow login within the Hyderabad
                        geo-fence.
                      </p>
                    </div>

                  </button>


                  {/* BANGALORE */}

                  <button
                    type="button"
                    className={`office-location-card ${
                      allowedBranches.includes("Bangalore")
                        ? "selected"
                        : ""
                    }`}
                    onClick={() =>
                      toggleBranch("Bangalore")
                    }
                  >

                    <div className="location-check">
                      {allowedBranches.includes("Bangalore") && (
                        <i className="fas fa-check" />
                      )}
                    </div>

                    <div className="location-icon">
                      💻
                    </div>

                    <div className="location-content">
                      <h4>Bangalore Office</h4>

                      <p>
                        Allow login within the Bangalore
                        geo-fence.
                      </p>
                    </div>

                  </button>

                </div>

              </div>

            )}


            {/* REMOTE INFO */}

            {loginAccessType === "REMOTE" && (

              <div className="remote-access-info">

                <div className="remote-info-icon">
                  🌐
                </div>

                <div>
                  <strong>
                    Remote access enabled
                  </strong>

                  <p>
                    This employee can login from anywhere.
                    GPS office restrictions will not apply.
                  </p>
                </div>

              </div>

            )}


            {/* MESSAGE */}

            {message && (

              <div
                className={`login-access-message ${
                  message.toLowerCase().includes("success")
                    ? "success"
                    : "error"
                }`}
              >
                {message}
              </div>

            )}


            {/* ACTIONS */}

            <div className="login-access-actions">

              <button
                type="button"
                className="login-cancel-btn"
                onClick={onClose}
                disabled={savingAccess}
              >
                Cancel
              </button>

              <button
                type="button"
                className="login-save-btn"
                onClick={handleSaveLoginAccess}
                disabled={savingAccess}
              >
                {savingAccess ? (
                  <>
                    <i className="fas fa-spinner fa-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <i className="fas fa-save" />
                    Save Login Access
                  </>
                )}
              </button>

            </div>

          </>

        )}

      </div>
    </div>
  );
}


// ============================================================
// EMPLOYEE DETAILS MODAL
// ============================================================

function EmployeeDetailsModal({
  open,
  employee,
  onClose,
  onCopyPassword,
  onEdit,
  onDeactivate,
  onActivate,
  onManageLoginAccess,
}) {
  if (!open || !employee) return null;

  return (

    <div
      className="employee-modal-overlay"
      onClick={onClose}
      role="presentation"
    >

      <div
        className="employee-modal-content wide"
        onClick={(event) =>
          event.stopPropagation()
        }
        role="dialog"
        aria-modal="true"
      >

        <h3>
          <i className="fas fa-id-card" />
          {" "}Full Employee Details
        </h3>


        {/* ACTION BUTTONS */}

        <div className="employee-detail-actions">

          <button
            type="button"
            className="modal-btn"
            onClick={() =>
              onEdit?.(employee.id)
            }
          >
            <i className="fas fa-pen" />
            {" "}Edit Employee
          </button>


          {/* NEW LOGIN ACCESS BUTTON */}

          <button
            type="button"
            className="modal-btn"
            onClick={() =>
              onManageLoginAccess?.(employee)
            }
          >
            <i className="fas fa-shield-alt" />
            {" "}Login Access
          </button>


          {employee.status === "inactive" ? (

            <button
              type="button"
              className="modal-btn activate"
              onClick={() =>
                onActivate?.(employee.id)
              }
            >
              <i className="fas fa-user-check" />
              {" "}Activate
            </button>

          ) : (

            <button
              type="button"
              className="modal-btn danger"
              onClick={() =>
                onDeactivate?.(employee.id)
              }
            >
              <i className="fas fa-user-slash" />
              {" "}Deactivate
            </button>

          )}

        </div>


        <div className="details-grid">


          {/* PERSONAL INFORMATION */}

          <div className="section-title">
            <i className="fas fa-user-circle" />
            {" "}Personal Information
          </div>


          <div className="detail-item">

            <div className="detail-icon">
              <i className="fas fa-user" />
            </div>

            <div className="detail-content">

              <div className="detail-label">
                Full Name
              </div>

              <div className="detail-value">
                {employee.name}
              </div>

            </div>

          </div>


          <div className="detail-item">

            <div className="detail-icon">
              <i className="fas fa-briefcase" />
            </div>

            <div className="detail-content">

              <div className="detail-label">
                Designation
              </div>

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

              <div className="detail-label">
                Employee ID
              </div>

              <div className="detail-value">
                {employee.empId}
              </div>

            </div>

          </div>


          <div className="detail-item">

            <div className="detail-icon">
              <i className="fas fa-envelope" />
            </div>

            <div className="detail-content">

              <div className="detail-label">
                HRMS Email
              </div>

              <div className="detail-value">
                {employee.email}
              </div>

            </div>

          </div>


          <div className="detail-item">

            <div className="detail-icon">
              <i className="fas fa-fingerprint" />
            </div>

            <div className="detail-content">

              <div className="detail-label">
                Aadhar Number
              </div>

              <div className="detail-value">

                {formatAadhar(employee.aadharNumber)}

                <span className="sensitive-badge">
                  Sensitive
                </span>

              </div>

            </div>

          </div>


          <div className="detail-item">

            <div className="detail-icon">
              <i className="fas fa-venus-mars" />
            </div>

            <div className="detail-content">

              <div className="detail-label">
                Role
              </div>

              <div className="detail-value">
                {employee.role}
              </div>

            </div>

          </div>


          <div className="detail-item">

            <div className="detail-icon">
              <i className="fas fa-circle" />
            </div>

            <div className="detail-content">

              <div className="detail-label">
                Status
              </div>

              <div className="detail-value">

                {employee.status === "active" ? (

                  <span
                    style={{
                      color: "#16A34A",
                    }}
                  >
                    ● Active
                  </span>

                ) : (

                  <span
                    style={{
                      color: "#F87171",
                    }}
                  >
                    ● Inactive
                  </span>

                )}

              </div>

            </div>

          </div>


          {/* EMPLOYMENT */}

          <div className="section-title">

            <i className="fas fa-building" />
            {" "}Employment & Branch

          </div>


          <div className="detail-item">

            <div className="detail-icon">
              <i className="fas fa-store" />
            </div>

            <div className="detail-content">

              <div className="detail-label">
                Branch
              </div>

              <div className="detail-value">
                {employee.branch}
              </div>

            </div>

          </div>


          <div className="detail-item">

            <div className="detail-icon">
              <i className="fas fa-chalkboard-user" />
            </div>

            <div className="detail-content">

              <div className="detail-label">
                Department
              </div>

              <div className="detail-value">
                {employee.department}
              </div>

            </div>

          </div>


          <div className="detail-item">

            <div className="detail-icon">
              <i className="fas fa-code-branch" />
            </div>

            <div className="detail-content">

              <div className="detail-label">
                Department Code
              </div>

              <div className="detail-value">
                {employee.departmentCode || "—"}
              </div>

            </div>

          </div>


          <div className="detail-item">

            <div className="detail-icon">
              <i className="fas fa-dollar-sign" />
            </div>

            <div className="detail-content">

              <div className="detail-label">
                Salary (INR)
              </div>

              <div className="detail-value">
                ₹{Number(employee.salary || 0).toLocaleString()}
              </div>

            </div>

          </div>


          <div className="detail-item">

            <div className="detail-icon">
              <i className="fas fa-calendar-alt" />
            </div>

            <div className="detail-content">

              <div className="detail-label">
                Joining Date
              </div>

              <div className="detail-value">
                {formatDate(employee.joiningDate)}
              </div>

            </div>

          </div>


          {/* BANK DETAILS */}

          <div className="section-title">

            <i className="fas fa-university" />
            {" "}Bank Details

          </div>


          <div className="detail-item">

            <div className="detail-icon">
              <i className="fas fa-university" />
            </div>

            <div className="detail-content">

              <div className="detail-label">
                Bank Name
              </div>

              <div className="detail-value">
                {employee.bankName || "—"}
              </div>

            </div>

          </div>


          <div className="detail-item">

            <div className="detail-icon">
              <i className="fas fa-credit-card" />
            </div>

            <div className="detail-content">

              <div className="detail-label">
                Account Number
              </div>

              <div className="detail-value">
                {employee.bankAccount || "—"}
              </div>

            </div>

          </div>


          <div className="detail-item">

            <div className="detail-icon">
              <i className="fas fa-code-branch" />
            </div>

            <div className="detail-content">

              <div className="detail-label">
                IFSC Code
              </div>

              <div className="detail-value">
                {employee.bankIfsc || "—"}
              </div>

            </div>

          </div>


          {/* HRMS CREDENTIALS */}

          <div className="section-title">

            <i className="fas fa-laptop" />
            {" "}HRMS Credentials

          </div>


          <div className="detail-item">

            <div className="detail-icon">
              <i className="fas fa-key" />
            </div>

            <div className="detail-content">

              <div className="detail-label">
                HRMS Password
              </div>

              <div className="detail-value">

                {employee.visiblePassword ? (

                  <button
                    type="button"
                    className="password-copy"
                    onClick={() =>
                      onCopyPassword(
                        employee.visiblePassword
                      )
                    }
                  >

                    {employee.visiblePassword}
                    {" "}
                    <i className="fas fa-copy" />

                  </button>

                ) : (

                  "••••••••"

                )}

                <span className="sensitive-badge">
                  Admin only
                </span>

              </div>

            </div>

          </div>


        </div>


        <div className="modal-actions">

          <button
            type="button"
            className="modal-btn cancel"
            onClick={onClose}
          >
            Close
          </button>

        </div>

      </div>

    </div>

  );
}


// ============================================================
// MAIN EMPLOYEE MODAL
// ============================================================

function EmployeeModal({
  formOpen,
  formMode,
  form,
  formError,
  saving,
  departments,

  detailsOpen,
  selectedEmployee,

  onFormClose,
  onFormChange,
  onFormSave,

  onDetailsClose,
  onCopyPassword,
  onEditEmployee,
  onDeactivateEmployee,
  onActivateEmployee,
}) {

  const [loginAccessOpen, setLoginAccessOpen] =
    useState(false);

  const [loginAccessEmployee, setLoginAccessEmployee] =
    useState(null);


  const handleManageLoginAccess = (employee) => {

    setLoginAccessEmployee(employee);

    setLoginAccessOpen(true);

  };


  const closeLoginAccess = () => {

    setLoginAccessOpen(false);

    setLoginAccessEmployee(null);

  };


  return (

    <>

      {/* EMPLOYEE ADD / EDIT */}

      <EmployeeFormModal

        open={formOpen}
        mode={formMode}
        form={form}
        formError={formError}
        saving={saving}
        departments={departments}

        onClose={onFormClose}
        onChange={onFormChange}
        onSave={onFormSave}

      />


      {/* EMPLOYEE DETAILS */}

      <EmployeeDetailsModal

        open={detailsOpen}
        employee={selectedEmployee}

        onClose={onDetailsClose}

        onCopyPassword={onCopyPassword}

        onEdit={onEditEmployee}

        onDeactivate={onDeactivateEmployee}

        onActivate={onActivateEmployee}

        onManageLoginAccess={
          handleManageLoginAccess
        }

      />


      {/* LOGIN ACCESS CONTROL */}

      <LoginAccessModal

        open={loginAccessOpen}

        employee={loginAccessEmployee}

        onClose={closeLoginAccess}

      />

    </>

  );

}


export default EmployeeModal;

