import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import PageLoading from "../../components/PageLoading";
import RouteErrorBoundary from "../../components/RouteErrorBoundary";
import ManagerPlaceholder from "../manager/ManagerPlaceholder";

const AdminAttendanceAnalysis = lazy(() => import("../admin/AdminAttendanceAnalysis"));
const AdminCalendar = lazy(() => import("../admin/AdminCalendar"));
const AdminDashboard = lazy(() => import("../admin/AdminDashboard"));
const AdminLeave = lazy(() => import("../admin/AdminLeave"));
const EmployeePayslip = lazy(() => import("../employee/EmployeePayslip"));
const ManagerAttendance = lazy(() => import("../manager/ManagerAttendance"));
const ManagerBreaks = lazy(() => import("../manager/ManagerBreaks"));
const ManagerDepartment = lazy(() => import("../manager/ManagerDepartment"));
const ManagerEmployee = lazy(() => import("../manager/ManagerEmployee"));
const ManagerNotifications = lazy(() => import("../manager/ManagerNotifications"));

function OperationalSelfServicePage({ children }) {
  return <div className="operations-self-service">{children}</div>;
}

function OperationalManagerRoutes() {
  const role = JSON.parse(localStorage.getItem("user") || "{}")?.role;
  if (role === "SUB_ADMIN") {
    return <Navigate to="/sub-admin" replace />;
  }
  if (role && role !== "OPERATIONAL_MANAGER") {
    return <Navigate to="/home" replace />;
  }

  return (
    <RouteErrorBoundary title="Operational Manager module error">
      <Suspense fallback={<PageLoading label="Loading operations module…" />}>
        <Routes>
          <Route index element={<AdminDashboard />} />
          <Route path="employees" element={<ManagerEmployee />} />
          <Route path="attendance-analysis" element={<AdminAttendanceAnalysis />} />
          <Route path="attendance" element={<ManagerAttendance />} />
          <Route path="department" element={<ManagerDepartment />} />
          <Route path="calendar" element={<AdminCalendar />} />
          <Route path="breaks" element={<ManagerBreaks />} />
          <Route path="leave" element={<AdminLeave />} />
          <Route path="notifications" element={<ManagerNotifications />} />
          <Route path="settings" element={<ManagerPlaceholder title="Settings" />} />

          <Route path="my-payslip" element={<OperationalSelfServicePage><EmployeePayslip /></OperationalSelfServicePage>} />

          <Route path="*" element={<ManagerPlaceholder title="Operational Manager module" />} />
        </Routes>
      </Suspense>
    </RouteErrorBoundary>
  );
}

export default OperationalManagerRoutes;
