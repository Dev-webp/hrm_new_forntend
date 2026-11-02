import { useState, useMemo, useCallback } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { NAV_MODULES, ROLE_BASE_PATH } from "../config/navConfig";
import { MANAGER_NAV } from "../config/managerNav";
import { SUB_ADMIN_NAV } from "../config/subAdminNav";
import { OPERATIONAL_MANAGER_NAV } from "../config/operationalManagerNav";
import { clearAuthSession, getStoredUser } from "../utils/auth";
import { useInvoiceAuth } from "../context/InvoiceAuthContext";
import { useOpsAuth } from "../context/OpsAuthContext";
import { hasProfile } from "../modules/ops/Shared";
import AssignmentNotifier from "./AssignmentNotifier";
import NotificationBadge from "./NotificationBadge";
import logo from "../assets/logoimagefinally1.png";

// Replaces Sidebar.jsx, ManagerSidebar.jsx, OperationalManagerSidebar.jsx,
// and SubAdminSidebar.jsx. One component, driven by navConfig.js.
//
// Visibility is composed from TWO independent signals:
//   1. HRMS role (item.roles)               — from the HRMS JWT
//   2. Invoice's own per-user permissions    — from the SSO-exchanged
//      (item.invoicePermission)                Invoice token, fetched once
//                                               at login via InvoiceAuthContext
// A CRM/Finance item only shows if BOTH checks pass, so two managers with
// the same HRMS role can see different Finance items based on what their
// individual Invoice account is actually permitted to do.
function UnifiedSidebar({ role = "admin" }) {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [expandedItems, setExpandedItems] = useState(new Set());
  const basePath = ROLE_BASE_PATH[role] || "/admin";
  const { user: invoiceUser } = useInvoiceAuth();
  const invoicePermissions = invoiceUser?.permissions || {};
  const ops = useOpsAuth();
  const location = useLocation();

  // Safe user retrieval with fallback
  const storedUser = useMemo(() => {
    try {
      return getStoredUser() || {};
    } catch (error) {
      console.error('[UnifiedSidebar] Error retrieving stored user:', error);
      return {};
    }
  }, []);

  const toggleExpand = useCallback((slug) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(slug)) {
        newSet.delete(slug);
      } else {
        // Clear all other expanded items and only keep the new one
        newSet.clear();
        newSet.add(slug);
      }
      return newSet;
    });
  }, []);

  const handleLogout = useCallback(() => {
    try {
      clearAuthSession();
      navigate("/");
    } catch (error) {
      console.error('[UnifiedSidebar] Error during logout:', error);
      // Force redirect even if logout fails
      navigate("/");
    }
  }, [navigate]);

  // Memoized visibility check for performance
  const itemIsVisible = useCallback((item) => {
    try {
      // Handle old-style config items (with path instead of slug)
      if (item.path) {
        return true; // Old-style items are always visible for their role
      }

      if (!item || !item.roles || !Array.isArray(item.roles)) return false;
      if (!item.roles.includes(role)) return false;

      // Handle OPS items with subItems (parent items)
      if (item.subItems && Array.isArray(item.subItems) && item.subItems.length > 0) {
        // Check if any sub-item is an OPS item and is allowed
        const hasAllowedOpsSubItem = item.subItems.some(subItem => {
          if (subItem.opsAccess && storedUser?.ops_access !== true) return false;
          if (subItem.opsEntry) return ops?.enabled && !ops?.ready;
          if (subItem.opsSection) return ops?.ready && ops?.allowedSections?.includes(subItem.opsSection);
          return true;
        });

        // If parent has opsAccess, check if any sub-item is allowed
        if (item.opsAccess) {
          return hasAllowedOpsSubItem;
        }
      }

      // Original OPS logic for standalone items
      if (item.opsAccess && storedUser?.ops_access !== true) return false;
      // OPS items: HRMS grants entry (ops_access), OPS decides the sections.
      // Match EmployeeSidebar.jsx logic exactly
      if (item.opsEntry) return ops?.enabled && !ops?.ready;
      if (item.opsSection) return ops?.ready && ops?.allowedSections?.includes(item.opsSection);
      // SECURITY NOTE: Admin bypass for Invoice permissions
      // Admins always see the full set of CRM/Finance actions, regardless of
      // their individual Invoice account permissions. This is intentional to give
      // admins full access to all modules. Managers and Employees remain gated
      // by their actual per-person Invoice permissions.
      if (role === "admin") return true;
      if (item.invoicePermission && !invoicePermissions[item.invoicePermission]) return false;
      return true;
    } catch (error) {
      console.error('[UnifiedSidebar] Error checking item visibility:', error, item);
      return false; // Hide item on error to prevent crashes
    }
  }, [role, storedUser, ops, invoicePermissions]);

  // Select the appropriate navigation config based on role
  const navConfig = useMemo(() => {
    if (role === "sub-admin") {
      return SUB_ADMIN_NAV;
    } else if (role === "manager") {
      return MANAGER_NAV;
    } else if (role === "operational-manager") {
      return OPERATIONAL_MANAGER_NAV;
    } else {
      return NAV_MODULES; // admin uses unified config
    }
  }, [role]);

  // Memoize visible items to prevent recalculation on every render
  const visibleModules = useMemo(() => {
    return navConfig.map((mod) => {
      try {
        const visibleItems = mod.items.filter(itemIsVisible);
        return { ...mod, visibleItems };
      } catch (error) {
        console.error('[UnifiedSidebar] Error filtering module items:', error, mod);
        return { ...mod, visibleItems: [] };
      }
    }).filter(mod => mod.visibleItems.length > 0);
  }, [itemIsVisible, navConfig]);

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
            padding: "4px",
          }}
        />
      </div>

      <AssignmentNotifier />

      <div className="nav-section" role="navigation" aria-label="Main navigation">
        {visibleModules.map((mod) => {
          // Handle old-style config (with "section") for sub-admin/manager/operational-manager
          if (mod.section) {
            return (
              <div key={mod.section}>
                <div className="nav-label sb-label" role="heading" aria-level="2">{mod.section}</div>
                {mod.visibleItems.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.end}
                    className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
                  >
                    <i className={`fas ${item.icon}`} aria-hidden="true" />
                    <span className="sb-label">{item.label}</span>
                  </NavLink>
                ))}
              </div>
            );
          }

          // Handle new-style config (with "module") for admin
          return (
            <div key={mod.module}>
              <div className="nav-label sb-label" role="heading" aria-level="2">{mod.module}</div>

              {mod.visibleItems.map((item) => {
                const path = item.absolute ? item.slug : `${basePath}${item.slug}`;
                const hasSubItems = item.subItems && Array.isArray(item.subItems) && item.subItems.length > 0;
                const isExpanded = expandedItems.has(item.slug);
                // "Case Filing" and "Case Processing" share one page and differ
                // only by ?view=processing, which NavLink does not look at.
                const onProcessingView =
                  new URLSearchParams(location.search).get("view") === "processing";
                const opsViewMatches = (isActive) =>
                  item.opsView
                    ? isActive && onProcessingView
                    : item.opsSection === "cases"
                    ? isActive && !onProcessingView
                    : isActive;
                const label =
                  item.opsSection === "cases" && hasProfile(ops?.user, "CASE_OFFICER")
                    ? "Case Processing"
                    : item.label;

                return (
                  <div key={`${path}-${item.label}`}>
                    <NavLink
                      to={path}
                      end={hasSubItems ? true : false}
                      className={({ isActive }) =>
                        `nav-item${opsViewMatches(isActive) ? " active" : ""}`
                      }
                      onClick={(e) => {
                        if (hasSubItems) {
                          e.preventDefault();
                          toggleExpand(item.slug);
                        }
                      }}
                      style={{ cursor: 'pointer' }}
                      aria-label={label}
                      aria-expanded={hasSubItems ? isExpanded : undefined}
                      aria-haspopup={hasSubItems ? true : undefined}
                    >
                      <i className={`fas ${item.icon}`} aria-hidden="true" />
                      <span className="sb-label">{label}</span>
                      {hasSubItems && (
                        <i
                          className={`fas fa-chevron-${isExpanded ? 'down' : 'right'} submenu-arrow`}
                          style={{ marginLeft: 'auto' }}
                          aria-hidden="true"
                        />
                      )}
                      {path.includes("notifications") ? (
                        <NotificationBadge type="notifications" />
                      ) : path.includes("leave") ? (
                        <NotificationBadge type="leaves" />
                      ) : path.includes("activity-logs") ? (
                        <NotificationBadge type="activityLogs" />
                      ) : path.includes("approvals") ? (
                        <NotificationBadge type="invoiceApprovals" />
                      ) : path.includes("ops") || path.includes("cases") || path.includes("audit") ? (
                        <NotificationBadge type="ops" />
                      ) : path.includes("leads") && !path.includes("ops") ? (
                        <NotificationBadge type="crmLeads" />
                      ) : null}
                    </NavLink>

                    {hasSubItems && isExpanded && (
                      <div style={{ marginLeft: '30px', marginTop: '5px' }} role="group" aria-label={`${label} submenu`}>
                        {item.subItems.filter(subItem => itemIsVisible(subItem)).map((subItem) => {
                          const subItemPath = subItem.absolute ? subItem.slug : `${basePath}${subItem.slug}`;
                          // Handle Case Filing/Case Processing view matching for sub-items
                          const subItemOpsViewMatches = (isActive) =>
                            subItem.opsView
                              ? isActive && onProcessingView
                              : subItem.opsSection === "cases"
                              ? isActive && !onProcessingView
                              : isActive;
                          return (
                            <NavLink
                              key={subItemPath}
                              to={subItemPath}
                              end={true}
                              className={({ isActive }) =>
                                `nav-item${subItemOpsViewMatches(isActive) ? " active" : ""}`
                              }
                              style={{ fontSize: '0.8rem', padding: '8px 12px' }}
                              aria-label={subItem.label}
                            >
                              <i className={`fas ${subItem.icon}`} style={{ width: '18px' }} aria-hidden="true" />
                              <span>{subItem.label}</span>
                              {subItemPath.includes("leave") ? (
                                <NotificationBadge type="leaves" />
                              ) : subItemPath.includes("approvals") ? (
                                <NotificationBadge type="invoiceApprovals" />
                              ) : subItemPath.includes("ops") || subItemPath.includes("cases") || subItemPath.includes("audit") ? (
                                <NotificationBadge type="ops" />
                              ) : subItemPath.includes("leads") && !subItemPath.includes("ops") ? (
                                <NotificationBadge type="crmLeads" />
                              ) : null}
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
      </div>

      <div className="sidebar-footer">
        <button
          type="button"
          className="nav-item"
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!collapsed}
        >
          <i className={`fas fa-chevron-${collapsed ? "right" : "left"}`} aria-hidden="true" />
          <span className="sb-label collapse-text">Collapse</span>
        </button>

        <button
          type="button"
          className="nav-item"
          onClick={handleLogout}
          aria-label="Logout"
        >
          <i className="fas fa-sign-out-alt" aria-hidden="true" />
          <span className="sb-label">Logout</span>
        </button>
      </div>
    </aside>
  );
}

export default UnifiedSidebar;