import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import PageLoading from "../../components/PageLoading";
import RouteErrorBoundary from "../../components/RouteErrorBoundary";
import { getPlaceholderManagerRoutes } from "../../config/managerNav";
import { getStoredRole } from "../../utils/auth";
import ManagerPlaceholder from "./ManagerPlaceholder";

const ManagerAttendance = lazy(() => import("./ManagerAttendance"));
const ManagerAttendanceAnalysis = lazy(() => import("./ManagerAttendanceAnalysis"));
const ManagerBreaks = lazy(() => import("./ManagerBreaks"));
const ManagerCalendar = lazy(() => import("./ManagerCalendar"));
const ManagerDashboard = lazy(() => import("./ManagerDashboard"));
const ManagerDepartment = lazy(() => import("./ManagerDepartment"));
const ManagerEmployee = lazy(() => import("./ManagerEmployee"));
const ManagerLeave = lazy(() => import("./ManagerLeave"));
const ManagerNotifications = lazy(() => import("./ManagerNotifications"));
const ManagerPayslip = lazy(() => import("./ManagerPayslip"));

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
  const role = getStoredRole();
  if (role === "SUB_ADMIN") {
    return <Navigate to="/sub-admin" replace />;
  }
  if (role && role !== "MANAGER") {
    return <Navigate to="/home" replace />;
  }

  const placeholderSlugs = getPlaceholderManagerRoutes().map((path) =>
    path.replace(/^\/manager\/?/, "")
  );

  return (
    <RouteErrorBoundary title="Manager module error">
      <Suspense fallback={<PageLoading label="Loading manager module…" />}>
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
      </Suspense>
    </RouteErrorBoundary>
  );
}

export default ManagerRoutes;
