// Admin sidebar navigation — maps old HTML pages to React Router paths

/** Routes with full React implementations (not placeholders). */
export const CONVERTED_ADMIN_ROUTE_PATHS = new Set([
  "/admin",
  "/admin/employees",
  "/admin/attendance",
  "/admin/attendance-analysis",
  "/admin/breaks",
  "/admin/calendar",
  "/admin/leave",
  "/admin/offer-letters",
  "/admin/letters",
  "/admin/payroll",
  "/admin/notifications",
  "/admin/activity-logs",
  "/admin/department",
  "/admin/profile",

]);

export function isConvertedAdminPath(path) {
  return CONVERTED_ADMIN_ROUTE_PATHS.has(path);
}

export function getPlaceholderAdminRoutes() {
  return ADMIN_NAV.flatMap((section) => section.items)
    .map((item) => item.path)
    .filter((path) => !CONVERTED_ADMIN_ROUTE_PATHS.has(path));
}

export function adminPathToRouteSlug(path) {
  return path.replace(/^\/admin\/?/, "") || "";
}

export const ADMIN_NAV = [
  {
    section: "Core",
    items: [
      {
        path: "/admin",
        icon: "fa-crown",
        label: "Executive Core",
        end: true,
      },
      {
        path: "/admin/employees",
        icon: "fa-users",
        label: "Employee Management",
      },
    ],
  },
  {
    section: "Operations",
    items: [
      {
        path: "/admin/attendance-analysis",
        icon: "fa-chart-line",
        label: "Attendance Analysis",
      },
      {
        path: "/admin/department",
        icon: "fa-chalkboard-user",
        label: "Add & View Department",
      },
      {
        path: "/admin/attendance",
        icon: "fa-calendar-check",
        label: "Daily Attendance",
      },
      {
        path: "/admin/calendar",
        icon: "fa-calendar-alt",
        label: "Holiday Calender",
      },
      {
        path: "/admin/breaks",
        icon: "fa-coffee",
        label: "Breaks",
      },
    ],
  },
  {
    section: "HR",
    items: [
      {
        path: "/admin/leave",
        icon: "fa-umbrella-beach",
        label: "Leave",
      },
      {
        path: "/admin/payroll",
        icon: "fa-coins",
        label: "Payroll",
      },
      { path: "/admin/letters", icon: "fa-file-contract", label: "Offer  & Relieving Letter" },
    ],
  },
  {
    section: "System",
    items: [
      {
        path: "/admin/activity-logs",
        icon: "fa-history",
        label: "Activity Logs",
      },
      {
        path: "/admin/notifications",
        icon: "fa-bell",
        label: "Notifications",
      },
      {
        path: "/admin/profile",
        icon: "fa-user-shield",
        label: "Profile",
      },
      {
        path: "/admin/settings",
        icon: "fa-sliders-h",
        label: "Settings",
      },
    ],
  },
];

export const BRANCH_OPTIONS = [
  { value: "all", label: "🌍 All Branches" },
  { value: "Hyderabad", label: "🏢 Hyderabad" },
  { value: "Bangalore", label: "💻 Bangalore" },
];
