import { Navigate, Route, Routes } from "react-router-dom";
import EmployeeAttendance from "./EmployeeAttendance";
import EmployeeBreaks from "./EmployeeBreaks";
import EmployeeDashboard from "./EmployeeDashboard";
import EmployeeLeave from "./EmployeeLeave";
import EmployeeMessages from "./EmployeeMessages";
import EmployeePayslip from "./EmployeePayslip";
import EmployeeInstructions from "./EmployeeInstructions";
import EmployeeHelpCenter from "./EmployeeHelpCenter";

export default function EmployeeRoutes() {
  const role = JSON.parse(localStorage.getItem("user") || "{}")?.role;
  if (role === "SUB_ADMIN") {
    return <Navigate to="/sub-admin" replace />;
  }

  return (
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
  );
}
