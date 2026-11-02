import { useState, useMemo } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { NAV_MODULES, ROLE_BASE_PATH } from "../config/navConfig";
import { MANAGER_NAV } from "../config/managerNav";
import { SUB_ADMIN_NAV } from "../config/subAdminNav";
import { OPERATIONAL_MANAGER_NAV } from "../config/operationalManagerNav";
import { clearAuthSession } from "../utils/auth";
import NotificationBadge from "./NotificationBadge";
import { useOpsAuth } from "../context/OpsAuthContext";
import logo from "../assets/logo.png";

function Sidebar({ role = "admin" }) {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [hoveredMenu, setHoveredMenu] = useState(null);
  const opsAuth = useOpsAuth();

  // Get user from localStorage to check permissions
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const hasInvoiceAccess = user.invoice_access === true;
  const hasOpsAccess = user.ops_access === true;

  // Use role-specific navigation config
  let navSections;
  if (role === "admin") {
    navSections = NAV_MODULES;
  } else if (role === "manager") {
    navSections = MANAGER_NAV;
  } else if (role === "sub-admin") {
    navSections = SUB_ADMIN_NAV;
  } else if (role === "operational-manager") {
    navSections = OPERATIONAL_MANAGER_NAV;
  } else {
    navSections = NAV_MODULES; // fallback
  }

  // Memoize nav sections to prevent re-filtering on every render
  const memoizedNavSections = useMemo(() => {
    return navSections.map(section => {
      // Skip OPS section entirely if user doesn't have OPS access
      if (section.module === "OPS" && !hasOpsAccess) {
        return null;
      }

      // Skip Finance section if user doesn't have Invoice access
      if (section.module === "Finance" && !hasInvoiceAccess) {
        return null;
      }

      return {
        ...section,
        items: section.items.filter(item => {
          // Skip if item requires a role the user doesn't have
          if (item.roles && !item.roles.includes(role)) {
            return false;
          }

          // Skip if item requires Invoice access but user doesn't have it
          if (item.invoicePermission && !hasInvoiceAccess) {
            return false;
          }

          // OPS access control
          if (section.module === "OPS") {
            // Skip if user doesn't have OPS access
            if (item.opsAccess && !hasOpsAccess) {
              return false;
            }
            // If item requires a specific OPS section, check if user has access
            if (item.opsSection) {
              if (!opsAuth.ready || !opsAuth.allowedSections.includes(item.opsSection)) {
                return false;
              }
            }
            // If item is for entry/retry (opsEntry), show only when not ready
            if (item.opsEntry) {
              if (opsAuth.ready) {
                return false;
              }
            }
          }

          return true;
        })
      };
    }).filter(Boolean);
  }, [navSections, role, hasInvoiceAccess, hasOpsAccess, opsAuth]);

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
    loading="lazy"
    style={{
      width: "180px",
      height: "auto",
      borderRadius: "8px",
      objectFit: "contain",
      padding: "4px"
    }}
  />
</div>

      <div className="nav-section">
        {memoizedNavSections.map((section) => {
          // Handle old-style config (managerNav, subAdminNav) with "section" and "items"
          if (section.section) {
            return (
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
                  </NavLink>
                ))}
              </div>
            );
          }

          // Handle new-style config (navConfig) with "module" and "items"
          // Skip OPS section entirely if user doesn't have OPS access
          if (section.module === "OPS" && !hasOpsAccess) {
            return null;
          }

          // Skip Finance section if user doesn't have Invoice access
          if (section.module === "Finance" && !hasInvoiceAccess) {
            return null;
          }

          return (
            <div key={section.module}>
              <div className="nav-label sb-label">{section.module}</div>

              {section.items.map((item) => {
                // Skip if item requires a role the user doesn't have
                if (item.roles && !item.roles.includes(role)) {
                  return null;
                }

                // Skip if item requires Invoice access but user doesn't have it
                if (item.invoicePermission && !hasInvoiceAccess) {
                  return null;
                }

                // OPS access control
                if (section.module === "OPS") {
                  // Skip if user doesn't have OPS access
                  if (item.opsAccess && !hasOpsAccess) {
                    return null;
                  }
                  // If item requires a specific OPS section, check if user has access
                  if (item.opsSection) {
                    if (!opsAuth.ready || !opsAuth.allowedSections.includes(item.opsSection)) {
                      return null;
                    }
                  }
                  // If item is for entry/retry (opsEntry), show only when not ready
                  if (item.opsEntry) {
                    if (opsAuth.ready) {
                      return null;
                    }
                  }
                }

                // Filter subitems based on permissions
                const hasChildren = (item.children && item.children.length > 0) || (item.subItems && item.subItems.length > 0);
                const children = item.children || item.subItems || [];
                const filteredChildren = children.filter(child => {
                  // Check role
                  if (child.roles && !child.roles.includes(role)) {
                    return false;
                  }
                  // Check Invoice permission
                  if (child.invoicePermission && !hasInvoiceAccess) {
                    return false;
                  }
                  // Check OPS section
                  if (child.opsSection && !hasOpsAccess) {
                    return false;
                  }
                  return true;
                });

                // Don't show parent if all children are filtered out
                if (hasChildren && filteredChildren.length === 0) {
                  return null;
                }

                const isPlaceholder = item.slug === '#';
                const to = item.absolute ? item.slug : `${ROLE_BASE_PATH[role] || '/admin'}${item.slug}`;

                return (
                  <div
                    key={item.slug}
                    className="nav-item-wrapper"
                    onMouseEnter={() => hasChildren && setHoveredMenu(item.slug)}
                    onMouseLeave={() => setHoveredMenu(null)}
                  >
                    <NavLink
                      to={isPlaceholder ? '#' : to}
                      end={item.end}
                      className={({ isActive }) =>
                        `nav-item${isActive && !isPlaceholder ? " active" : ""}`
                      }
                      onClick={(e) => {
                        if (hasChildren || isPlaceholder) {
                          e.preventDefault();
                        }
                      }}
                      style={{ cursor: hasChildren || isPlaceholder ? 'default' : 'pointer' }}
                    >
                      <i className={`fas ${item.icon}`} />
                    <span className="sb-label">{item.label}</span>
                    {hasChildren && <i className="fas fa-chevron-right submenu-arrow" />}
                    {item.slug.includes("notifications") ? (
                      <NotificationBadge type="notifications" />
                    ) : item.slug.includes("leave") ? (
                      <NotificationBadge type="leaves" />
                    ) : item.slug.includes("activity-logs") ? (
                      <NotificationBadge type="activityLogs" />
                    ) : null}
                  </NavLink>

                    {hasChildren && (
                      <div className="submenu" style={{ display: hoveredMenu === item.slug ? 'block' : 'none' }}>
                        {filteredChildren.map((child) => {
                          const childTo = child.absolute ? child.slug : `${ROLE_BASE_PATH[role] || '/admin'}${child.slug}`;
                          return (
                            <NavLink
                              key={child.slug}
                              to={childTo}
                              end={child.end}
                              className={({ isActive }) =>
                                `submenu-item${isActive ? " active" : ""}`
                              }
                            >
                              <i className={`fas ${child.icon}`} />
                              <span>{child.label}</span>
                            </NavLink>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}

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
