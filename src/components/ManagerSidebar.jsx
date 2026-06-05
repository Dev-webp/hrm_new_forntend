import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { MANAGER_NAV } from "../config/managerNav";
import { clearAuthSession } from "../utils/auth";
import NotificationBadge from "./NotificationBadge";


function ManagerSidebar() {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = () => {
    clearAuthSession();
    navigate("/");
  };

  return (
    <aside className={`sidebar${collapsed ? " collapsed" : ""}`}>
      <div className="sidebar-header">
        <h2>VJC OVERSEAS</h2>
        <p className="sb-label">IMMIGRATION &amp; VISA</p>
      </div>

      <div className="nav-section">
        {MANAGER_NAV.map((section) => (
          <div key={section.section}>
            <div className="nav-label sb-label">{section.section}</div>

            {section.items.map((item) => (
           <NavLink
  key={item.path}
  to={item.path}
  end={item.end}
  className={({ isActive }) =>
    `nav-item${isActive ? " active" : ""}`
  }
>
  <i className={`fas ${item.icon}`} />
  <span className="sb-label">{item.label}</span>

{item.path.includes("notifications") || item.path.includes("leave") ? (
  <NotificationBadge />
) : null}
</NavLink>
            ))}
          </div>
        ))}

        <div className="nav-item">
          <i className="fas fa-shield-alt" />
          <span className="sb-label">Manager</span>
          <span className="secure-badge">
            <i className="fas fa-lock" /> MGR
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

export default ManagerSidebar;
