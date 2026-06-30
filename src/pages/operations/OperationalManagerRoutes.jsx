import { Navigate, Route, Routes } from "react-router-dom";
import RouteErrorBoundary from "../../components/RouteErrorBoundary";
import AdminAttendanceAnalysis from "../admin/AdminAttendanceAnalysis";
import AdminCalendar from "../admin/AdminCalendar";
import AdminDashboard from "../admin/AdminDashboard";
import AdminLeave from "../admin/AdminLeave";
import EmployeePayslip from "../employee/EmployeePayslip";
import ManagerAttendance from "../manager/ManagerAttendance";
import ManagerBreaks from "../manager/ManagerBreaks";
import ManagerDepartment from "../manager/ManagerDepartment";
import ManagerEmployee from "../manager/ManagerEmployee";
import ManagerNotifications from "../manager/ManagerNotifications";
import ManagerPlaceholder from "../manager/ManagerPlaceholder";

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
    </RouteErrorBoundary>
  );
}

export default OperationalManagerRoutes;
