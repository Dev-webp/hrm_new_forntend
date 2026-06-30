export const SUB_ADMIN_NAV = [
  {
    section: "Self Service",
    items: [
      { path: "/sub-admin", icon: "fa-chart-line", label: "Dashboard", end: true },
      { path: "/sub-admin/calendar", icon: "fa-calendar-alt", label: "Calendar" },
      { path: "/sub-admin/leave", icon: "fa-umbrella-beach", label: "Leave" },
      { path: "/sub-admin/payslip", icon: "fa-file-invoice-dollar", label: "My Payslip" },
    ],
  },
  {
    section: "Operations",
    items: [
      { path: "/sub-admin/attendance", icon: "fa-calendar-check", label: "Attendance" },
      { path: "/sub-admin/breaks", icon: "fa-coffee", label: "Breaks" },
    ],
  },
  {
    section: "Profile",
    items: [
      { path: "/sub-admin/settings", icon: "fa-sliders-h", label: "Settings" },
    ],
  },
];
