import { useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import RouteErrorBoundary from "../../components/RouteErrorBoundary";
import { getPlaceholderAdminRoutes } from "../../config/adminNav";
import AdminAttendance from "./AdminAttendance";
import AdminAttendanceAnalysis from "./AdminAttendanceAnalysis";
import AdminBreaks from "./AdminBreaks";
import AdminCalendar from "./AdminCalendar";
import AdminDashboard from "./AdminDashboard";
import AdminEmployees from "./AdminEmployees";
import AdminLeave from "./AdminLeave";
import AdminActivityLogs from "./AdminActivityLogs";
import AdminDepartment from "./AdminDepartment";
import AdminNotifications from "./AdminNotifications";
import AdminPayslip from "./AdminPayslip";
import AdminPlaceholder from "./AdminPlaceholder";
import AdminOfferLetters from "./AdminOfferLetters";

function AdminRoutes() {
  const role = JSON.parse(localStorage.getItem("user") || "{}")?.role;
  if (role === "SUB_ADMIN") {
    return <Navigate to="/sub-admin" replace />;
  }
  if (role && role !== "SUPER_ADMIN") {
    return <Navigate to="/home" replace />;
  }

  const today = new Date();
  const [currentBranch, setCurrentBranch] = useState("all");
  const [currentMonthStr, setCurrentMonthStr] = useState(() => {
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}`;
  });

  const placeholderSlugs = getPlaceholderAdminRoutes().map((path) =>
    path.replace("/admin/", "")
  );

  const placeholderProps = {
    branch: currentBranch,
    month: currentMonthStr,
    onBranchChange: setCurrentBranch,
    onMonthChange: setCurrentMonthStr,
  };

  return (
    <RouteErrorBoundary title="Admin module error">
      <Routes>
        <Route index element={<AdminDashboard />} />
        <Route path="employees" element={<AdminEmployees />} />
        <Route path="attendance" element={<AdminAttendance />} />
        <Route path="breaks" element={<AdminBreaks />} />
        <Route path="calendar" element={<AdminCalendar />} />
        <Route path="leave" element={<AdminLeave />} />
        <Route path="offer-letters" element={<AdminOfferLetters />} />
        <Route path="payroll" element={<AdminPayslip />} />
        <Route path="notifications" element={<AdminNotifications />} />
        <Route path="activity-logs" element={<AdminActivityLogs />} />
        <Route path="department" element={<AdminDepartment />} />
        <Route
          path="attendance-analysis"
          element={<AdminAttendanceAnalysis />}
        />

        {placeholderSlugs.map((slug) => (
          <Route
            key={slug}
            path={slug}
            element={<AdminPlaceholder {...placeholderProps} />}
          />
        ))}

        {/* Catch unknown /admin/* paths — avoids blank outlet */}
        <Route path="*" element={<AdminPlaceholder {...placeholderProps} />} />
      </Routes>
    </RouteErrorBoundary>
  );
}

export default AdminRoutes;
