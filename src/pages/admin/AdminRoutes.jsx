import { lazy, Suspense, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import PageLoading from "../../components/PageLoading";
import RouteErrorBoundary from "../../components/RouteErrorBoundary";
import { getPlaceholderAdminRoutes } from "../../config/adminNav";
import AdminPlaceholder from "./AdminPlaceholder";

const AdminAttendance = lazy(() => import("./AdminAttendance"));
const AdminAttendanceAnalysis = lazy(() => import("./AdminAttendanceAnalysis"));
const AdminBreaks = lazy(() => import("./AdminBreaks"));
const AdminCalendar = lazy(() => import("./AdminCalendar"));
const AdminDashboard = lazy(() => import("./AdminDashboard"));
const AdminEmployees = lazy(() => import("./AdminEmployees"));
const AdminLeave = lazy(() => import("./AdminLeave"));
const AdminActivityLogs = lazy(() => import("./AdminActivityLogs"));
const AdminDepartment = lazy(() => import("./AdminDepartment"));
const AdminNotifications = lazy(() => import("./AdminNotifications"));
const AdminPayslip = lazy(() => import("./AdminPayslip"));
const AdminOfferLetters = lazy(() => import("./AdminOfferLetters"));

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
      <Suspense fallback={<PageLoading label="Loading admin module…" />}>
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
      </Suspense>
    </RouteErrorBoundary>
  );
}

export default AdminRoutes;
