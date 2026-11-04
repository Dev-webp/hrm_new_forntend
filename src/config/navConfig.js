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
        roles: ["admin", "manager", "operational-manager", "sub-admin"],
        subItems: [
          { slug: "/overview", icon: "fa-chart-pie", label: "Executive Dashboard", roles: ["admin"] },
          { slug: "/invoice/dashboard", icon: "fa-chart-line", label: "Finance Dashboard", roles: ["admin", "manager"], invoicePermission: "invoices" },
          { slug: "/admin/ops/dashboard", icon: "fa-briefcase", label: "OPS Dashboard", roles: ["admin", "manager", "operational-manager", "sub-admin"], opsAccess: true, opsSection: "dashboard", absolute: true },
          { slug: "/dashboard", icon: "fa-users", label: "HRMS", roles: ["admin"] },
        ]
      },
    ],
  },
  {
    module: "Leads",
    items: [
      {
        slug: "/leads",
        icon: "fa-bullseye",
        label: "Leads",
        roles: ["admin", "manager", "operational-manager", "sub-admin"],
        subItems: [
          { slug: "/crm/leads", icon: "fa-file-invoice", label: "Invoice Leads", roles: ["admin", "manager"], invoicePermission: "customers" },
          { slug: "/admin/ops/leads", icon: "fa-briefcase", label: "OPS Leads", roles: ["admin", "manager", "operational-manager", "sub-admin"], opsAccess: true, opsSection: "leads", absolute: true },
          { slug: "/crm/customers", icon: "fa-address-book", label: "Customers", roles: ["admin", "manager"], invoicePermission: "customers" },
        ]
      },
    ],
  },
  {
    module: "Approvals",
    items: [
      {
        slug: "/leave",
        icon: "fa-umbrella-beach",
        label: "Approvals",
        roles: ["admin", "manager", "operational-manager", "sub-admin"],
        subItems: [
          { slug: "/leave", icon: "fa-file-signature", label: "Leave Requests", roles: ["admin", "manager", "operational-manager", "sub-admin"] },
          { slug: "/invoice/approvals", icon: "fa-clipboard-check", label: "Approval Invoice", roles: ["admin", "manager"], invoicePermission: "invoices" },
        ]
      },
      { slug: "/payslip", icon: "fa-file-invoice-dollar", label: "Payslip", roles: ["manager", "sub-admin"] },
      { slug: "/my-payslip", icon: "fa-file-invoice-dollar", label: "My Payslip", roles: ["operational-manager"] },
    ],
  },
  {
    module: "Attendance",
    items: [
      {
        slug: "/employees",
        icon: "fa-users",
        label: "Employee Management",
        roles: ["admin"],
        subItems: [
          { slug: "/employees", icon: "fa-user", label: "Employee Management", roles: ["admin"] },
          { slug: "/admin/ops/employees", icon: "fa-users-gear", label: "OPS Employees", roles: ["admin", "manager", "operational-manager", "sub-admin"], opsAccess: true, absolute: true },
          { slug: "/admin/invoice/employees", icon: "fa-file-invoice-dollar", label: "Add Invoice Employee", roles: ["admin", "manager"], invoicePermission: "services", absolute: true },
          { slug: "/department", icon: "fa-building", label: "Add Department", roles: ["admin"] },
        ]
      },
      { slug: "/employees", icon: "fa-users", label: "Employees", roles: ["manager", "operational-manager"] },
      {
        slug: "/attendance",
        icon: "fa-calendar-check",
        label: "Attendance",
        roles: ["admin", "manager", "operational-manager", "sub-admin"],
        subItems: [
          { slug: "/attendance-analysis", icon: "fa-chart-line", label: "Attendance Analysis", roles: ["admin", "manager", "operational-manager"] },
          { slug: "/attendance", icon: "fa-calendar-day", label: "Daily Attendance", roles: ["admin", "manager", "operational-manager", "sub-admin"] },
          { slug: "/breaks", icon: "fa-coffee", label: "Breaks", roles: ["admin", "manager", "operational-manager", "sub-admin"] },
        ]
      },
    ],
  },
  {
    module: "OPS",
    items: [
      {
        slug: "/ops/dashboard",
        absolute: true,
        opsAccess: true,
        icon: "fa-briefcase",
        label: "OPS Portal",
        roles: ["admin", "manager", "operational-manager", "sub-admin"],
        opsEntry: true,
      },
      {
        slug: "/cases",
        icon: "fa-folder-open",
        label: "Cases",
        roles: ["admin", "manager", "operational-manager", "sub-admin"],
        opsAccess: true,
        subItems: [
          { slug: "/admin/ops/cases", icon: "fa-folder", label: "Case Filing", roles: ["admin", "manager", "operational-manager", "sub-admin"], opsAccess: true, opsSection: "cases", absolute: true },
          { slug: "/admin/ops/cases?view=processing", icon: "fa-clipboard-list", label: "Case Processing", roles: ["manager", "operational-manager", "sub-admin"], opsAccess: true, opsSection: "case-processing", opsView: "processing", absolute: true },
          { slug: "/admin/ops/audit", icon: "fa-microphone", label: "Quality Audit", roles: ["admin", "manager", "operational-manager", "sub-admin"], opsAccess: true, opsSection: "audit", absolute: true },
        ]
      },
    ],
  },
  {
    module: "Finance",
    items: [
      {
        slug: "/invoice",
        icon: "fa-file-invoice-dollar",
        label: "Invoice",
        roles: ["admin", "manager"],
        invoicePermission: "invoices",
        subItems: [
          { slug: "/invoice/approvals", icon: "fa-clipboard-check", label: "Approval Invoice", roles: ["admin", "manager"], invoicePermission: "invoices" },
          { slug: "/invoice/invoices", icon: "fa-file-invoice", label: "Approved Invoice", roles: ["admin", "manager"], invoicePermission: "invoices" },
          { slug: "/invoice/rejected", icon: "fa-file-circle-xmark", label: "Reject Invoice", roles: ["admin", "manager"], invoicePermission: "invoices" },
          { slug: "/invoice/quotes", icon: "fa-file-signature", label: "Proforma Invoice", roles: ["admin", "manager"], invoicePermission: "quotes" },
        ]
      },
      {
        slug: "/finance",
        icon: "fa-chart-line",
        label: "Finance",
        roles: ["admin", "manager"],
        subItems: [
          { slug: "/invoice/payments", icon: "fa-credit-card", label: "Invoice Payments", roles: ["admin", "manager"], invoicePermission: "payments" },
          { slug: "/invoice/expenses", icon: "fa-wallet", label: "Invoice Expenses", roles: ["admin", "manager"], invoicePermission: "expenses" },
          { slug: "/payroll", icon: "fa-coins", label: "HRMS Payroll", roles: ["admin"] },
        ]
      },
    ],
  },
  {
    module: "Reports",
    items: [
      {
        slug: "/reports",
        icon: "fa-chart-column",
        label: "Reports",
        roles: ["admin", "manager", "operational-manager", "sub-admin"],
        subItems: [
          { slug: "/invoice/reports", icon: "fa-file-invoice", label: "Invoice Reports", roles: ["admin", "manager"], invoicePermission: "reports" },
          { slug: "/admin/ops/reports", icon: "fa-chart-bar", label: "OPS Reports", roles: ["admin", "manager", "operational-manager", "sub-admin"], opsAccess: true, opsSection: "reports", absolute: true },
        ]
      },
    ],
  },
  {
    module: "HR Documents",
    items: [
      {
        slug: "/hr-docs",
        icon: "fa-file-lines",
        label: "HR Documents",
        roles: ["admin", "manager", "operational-manager", "sub-admin"],
        subItems: [
          { slug: "/letters", icon: "fa-file-contract", label: "Offer & Relieving Letter", roles: ["admin"] },
          { slug: "/calendar", icon: "fa-calendar-alt", label: "Holiday Calendar", roles: ["admin", "manager", "operational-manager", "sub-admin"] },
        ]
      },
    ],
  },
  {
    module: "System",
    items: [
      {
        slug: "/system",
        icon: "fa-cog",
        label: "System",
        roles: ["admin", "manager", "operational-manager", "sub-admin"],
        subItems: [
          { slug: "/activity-logs", icon: "fa-history", label: "Activity Logs", roles: ["admin"] },
          { slug: "/notifications", icon: "fa-bell", label: "Notifications", roles: ["admin", "manager", "operational-manager"] },
          { slug: "/profile", icon: "fa-user-shield", label: "Profile", roles: ["admin"] },
        ]
      },
      { slug: "/instructions", icon: "fa-book-open", label: "Instructions", roles: ["sub-admin"] },
    ],
  },
];

export function getPlaceholderAdminRoutes() {
  return ["/admin/settings"];
}