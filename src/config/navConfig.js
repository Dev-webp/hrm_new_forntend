// Unified navigation config — replaces adminNav.js, managerNav.js,
// operationalManagerNav.js, subAdminNav.js.
//
// Each item's real URL is built as `${ROLE_BASE_PATH[role]}${item.slug}`,
// so EXISTING routes don't move. This only changes how the sidebar is
// generated, not where pages live.
//
// To add Invoice/CRM later, just add items under the "CRM" / "Finance"
// modules below and give them the roles that should see them.

export const ROLE_BASE_PATH = {
  admin: "/admin",
  manager: "/manager",
  "operational-manager": "/operations",
  "sub-admin": "/sub-admin",
};

export const NAV_MODULES = [
  {
    module: "Main",
    items: [
      {
        slug: "",
        icon: "fa-chart-line",
        label: "Dashboard",
        end: true,
        roles: ["admin", "manager", "operational-manager", "sub-admin"],
      },
    ],
  },
  {
    module: "People",
    items: [
      { slug: "/employees", icon: "fa-users", label: "Employee Management", roles: ["admin"] },
      { slug: "/employees", icon: "fa-users", label: "Employees", roles: ["manager", "operational-manager"] },
      { slug: "/attendance-analysis", icon: "fa-chart-line", label: "Attendance Analysis", roles: ["admin", "manager", "operational-manager"] },
      { slug: "/department", icon: "fa-chalkboard-user", label: "Add & View Department", roles: ["admin"] },
      { slug: "/department", icon: "fa-chalkboard-user", label: "Department", roles: ["manager", "operational-manager"] },
      { slug: "/attendance", icon: "fa-calendar-check", label: "Daily Attendance", roles: ["admin"] },
      { slug: "/attendance", icon: "fa-calendar-check", label: "Attendance", roles: ["manager", "operational-manager", "sub-admin"] },
      { slug: "/calendar", icon: "fa-calendar-alt", label: "Holiday Calender", roles: ["admin"] },
      { slug: "/calendar", icon: "fa-calendar-alt", label: "Calendar", roles: ["manager", "operational-manager", "sub-admin"] },
      { slug: "/breaks", icon: "fa-coffee", label: "Breaks", roles: ["admin", "manager", "operational-manager", "sub-admin"] },
    ],
  },
  {
    module: "HR",
    items: [
      { slug: "/leave", icon: "fa-umbrella-beach", label: "Leave", roles: ["admin", "manager", "operational-manager", "sub-admin"] },
      { slug: "/payroll", icon: "fa-coins", label: "Payroll", roles: ["admin"] },
      { slug: "/payslip", icon: "fa-file-invoice-dollar", label: "Payslip", roles: ["manager", "sub-admin"] },
      { slug: "/my-payslip", icon: "fa-file-invoice-dollar", label: "My Payslip", roles: ["operational-manager"] },
      { slug: "/letters", icon: "fa-file-contract", label: "Offer & Relieving Letter", roles: ["admin"] },
    ],
  },
  {
    module: "CRM",
    items: [
      { slug: "/crm/leads", icon: "fa-bullseye", label: "Leads", roles: ["admin", "manager"], invoicePermission: "customers" },
      { slug: "/crm/customers", icon: "fa-address-book", label: "Customers", roles: ["admin", "manager"], invoicePermission: "customers" },
      { slug: "/crm/follow-ups", icon: "fa-phone-volume", label: "Follow-ups", roles: ["admin", "manager"], invoicePermission: "customers" },
    ],
  },
  {
    module: "Finance",
    items: [
      { slug: "/invoice/invoices", icon: "fa-file-invoice", label: "Approved Invoices", roles: ["admin", "manager"], invoicePermission: "invoices" },
      { slug: "/invoice/quotes", icon: "fa-file-signature", label: "Proforma Invoice", roles: ["admin", "manager"], invoicePermission: "quotes" },
      { slug: "/invoice/payments", icon: "fa-credit-card", label: "Payments", roles: ["admin", "manager"], invoicePermission: "payments" },
      { slug: "/invoice/expenses", icon: "fa-wallet", label: "Expenses", roles: ["admin", "manager"], invoicePermission: "expenses" },
      { slug: "/invoice/reports", icon: "fa-chart-pie", label: "Reports", roles: ["admin", "manager"], invoicePermission: "reports" },
      { slug: "/invoice/items", icon: "fa-boxes-stacked", label: "Services", roles: ["admin", "manager"], invoicePermission: "services" },
      { slug: "/invoice/approvals", icon: "fa-clipboard-check", label: "Approval Requests", roles: ["admin", "manager"], invoicePermission: "invoices" },
      { slug: "/invoice/rejected", icon: "fa-file-circle-xmark", label: "Rejected Invoices", roles: ["admin", "manager"], invoicePermission: "invoices" },
      { slug: "/invoice/dashboard", icon: "fa-gauge-high", label: "Finance Dashboard", roles: ["admin", "manager"], invoicePermission: "invoices" },
    ],
  },
  {
    module: "System",
    items: [
      { slug: "/activity-logs", icon: "fa-history", label: "Activity Logs", roles: ["admin"] },
      { slug: "/notifications", icon: "fa-bell", label: "Notifications", roles: ["admin", "manager", "operational-manager"] },
      { slug: "/instructions", icon: "fa-book-open", label: "Instructions", roles: ["sub-admin"] },
      { slug: "/profile", icon: "fa-user-shield", label: "Profile", roles: ["admin"] },
      { slug: "/settings", icon: "fa-sliders-h", label: "Settings", roles: ["admin", "manager", "operational-manager"] },
    ],
  },
];