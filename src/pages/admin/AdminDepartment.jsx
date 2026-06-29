import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createDepartment,
  deleteDepartment,
  fetchBranches,
  fetchDepartments,
  updateDepartment,
  updateDepartmentStatus,
} from "../../services/departmentApi";
import "./AdminDepartment.css";

const EMPTY_FORM = {
  name: "",
  code: "",
  description: "",
  branch: "All",
  status: "active",
};

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

function normalizeCode(value) {
  return value.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 30).toUpperCase();
}

export default function AdminDepartment() {
  const [departments, setDepartments] = useState([]);
  const [branches, setBranches] = useState([]);
  const [branchFilter, setBranchFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedDate, setSelectedDate] = useState(todayDate());
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [codeEdited, setCodeEdited] = useState(false);

  const showToast = useCallback((message, type = "success") => {
    setToast({ show: true, message, type });
    window.setTimeout(() => setToast({ show: false, message: "", type }), 3000);
  }, []);

  const loadBranches = useCallback(async () => {
    try {
      const data = await fetchBranches();
      setBranches(data.map((branch) => branch.name).filter(Boolean));
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to load branches", "error");
    }
  }, [showToast]);

  const loadDepartments = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchDepartments({
        branch: branchFilter,
        status: statusFilter,
        search,
        date: selectedDate,
      });
      setDepartments(data);
    } catch (err) {
      const message = err.response?.data?.message || err.message || "Failed to load departments";
      setError(message);
      setDepartments([]);
    } finally {
      setLoading(false);
    }
  }, [branchFilter, statusFilter, search, selectedDate]);

  useEffect(() => {
    loadBranches();
  }, [loadBranches]);

  useEffect(() => {
    loadDepartments();
  }, [loadDepartments]);

  const summary = useMemo(() => {
    const totalEmployees = departments.reduce(
      (sum, department) => sum + Number(department.employees || 0),
      0
    );
    return {
      total: departments.length,
      active: departments.filter((department) => department.status === "active").length,
      inactive: departments.filter((department) => department.status === "inactive").length,
      employees: totalEmployees,
      present: departments.reduce((sum, department) => sum + Number(department.present || 0), 0),
      absent: departments.reduce((sum, department) => sum + Number(department.absent || 0), 0),
    };
  }, [departments]);

  const openAddModal = () => {
    setEditingDepartment(null);
    setForm(EMPTY_FORM);
    setCodeEdited(false);
    setModalOpen(true);
  };

  const openEditModal = (department) => {
    setEditingDepartment(department);
    setForm({
      name: department.name || "",
      code: department.code || "",
      description: department.description || "",
      branch: department.branch || "All",
      status: department.status || "active",
    });
    setCodeEdited(true);
    setModalOpen(true);
  };

  const handleNameChange = (value) => {
    setForm((prev) => ({
      ...prev,
      name: value,
      code: editingDepartment || codeEdited ? prev.code : normalizeCode(value),
    }));
  };

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.code.trim()) {
      showToast("Department name and code are required", "error");
      return;
    }

    setSaving(true);
    try {
      if (editingDepartment) {
        await updateDepartment(editingDepartment.id, form);
        showToast("Department updated");
      } else {
        await createDepartment(form);
        showToast("Department created");
      }
      setModalOpen(false);
      await loadDepartments();
    } catch (err) {
      showToast(err.response?.data?.message || err.message || "Save failed", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleStatusToggle = async (department) => {
    const nextStatus = department.status === "active" ? "inactive" : "active";
    const confirmed = window.confirm(
      `${nextStatus === "inactive" ? "Deactivate" : "Activate"} ${department.name}?`
    );
    if (!confirmed) return;

    try {
      await updateDepartmentStatus(department.id, nextStatus);
      showToast(`Department ${nextStatus}`);
      await loadDepartments();
    } catch (err) {
      showToast(err.response?.data?.message || "Status update failed", "error");
    }
  };

  const handleDelete = async (department) => {
    const confirmed = window.confirm(
      `Delete ${department.name}? This is only allowed when no employees are assigned.`
    );
    if (!confirmed) return;

    try {
      await deleteDepartment(department.id);
      showToast("Department deleted");
      await loadDepartments();
    } catch (err) {
      showToast(err.response?.data?.message || "Delete failed", "error");
    }
  };

  return (
    <div className="admin-department-page admin-portal-page">
      <div className="department-page-header">
        <div>
          <h1>
            <i className="fas fa-building" /> Departments
          </h1>
          <p>Manage department names used by employees, attendance, payroll, and reports.</p>
        </div>
        <button type="button" className="department-primary-btn" onClick={openAddModal}>
          <i className="fas fa-plus" /> Add Department
        </button>
      </div>

      <div className="department-kpi-grid">
        <div className="department-kpi">
          <span>Total Departments</span>
          <strong>{loading ? "-" : summary.total}</strong>
        </div>
        <div className="department-kpi success">
          <span>Active</span>
          <strong>{loading ? "-" : summary.active}</strong>
        </div>
        <div className="department-kpi danger">
          <span>Inactive</span>
          <strong>{loading ? "-" : summary.inactive}</strong>
        </div>
        <div className="department-kpi">
          <span>Assigned Employees</span>
          <strong>{loading ? "-" : summary.employees}</strong>
        </div>
        <div className="department-kpi success">
          <span>Present</span>
          <strong>{loading ? "-" : summary.present}</strong>
        </div>
        <div className="department-kpi danger">
          <span>Absent</span>
          <strong>{loading ? "-" : summary.absent}</strong>
        </div>
      </div>

      <div className="department-toolbar">
        <div className="department-search">
          <i className="fas fa-search" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search department or code"
          />
        </div>
        <select value={branchFilter} onChange={(event) => setBranchFilter(event.target.value)}>
          <option value="all">All Branches</option>
          <option value="All">Shared (All)</option>
          {branches.map((branch) => (
            <option key={branch} value={branch}>
              {branch}
            </option>
          ))}
        </select>
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <input
          type="date"
          value={selectedDate}
          onChange={(event) => setSelectedDate(event.target.value || todayDate())}
          aria-label="Attendance date"
        />
      </div>

      <div className="department-table-card">
        {error ? <div className="department-alert error">{error}</div> : null}
        <table className="department-table">
          <thead>
            <tr>
              <th>Department</th>
              <th>Code</th>
              <th>Branch</th>
              <th>Status</th>
              <th>Employees</th>
              <th>Present</th>
              <th>Absent</th>
              <th>Description</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} className="department-empty">Loading departments...</td>
              </tr>
            ) : departments.length === 0 ? (
              <tr>
                <td colSpan={9} className="department-empty">
                  No departments found. Add a department to start using dynamic HRMS filters.
                </td>
              </tr>
            ) : (
              departments.map((department) => (
                <tr key={department.id}>
                  <td>
                    <strong>{department.name}</strong>
                  </td>
                  <td>{department.code}</td>
                  <td>{department.branch || "All"}</td>
                  <td>
                    <span className={`department-status ${department.status}`}>
                      {department.status}
                    </span>
                  </td>
                  <td>{department.employees || 0}</td>
                  <td className="department-present-count">{department.present || 0}</td>
                  <td className="department-absent-count">{department.absent || 0}</td>
                  <td className="department-description">
                    {department.description || "-"}
                  </td>
                  <td>
                    <div className="department-actions">
                      <button type="button" onClick={() => openEditModal(department)} title="Edit">
                        <i className="fas fa-pen" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStatusToggle(department)}
                        title={department.status === "active" ? "Deactivate" : "Activate"}
                      >
                        <i className={`fas fa-${department.status === "active" ? "toggle-on" : "toggle-off"}`} />
                      </button>
                      <button
                        type="button"
                        className="danger"
                        onClick={() => handleDelete(department)}
                        title="Delete"
                      >
                        <i className="fas fa-trash" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {modalOpen ? (
        <div className="department-modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="department-modal" onClick={(event) => event.stopPropagation()}>
            <h2>{editingDepartment ? "Edit Department" : "Add Department"}</h2>
            <div className="department-form-grid">
              <label>
                Department Name
                <input
                  value={form.name}
                  onChange={(event) => handleNameChange(event.target.value)}
                  placeholder="e.g., Client Success"
                />
              </label>
              <label>
                Code
                <input
                  value={form.code}
                  onChange={(event) => {
                    setCodeEdited(true);
                    setForm((prev) => ({ ...prev, code: normalizeCode(event.target.value) }));
                  }}
                  placeholder="SALES"
                />
              </label>
              <label>
                Branch
                <select
                  value={form.branch}
                  onChange={(event) => setForm((prev) => ({ ...prev, branch: event.target.value }))}
                >
                  <option value="All">All Branches</option>
                  {branches.map((branch) => (
                    <option key={branch} value={branch}>
                      {branch}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Status
                <select
                  value={form.status}
                  onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </label>
              <label className="full">
                Description
                <textarea
                  value={form.description}
                  onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                  rows={3}
                  placeholder="Optional department description"
                />
              </label>
            </div>
            <div className="department-modal-actions">
              <button type="button" className="secondary" onClick={() => setModalOpen(false)}>
                Cancel
              </button>
              <button type="button" onClick={handleSubmit} disabled={saving}>
                {saving ? "Saving..." : "Save Department"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className={`department-toast ${toast.show ? "show" : ""} ${toast.type}`}>
        {toast.message}
      </div>
    </div>
  );
}
