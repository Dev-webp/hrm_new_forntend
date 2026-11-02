import { useCallback, useEffect, useMemo, useRef, useState, memo } from "react";

// Custom debounce function to avoid lodash dependency
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}
import { useSearchParams } from "react-router-dom";
import { Toast } from "../../components/Cards";
import EmployeeModal from "../../components/EmployeeModal";
import { useToast } from "../../hooks/useToast";
import api from "../../services/api";
import { fetchActiveDepartments, fetchDepartments } from "../../services/departmentApi";
import { updateEmployeeStatus } from "../../services/employeeApi";
import {
  BRANCH_OPTIONS,
  EMPTY_EMPLOYEE_FORM,
  ROLE_OPTIONS,
  buildEmployeePayload,
  employeeToForm,
  formatDate,
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
  const [statusFilter, setStatusFilter] = useState("active"); // Default to showing only active employees
  const [viewMode, setViewMode] = useState("active"); // Toggle between active/inactive views

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
      const statusMatch = viewMode === "all" || employee.status === viewMode;
      return roleMatch && statusMatch;
    });
  }, [employees, roleFilter, viewMode]);

  // Debounce search input for performance
  const debouncedSearch = useCallback(
    debounce((value) => setSearch(value), 300),
    []
  );

  const stats = useMemo(() => {
    const total = employees.length;
    const activeCount = employees.filter((e) => e.status === "active").length;
    const inactiveCount = total - activeCount;
    const activePercentage = total > 0 ? Math.round((activeCount / total) * 100) : 0;
    const inactivePercentage = total > 0 ? Math.round((inactiveCount / total) * 100) : 0;
    return {
      total,
      activeCount,
      inactiveCount,
      activePercentage,
      inactivePercentage,
    };
  }, [employees]);

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
    const emptyForm = { ...EMPTY_EMPLOYEE_FORM, department: activeDepartmentOptions[0] || "" };
    setForm(emptyForm);
    setFormError("");
    setFormOpen(true);
  };

  const openEditModal = (employeeId) => {
    const employee = employees.find((item) => item.id === employeeId);
    if (!employee) return;

    setDetailsOpen(false);
    setSelectedEmployeeId(null);
    setFormMode("edit");
    setEditingEmployeeId(employeeId);
    const employeeFormData = employeeToForm(employee);
    setForm(employeeFormData);
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

    const newValue = employee.invoiceAccess !== true;
    if (!window.confirm(`${newValue ? "Enable" : "Disable"} CRM / Invoice access for ${employee.name}?`)) return;

    try {
      await api.patch(`${API_PATH}/${employeeId}/invoice-access`, { invoice_access: newValue });
      setEmployees((prev) =>
        prev.map((item) => (item.id === employeeId ? { ...item, invoiceAccess: newValue } : item))
      );
      showToast(`${employee.name} CRM / Invoice access ${newValue ? "enabled" : "disabled"}`);
    } catch (error) {
      showToast(`CRM access update failed: ${error.response?.data?.message || error.message}`);
    }
  };

  const handleOpsAccess = async (employeeId) => {
    const employee = employees.find((item) => item.id === employeeId);
    if (!employee) return;

    const newValue = !employee.opsAccess;

    try {
      await api.patch(`${API_PATH}/${employeeId}/ops-access`, { ops_access: newValue });
      setEmployees((prev) =>
        prev.map((item) => (item.id === employeeId ? { ...item, opsAccess: newValue } : item))
      );
      showToast(`${employee.name} OPS access ${newValue ? "enabled" : "disabled"}`);
    } catch (error) {
      showToast(`OPS access update failed: ${error.response?.data?.message || error.message}`);
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

  const handleResetFilters = () => {
    setSearch("");
    setRoleFilter("all");
    setCurrentDept("all");
    setViewMode("active");
  };

  // --- Render helpers ---

  const renderStats = () => (
    <div className="em-stats-container">
      <div className="em-stat-card em-stat-total">
        <div className="em-stat-icon-wrapper">
          <div className="em-stat-icon">
            <i className="fas fa-users" />
          </div>
        </div>
        <div className="em-stat-content">
          <div className="em-stat-number">{stats.total}</div>
          <div className="em-stat-label">Total Employees</div>
        </div>
      </div>

      <div className="em-stat-card em-stat-active">
        <div className="em-stat-icon-wrapper">
          <div className="em-stat-icon">
            <i className="fas fa-check-circle" />
          </div>
        </div>
        <div className="em-stat-content">
          <div className="em-stat-number">{stats.activeCount}</div>
          <div className="em-stat-label">Active Employees</div>
          <div className="em-stat-percentage">{stats.activePercentage}%</div>
        </div>
      </div>

      <div className="em-stat-card em-stat-inactive">
        <div className="em-stat-icon-wrapper">
          <div className="em-stat-icon">
            <i className="fas fa-pause-circle" />
          </div>
        </div>
        <div className="em-stat-content">
          <div className="em-stat-number">{stats.inactiveCount}</div>
          <div className="em-stat-label">Inactive Employees</div>
          <div className="em-stat-percentage">{stats.inactivePercentage}%</div>
        </div>
      </div>
    </div>
  );

  const EmployeeCard = memo(({ employee, onDetails, onInvoiceAccess, onOpsAccess }) => {
    const roleMeta = getRoleMeta(employee.role);
    const isActive = (employee.status || "active") === "active";

    // Determine role badge class
    const getRoleBadgeClass = (role) => {
      const roleLower = role?.toLowerCase() || '';
      if (roleLower.includes('manager') && !roleLower.includes('operational')) return 'manager';
      if (roleLower.includes('operational')) return 'ops-manager';
      if (roleLower.includes('admin') || roleLower.includes('super')) return 'default';
      return 'employee';
    };

    const roleBadgeClass = getRoleBadgeClass(employee.role);

    return (
      <div className="em-card">
        <div className="em-card-header">
          <div className="em-avatar" style={{ background: roleMeta.color }}>
            {employee.initials || employee.name?.slice(0, 2)?.toUpperCase() || "E"}
          </div>
          <div className="em-card-info">
            <h3 className="em-card-name">{employee.name}</h3>
            <div className="em-card-meta">
              <span className={`em-role-badge ${roleBadgeClass}`}>
                {roleMeta.label}
              </span>
              <span className={`em-status-indicator${isActive ? " active" : " inactive"}`}>
                <span className="em-status-dot" />
                {isActive ? "Active" : "Inactive"}
              </span>
            </div>
          </div>
        </div>

        <div className="em-card-details">
          <div className="em-detail-row">
            <i className="fas fa-building em-detail-icon" />
            <span className="em-detail-label">Department</span>
            <span className="em-detail-value">{employee.department || "—"}</span>
          </div>
          <div className="em-detail-row">
            <i className="fas fa-id-card em-detail-icon" />
            <span className="em-detail-label">Employee ID</span>
            <span className="em-detail-value">{employee.empId || "—"}</span>
          </div>
          <div className="em-detail-row">
            <i className="fas fa-envelope em-detail-icon" />
            <span className="em-detail-label">Email</span>
            <span className="em-detail-value">{employee.email || "—"}</span>
          </div>
          <div className="em-detail-row">
            <i className="fas fa-map-marker-alt em-detail-icon" />
            <span className="em-detail-label">Branch</span>
            <span className="em-detail-value">{employee.branch || "—"}</span>
          </div>
          <div className="em-detail-row">
            <i className="fas fa-calendar em-detail-icon" />
            <span className="em-detail-label">Joining Date</span>
            <span className="em-detail-value">{employee.dateOfBirth ? formatDate(employee.dateOfBirth) : "—"}</span>
          </div>
        </div>

        <div className="em-card-actions">
          <button
            type="button"
            className="em-action-btn em-btn-details"
            onClick={onDetails}
          >
            <i className="fas fa-file-alt" /> Details
          </button>

          <button
            type="button"
            className={`em-action-btn em-btn-crm${employee.invoiceAccess ? " enabled" : ""}`}
            onClick={() => onInvoiceAccess(employee.id)}
          >
            <i className={employee.invoiceAccess ? "fas fa-check-circle" : "fas fa-link"} />
            {employee.invoiceAccess ? "CRM Enabled" : "Enable CRM"}
          </button>

          <button
            type="button"
            className={`em-action-btn em-btn-ops${employee.opsAccess ? " enabled" : ""}`}
            onClick={() => onOpsAccess(employee.id)}
          >
            <i className={employee.opsAccess ? "fas fa-check-circle" : "fas fa-layer-group"} />
            {employee.opsAccess ? "OPS Enabled" : "Enable OPS"}
          </button>
        </div>
      </div>
    );
  });

  EmployeeCard.displayName = 'EmployeeCard';

  return (
    <div className="em-page">
      <style>{`
        .em-page {
          --primary-blue: #1264E8;
          --navy-dark: #102443;
          --navy: #143967;
          --secondary-text: #64748B;
          --border-color: #DCE5F0;
          --active-green: #079B68;
          --crm-orange: #F97316;
          --ops-purple: #8B5CF6;
          --page-bg: #F4F7FB;
          --card-bg: #FFFFFF;
          --card-radius: 16px;
          --btn-radius: 10px;
        }

        /* Page Background */
        .em-page {
          background: var(--page-bg);
          min-height: 100vh;
          padding: 20px;
          width: 100%;
          max-width: 100%;
          overflow-x: hidden;
          box-sizing: border-box;
        }

        /* --- Header --- */
        .em-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          padding: 20px 24px;
          background: var(--card-bg);
          border-radius: var(--card-radius);
          border: 1px solid var(--border-color);
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
          width: 100%;
          box-sizing: border-box;
        }

        .em-header-left {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .em-header-icon {
          width: 48px;
          height: 48px;
          background: #E3F2FD;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--primary-blue);
          font-size: 20px;
          flex-shrink: 0;
        }

        .em-header-title h1 {
          font-size: 24px;
          font-weight: 700;
          color: var(--navy-dark);
          margin: 0 0 4px 0;
        }

        .em-header-title p {
          font-size: 13px;
          color: var(--secondary-text);
          margin: 0;
        }

        .em-header-right {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .em-add-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          background: var(--primary-blue);
          color: #fff;
          border: none;
          border-radius: var(--btn-radius);
          padding: 10px 20px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s ease, transform 0.2s ease;
        }

        .em-add-btn:hover {
          background: #0E5BC7;
          transform: translateY(-1px);
        }

        .em-branch-dropdown {
          position: relative;
        }

        .em-branch-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #fff;
          border: 1.5px solid var(--border-color);
          border-radius: var(--btn-radius);
          padding: 10px 16px;
          font-size: 14px;
          color: var(--navy-dark);
          cursor: pointer;
          transition: border-color 0.2s ease;
        }

        .em-branch-btn:hover {
          border-color: var(--primary-blue);
        }

        .em-branch-menu {
          position: absolute;
          right: 0;
          top: calc(100% + 8px);
          background: #fff;
          border: 1px solid var(--border-color);
          border-radius: 12px;
          box-shadow: 0 8px 24px rgba(16, 36, 67, 0.12);
          min-width: 180px;
          padding: 8px;
          z-index: 30;
          display: none;
        }

        .em-branch-menu.show {
          display: block;
        }

        .em-branch-item {
          padding: 10px 14px;
          border-radius: 8px;
          font-size: 14px;
          color: var(--navy-dark);
          cursor: pointer;
          transition: background 0.2s ease;
        }

        .em-branch-item:hover {
          background: #F4F7FB;
        }

        /* --- Summary Cards --- */
        .em-stats-container {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 20px;
          margin-bottom: 20px;
          width: 100%;
          box-sizing: border-box;
        }

        .em-stat-card {
          display: flex;
          align-items: center;
          gap: 16px;
          background: var(--card-bg);
          border: 1px solid var(--border-color);
          border-radius: var(--card-radius);
          padding: 20px 24px;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        }

        .em-stat-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 16px rgba(16, 36, 67, 0.1);
        }

        .em-stat-icon-wrapper {
          flex-shrink: 0;
        }

        .em-stat-icon {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          color: #fff;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .em-stat-total .em-stat-icon {
          background: linear-gradient(135deg, var(--primary-blue) 0%, #0E5BC7 100%);
        }

        .em-stat-active .em-stat-icon {
          background: linear-gradient(135deg, var(--active-green) 0%, #058A5B 100%);
        }

        .em-stat-inactive .em-stat-icon {
          background: linear-gradient(135deg, var(--crm-orange) 0%, #E65A0F 100%);
        }

        .em-stat-content {
          flex: 1;
        }

        .em-stat-number {
          font-size: 32px;
          font-weight: 700;
          color: var(--navy-dark);
          line-height: 1.1;
          margin-bottom: 4px;
        }

        .em-stat-label {
          font-size: 14px;
          color: var(--secondary-text);
          font-weight: 600;
          margin-bottom: 2px;
        }

        .em-stat-percentage {
          font-size: 13px;
          color: var(--secondary-text);
          font-weight: 500;
        }

        /* --- Combined Filter Bar --- */
        .em-filter-bar {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 20px;
          padding: 14px 18px;
          background: var(--card-bg);
          border: 1px solid var(--border-color);
          border-radius: var(--btn-radius);
          flex-wrap: nowrap;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
          width: 100%;
          box-sizing: border-box;
        }

        .em-view-label {
          font-size: 14px;
          font-weight: 600;
          color: var(--navy-dark);
          white-space: nowrap;
        }

        .em-tabs-container {
          display: flex;
          background: #F4F7FB;
          border-radius: 8px;
          padding: 4px;
          flex-shrink: 0;
        }

        .em-tab-btn {
          padding: 10px 24px;
          border: none;
          border-radius: 6px;
          background: transparent;
          color: var(--secondary-text);
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
        }

        .em-tab-btn.active {
          background: var(--primary-blue);
          color: #fff;
          box-shadow: 0 2px 8px rgba(18, 100, 232, 0.2);
        }

        .em-tab-btn:hover:not(.active) {
          background: rgba(18, 100, 232, 0.1);
        }

        .em-search-wrapper {
          position: relative;
          flex: 1;
          min-width: 200px;
          max-width: 300px;
        }

        .em-search-icon {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--secondary-text);
          font-size: 14px;
        }

        .em-search-input {
          width: 100%;
          padding: 11px 14px 11px 40px;
          border: 1.5px solid var(--border-color);
          border-radius: var(--btn-radius);
          font-size: 14px;
          color: var(--navy-dark);
          outline: none;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }

        .em-search-input:focus {
          border-color: var(--primary-blue);
          box-shadow: 0 0 0 3px rgba(18, 100, 232, 0.1);
        }

        .em-search-input::placeholder {
          color: #94A3B8;
        }

        .em-filter-select {
          padding: 11px 14px;
          border: 1.5px solid var(--border-color);
          border-radius: var(--btn-radius);
          font-size: 14px;
          color: var(--navy-dark);
          background: #fff;
          cursor: pointer;
          outline: none;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
          min-width: 130px;
          flex-shrink: 0;
        }

        .em-filter-select:focus {
          border-color: var(--primary-blue);
          box-shadow: 0 0 0 3px rgba(18, 100, 232, 0.1);
        }

        .em-reset-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 10px 16px;
          border: 1.5px solid var(--border-color);
          border-radius: var(--btn-radius);
          background: #fff;
          color: var(--navy-dark);
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          flex-shrink: 0;
        }

        .em-reset-btn:hover {
          background: #F4F7FB;
          border-color: var(--primary-blue);
        }

        /* --- Employee Card Grid --- */
        .em-card-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 20px;
          width: 100%;
          max-width: 100%;
          overflow-x: hidden;
        }

        /* --- Employee Card --- */
        .em-card {
          background: var(--card-bg);
          border: 3px solid #044172;
          border-radius: var(--card-radius);
          padding: 20px;
          transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
          display: flex;
          flex-direction: column;
          min-width: 0;
          width: 100%;
          box-sizing: border-box;
        }

        .em-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(16, 36, 67, 0.12);
          border-color: var(--primary-blue);
        }

        .em-card-header {
          display: flex;
          align-items: flex-start;
          gap: 14px;
          margin-bottom: 16px;
          width: 100%;
        }

        .em-avatar {
          width: 52px;
          height: 52px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          font-weight: 700;
          font-size: 18px;
          flex-shrink: 0;
          background: var(--primary-blue);
          box-shadow: 0 2px 8px rgba(18, 100, 232, 0.2);
        }

        .em-card-info {
          flex: 1;
          min-width: 0;
          overflow: hidden;
        }

        .em-card-name {
          font-size: 16px;
          font-weight: 700;
          color: var(--navy-dark);
          margin: 0 0 8px 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          line-height: 1.3;
        }

        .em-card-meta {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .em-role-badge {
          font-size: 11px;
          font-weight: 700;
          padding: 4px 12px;
          border-radius: 999px;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }

        .em-role-badge.employee {
          background: #E3F2FD;
          color: var(--primary-blue);
        }

        .em-role-badge.manager {
          background: #F3E8FF;
          color: var(--ops-purple);
        }

        .em-role-badge.ops-manager {
          background: #FFF1E5;
          color: var(--crm-orange);
        }

        .em-role-badge.default {
          background: #F4F7FB;
          color: var(--secondary-text);
        }

        .em-status-indicator {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          font-weight: 600;
        }

        .em-status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }

        .em-status-indicator.active {
          color: var(--active-green);
        }

        .em-status-indicator.active .em-status-dot {
          background: var(--active-green);
          box-shadow: 0 0 0 2px rgba(7, 155, 104, 0.1);
        }

        .em-status-indicator.inactive {
          color: var(--secondary-text);
        }

        .em-status-indicator.inactive .em-status-dot {
          background: #CBD5E1;
        }

        .em-card-details {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 16px;
          padding: 16px 0;
          border-top: 1px solid var(--border-color);
          border-bottom: 1px solid var(--border-color);
          flex: 1;
        }

        .em-detail-row {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 13px;
        }

        .em-detail-icon {
          width: 18px;
          color: var(--secondary-text);
          font-size: 14px;
          flex-shrink: 0;
        }

        .em-detail-label {
          width: 95px;
          color: var(--secondary-text);
          font-weight: 500;
          flex-shrink: 0;
        }

        .em-detail-value {
          color: var(--navy-dark);
          font-weight: 600;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .em-card-actions {
          display: flex;
          gap: 8px;
          margin-top: auto;
        }

        .em-action-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 10px 12px;
          border: 1.5px solid var(--border-color);
          border-radius: 8px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          min-height: 40px;
        }

        .em-btn-details {
          background: #fff;
          color: var(--navy-dark);
        }

        .em-btn-details:hover {
          background: #F4F7FB;
          border-color: var(--primary-blue);
          color: var(--primary-blue);
        }

        .em-btn-crm {
          background: #FFF7ED;
          border-color: #FED7AA;
          color: var(--crm-orange);
        }

        .em-btn-crm:hover {
          background: #FFEDD5;
          border-color: var(--crm-orange);
        }

        .em-btn-crm.enabled {
          background: #DCFCE7;
          border-color: #86EFAC;
          color: var(--active-green);
        }

        .em-btn-crm.enabled:hover {
          background: #BBF7D0;
          border-color: var(--active-green);
        }

        .em-btn-ops {
          background: #FAF5FF;
          border-color: #E9D5FF;
          color: var(--ops-purple);
        }

        .em-btn-ops:hover {
          background: #F3E8FF;
          border-color: var(--ops-purple);
        }

        .em-btn-ops.enabled {
          background: #DCFCE7;
          border-color: #86EFAC;
          color: var(--active-green);
        }

        .em-btn-ops.enabled:hover {
          background: #BBF7D0;
          border-color: var(--active-green);
        }

        /* --- Loading/Empty States --- */
        .em-loading-state,
        .em-empty-state {
          grid-column: 1 / -1;
          text-align: center;
          padding: 80px 20px;
          color: var(--secondary-text);
          font-size: 14px;
          background: var(--card-bg);
          border-radius: var(--card-radius);
          border: 1px dashed var(--border-color);
        }

        /* --- Responsive Design --- */
        @media (max-width: 1400px) {
          .em-card-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }

        @media (max-width: 1100px) {
          .em-card-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .em-stats-container {
            grid-template-columns: repeat(2, 1fr);
          }

          .em-filter-bar {
            flex-wrap: wrap;
          }

          .em-search-wrapper {
            max-width: 100%;
            min-width: 200px;
          }
        }

        @media (max-width: 768px) {
          .em-page {
            padding: 16px;
          }

          .em-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 16px;
          }

          .em-header-right {
            width: 100%;
            justify-content: space-between;
          }

          .em-stats-container {
            grid-template-columns: 1fr;
          }

          .em-card-grid {
            grid-template-columns: 1fr;
          }

          .em-filter-bar {
            flex-wrap: wrap;
            align-items: stretch;
            gap: 8px;
          }

          .em-view-label {
            width: 100%;
            margin-bottom: 4px;
          }

          .em-tabs-container {
            width: 100%;
            margin-bottom: 8px;
          }

          .em-tab-btn {
            flex: 1;
            text-align: center;
          }

          .em-search-wrapper {
            max-width: 100%;
            min-width: 100%;
            order: 3;
          }

          .em-filter-select {
            min-width: calc(50% - 4px);
            order: 4;
          }

          .em-reset-btn {
            width: 100%;
            order: 5;
          }

          .em-card-actions {
            flex-wrap: wrap;
          }

          .em-action-btn {
            min-width: calc(50% - 4px);
          }
        }
      `}</style>

      {/* Header */}
      <div className="em-header">
        <div className="em-header-left">
          <div className="em-header-icon">
            <i className="fas fa-users" />
          </div>
          <div className="em-header-title">
            <h1>Employees</h1>
            <p>Manage employee profiles, roles, departments, and branches.</p>
          </div>
        </div>

        <div className="em-header-right">
          <button type="button" className="em-add-btn" onClick={openAddModal}>
            <i className="fas fa-plus" /> Add Employee
          </button>

          <div className="em-branch-dropdown" ref={branchDropdownRef}>
            <button
              type="button"
              className="em-branch-btn"
              onClick={(event) => {
                event.stopPropagation();
                setBranchMenuOpen((prev) => !prev);
              }}
            >
              <i className="fas fa-building" /> {branchLabel} <i className="fas fa-chevron-down" />
            </button>

            <div className={`em-branch-menu${branchMenuOpen ? " show" : ""}`}>
              {BRANCH_OPTIONS.map((option) => (
                <div
                  key={option.value}
                  className="em-branch-item"
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

      {/* Summary Cards */}
      {renderStats()}

      {/* Combined Filter Bar */}
      <div className="em-filter-bar">
        <span className="em-view-label">View:</span>
        <div className="em-tabs-container">
          <button
            type="button"
            className={`em-tab-btn${viewMode === 'active' ? ' active' : ''}`}
            onClick={() => setViewMode('active')}
          >
            Active ({stats.activeCount})
          </button>
          <button
            type="button"
            className={`em-tab-btn${viewMode === 'inactive' ? ' active' : ''}`}
            onClick={() => setViewMode('inactive')}
          >
            Inactive ({stats.inactiveCount})
          </button>
        </div>

        <div className="em-search-wrapper">
          <i className="fas fa-search em-search-icon" />
          <input
            type="text"
            className="em-search-input"
            placeholder="Search by name, email or employee ID"
            value={search}
            onChange={(event) => debouncedSearch(event.target.value)}
          />
        </div>

        <select
          className="em-filter-select"
          value={roleFilter}
          onChange={(event) => setRoleFilter(event.target.value)}
        >
          <option value="all">All Roles</option>
          {ROLE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <select
          className="em-filter-select"
          value={currentDept}
          onChange={(event) => setCurrentDept(event.target.value)}
        >
          <option value="all">All Departments</option>
          {departmentOptions.map((dept) => (
            <option key={dept} value={dept}>
              {dept}
            </option>
          ))}
        </select>

        <button type="button" className="em-reset-btn" onClick={handleResetFilters}>
          <i className="fas fa-redo" /> Reset
        </button>
      </div>

      {/* Employee Card Grid */}
      <div className="em-card-grid">
        {loading ? (
          <div className="em-loading-state">Loading employees...</div>
        ) : filteredEmployees.length === 0 ? (
          <div className="em-empty-state">No employees found</div>
        ) : (
          filteredEmployees.map((employee) => (
            <EmployeeCard
              key={employee.id}
              employee={employee}
              onDetails={() => {
                setSelectedEmployeeId(employee.id);
                setDetailsOpen(true);
              }}
              onInvoiceAccess={handleInvoiceAccess}
              onOpsAccess={handleOpsAccess}
            />
          ))
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