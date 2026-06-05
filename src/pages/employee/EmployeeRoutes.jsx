import { Navigate, Route, Routes } from "react-router-dom";
import EmployeeAttendance from "./EmployeeAttendance";
import EmployeeBreaks from "./EmployeeBreaks";
import EmployeeDashboard from "./EmployeeDashboard";
import EmployeeLeave from "./EmployeeLeave";
import EmployeePayslip from "./EmployeePayslip";

export default function EmployeeRoutes() {
  return (
    <Routes>
      <Route path="dashboard" element={<EmployeeDashboard />} />
      <Route path="attendance" element={<EmployeeAttendance />} />
      <Route path="breaks" element={<EmployeeBreaks />} />
      <Route path="leave" element={<EmployeeLeave />} />
      <Route path="payslip" element={<EmployeePayslip />} />
      <Route index element={<Navigate to="dashboard" replace />} />
    </Routes>
  );
}
