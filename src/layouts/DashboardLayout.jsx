import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import ManagerSidebar from "../components/ManagerSidebar";
import Sidebar from "../components/Sidebar";
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
      {role === "manager" ? <ManagerSidebar /> : <Sidebar role={role} />}

      <div className="main-panel">
        {children ?? <Outlet />}
      </div>

      <LiveNotificationToast />
    </div>
  );
}

export default DashboardLayout;