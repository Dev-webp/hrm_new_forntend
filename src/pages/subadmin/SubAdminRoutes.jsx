import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import PageLoading from "../../components/PageLoading";
import RouteErrorBoundary from "../../components/RouteErrorBoundary";
import ManagerPlaceholder from "../manager/ManagerPlaceholder";

const EmployeeAttendance = lazy(() => import("../employee/EmployeeAttendance"));
const EmployeeDashboard = lazy(() => import("../employee/EmployeeDashboard"));
const EmployeeLeave = lazy(() => import("../employee/EmployeeLeave"));
const EmployeePayslip = lazy(() => import("../employee/EmployeePayslip"));
const ManagerAttendance = lazy(() => import("../manager/ManagerAttendance"));
const ManagerBreaks = lazy(() => import("../manager/ManagerBreaks"));

export default function SubAdminRoutes() {
  return (
    <RouteErrorBoundary title="Sub Admin module error">
      <Suspense fallback={<PageLoading label="Loading sub admin module…" />}>
        <Routes>
          <Route index element={<EmployeeDashboard embedded />} />
          <Route path="dashboard" element={<Navigate to="/sub-admin" replace />} />
          <Route path="attendance" element={<ManagerAttendance />} />
          <Route path="calendar" element={<EmployeeAttendance embedded />} />
          <Route path="breaks" element={<ManagerBreaks />} />
          <Route path="leave" element={<EmployeeLeave embedded />} />
          <Route path="payslip" element={<EmployeePayslip embedded />} />
          <Route path="settings" element={<ManagerPlaceholder title="Settings / Profile" />} />
          <Route path="*" element={<Navigate to="/sub-admin" replace />} />
        </Routes>
      </Suspense>
    </RouteErrorBoundary>
  );
}
