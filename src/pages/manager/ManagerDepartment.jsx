import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchDepartments } from "../../services/departmentApi";
import { getAuthToken } from "../../utils/auth";
import "../../styles/ManagerDepartment.css";

function formatDateDisplay(dateStr) {
  if (!dateStr) return "";
  return dateStr.split("-").reverse().join("/");
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function ManagerDepartment() {
  const navigate = useNavigate();
  const token = getAuthToken();
  const branch = localStorage.getItem("branch") || "Hyderabad";

  const [currentDate, setCurrentDate] = useState(todayStr);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState({ show: false, message: "" });

  const showToast = useCallback((message) => {
    setToast({ show: true, message });
    window.setTimeout(() => setToast({ show: false, message: "" }), 2800);
  }, []);

  const loadDepartments = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await fetchDepartments({
        date: currentDate,
        branch,
      });
      setDepartments(data);
    } catch (err) {
      const message =
        err.response?.data?.message ||
        err.message ||
        "Failed to load departments";
      setError(message);
      showToast(`Error: ${message}`);
    } finally {
      setLoading(false);
    }
  }, [branch, currentDate, showToast]);

  useEffect(() => {
    if (!token) {
      navigate("/");
      return;
    }
    loadDepartments();
  }, [token, navigate, loadDepartments]);

  const handleDateChange = (event) => {
    setCurrentDate(event.target.value);
  };

  const dateDisplay = formatDateDisplay(currentDate);
  const branchBadge = `${branch} Branch`;

  return (
    <>
      <main className="main-content manager-department-page">
        <div className="page-header">
          <div className="title">
            <h1>
              <i className="fas fa-chalkboard-user" /> Department Operations
            </h1>
            <p>
              Live attendance · <span>{branch}</span> · <span>{dateDisplay}</span>
            </p>
          </div>
          <div className="date-picker-wrapper">
            <i className="fas fa-calendar-day" />
            <input
              type="date"
              id="attendanceDate"
              value={currentDate}
              onChange={handleDateChange}
            />
          </div>
        </div>

        <div className="stats-badge">
          <i className="fas fa-building" /> {departments.length} departments ·{" "}
          <span>{branchBadge}</span>
        </div>

        <div className="dept-grid" id="deptGrid">
          {loading ? (
            <div className="empty-state">
              <span className="spinner" />
              <p style={{ marginTop: "16px" }}>Loading departments...</p>
            </div>
          ) : error ? (
            <div className="empty-state">Error: {error}</div>
          ) : !departments.length ? (
            <div className="empty-state">
              <i
                className="fas fa-building"
                style={{ fontSize: "3rem", opacity: 0.3 }}
              />
              <p style={{ marginTop: "16px" }}>
                No departments found for {branch} on {currentDate}
              </p>
            </div>
          ) : (
            departments.map((dept) => (
              <div className="glass-card" key={dept.name}>
                <div className="dept-header">
                  <div className="dept-name">{dept.name}</div>
                  <span className="dept-code">{dept.code}</span>
                </div>
                <div className="employee-count">
                  {dept.employees}{" "}
                  {dept.employees === 1 ? "Employee" : "Employees"}
                </div>
                <div className="attendance-stats">
                  <div className="present-box">
                    <div className="att-label">
                      <i className="fas fa-user-check" /> Present ({dateDisplay})
                    </div>
                    <div className="att-num">{dept.present || 0}</div>
                  </div>
                  <div className="absent-box">
                    <div className="att-label">
                      <i className="fas fa-user-times" /> Absent
                    </div>
                    <div className="att-num">{dept.absent || 0}</div>
                  </div>
                </div>
                {dept.head ? (
                  <div className="dept-head">
                    <i className="fas fa-user-tie" /> Head: {dept.head}
                  </div>
                ) : null}
              </div>
            ))
          )}
        </div>
      </main>

      <div className={`mgr-dept-toast${toast.show ? " show" : ""}`}>
        {toast.message}
      </div>
    </>
  );
}
