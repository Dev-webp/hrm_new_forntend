import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { SUB_ADMIN_NAV } from "../config/subAdminNav";
import { clearAuthSession } from "../utils/auth";
import logo from "../assets/logoimagefinally1.png";

export default function SubAdminSidebar() {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = () => {
    clearAuthSession();
    navigate("/");
  };

  return (
    <aside className={`sidebar${collapsed ? " collapsed" : ""}`}>
      <div className="sidebar-header logo-only-header">
        <img
          src={logo}
          alt="VJC Overseas"
          className="sidebar-logo-img"
          style={{
            borderRadius: "10px",
            width: "200px",
            height: "auto",
            objectFit: "contain",
          }}
        />
      </div>

      <div className="nav-section">
        {SUB_ADMIN_NAV.map((section) => (
          <div key={section.section}>
            <div className="nav-label sb-label">{section.section}</div>
            {section.items.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.end}
                className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
              >
                <i className={`fas ${item.icon}`} />
                <span className="sb-label">{item.label}</span>
              </NavLink>
            ))}
          </div>
        ))}

        <div className="nav-item">
          <i className="fas fa-user-shield" />
          <span className="sb-label">Sub Admin</span>
          <span className="secure-badge">
            <i className="fas fa-lock" /> SUB
          </span>
        </div>
      </div>

      <div className="sidebar-footer">
        <button type="button" className="nav-item" onClick={() => setCollapsed((c) => !c)}>
          <i className={`fas fa-chevron-${collapsed ? "right" : "left"}`} />
          <span className="sb-label collapse-text">Collapse</span>
        </button>

        <button type="button" className="nav-item" onClick={handleLogout}>
          <i className="fas fa-sign-out-alt" />
          <span className="sb-label">Logout</span>
        </button>
      </div>
    </aside>
  );
}
