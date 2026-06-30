export const OPERATIONAL_MANAGER_NAV = [
  {
    section: "Core",
    items: [
      { path: "/operations", icon: "fa-chart-line", label: "Dashboard", end: true },
      { path: "/operations/employees", icon: "fa-users", label: "Employees" },
    ],
  },
  {
    section: "Operations",
    items: [
      { path: "/operations/attendance-analysis", icon: "fa-chart-line", label: "Attendance Analysis" },
      { path: "/operations/attendance", icon: "fa-calendar-check", label: "Attendance" },
      { path: "/operations/department", icon: "fa-chalkboard-user", label: "Department" },
      { path: "/operations/calendar", icon: "fa-calendar-alt", label: "Calendar" },
      { path: "/operations/breaks", icon: "fa-coffee", label: "Breaks" },
    ],
  },
  {
    section: "Self Service",
    items: [
      { path: "/operations/my-payslip", icon: "fa-file-invoice-dollar", label: "My Payslip" },
    ],
  },
  {
    section: "HR",
    items: [
      { path: "/operations/leave", icon: "fa-umbrella-beach", label: "Leave" },
    ],
  },
  {
    section: "System",
    items: [
      { path: "/operations/notifications", icon: "fa-bell", label: "Notifications" },
      { path: "/operations/settings", icon: "fa-sliders-h", label: "Settings" },
    ],
  },
];
