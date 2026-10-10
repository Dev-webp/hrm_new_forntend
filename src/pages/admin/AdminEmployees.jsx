import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Toast } from "../../components/Cards";
import EmployeeFilters from "../../components/EmployeeFilters";
import EmployeeModal from "../../components/EmployeeModal";
import { useToast } from "../../hooks/useToast";
import api from "../../services/api";
import { fetchActiveDepartments, fetchDepartments } from "../../services/departmentApi";
import { updateEmployeeStatus } from "../../services/employeeApi";
import {
  BRANCH_OPTIONS,
  EMPTY_EMPLOYEE_FORM,
  buildEmployeePayload,
  employeeToForm,
  mapApiEmployee,
  validateEmployeeForm,
} from "../../utils/employeeHelpers";
import "../../styles/adminEmployees.css";

const API_PATH = "/admin/employees";

// Role -> display label + accent color, matching the brand palette.
const ROLE_META = {
  Admin: { label: "MANAGER", color: "#143967" },
  MANAGER: { label: "MANAGER", color: "#143967" },
  "Sub Admin": { label: "SUB ADMIN", color: "#14A79E" },
  SUB_ADMIN: { label: "SUB ADMIN", color: "#14A79E" },
  "Operational Manager": { label: "OPERATIONAL MANAGER", color: "#F6821F" },
  OPERATIONAL_MANAGER: { label: "OPERATIONAL MANAGER", color: "#F6821F" },
  "Super Admin": { label: "SUPER ADMIN", color: "#0E2A4D" },
  SUPER_ADMIN: { label: "SUPER ADMIN", color: "#0E2A4D" },
};
const DEFAULT_ROLE_META = { label: "EMPLOYEE", color: "#64748B" };

function getRoleMeta(role) {
  return ROLE_META[role] || DEFAULT_ROLE_META;
}

