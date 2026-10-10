import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { clearAuthSession } from "../utils/auth";
import { parseJwt } from "../utils/parseJwt";
import { fetchEmployeeUnreadCount } from "../services/notificationsApi";
import { useInvoiceAuth } from "../context/InvoiceAuthContext";
import AssignmentNotifier from "./AssignmentNotifier";
import "../styles/EmployeeSidebar.css";
import logo from "../assets/logoimagefinally1.png";

const NAV_ITEMS = [
  { id: "dashboard", path: "/employee/dashboard", icon: "fa-chart-line", label: "Dashboard" },
  { id: "attendance", path: "/employee/attendance", icon: "fa-calendar-check", label: "Attendance" },
  { id: "leave", path: "/employee/leave", icon: "fa-umbrella-beach", label: "Leave" },
  { id: "breaks", path: "/employee/breaks", icon: "fa-coffee", label: "Breaks" },
  // Only shown if this person's Invoice account has the "customers" permission.
  { id: "leads", path: "/employee/crm/leads", icon: "fa-bullseye", label: "Leads", invoicePermission: "customers" },
  { id: "customers", path: "/employee/crm/customers", icon: "fa-address-book", label: "Customers", invoicePermission: "customers" },
  { id: "reports", path: "/employee/invoice/reports", icon: "fa-chart-pie", label: "Reports", invoicePermission: "reports" },
  { id: "invoices", path: "/employee/invoice/invoices", icon: "fa-file-invoice", label: "Invoices", invoicePermission: "invoices" },
  { id: "quotes", path: "/employee/invoice/quotes", icon: "fa-file-signature", label: "Quotes", invoicePermission: "quotes" },
  { id: "payments", path: "/employee/invoice/payments", icon: "fa-credit-card", label: "Payments", invoicePermission: "payments" },
  { id: "items", path: "/employee/invoice/items", icon: "fa-boxes-stacked", label: "Items", invoicePermission: "services" },
  { id: "messages", path: "/employee/messages", icon: "fa-envelope", label: "Messages" },
  { id: "payslip", path: "/employee/payslip", icon: "fa-file-invoice-dollar", label: "Payslip" },
  { id: "instructions", path: "/employee/instructions", icon: "fa-book-open", label: "Instructions" },
];

export default function EmployeeSidebar({ activePage = "dashboard" }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const { user: invoiceUser } = useInvoiceAuth();
  const invoicePermissions = invoiceUser?.permissions || {};

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.invoicePermission || invoicePermissions[item.invoicePermission]
  );


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
        {visibleItems.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`nav-item${isActive(item) ? " active" : ""}`}
            onClick={() => navigate(item.path)}
          >
            <i className={`fas ${item.icon}`} />
            <span>{item.label}</span>
            {item.id === "messages" && unreadMessages > 0 && (
              <span className="nav-badge">{unreadMessages > 99 ? "99+" : unreadMessages}</span>
            )}
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