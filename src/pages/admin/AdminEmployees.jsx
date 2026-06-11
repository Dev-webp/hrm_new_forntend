import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Toast } from "../../components/Cards";
import EmployeeFilters from "../../components/EmployeeFilters";
import EmployeeTable from "../../components/EmployeeTable";
import EmployeeModal from "../../components/EmployeeModal";
import { useToast } from "../../hooks/useToast";
import api from "../../services/api";
import {
  BRANCH_OPTIONS,
  EMPTY_EMPLOYEE_FORM,
  buildEmployeePayload,
  employeeToForm,
  mapApiEmployee,
  validateEmployeeForm,
} from "../../utils/employeeHelpers";
import "../../styles/adminEmployees.css";

const PAGE_SIZE = 6;
const API_PATH = "/admin/employees";

function AdminEmployees() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  const [currentBranch, setCurrentBranch] = useState("all");
  const [currentDept, setCurrentDept] = useState("all");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);

  const [branchMenuOpen, setBranchMenuOpen] = useState(false);
  const branchDropdownRef = useRef(null);

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState("add");
  const [form, setForm] = useState(EMPTY_EMPLOYEE_FORM);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingEmployeeId, setEditingEmployeeId] = useState(null);

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);

  const { toast, showToast } = useToast(3000);

  // Close branch dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        branchDropdownRef.current &&
        !branchDropdownRef.current.contains(event.target)
      ) {
        setBranchMenuOpen(false);
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const loadEmployees = useCallback(async () => {
    setLoading(true);

    try {
      const response = await api.get(API_PATH, {
        params: {
          branch: currentBranch,
          department: currentDept,
          search,
        },
      });

      setEmployees(response.data.map(mapApiEmployee));
    } catch (error) {
      const message =
        error.response?.data?.message || error.message || "Request failed";
      showToast(`Error loading employees: ${message}`);
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  }, [currentBranch, currentDept, search, showToast]);

  // Reload when server-side filters change (same as original adminemployee.html)
  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  // Reset to page 1 when any filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [currentBranch, currentDept, search, roleFilter, statusFilter]);

  const filteredEmployees = useMemo(() => {
    return employees.filter((employee) => {
      const roleMatch =
        roleFilter === "all" || employee.role === roleFilter;
      const statusMatch =
        statusFilter === "all" || employee.status === statusFilter;

      return roleMatch && statusMatch;
    });
  }, [employees, roleFilter, statusFilter]);

  const stats = useMemo(() => {
    const total = filteredEmployees.length;
    const activeCount = filteredEmployees.filter(
      (employee) => employee.status === "active"
    ).length;
    const uniqueDepts = new Set(
      filteredEmployees.map((employee) => employee.department)
    );
    const uniqueBranches = new Set(
      filteredEmployees.map((employee) => employee.branch).filter(Boolean)
    );

    return {
      total,
      activeCount,
      inactiveCount: total - activeCount,
      deptCount: uniqueDepts.size,
      branchCount: uniqueBranches.size,
    };
  }, [filteredEmployees]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredEmployees.length / PAGE_SIZE)
  );

  const paginatedEmployees = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredEmployees.slice(start, start + PAGE_SIZE);
  }, [filteredEmployees, currentPage]);

  const selectedEmployee = useMemo(
    () => employees.find((employee) => employee.id === selectedEmployeeId),
    [employees, selectedEmployeeId]
  );

  const branchLabel =
    BRANCH_OPTIONS.find((option) => option.value === currentBranch)?.label ||
    currentBranch;

  const openAddModal = () => {
    setFormMode("add");
    setEditingEmployeeId(null);
    setForm(EMPTY_EMPLOYEE_FORM);
    setFormError("");
    setFormOpen(true);
  };

  const openEditModal = (employeeId) => {
    const employee = employees.find((item) => item.id === employeeId);

    if (!employee) return;

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
        showToast(
          `✅ ${form.name.trim()} added. HRMS Login: ${result.hrmsLogin} | Password: ${result.hrmsPassword}`
        );
      }

      setFormOpen(false);
      await loadEmployees();
    } catch (error) {
      const message =
        error.response?.data?.message || error.message || "Save failed";
      setFormError(message);
      showToast(`Save failed: ${message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEmployee = async (employeeId) => {
    const employee = employees.find((item) => item.id === employeeId);

    if (!employee) return;

    const confirmed = window.confirm(
      `Delete ${employee.name}? This cannot be undone.`
    );

    if (!confirmed) return;

    try {
      await api.delete(`${API_PATH}/${employeeId}`);
      showToast(`🗑️ ${employee.name} deleted.`);
      await loadEmployees();
    } catch (error) {
      const message =
        error.response?.data?.message || error.message || "Delete failed";
      showToast(`Delete failed: ${message}`);
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

  return (
    <div className="admin-employees-page">
      <div className="header">
        <div className="title">
          <h1>
            Employee Management
          </h1>
          <p>
            Manage employee profiles, roles, departments, and branch assignments.
          </p>
        </div>

        <div className="header-actions">
          <button type="button" className="add-employee-btn" onClick={openAddModal}>
            <i className="fas fa-plus" /> Add Employee
          </button>

          <div className="branch-dropdown" ref={branchDropdownRef}>
            <button
              type="button"
              className="branch-selector"
              onClick={(event) => {
                event.stopPropagation();
                setBranchMenuOpen((prev) => !prev);
              }}
            >
              <i className="fas fa-store" />
              <span>{branchLabel}</span>
              <i className="fas fa-chevron-down" />
            </button>

            <div className={`dropdown-menu${branchMenuOpen ? " show" : ""}`}>
              {BRANCH_OPTIONS.map((option) => (
                <div
                  key={option.value}
                  className="dropdown-item"
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

      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-label">Total Employees</div>
          <div className="stat-number">{stats.total}</div>
          <div className="stat-trend">Across selected workforce</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Active Employees</div>
          <div className="stat-number">{stats.activeCount}</div>
          <div className="stat-trend">Currently active</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Inactive Employees</div>
          <div className="stat-number">{stats.inactiveCount}</div>
          <div className="stat-trend neutral">Require review</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Departments</div>
          <div className="stat-number">{stats.deptCount}</div>
          <div className="stat-trend">Active teams</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Branches</div>
          <div className="stat-number">{stats.branchCount}</div>
          <div className="stat-trend">Operational locations</div>
        </div>
      </div>

      <EmployeeFilters
        search={search}
        onSearchChange={setSearch}
        department={currentDept}
        onDepartmentChange={setCurrentDept}
        roleFilter={roleFilter}
        onRoleFilterChange={setRoleFilter}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
      />

      <EmployeeTable
        employees={paginatedEmployees}
        loading={loading}
        currentPage={currentPage}
        totalPages={totalPages}
        pageSize={PAGE_SIZE}
        totalCount={filteredEmployees.length}
        onEdit={openEditModal}
        onDelete={handleDeleteEmployee}
        onViewDetails={(employeeId) => {
          setSelectedEmployeeId(employeeId);
          setDetailsOpen(true);
        }}
        onPageChange={setCurrentPage}
      />

      <EmployeeModal
        formOpen={formOpen}
        formMode={formMode}
        form={form}
        formError={formError}
        saving={saving}
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
      />

      <Toast message={toast.message} visible={toast.visible} />
    </div>
  );
}

export default AdminEmployees;
