import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { NAV_MODULES, ROLE_BASE_PATH } from "../config/navConfig";
import { clearAuthSession } from "../utils/auth";
import { useInvoiceAuth } from "../context/InvoiceAuthContext";
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
  const basePath = ROLE_BASE_PATH[role] || "/admin";
  const { user: invoiceUser } = useInvoiceAuth();
  const invoicePermissions = invoiceUser?.permissions || {};

  const handleLogout = () => {
    clearAuthSession();
    navigate("/");
  };

  const itemIsVisible = (item) => {
    if (!item.roles.includes(role)) return false;
    // Admin always sees the full set of CRM/Finance actions, regardless of
    // that specific person's individual Invoice permissions. Manager and
    // Employee stay gated by their actual per-person permissions.
    if (role === "admin") return true;
    if (item.invoicePermission && !invoicePermissions[item.invoicePermission]) return false;
    return true;
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
            padding: "4px",
          }}
        />
      </div>

      <AssignmentNotifier />

      <div className="nav-section">
        {NAV_MODULES.map((mod) => {
          const visibleItems = mod.items.filter(itemIsVisible);
          if (visibleItems.length === 0) return null;

          return (
            <div key={mod.module}>
              <div className="nav-label sb-label">{mod.module}</div>

              {visibleItems.map((item) => {
                const path = `${basePath}${item.slug}`;
                return (
                  <NavLink
                    key={`${path}-${item.label}`}
                    to={path}
                    end={item.end}
                    className={({ isActive }) =>
                      `nav-item${isActive ? " active" : ""}`
                    }
                  >
                    <i className={`fas ${item.icon}`} />
                    <span className="sb-label">{item.label}</span>
                    {path.includes("notifications") ? (
                      <NotificationBadge type="notifications" />
                    ) : path.includes("leave") ? (
                      <NotificationBadge type="leaves" />
                    ) : path.includes("activity-logs") ? (
                      <NotificationBadge type="activityLogs" />
                    ) : null}
                  </NavLink>
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

export default UnifiedSidebar;