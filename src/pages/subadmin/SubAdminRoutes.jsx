import { Navigate, Route, Routes } from "react-router-dom";
import RouteErrorBoundary from "../../components/RouteErrorBoundary";
import EmployeeAttendance from "../employee/EmployeeAttendance";
import EmployeeDashboard from "../employee/EmployeeDashboard";
import EmployeeLeave from "../employee/EmployeeLeave";
import EmployeePayslip from "../employee/EmployeePayslip";
import ManagerAttendance from "../manager/ManagerAttendance";
import ManagerBreaks from "../manager/ManagerBreaks";
import ManagerPlaceholder from "../manager/ManagerPlaceholder";

export default function SubAdminRoutes() {
  return (
    <RouteErrorBoundary title="Sub Admin module error">
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
    </RouteErrorBoundary>
  );
}
