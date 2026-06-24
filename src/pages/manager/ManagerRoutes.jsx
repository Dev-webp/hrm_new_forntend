import { Route, Routes } from "react-router-dom";
import RouteErrorBoundary from "../../components/RouteErrorBoundary";
import { getPlaceholderManagerRoutes } from "../../config/managerNav";
import ManagerAttendance from "./ManagerAttendance";
import ManagerAttendanceAnalysis from "./ManagerAttendanceAnalysis";
import ManagerBreaks from "./ManagerBreaks";
import ManagerCalendar from "./ManagerCalendar";
import ManagerDashboard from "./ManagerDashboard";
import ManagerDepartment from "./ManagerDepartment";
import ManagerEmployee from "./ManagerEmployee";
import ManagerLeave from "./ManagerLeave";
import ManagerNotifications from "./ManagerNotifications";
import AdminActivityLogs from "../admin/AdminActivityLogs";
import ManagerPayslip from "./ManagerPayslip";
import ManagerPlaceholder from "./ManagerPlaceholder";

const PLACEHOLDER_TITLES = {
  employees: "Employees",
  attendance: "Attendance",
  department: "Department",
  calendar: "Calendar",
  breaks: "Breaks",
  leave: "Leave",
  notifications: "Notifications",
  settings: "Settings",
};

function ManagerRoutes() {
  const placeholderSlugs = getPlaceholderManagerRoutes().map((path) =>
    path.replace(/^\/manager\/?/, "")
  );

  return (
    <RouteErrorBoundary title="Manager module error">
      <Routes>
        <Route index element={<ManagerDashboard />} />
        <Route path="attendance" element={<ManagerAttendance />} />
        <Route path="attendance-analysis" element={<ManagerAttendanceAnalysis />} />
        <Route path="employees" element={<ManagerEmployee />} />
        <Route path="leave" element={<ManagerLeave />} />
        <Route path="breaks" element={<ManagerBreaks />} />
        <Route path="calendar" element={<ManagerCalendar />} />
        <Route path="department" element={<ManagerDepartment />} />
        <Route path="notifications" element={<ManagerNotifications />} />
        <Route path="activity-logs" element={<AdminActivityLogs />} />
        <Route path="payslip" element={<ManagerPayslip />} />

        {placeholderSlugs.map((slug) => (
          <Route
            key={slug}
            path={slug}
            element={
              <ManagerPlaceholder
                title={PLACEHOLDER_TITLES[slug] || "Manager module"}
              />
            }
          />
        ))}

        <Route path="*" element={<ManagerPlaceholder title="Manager module" />} />
      </Routes>
    </RouteErrorBoundary>
  );
}

export default ManagerRoutes;
