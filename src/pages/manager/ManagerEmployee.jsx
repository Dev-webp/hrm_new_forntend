import { useCallback, useEffect, useMemo, useState } from "react";
import { Toast } from "../../components/Cards";
import EmployeeFilters from "../../components/EmployeeFilters";
import EmployeeModal from "../../components/EmployeeModal";
import { useToast } from "../../hooks/useToast";
import api from "../../services/api";
import { fetchActiveDepartments, fetchDepartments } from "../../services/departmentApi";
import { updateEmployeeStatus } from "../../services/employeeApi";
import {
  EMPTY_EMPLOYEE_FORM,
  buildEmployeePayload,
  employeeToForm,
  mapApiEmployee,
  validateEmployeeForm,
} from "../../utils/employeeHelpers";
import "../../styles/adminEmployees.css";
import "./ManagerEmployee.css";

const API_PATH = "/admin/employees";

function ManagerEmployee() {
  const [employees, setEmployees] = useState([]);
  const [departmentOptions, setDepartmentOptions] = useState([]);
  const [activeDepartmentOptions, setActiveDepartmentOptions] = useState([]);
  const [loading, setLoading] = useState(true);

  const [currentDept, setCurrentDept] = useState("all");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState("add");
  const [form, setForm] = useState(EMPTY_EMPLOYEE_FORM);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingEmployeeId, setEditingEmployeeId] = useState(null);

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);

  const { toast, showToast } = useToast(3000);
  const storedUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
      return {};
    }
  }, []);
  const isOperationalManager = storedUser.role === "OPERATIONAL_MANAGER";
  const [selectedBranch, setSelectedBranch] = useState(isOperationalManager ? "all" : (localStorage.getItem("branch") || "Hyderabad"));
  const branch = isOperationalManager ? selectedBranch : (localStorage.getItem("branch") || "Hyderabad");
  const editableBranch = branch === "all" ? "Hyderabad" : branch;

  const loadEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get(API_PATH, {
        params: {
          branch,
          department: currentDept,
          search,
          status: "all",
        },
      });
      setEmployees(response.data.map(mapApiEmployee));
    } catch (error) {
      const message = error.response?.data?.message || error.message || "Request failed";
      showToast(`Error loading employees: ${message}`);
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  }, [branch, currentDept, search, showToast]);

  const loadDepartmentOptions = useCallback(async () => {
    try {
      const [all, active] = await Promise.all([
        fetchDepartments({ branch, status: "all" }),
        fetchActiveDepartments({ branch }),
      ]);
      setDepartmentOptions(all.map((dept) => dept.name).filter(Boolean));
      setActiveDepartmentOptions(active.map((dept) => dept.name).filter(Boolean));
    } catch (error) {
      showToast(error.response?.data?.message || "Failed to load departments");
      setDepartmentOptions([]);
      setActiveDepartmentOptions([]);
    }
  }, [branch, showToast]);

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  useEffect(() => {
    loadDepartmentOptions();
  }, [loadDepartmentOptions]);

  const filteredEmployees = useMemo(() => {
    return employees.filter((employee) => {
      const roleMatch = roleFilter === "all" || employee.role === roleFilter;
      const statusMatch = statusFilter === "all" || employee.status === statusFilter;
      return roleMatch && statusMatch;
    });
  }, [employees, roleFilter, statusFilter]);

  const stats = useMemo(() => {
    const total = filteredEmployees.length;
    const activeCount = filteredEmployees.filter((employee) => employee.status === "active").length;
    const uniqueDepts = new Set(filteredEmployees.map((employee) => employee.department));
    return {
      total,
      activeCount,
      inactiveCount: total - activeCount,
      deptCount: uniqueDepts.size,
    };
  }, [filteredEmployees]);

  const selectedEmployee = useMemo(
    () => employees.find((employee) => employee.id === selectedEmployeeId),
    [employees, selectedEmployeeId]
  );

  const openAddModal = () => {
    setFormMode("add");
    setEditingEmployeeId(null);
    setForm({
      ...EMPTY_EMPLOYEE_FORM,
      branch: editableBranch,
      role: "Employee",
      department: activeDepartmentOptions[0] || "",
    });
    setFormError("");
    setFormOpen(true);
  };

  const openEditModal = (employeeId) => {
    const employee = employees.find((item) => item.id === employeeId);
    if (!employee) return;

    setDetailsOpen(false);
    setFormMode("edit");
    setEditingEmployeeId(employeeId);
    setForm({ ...employeeToForm(employee), role: "Employee" });
    setFormError("");
    setFormOpen(true);
  };

  const handleSaveEmployee = async () => {
    const managerForm = { ...form, branch: form.branch || editableBranch, role: "Employee" };
    const validationError = validateEmployeeForm(managerForm);
    if (validationError) {
      setFormError(validationError);
      showToast(validationError);
      return;
    }

    setFormError("");
    setSaving(true);
    const payload = buildEmployeePayload(managerForm);

    try {
      if (editingEmployeeId !== null) {
        await api.put(`${API_PATH}/${editingEmployeeId}`, payload);
        showToast(`${managerForm.name.trim()} updated`);
      } else {
        const response = await api.post(API_PATH, payload);
        const result = response.data;
        showToast(`${managerForm.name.trim()} added. HRMS Login: ${result.hrmsLogin} | Password: ${result.hrmsPassword}`);
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

  const handleDeactivateEmployee = async (employeeId) => {
    const employee = employees.find((item) => item.id === employeeId);
    if (!employee) return;
    if (!window.confirm(`Mark ${employee.name} inactive? This keeps their records and related data.`)) return;
    const reason = window.prompt("Reason for deactivation (optional):", "") ?? null;
    if (reason === null) return;

    try {
      await updateEmployeeStatus(employeeId, "inactive", reason);
      setEmployees((prev) => prev.map((item) =>
        item.id === employeeId ? { ...item, status: "inactive" } : item
      ));
      showToast("Employee marked as inactive");
    } catch (error) {
      const message = error.response?.data?.message || error.message || "Mark inactive failed";
      showToast(`Mark inactive failed: ${message}`);
    }
  };

  const handleActivateEmployee = async (employeeId) => {
    const employee = employees.find((item) => item.id === employeeId);
    if (!employee || !window.confirm(`Activate ${employee.name}?`)) return;
    const reason = window.prompt("Reason for activation (optional):", "") ?? null;
    if (reason === null) return;

    try {
      await updateEmployeeStatus(employeeId, "active", reason);
      setEmployees((prev) => prev.map((item) =>
        item.id === employeeId ? { ...item, status: "active" } : item
      ));
      showToast(`${employee.name} activated`);
    } catch (error) {
      showToast(error.response?.data?.message || "Activation failed");
    }
  };

  const handleCopyPassword = async (password) => {
    try {
      await navigator.clipboard.writeText(password);
      showToast("Password copied to clipboard");
    } catch {
      showToast("Could not copy password");
    }
  };

  return (
    <div className="admin-employees-page manager-employees-page manager-portal-page">
      <div className="header">
        <div className="title">
          <h1>Employee Management</h1>
          <p>Manage employee profiles, departments, and status for {isOperationalManager ? "all branches" : branch}.</p>
        </div>

        <div className="header-actions">
          <button type="button" className="add-employee-btn" onClick={openAddModal}>
            <i className="fas fa-plus" /> Add Employee
          </button>
          {isOperationalManager ? (
            <div className="branch-selector">
              <i className="fas fa-store" />
              <select value={selectedBranch} onChange={(event) => setSelectedBranch(event.target.value)}>
                <option value="all">All Branches</option>
                <option value="Hyderabad">Hyderabad</option>
                <option value="Bangalore">Bangalore</option>
              </select>
            </div>
          ) : (
            <div className="branch-selector manager-branch-locked">
              <i className="fas fa-store" />
              <span>{branch}</span>
            </div>
          )}
        </div>
      </div>

      <div className="stats-row manager-stats-row">
        <div className="stat-card">
          <div className="stat-label">Total Employees</div>
          <div className="stat-number">{stats.total}</div>
          <div className="stat-trend">Your branch team</div>
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
          <div className="stat-trend">In your branch</div>
        </div>
      </div>

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
          <div className="loading-state">Loading employees...</div>
        ) : filteredEmployees.length === 0 ? (
          <div className="empty-state">No employees found</div>
        ) : (
          filteredEmployees.map((employee) => (
            <div key={employee.id} className="admin-employee-card">
              <div className="admin-card-header">
                <div className="admin-avatar">
                  {employee.initials || employee.name?.slice(0, 2)?.toUpperCase() || "E"}
                </div>

                <div className="admin-card-person">
                  <h4>{employee.name}</h4>
                  <div className="admin-role-line">
                    {employee.role === "Admin"
                      ? "MANAGER"
                      : employee.role === "Sub Admin"
                      ? "SUB ADMIN"
                      : employee.role === "Operational Manager"
                      ? "OPERATIONAL MANAGER"
                      : employee.role === "Super Admin"
                      ? "SUPER ADMIN"
                      : "EMPLOYEE"}
                    <span className={`admin-status-dot ${employee.status || "active"}`}>
                      {employee.status || "active"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="admin-card-details">
                <div>
                  <i className="fas fa-building" /> {employee.department || "-"}
                </div>
                <div>
                  <i className="fas fa-id-card" /> <span className="employee-id-chip">ID: {employee.empId || "-"}</span>
                </div>
                <div>
                  <i className="fas fa-code-branch" /> Dept Code: {employee.departmentCode || "-"}
                </div>
                <div>
                  <i className="fas fa-envelope" /> {employee.email || "-"}
                </div>
                <div>
                  <i className="fas fa-store" /> {employee.branch || branch}
                </div>
              </div>

              <button
                type="button"
                className="admin-full-details-btn"
                onClick={() => {
                  setSelectedEmployeeId(employee.id);
                  setDetailsOpen(true);
                }}
              >
                <i className="fas fa-file-alt" /> Full Details
              </button>
            </div>
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
        onFormChange={(nextForm) => setForm({ ...nextForm, branch: nextForm.branch || editableBranch, role: "Employee" })}
        onFormSave={handleSaveEmployee}
        onDetailsClose={() => {
          setDetailsOpen(false);
          setSelectedEmployeeId(null);
        }}
        onCopyPassword={handleCopyPassword}
        onEditEmployee={openEditModal}
        onDeactivateEmployee={handleDeactivateEmployee}
        onActivateEmployee={handleActivateEmployee}
      />

      <Toast message={toast.message} visible={toast.visible} />
    </div>
  );
}

export default ManagerEmployee;
