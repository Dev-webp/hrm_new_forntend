import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { clearAuthSession, getStoredUser } from "../utils/auth";
import { parseJwt } from "../utils/parseJwt";
import { fetchEmployeeUnreadCount } from "../services/notificationsApi";
import { useInvoiceAuth } from "../context/InvoiceAuthContext";
import { useOpsAuth } from "../context/OpsAuthContext";
import { hasProfile } from "../modules/ops/Shared";
import AssignmentNotifier from "./AssignmentNotifier";
import "../styles/EmployeeSidebar.css";
import logo from "../assets/logoimagefinally1.png";

const NAV_ITEMS = [
  { id: "dashboard", path: "/employee/dashboard", icon: "fa-chart-line", label: "Dashboard" },
  { id: "attendance", path: "/employee/attendance", icon: "fa-calendar-check", label: "Attendance" },
  { id: "leave", path: "/employee/leave", icon: "fa-umbrella-beach", label: "Leave" },
  { id: "breaks", path: "/employee/breaks", icon: "fa-coffee", label: "Breaks" },
  { id: "messages", path: "/employee/messages", icon: "fa-envelope", label: "Messages" },
  { id: "payslip", path: "/employee/payslip", icon: "fa-file-invoice-dollar", label: "Payslip" },
  { id: "instructions", path: "/employee/instructions", icon: "fa-book-open", label: "Instructions" },
  // Only shown if this person's Invoice account has the "customers" permission.
  { id: "leads", path: "/employee/crm/leads", icon: "fa-bullseye", label: "Leads", invoicePermission: "customers" },
  { id: "customers", path: "/employee/crm/customers", icon: "fa-address-book", label: "Customers", invoicePermission: "customers" },
  { id: "reports", path: "/employee/invoice/reports", icon: "fa-chart-pie", label: "Reports", invoicePermission: "reports" },
  { id: "invoices", path: "/employee/invoice/invoices", icon: "fa-file-invoice", label: "Invoices", invoicePermission: "invoices" },
  { id: "rejected-invoices", path: "/employee/invoice/rejected", icon: "fa-file-circle-xmark", label: "Rejected Invoices", invoicePermission: "invoices" },
  { id: "quotes", path: "/employee/invoice/quotes", icon: "fa-file-signature", label: "Quotes", invoicePermission: "quotes" },
  { id: "payments", path: "/employee/invoice/payments", icon: "fa-credit-card", label: "Payments", invoicePermission: "payments" },
  { id: "items", path: "/employee/invoice/items", icon: "fa-boxes-stacked", label: "Items", invoicePermission: "services" },
  // OPS portal: shown only once the OPS sign-in has succeeded and OPS says this
  // person's work profiles may open the section (opsSection).
  { id: "ops-connect", path: "/employee/ops/dashboard", icon: "fa-plug", label: "OPS Portal", opsEntry: true },
  { id: "ops-dashboard", path: "/employee/ops/dashboard", icon: "fa-gauge", label: "OPS Dashboard", opsSection: "dashboard" },
  { id: "ops-leads", path: "/employee/ops/leads", icon: "fa-user-check", label: "Leads / Agreements", opsSection: "leads" },
  { id: "ops-audit", path: "/employee/ops/audit", icon: "fa-microphone", label: "Quality Audit", opsSection: "audit" },
  { id: "ops-cases", path: "/employee/ops/cases", icon: "fa-folder-open", label: "Case Filing Ops", opsSection: "cases" },
  { id: "ops-case-processing", path: "/employee/ops/cases?view=processing", icon: "fa-clipboard-list", label: "Case Processing", opsSection: "case-processing" },
  { id: "ops-reports", path: "/employee/ops/reports", icon: "fa-chart-column", label: "OPS Reports", opsSection: "reports" },
  { id: "ops-employees", path: "/employee/ops/employees", icon: "fa-users-gear", label: "OPS Employees", opsSection: "employees" },
  { id: "ops", path: "/ops/dashboard", icon: "fa-briefcase", label: "OPS Portal", opsAccess: true },
];