function AdminEmployees() {
  const [searchParams] = useSearchParams();
  const { toast, showToast } = useToast(3000);

  // --- Data state ---
  const [employees, setEmployees] = useState([]);
  const [departmentOptions, setDepartmentOptions] = useState([]);
  const [activeDepartmentOptions, setActiveDepartmentOptions] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- Filters ---
  const [currentBranch, setCurrentBranch] = useState("all");
  const [currentDept, setCurrentDept] = useState("all");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // --- Branch dropdown ---
  const [branchMenuOpen, setBranchMenuOpen] = useState(false);
  const branchDropdownRef = useRef(null);

  // --- Add/edit modal ---
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState("add");
  const [form, setForm] = useState(EMPTY_EMPLOYEE_FORM);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingEmployeeId, setEditingEmployeeId] = useState(null);

  // --- Details modal ---
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);

  // Open an employee straight from a dashboard "quick action" link (?employeeId=...)
  useEffect(() => {
    const quickActionEmployeeId = searchParams.get("employeeId");
    if (!quickActionEmployeeId) return;

    setSelectedEmployeeId(parseInt(quickActionEmployeeId, 10));
    setDetailsOpen(true);
    window.history.replaceState({}, document.title, "/admin/employees");
  }, [searchParams]);

  // Close the branch dropdown when clicking outside it
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (branchDropdownRef.current && !branchDropdownRef.current.contains(event.target)) {
        setBranchMenuOpen(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  // --- Load data (same API endpoints as before) ---

  const loadEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get(API_PATH, {
        params: { branch: currentBranch, department: currentDept, search, status: "all" },
      });
      setEmployees(response.data.map(mapApiEmployee));
    } catch (error) {
      showToast(`Error loading employees: ${error.response?.data?.message || error.message}`);
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  }, [currentBranch, currentDept, search, showToast]);

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  const loadDepartmentOptions = useCallback(async () => {
    try {
      const [all, active] = await Promise.all([
        fetchDepartments({ branch: currentBranch, status: "all" }),
        fetchActiveDepartments({ branch: currentBranch }),
      ]);
      setDepartmentOptions(all.map((dept) => dept.name).filter(Boolean));
      setActiveDepartmentOptions(active.map((dept) => dept.name).filter(Boolean));
    } catch (error) {
      showToast(error.response?.data?.message || "Failed to load departments");
      setDepartmentOptions([]);
      setActiveDepartmentOptions([]);
    }
  }, [currentBranch, showToast]);

  useEffect(() => {
    loadDepartmentOptions();
  }, [loadDepartmentOptions]);

  // --- Derived data ---

  const filteredEmployees = useMemo(() => {
    return employees.filter((employee) => {
      const roleMatch = roleFilter === "all" || employee.role === roleFilter;
      const statusMatch = statusFilter === "all" || employee.status === statusFilter;
      return roleMatch && statusMatch;
    });
  }, [employees, roleFilter, statusFilter]);

  const stats = useMemo(() => {
    const total = filteredEmployees.length;
    const activeCount = filteredEmployees.filter((e) => e.status === "active").length;
    return {
      total,
      activeCount,
      inactiveCount: total - activeCount,
    };
  }, [filteredEmployees]);

  const selectedEmployee = useMemo(
    () => employees.find((employee) => employee.id === selectedEmployeeId),
    [employees, selectedEmployeeId]
  );

  const branchLabel =
    BRANCH_OPTIONS.find((option) => option.value === currentBranch)?.label || currentBranch;

  // --- Actions (same API calls as before) ---

  const openAddModal = () => {
    setFormMode("add");
    setEditingEmployeeId(null);
    setForm({ ...EMPTY_EMPLOYEE_FORM, department: activeDepartmentOptions[0] || "" });
    setFormError("");
    setFormOpen(true);
  };

  const openEditModal = (employeeId) => {
    const employee = employees.find((item) => item.id === employeeId);
    if (!employee) return;

    setDetailsOpen(false);
    setFormMode("edit");
    setEditingEmployeeId(employeeId);
    setForm(employeeToForm(employee));
    setFormError("");
    setFormOpen(true);
  };

  const handleSaveEmployee = async () => {
    const validationError = validateEmployeeForm(form);
    if (validationError) {
      setFormError(validationError);
      showToast(validationError);
      return;
    }

    setFormError("");
    setSaving(true);
    const payload = buildEmployeePayload(form);

    try {
      if (editingEmployeeId !== null) {
        await api.put(`${API_PATH}/${editingEmployeeId}`, payload);
        showToast(`✅ ${form.name.trim()} updated`);
      } else {
        const response = await api.post(API_PATH, payload);
        const result = response.data;
        showToast(`✅ ${form.name.trim()} added. HRMS Login: ${result.hrmsLogin} | Password: ${result.hrmsPassword}`);
      }
      setFormOpen(false);
      await loadEmployees();
    } catch (error) {
      const message = error.response?.data?.message || error.message || "Save failed";
      setFormError(message);
      showToast(`Save failed: ${message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEmployee = async (employeeId) => {
    const employee = employees.find((item) => item.id === employeeId);
    if (!employee) return;

    if (!window.confirm(`Mark ${employee.name} inactive? This keeps their records and related data.`)) return;
    const reason = window.prompt("Reason for deactivation (optional):", "") ?? null;
    if (reason === null) return;

    try {
      await updateEmployeeStatus(employeeId, "inactive", reason);
      setEmployees((prev) =>
        prev.map((item) => (item.id === employeeId ? { ...item, status: "inactive" } : item))
      );
      showToast("Employee marked as inactive");
    } catch (error) {
      showToast(`Mark inactive failed: ${error.response?.data?.message || error.message}`);
    }
  };

  const handleActivateEmployee = async (employeeId) => {
    const employee = employees.find((item) => item.id === employeeId);
    if (!employee || !window.confirm(`Activate ${employee.name}?`)) return;
    const reason = window.prompt("Reason for activation (optional):", "") ?? null;
    if (reason === null) return;

    try {
      await updateEmployeeStatus(employeeId, "active", reason);
      setEmployees((prev) =>
        prev.map((item) => (item.id === employeeId ? { ...item, status: "active" } : item))
      );
      showToast(`${employee.name} activated`);
    } catch (error) {
      showToast(error.response?.data?.message || "Activation failed");
    }
  };

  const handleInvoiceAccess = async (employeeId) => {
    const employee = employees.find((item) => item.id === employeeId);
    if (!employee) return;

    const newValue = employee.invoice_access !== true;
    if (!window.confirm(`${newValue ? "Enable" : "Disable"} CRM / Invoice access for ${employee.name}?`)) return;

    try {
      await api.patch(`${API_PATH}/${employeeId}/invoice-access`, { invoice_access: newValue });
      setEmployees((prev) =>
        prev.map((item) => (item.id === employeeId ? { ...item, invoice_access: newValue } : item))
      );
      showToast(`${employee.name} CRM / Invoice access ${newValue ? "enabled" : "disabled"}`);
    } catch (error) {
      showToast(`CRM access update failed: ${error.response?.data?.message || error.message}`);
    }
  };

  const handleCopyPassword = async (password) => {
    try {
      await navigator.clipboard.writeText(password);
      showToast("📋 Password copied to clipboard");
    } catch {
      showToast("Could not copy password");
    }
  };

  // --- Render helpers ---

  const renderStats = () => (
    <div className="ax-stats">
      <div className="ax-stat-card">
        <div className="ax-stat-icon ax-navy">
          <i className="fas fa-users" />
        </div>
        <div>
          <div className="ax-stat-number">{stats.total}</div>
          <div className="ax-stat-label">Total employees</div>
        </div>
      </div>

      <div className="ax-stat-card">
        <div className="ax-stat-icon ax-teal">
          <i className="fas fa-circle-check" />
        </div>
        <div>
          <div className="ax-stat-number">{stats.activeCount}</div>
          <div className="ax-stat-label">Active</div>
        </div>
      </div>

      <div className="ax-stat-card">
        <div className="ax-stat-icon ax-orange">
          <i className="fas fa-circle-pause" />
        </div>
        <div>
          <div className="ax-stat-number">{stats.inactiveCount}</div>
          <div className="ax-stat-label">Inactive</div>
        </div>
      </div>
    </div>
  );

  const renderEmployeeCard = (employee) => {
    const roleMeta = getRoleMeta(employee.role);
    const isActive = (employee.status || "active") === "active";

    return (
      <div key={employee.id} className="ax-card">
        <div className="ax-card-top">
          <div className="ax-avatar" style={{ background: roleMeta.color }}>
            {employee.initials || employee.name?.slice(0, 2)?.toUpperCase() || "E"}
          </div>
          <div className="ax-card-person">
            <h4>{employee.name}</h4>
            <div className="ax-role-row">
              <span className="ax-role-badge" style={{ color: roleMeta.color, borderColor: roleMeta.color }}>
                {roleMeta.label}
              </span>
              <span className={`ax-status-dot${isActive ? " active" : ""}`}>
                <i className="fas fa-circle" /> {isActive ? "Active" : "Inactive"}
              </span>
            </div>
          </div>
        </div>

        <div className="ax-card-details">
          <div><i className="fas fa-building" /> {employee.department || "—"}</div>
          <div><i className="fas fa-id-card" /> {employee.empId || "—"}</div>
          <div><i className="fas fa-envelope" /> {employee.email || "—"}</div>
          <div><i className="fas fa-store" /> {employee.branch || "—"}</div>
        </div>

        <div className="ax-card-actions">
          <button
            type="button"
            className="ax-btn-outline"
            onClick={() => {
              setSelectedEmployeeId(employee.id);
              setDetailsOpen(true);
            }}
          >
            <i className="fas fa-file-alt" /> Details
          </button>

          <button
            type="button"
            className={`ax-btn-crm${employee.invoice_access ? " enabled" : ""}`}
            onClick={() => handleInvoiceAccess(employee.id)}
          >
            <i className={employee.invoice_access ? "fas fa-check-circle" : "fas fa-ban"} />
            {employee.invoice_access ? "CRM Enabled" : "Enable CRM"}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="admin-employees-page admin-portal-page ax-page">
      <style>{`
        .ax-page {
          --navy: #143967;
          --navy-dark: #0E2A4D;
          --orange: #F6821F;
          --teal: #14A79E;
          --mist: #F3F6FB;
          --line: #E2E7EF;
          --muted: #64748B;
        }

        /* --- Header --- */
        .ax-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          flex-wrap: wrap;
          gap: 16px;
          margin-bottom: 22px;
        }
        .ax-title h1 {
          font-size: 26px;
          font-weight: 700;
          color: var(--navy-dark);
          margin: 0 0 4px;
        }
        .ax-title p {
          font-size: 14px;
          color: var(--muted);
          margin: 0;
        }
        .ax-header-actions {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .ax-add-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          background: var(--orange);
          color: #fff;
          border: none;
          border-radius: 10px;
          padding: 11px 18px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.15s ease, transform 0.1s ease;
        }
        .ax-add-btn:hover {
          background: #DD6E12;
        }
        .ax-add-btn:active {
          transform: scale(0.98);
        }

        .ax-branch {
          position: relative;
        }
        .ax-branch-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #fff;
          border: 1.5px solid var(--line);
          border-radius: 10px;
          padding: 10px 14px;
          font-size: 14px;
          color: var(--navy-dark);
          cursor: pointer;
          transition: border-color 0.15s ease;
        }
        .ax-branch-btn:hover {
          border-color: var(--navy);
        }
        .ax-branch-menu {
          position: absolute;
          right: 0;
          top: calc(100% + 6px);
          background: #fff;
          border: 1px solid var(--line);
          border-radius: 10px;
          box-shadow: 0 8px 24px rgba(14, 42, 77, 0.14);
          min-width: 180px;
          padding: 6px;
          z-index: 20;
          display: none;
        }
        .ax-branch-menu.show {
          display: block;
        }
        .ax-branch-item {
          padding: 9px 12px;
          border-radius: 7px;
          font-size: 13.5px;
          color: var(--navy-dark);
          cursor: pointer;
        }
        .ax-branch-item:hover {
          background: var(--orange);
          color: #fff;
        }

        /* --- Stats --- */
        .ax-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 14px;
          margin-bottom: 22px;
        }
        .ax-stat-card {
          display: flex;
          align-items: center;
          gap: 14px;
          background: #fff;
          border: 1px solid var(--line);
          border-radius: 14px;
          padding: 16px 18px;
        }
        .ax-stat-icon {
          width: 42px;
          height: 42px;
          border-radius: 11px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          color: #fff;
          flex-shrink: 0;
        }
        .ax-stat-icon.ax-navy { background: var(--navy); }
        .ax-stat-icon.ax-teal { background: var(--teal); }
        .ax-stat-icon.ax-orange { background: var(--orange); }
        .ax-stat-number {
          font-size: 22px;
          font-weight: 700;
          color: var(--navy-dark);
          line-height: 1.1;
        }
        .ax-stat-label {
          font-size: 12.5px;
          color: var(--muted);
          margin-top: 2px;
        }

        /* --- Card grid --- */
        .admin-employee-card-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 14px;
        }
        .ax-card {
          background: #fff;
          border: 1px solid var(--line);
          border-radius: 14px;
          padding: 16px;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }
        .ax-card:hover {
          border-color: var(--navy);
          box-shadow: 0 4px 16px rgba(14, 42, 77, 0.08);
        }
        .ax-card-top {
          display: flex;
          gap: 12px;
          align-items: center;
          margin-bottom: 12px;
        }
        .ax-avatar {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          font-weight: 700;
          font-size: 14px;
          flex-shrink: 0;
        }
        .ax-card-person h4 {
          margin: 0 0 4px;
          font-size: 15px;
          color: var(--navy-dark);
        }
        .ax-role-row {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }
        .ax-role-badge {
          font-size: 10.5px;
          font-weight: 700;
          letter-spacing: 0.3px;
          border: 1.3px solid;
          border-radius: 999px;
          padding: 2px 8px;
        }
        .ax-status-dot {
          font-size: 11.5px;
          color: var(--muted);
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .ax-status-dot i {
          font-size: 6px;
          color: #C3CBD4;
        }
        .ax-status-dot.active i {
          color: var(--teal);
        }

        .ax-card-details {
          display: flex;
          flex-direction: column;
          gap: 6px;
          font-size: 13px;
          color: #3F4C58;
          border-top: 1px solid var(--line);
          border-bottom: 1px solid var(--line);
          padding: 12px 0;
          margin-bottom: 12px;
        }
        .ax-card-details i {
          width: 16px;
          color: #93A0AC;
        }

        .ax-card-actions {
          display: flex;
          gap: 8px;
        }
        .ax-btn-outline {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          background: #fff;
          border: 1.3px solid var(--line);
          color: var(--navy-dark);
          border-radius: 9px;
          padding: 9px 10px;
          font-size: 12.5px;
          font-weight: 600;
          cursor: pointer;
          transition: border-color 0.15s ease, color 0.15s ease;
        }
        .ax-btn-outline:hover {
          border-color: var(--navy);
          color: var(--navy);
        }
        .ax-btn-crm {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          background: #FFF1E5;
          border: 1.3px solid #FBD5AE;
          color: var(--orange);
          border-radius: 9px;
          padding: 9px 10px;
          font-size: 12.5px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.15s ease;
        }
        .ax-btn-crm.enabled {
          background: #E4F6F4;
          border-color: #B7E6E1;
          color: var(--teal);
        }

        .ax-loading-state,
        .ax-empty-state {
          grid-column: 1 / -1;
          text-align: center;
          padding: 48px 16px;
          color: var(--muted);
          font-size: 14px;
        }
      `}</style>

      <div className="ax-header">
        <div className="ax-title">
          <h1>Employees</h1>
          <p>Manage employee profiles, roles, departments, and branches.</p>
        </div>

        <div className="ax-header-actions">
          <button type="button" className="ax-add-btn" onClick={openAddModal}>
            <i className="fas fa-plus" /> Add Employee
          </button>

          <div className="ax-branch" ref={branchDropdownRef}>
            <button
              type="button"
              className="ax-branch-btn"
              onClick={(event) => {
                event.stopPropagation();
                setBranchMenuOpen((prev) => !prev);
              }}
            >
              <i className="fas fa-store" /> {branchLabel} <i className="fas fa-chevron-down" />
            </button>

            <div className={`ax-branch-menu${branchMenuOpen ? " show" : ""}`}>
              {BRANCH_OPTIONS.map((option) => (
                <div
                  key={option.value}
                  className="ax-branch-item"
                  onClick={() => {
                    setCurrentBranch(option.value);
                    setBranchMenuOpen(false);
                  }}
                >
                  {option.label}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {renderStats()}

      <EmployeeFilters
        search={search}
        onSearchChange={setSearch}
        department={currentDept}
        onDepartmentChange={setCurrentDept}
        departments={departmentOptions}
        roleFilter={roleFilter}
        onRoleFilterChange={setRoleFilter}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
      />

      <div className="admin-employee-card-grid">
        {loading ? (
          <div className="ax-loading-state">Loading employees...</div>
        ) : filteredEmployees.length === 0 ? (
          <div className="ax-empty-state">No employees found</div>
        ) : (
          filteredEmployees.map(renderEmployeeCard)
        )}
      </div>

      <EmployeeModal
        formOpen={formOpen}
        formMode={formMode}
        form={form}
        formError={formError}
        saving={saving}
        departments={activeDepartmentOptions}
        detailsOpen={detailsOpen}
        selectedEmployee={selectedEmployee}
        onFormClose={() => setFormOpen(false)}
        onFormChange={setForm}
        onFormSave={handleSaveEmployee}
        onDetailsClose={() => {
          setDetailsOpen(false);
          setSelectedEmployeeId(null);
        }}
        onCopyPassword={handleCopyPassword}
        onEditEmployee={openEditModal}
        onDeactivateEmployee={handleDeleteEmployee}
        onActivateEmployee={handleActivateEmployee}
      />

      <Toast message={toast.message} visible={toast.visible} />
    </div>
  );
}

export default AdminEmployees;