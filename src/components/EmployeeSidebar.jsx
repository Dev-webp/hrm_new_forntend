import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { clearAuthSession } from "../utils/auth";
import { parseJwt } from "../utils/parseJwt";
import "../styles/EmployeeSidebar.css";

const NAV_ITEMS = [
  { id: "dashboard", path: "/employee/dashboard", icon: "fa-chart-line", label: "Dashboard" },
  { id: "attendance", path: "/employee/attendance", icon: "fa-calendar-check", label: "Attendance" },
  { id: "leave", path: "/employee/leave", icon: "fa-umbrella-beach", label: "Leave" },
  { id: "breaks", path: "/employee/breaks", icon: "fa-coffee", label: "Breaks" },
  { id: "payslip", path: "/employee/payslip", icon: "fa-file-invoice-dollar", label: "Payslip" },
];

export default function EmployeeSidebar({ activePage = "dashboard" }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const profile = useMemo(() => {
    const token = localStorage.getItem("token");
    const decoded = parseJwt(token) || {};
    const fullName =
      decoded.full_name || localStorage.getItem("full_name") || "Employee";
    const department =
      decoded.department || localStorage.getItem("department") || "";
    const initials = fullName
      .split(" ")
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
    return { fullName, department, initials };
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) navigate("/login");
  }, [navigate]);

  const handleLogout = () => {
    clearAuthSession();
    navigate("/login");
  };

  const isActive = (item) => {
    if (activePage) return item.id === activePage;
    return location.pathname === item.path;
  };

  return (
    <aside className={`sidebar employee-sidebar${collapsed ? " collapsed" : ""}`}>
      <div className="logo-area">
        <div className="brand-mark">V</div>
        <div className="logo-text">
          <h2>VJC OVERSEAS</h2>
          <p>Employee Workspace</p>
        </div>
      </div>

      <div className="emp-avatar-area">
        <div className="emp-avatar">{profile.initials}</div>
        <div className="emp-info">
          <div className="name">{profile.fullName}</div>
          <div className="dept">{profile.department}</div>
        </div>
      </div>

      <div className="nav-section">
        <div className="nav-label-group">Menu</div>
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`nav-item${isActive(item) ? " active" : ""}`}
            onClick={() => navigate(item.path)}
          >
            <i className={`fas ${item.icon}`} />
            <span>{item.label}</span>
          </button>
        ))}
      </div>

      <div className="sidebar-bottom">
        <button
          type="button"
          className="nav-item"
          onClick={() => setCollapsed((c) => !c)}
        >
          <i className={`fas fa-chevron-${collapsed ? "right" : "left"}`} />
          <span className="collapse-text">Collapse</span>
        </button>
        <button type="button" className="nav-item" onClick={handleLogout}>
          <i className="fas fa-sign-out-alt" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