export default function EmployeeSidebar({ activePage = "dashboard" }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const { user: invoiceUser } = useInvoiceAuth();
  const invoicePermissions = invoiceUser?.permissions || {};
  const ops = useOpsAuth();
  const hrmsUser = getStoredUser();

  // Use HRMS permissions if available, otherwise fall back to Invoice auth permissions
  const hrmsInvoicePermissions = hrmsUser?.invoice_permissions || {};

  const visibleItems = NAV_ITEMS.filter((item) => {
    if (item.opsEntry) return ops.enabled && !ops.ready;
    if (item.opsSection) return ops.ready && ops.allowedSections.includes(item.opsSection);
    // For Invoice/CRM items, check HRMS invoice_access first
    // Use HRMS permissions if set, otherwise use Invoice auth permissions
    const hasInvoiceAccess = hrmsUser?.invoice_access === true;
    const hasPermission = !item.invoicePermission ||
      (hrmsInvoicePermissions[item.invoicePermission] || invoicePermissions[item.invoicePermission]);
    return (!item.invoicePermission || (hasInvoiceAccess && hasPermission)) &&
      (!item.opsAccess || hrmsUser?.ops_access === true);
  }).map((item) => {
    const label =
      item.opsSection === "cases" && hasProfile(ops.user, "CASE_OFFICER")
        ? "Case Processing"
        : item.label;
    return { ...item, label };
  });


  const profile = useMemo(() => {
    const token = localStorage.getItem("token");
    const decoded = parseJwt(token) || {};
    const fullName =
      decoded.full_name || localStorage.getItem("full_name") || "Employee";
    const designation =
      decoded.designation || localStorage.getItem("designation") || "—";

    const initials = fullName
      .split(" ")
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
    return { fullName, designation, initials };
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) navigate("/login");
  }, [navigate]);

  useEffect(() => {
    let mounted = true;

    const loadUnreadMessages = async () => {
      try {
        const data = await fetchEmployeeUnreadCount();
        if (mounted) setUnreadMessages(Number(data?.count || 0));
      } catch {
        if (mounted) setUnreadMessages(0);
      }
    };

    loadUnreadMessages();
    const id = setInterval(loadUnreadMessages, 60000);

    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, []);

  const handleLogout = () => {
    clearAuthSession();
    navigate("/login");
  };

  const isActive = (item) => {
    if (activePage) return item.id === activePage;
    return location.pathname === item.path;
  };

  // "Case Filing" and "Case Processing" share one page and differ
  // only by ?view=processing, which NavLink does not look at.
  const onProcessingView =
    new URLSearchParams(location.search).get("view") === "processing";

  return (
    <aside className={`sidebar employee-sidebar${collapsed ? " collapsed" : ""}`}>
     
<div className="logo-area">
  <img
    src={logo}
    alt="VJC Overseas"
    className="company-logo"
  />
</div>
      <div className="emp-avatar-area">
        <div className="emp-avatar">{profile.initials}</div>
        <div className="emp-info">
          <div className="name">{profile.fullName}</div>
          <div className="designation">{profile.designation}</div>
          <div className="online-status"><span /> Online</div>
        </div>
      </div>

      <AssignmentNotifier />

      <div className="nav-section">
        <div className="nav-label-group">Menu</div>
        {visibleItems.map((item) => {
          // "Case Filing" and "Case Processing" share one page and differ
          // only by ?view=processing, which NavLink does not look at.
          const onProcessingView =
            new URLSearchParams(location.search).get("view") === "processing";
          const opsViewMatches = (active) =>
            item.opsView
              ? active && onProcessingView
              : item.opsSection === "cases"
              ? active && !onProcessingView
              : active;
          return (
            <button
              key={item.id}
              type="button"
              className={`nav-item${opsViewMatches(isActive(item)) ? " active" : ""}`}
              onClick={() => navigate(item.path)}
            >
              <i className={`fas ${item.icon}`} />
              <span>{item.label}</span>
              {item.id === "messages" && unreadMessages > 0 && (
                <span className="nav-badge">{unreadMessages > 99 ? "99+" : unreadMessages}</span>
              )}
            </button>
          );
        })}
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