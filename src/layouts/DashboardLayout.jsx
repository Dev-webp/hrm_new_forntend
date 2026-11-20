import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import UnifiedSidebar from "../components/UnifiedSidebar";
import EmployeeSidebar from "../components/EmployeeSidebar";
import LiveNotificationToast from "../components/LiveNotificationToast";
import { getStoredRole } from "../utils/auth";
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

  return (
    <div className="app-layout">
      <Sidebar role={role} />

      <div className="main-panel">
        {children ?? <Outlet />}
      </div>

      {role !== "sub-admin" && getStoredRole() !== "HR" && <LiveNotificationToast />}
    </div>
  );
}

export default DashboardLayout;