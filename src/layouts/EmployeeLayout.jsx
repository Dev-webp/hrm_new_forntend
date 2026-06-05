import { useEffect } from "react";
import { Outlet } from "react-router-dom";

function EmployeeLayout() {
  useEffect(() => {
    document.body.classList.add("hrms-dashboard");
    return () => document.body.classList.remove("hrms-dashboard");
  }, []);

  return <Outlet />;
}

export default EmployeeLayout;
