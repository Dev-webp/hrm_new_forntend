import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import UnifiedSidebar from "../components/UnifiedSidebar";
import EmployeeSidebar from "../components/EmployeeSidebar";
import LiveNotificationToast from "../components/LiveNotificationToast";
import ScreenTimeTracker from "../components/ScreenTimeTracker";
import { getStoredRole, getStoredUser } from "../utils/auth";
import "../styles/admin.css";

function DashboardLayout({ role = "admin", children = null }) {
  useEffect(() => {
    document.body.classList.add("hrms-dashboard");

    return () => {
      document.body.classList.remove("hrms-dashboard");
    };
  }, []);

  // Use EmployeeSidebar for employee role, UnifiedSidebar for others
  const Sidebar = role === "employee" ? EmployeeSidebar : UnifiedSidebar;
  const user = getStoredUser();
  const userRole = getStoredRole();

  // Show screen timer on specific dashboards: Admin, HR, Sub-admin, Manager, Employee, Operational Manager
  const shouldShowScreenTimer = [
    "admin",
    "HR",
    "sub-admin",
    "manager",
    "employee",
    "operational-manager"
  ].includes(role) || [
    "admin",
    "HR",
    "sub-admin",
    "manager",
    "employee",
    "operational-manager"
  ].includes(userRole);

  return (
    <div className="app-layout">
      <Sidebar role={role} />

      <div className="main-panel">
        {children ?? <Outlet />}
      </div>

      {role !== "sub-admin" && userRole !== "HR" && <LiveNotificationToast />}
      
      {/* Screen Time Tracker - only on Admin, HR, Sub-admin, Manager, Employee dashboards */}
      {user?.id && shouldShowScreenTimer && <ScreenTimeTracker userId={user.id} />}
    </div>
  );
}

export default DashboardLayout;