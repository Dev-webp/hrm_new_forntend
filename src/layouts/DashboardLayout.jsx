import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import UnifiedSidebar from "../components/UnifiedSidebar";
import LiveNotificationToast from "../components/LiveNotificationToast";
import "../styles/admin.css";

function DashboardLayout({ role = "admin", children = null }) {
  useEffect(() => {
    document.body.classList.add("hrms-dashboard");

    return () => {
      document.body.classList.remove("hrms-dashboard");
    };
  }, []);

  return (
    <div className="app-layout">
      <UnifiedSidebar role={role} />

      <div className="main-panel">
        {children ?? <Outlet />}
      </div>

      {role !== "sub-admin" && <LiveNotificationToast />}
    </div>
  );
}

export default DashboardLayout;