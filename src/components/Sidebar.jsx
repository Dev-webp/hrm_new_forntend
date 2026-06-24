import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { ADMIN_NAV } from "../config/adminNav";
import { clearAuthSession } from "../utils/auth";
import NotificationBadge from "./NotificationBadge";
import logo from "../assets/logoimagefinally1.png";

function Sidebar({ role = "admin" }) {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const navSections = role === "admin" ? ADMIN_NAV : [];

  const handleLogout = () => {
    clearAuthSession();
    navigate("/");
  };

  const toggleCollapse = () => {
    setCollapsed((prev) => !prev);
  };

  return (
    <aside className={`sidebar${collapsed ? " collapsed" : ""}`}>
     <div className="sidebar-header logo-only-header">
  <img
    src={logo}
    alt="VJC Overseas"
    style={{
      width: "200px",
      height: "auto",
      borderRadius: "10px",
      objectFit: "contain",
      padding: "4px"
    }}
  />
</div>

      <div className="nav-section">
        {navSections.map((section) => (
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
{item.path.includes("notifications") ? (
  <NotificationBadge type="notifications" />
) : item.path.includes("leave") ? (
  <NotificationBadge type="leaves" />
) : item.path.includes("activity-logs") ? (
  <NotificationBadge type="activityLogs" />
) : null}

              </NavLink>
            ))}
          </div>
        ))}

        {role === "admin" && (
          <div className="nav-item">
            <i className="fas fa-shield-alt" />
            <span className="sb-label">Super Admin</span>
            <span className="secure-badge">
              <i className="fas fa-lock" /> SA
            </span>
          </div>
        )}
      </div>

      <div className="sidebar-footer">
        <button type="button" className="nav-item" onClick={toggleCollapse}>
          <i
            className={`fas fa-chevron-${collapsed ? "right" : "left"}`}
          />
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

export default Sidebar;
