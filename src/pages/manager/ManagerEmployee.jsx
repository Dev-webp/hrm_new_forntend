import { useCallback, useEffect, useState } from "react";
import {
  createEmployee,
  deleteEmployee,
  fetchEmployeeById,
  fetchManagerEmployees,
  updateEmployee,
} from "../../services/managerApi";
import "./ManagerEmployee.css";

function escapeHtml(str) {
  return str
    ?.replace(/[&<>]/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[m])) || "";
}

function formatDate(dateStr) {
  if (!dateStr) return "N/A";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function generatePassword() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%";
  let pass = "";
  for (let i = 0; i < 10; i++) pass += chars.charAt(Math.floor(Math.random() * chars.length));
  return pass;
}

function getInitials(name) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function ManagerEmployee() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDept, setSelectedDept] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [toast, setToast] = useState("");
  const [managerProfile, setManagerProfile] = useState(null);

  const [formData, setFormData] = useState({
    full_name: "",
    designation: "",
    department: "Branch Manager",
    salary: "",
    email: "",
    password: "",
  });

  const branch = localStorage.getItem("branch") || "Hyderabad";
  const managerName = localStorage.getItem("full_name") || "Manager";

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  }, []);

  const loadEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchManagerEmployees({
        department: selectedDept,
        search: searchTerm,
      });
      setEmployees(data);
    } catch (err) {
      showToast(err.message);
    } finally {
      setLoading(false);
    }
  }, [selectedDept, searchTerm, showToast]);

  const handleDeptFilter = (dept) => {
    setSelectedDept(dept);
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleAddEmployee = () => {
    setEditingId(null);
    setFormData({
      full_name: "",
      designation: "",
      department: "Branch Manager",
      salary: "",
      email: "",
      password: generatePassword(),
    });
    setShowModal(true);
  };

  const handleEditEmployee = async (id) => {
    try {
      const emp = await fetchEmployeeById(id);
      setEditingId(id);
      setFormData({
        full_name: emp.full_name,
        designation: emp.designation || "",
        department: emp.department,
        salary: emp.salary,
        email: emp.email,
        password: "",
      });
      setShowModal(true);
    } catch (err) {
      showToast(err.message);
    }
  };

  const handleDeleteEmployee = async (id) => {
    if (!window.confirm("Delete this employee permanently?")) return;
    try {
      await deleteEmployee(id);
      showToast("Employee deleted");
      loadEmployees();
    } catch (err) {
      showToast(err.message);
    }
  };

  const handleShowDetails = async (id) => {
    try {
      const emp = await fetchEmployeeById(id);
      setSelectedEmployee(emp);
      setShowDetailsModal(true);
    } catch (err) {
      showToast("Could not load details: " + err.message);
    }
  };

  const handleSaveEmployee = async () => {
    const { full_name, designation, department, salary, email, password } = formData;
    if (!full_name || !department || !salary || !email) {
      showToast("Fill all required fields");
      return;
    }

    const payload = {
      full_name,
      designation,
      department,
      salary: parseFloat(salary),
      email,
      password: password || undefined,
    };

    try {
      if (editingId) {
        await updateEmployee(editingId, payload);
        showToast("Employee updated");
      } else {
        const result = await createEmployee(payload);
        showToast(`Employee added. HRMS Login: ${result.hrmsLogin} | Password: ${result.hrmsPassword}`);
      }
      setShowModal(false);
      loadEmployees();
    } catch (err) {
      showToast(err.message);
    }
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  const totalEmployees = employees.length;
  const activeEmployees = employees.filter((e) => e.status === "active").length;
  const deptCount = new Set(employees.map((e) => e.department)).size;

  return (
    <>
      <div className="main-content manager-portal-page manager-employees-page">
        <div className="header">
          <div className="title">
            <h1>
              Employee Management
            </h1>
            <p>
              Branch: <span>{branch}</span> · Your team
            </p>
          </div>
          <div className="controls-group">
            <div className="branch-pill">
              <i className="fas fa-store"></i> <span>{branch}</span>
            </div>
            <button className="add-employee-btn" onClick={handleAddEmployee}>
              <i className="fas fa-plus"></i> Add Employee
            </button>
          </div>
        </div>

        <div className="stats-row">
          <div className="stat-card">
            <div className="stat-label">Total Employees</div>
            <div className="stat-number">{totalEmployees}</div>
            <div className="stat-trend">Your branch team</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Active Employees</div>
            <div className="stat-number">{activeEmployees}</div>
            <div className="stat-trend">Currently active</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Inactive Employees</div>
            <div className="stat-number">{totalEmployees - activeEmployees}</div>
            <div className="stat-trend neutral">Require review</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Departments</div>
            <div className="stat-number">{deptCount}</div>
            <div className="stat-trend">In your branch</div>
          </div>
        </div>

        <div className="filter-bar">
          <div className="search-box">
            <i className="fas fa-search" style={{ color: "#FF8C00" }}></i>
            <input
              type="text"
              placeholder="Search by name, department, email..."
              value={searchTerm}
              onChange={handleSearch}
            />
          </div>
          <div className="dept-filters">
            {["all", "Branch Manager", "Reception", "Sales Team", "Process Team", "Accounts", "Digital Marketing Team", "IT Department"].map((dept) => (
              <div
                key={dept}
                className={`filter-chip ${selectedDept === dept ? "active" : ""}`}
                onClick={() => handleDeptFilter(dept)}
              >
                {dept === "all" ? "All Departments" : dept}
              </div>
            ))}
          </div>
        </div>

        <div className="employees-grid">
          {loading ? (
            <div style={{ textAlign: "center", padding: "40px" }}>
              <span className="spinner"></span> Loading employees...
            </div>
          ) : !employees.length ? (
            <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "60px" }}>
              No employees found
            </div>
          ) : (
            employees.map((emp) => (
              <div key={emp.id} className="employee-card">
                <div className="card-actions">
                  <button className="action-icon" onClick={() => handleEditEmployee(emp.id)}>
                    <i className="fas fa-pencil-alt"></i>
                  </button>
                  <button className="action-icon delete-icon" onClick={() => handleDeleteEmployee(emp.id)}>
                    <i className="fas fa-trash-alt"></i>
                  </button>
                </div>
                <div className="card-header">
                  <div className="avatar">{escapeHtml(emp.profile_initials || "E")}</div>
                  <div className="employee-info">
                    <h4>
                      {escapeHtml(emp.full_name)}{" "}
                      <span className="role-badge">
                        {emp.role === "MANAGER"
                          ? "Admin"
                          : emp.role === "SUPER_ADMIN"
                          ? "Super Admin"
                          : "Employee"}
                      </span>
                    </h4>
                    <div className="employee-dept">{escapeHtml(emp.designation || emp.role)}</div>
                  </div>
                </div>
                <div className="employee-details">
                  <div>
                    <i className="fas fa-building"></i> {escapeHtml(emp.department)}
                  </div>
                  <div>
                    <i className="fas fa-id-card"></i> ID: {escapeHtml(emp.employee_code)}
                  </div>
                  <div>
                    <i className="fas fa-envelope"></i> {escapeHtml(emp.email)}
                  </div>
                </div>
                <button className="full-details-btn" onClick={() => handleShowDetails(emp.id)}>
                  📄 Full Details
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {showModal && (
        <div className="modal" style={{ display: "flex" }}>
          <div className="modal-content">
            <h3>
              <i className="fas fa-user-plus"></i> {editingId ? "Edit Employee" : "Add Employee"}
            </h3>
            <div className="form-group">
              <label>Full Name</label>
              <input
                type="text"
                name="full_name"
                value={formData.full_name}
                onChange={handleInputChange}
                placeholder="e.g., John Doe"
              />
            </div>
            <div className="form-group">
              <label>Designation</label>
              <input
                type="text"
                name="designation"
                value={formData.designation}
                onChange={handleInputChange}
                placeholder="e.g., Team Lead"
              />
            </div>
            <div className="form-group">
              <label>Department</label>
              <select name="department" value={formData.department} onChange={handleInputChange}>
                <option value="Branch Manager">Branch Manager</option>
                <option value="Reception">Reception</option>
                <option value="Sales Team">Sales Team</option>
                <option value="Process Team">Process Team</option>
                <option value="Accounts">Accounts</option>
                <option value="Digital Marketing Team">Digital Marketing Team</option>
                <option value="IT Department">IT Department</option>
              </select>
            </div>
            <div className="form-group">
              <label>Branch</label>
              <input type="text" value={branch} readOnly style={{ background: "#EAF4FF" }} />
            </div>
            <div className="form-group">
              <label>Salary (INR)</label>
              <input
                type="number"
                name="salary"
                value={formData.salary}
                onChange={handleInputChange}
                placeholder="e.g., 50000"
              />
            </div>
            <div className="form-group">
              <label>Employee ID</label>
              <input
                type="text"
                value={editingId ? selectedEmployee?.employee_code : "Auto-generated"}
                readOnly
                style={{ background: "#EAF4FF" }}
              />
            </div>
            <div className="form-group">
              <label>HRMS Login Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="auto@company.com"
              />
            </div>
            <div className="form-group">
              <label>HRMS Password</label>
              <input
                type="text"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="Auto-generated"
              />
            </div>
            <div className="modal-actions">
              <button className="modal-btn cancel" onClick={() => setShowModal(false)}>
                Cancel
              </button>
              <button className="modal-btn" onClick={handleSaveEmployee}>
                Save Employee
              </button>
            </div>
          </div>
        </div>
      )}

      {showDetailsModal && selectedEmployee && (
        <div className="modal" style={{ display: "flex" }} onClick={() => setShowDetailsModal(false)}>
          <div className="modal-content" style={{ maxWidth: "720px" }} onClick={(e) => e.stopPropagation()}>
            <h3>
              <i className="fas fa-id-card"></i> Employee Full Details
            </h3>
            <div className="details-grid">
              <div className="section-title">
                <i className="fas fa-user-circle"></i> Personal Information
              </div>
              <div className="detail-item">
                <div className="detail-icon">
                  <i className="fas fa-user"></i>
                </div>
                <div className="detail-content">
                  <div className="detail-label">Full Name</div>
                  <div className="detail-value">{escapeHtml(selectedEmployee.full_name)}</div>
                </div>
              </div>
              <div className="detail-item">
                <div className="detail-icon">
                  <i className="fas fa-briefcase"></i>
                </div>
                <div className="detail-content">
                  <div className="detail-label">Designation</div>
                  <div className="detail-value">{escapeHtml(selectedEmployee.designation || "—")}</div>
                </div>
              </div>
              <div className="detail-item">
                <div className="detail-icon">
                  <i className="fas fa-id-card"></i>
                </div>
                <div className="detail-content">
                  <div className="detail-label">Employee ID</div>
                  <div className="detail-value">{escapeHtml(selectedEmployee.employee_code)}</div>
                </div>
              </div>
              <div className="detail-item">
                <div className="detail-icon">
                  <i className="fas fa-envelope"></i>
                </div>
                <div className="detail-content">
                  <div className="detail-label">Email (HRMS Login)</div>
                  <div className="detail-value">{escapeHtml(selectedEmployee.email)}</div>
                </div>
              </div>
              <div className="detail-item">
                <div className="detail-icon">
                  <i className="fas fa-venus-mars"></i>
                </div>
                <div className="detail-content">
                  <div className="detail-label">Role</div>
                  <div className="detail-value">
                    {selectedEmployee.role === "MANAGER"
                      ? "Admin (Manager)"
                      : selectedEmployee.role === "SUPER_ADMIN"
                      ? "Super Admin"
                      : "Employee"}{" "}
                    <span className="sensitive-badge">
                      {selectedEmployee.role === "MANAGER" ? "Branch Access" : "Restricted"}
                    </span>
                  </div>
                </div>
              </div>
              <div className="detail-item">
                <div className="detail-icon">
                  <i className="fas fa-circle"></i>
                </div>
                <div className="detail-content">
                  <div className="detail-label">Status</div>
                  <div className="detail-value">
                    {selectedEmployee.status === "active" ? (
                      <span style={{ color: "#16A34A" }}>● Active</span>
                    ) : (
                      <span style={{ color: "#F87171" }}>● Inactive</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="section-title">
                <i className="fas fa-building"></i> Employment & Branch
              </div>
              <div className="detail-item">
                <div className="detail-icon">
                  <i className="fas fa-store"></i>
                </div>
                <div className="detail-content">
                  <div className="detail-label">Branch</div>
                  <div className="detail-value">{escapeHtml(selectedEmployee.branch)}</div>
                </div>
              </div>
              <div className="detail-item">
                <div className="detail-icon">
                  <i className="fas fa-chalkboard-user"></i>
                </div>
                <div className="detail-content">
                  <div className="detail-label">Department</div>
                  <div className="detail-value">{escapeHtml(selectedEmployee.department)}</div>
                </div>
              </div>
              <div className="detail-item">
                <div className="detail-icon">
                  <i className="fas fa-dollar-sign"></i>
                </div>
                <div className="detail-content">
                  <div className="detail-label">Salary (INR)</div>
                  <div className="detail-value">${Number(selectedEmployee.salary).toLocaleString()}</div>
                </div>
              </div>
              <div className="detail-item">
                <div className="detail-icon">
                  <i className="fas fa-calendar-alt"></i>
                </div>
                <div className="detail-content">
                  <div className="detail-label">Joining Date</div>
                  <div className="detail-value">{formatDate(selectedEmployee.joining_date)}</div>
                </div>
              </div>

              <div className="section-title">
                <i className="fas fa-university"></i> Bank Details
              </div>
              <div className="detail-item">
                <div className="detail-icon">
                  <i className="fas fa-university"></i>
                </div>
                <div className="detail-content">
                  <div className="detail-label">Bank Name</div>
                  <div className="detail-value">{escapeHtml(selectedEmployee.bank_name || "—")}</div>
                </div>
              </div>
              <div className="detail-item">
                <div className="detail-icon">
                  <i className="fas fa-credit-card"></i>
                </div>
                <div className="detail-content">
                  <div className="detail-label">Account Number</div>
                  <div className="detail-value">{escapeHtml(selectedEmployee.bank_account || "—")}</div>
                </div>
              </div>
              <div className="detail-item">
                <div className="detail-icon">
                  <i className="fas fa-code-branch"></i>
                </div>
                <div className="detail-content">
                  <div className="detail-label">IFSC Code</div>
                  <div className="detail-value">{escapeHtml(selectedEmployee.bank_ifsc || "—")}</div>
                </div>
              </div>
            </div>
            <div className="modal-actions">
              <button className="modal-btn cancel" onClick={() => setShowDetailsModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="toast-msg show">{toast}</div>}
    </>
  );
}
