import { useState, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { NAV_MODULES, ROLE_BASE_PATH } from "../config/navConfig";
import { clearAuthSession, getStoredUser } from "../utils/auth";
import logo from "../assets/logoimagefinally1.png";

export default function SubAdminSidebar() {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [navItems, setNavItems] = useState([]);

  useEffect(() => {
    const user = getStoredUser();
    console.log("[SubAdminSidebar] User data:", user);
    const role = user?.role || "sub-admin";
    const basePath = ROLE_BASE_PATH[role] || "/sub-admin";
    const invoiceAccess = user?.invoice_access || false;
    const invoicePermissions = user?.invoice_permissions || {};
    const opsAccess = user?.ops_access || false;
    const opsPermissions = user?.ops_permissions || {};

    console.log("[SubAdminSidebar] Permissions:", {
      role,
      invoiceAccess,
      invoicePermissions,
      opsAccess,
      opsPermissions
    });

    const filteredModules = NAV_MODULES.filter((module) => {
      return module.items.some((item) => {
        // Check if role is allowed
        if (!item.roles.includes(role)) return false;

        // Check invoice permission if required
        if (item.invoicePermission && !invoicePermissions[item.invoicePermission]) {
          return false;
        }

        // Check ops access if required
        if (item.opsAccess && !opsAccess) {
          return false;
        }

        // Check ops section permission if required
        if (item.opsSection && opsPermissions[item.opsSection] !== true) {
          return false;
        }

        return true;
      });
    }).map((module) => ({
      section: module.module,
      items: module.items.filter((item) => {
        // Check if role is allowed
        if (!item.roles.includes(role)) return false;

        // Check invoice permission if required
        if (item.invoicePermission && !invoicePermissions[item.invoicePermission]) {
          return false;
        }

        // Check ops access if required
        if (item.opsAccess && !opsAccess) {
          return false;
        }

        // Check ops section permission if required
        if (item.opsSection && opsPermissions[item.opsSection] !== true) {
          return false;
        }

        return true;
      }).map((item) => ({
        path: item.absolute ? item.slug : `${basePath}${item.slug}`,
        icon: item.icon,
        label: item.label,
        end: false,
        subItems: item.subItems?.filter((subItem) => {
          if (!subItem.roles.includes(role)) return false;
          if (subItem.invoicePermission && !invoicePermissions[subItem.invoicePermission]) {
            return false;
          }
          if (subItem.opsAccess && !opsAccess) return false;
          if (subItem.opsSection && opsPermissions[subItem.opsSection] !== true) {
            return false;
          }
          return true;
        }).map((subItem) => ({
          path: subItem.absolute ? subItem.slug : `${basePath}${subItem.slug}`,
          icon: subItem.icon,
          label: subItem.label,
        }))
      }))
    }));

    console.log("[SubAdminSidebar] Filtered modules:", filteredModules);
    setNavItems(filteredModules);
  }, []);

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
        {navItems.map((section) => (
          <div key={section.section}>
            <div className="nav-label sb-label">{section.section}</div>
            {section.items.map((item) => (
              <div key={item.path}>
                <NavLink
                  to={item.path}
                  end={item.end}
                  className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
                >
                  <i className={`fas ${item.icon}`} />
                  <span className="sb-label">{item.label}</span>
                </NavLink>
                {item.subItems && item.subItems.length > 0 && (
                  <div className="nav-subitems">
                    {item.subItems.map((subItem) => (
                      <NavLink
                        key={subItem.path}
                        to={subItem.path}
                        className={({ isActive }) => `nav-item nav-subitem${isActive ? " active" : ""}`}
                      >
                        <i className={`fas ${subItem.icon}`} />
                        <span className="sb-label">{subItem.label}</span>
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
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
