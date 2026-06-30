export const MANAGER_NAV = [
  {
    section: "Core",
    items: [
      {
        path: "/manager",
        icon: "fa-chart-line",
        label: "Dashboard",
        end: true,
      },
      {
        path: "/manager/employees",
        icon: "fa-users",
        label: "Employees",
      },
    ],
  },
  {
    section: "Operations",
    items: [
      {
        path: "/manager/attendance-analysis",
        icon: "fa-chart-line",
        label: "Attendance Analysis",
      },
      {
        path: "/manager/attendance",
        icon: "fa-calendar-check",
        label: "Attendance",
      },
      {
        path: "/manager/department",
        icon: "fa-chalkboard-user",
        label: "Department",
      },
      {
        path: "/manager/calendar",
        icon: "fa-calendar-alt",
        label: "Calendar",
      },
      {
        path: "/manager/breaks",
        icon: "fa-coffee",
        label: "Breaks",
      },
    ],
  },
  {
    section: "HR",
    items: [
     
      {
        path: "/manager/payslip",
        icon: "fa-file-invoice-dollar",
        label: "Payslip",
      },
      {
        path: "/manager/leave",
        icon: "fa-umbrella-beach",
        label: "Leave",
      },
    ],
  },
  {
    section: "System",
    items: [
      {
        path: "/manager/notifications",
        icon: "fa-bell",
        label: "Notifications",
      },
      {
        path: "/manager/settings",
        icon: "fa-sliders-h",
        label: "Settings",
      },
    ],
  },
];

export const CONVERTED_MANAGER_ROUTE_PATHS = new Set([
  "/manager",
  "/manager/attendance",
  "/manager/attendance-analysis",
  "/manager/employees",
  "/manager/leave",
  "/manager/breaks",
  "/manager/calendar",
  "/manager/department",
  "/manager/notifications",
  "/manager/payslip",
]);

export function getPlaceholderManagerRoutes() {
  return MANAGER_NAV.flatMap((section) => section.items)
    .map((item) => item.path)
    .filter((path) => !CONVERTED_MANAGER_ROUTE_PATHS.has(path));
}
