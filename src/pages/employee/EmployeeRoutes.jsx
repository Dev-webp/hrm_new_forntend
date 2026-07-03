import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import PageLoading from "../../components/PageLoading";
import RouteErrorBoundary from "../../components/RouteErrorBoundary";
import { getStoredRole } from "../../utils/auth";

const EmployeeAttendance = lazy(() => import("./EmployeeAttendance"));
const EmployeeBreaks = lazy(() => import("./EmployeeBreaks"));
const EmployeeDashboard = lazy(() => import("./EmployeeDashboard"));
const EmployeeLeave = lazy(() => import("./EmployeeLeave"));
const EmployeeMessages = lazy(() => import("./EmployeeMessages"));
const EmployeePayslip = lazy(() => import("./EmployeePayslip"));
const EmployeeInstructions = lazy(() => import("./EmployeeInstructions"));
const EmployeeHelpCenter = lazy(() => import("./EmployeeHelpCenter"));

export default function EmployeeRoutes() {
  const role = getStoredRole();
  if (role === "SUB_ADMIN") {
    return <Navigate to="/sub-admin" replace />;
  }

  return (
    <RouteErrorBoundary title="Employee module error">
      <Suspense fallback={<PageLoading label="Loading employee module..." />}>
        <Routes>
          <Route path="dashboard" element={<EmployeeDashboard />} />
          <Route path="attendance" element={<EmployeeAttendance />} />
          <Route path="breaks" element={<EmployeeBreaks />} />
          <Route path="leave" element={<EmployeeLeave />} />
          <Route path="messages" element={<EmployeeMessages />} />
          <Route path="payslip" element={<EmployeePayslip />} />
          <Route path="instructions" element={<EmployeeInstructions />} />
          <Route path="help-center" element={<EmployeeHelpCenter />} />
          <Route index element={<Navigate to="dashboard" replace />} />
        </Routes>
      </Suspense>
    </RouteErrorBoundary>
  );
}
