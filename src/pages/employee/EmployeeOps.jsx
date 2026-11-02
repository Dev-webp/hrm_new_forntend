import { useLocation } from "react-router-dom";
import EmployeeSidebar from "../../components/EmployeeSidebar";
import OpsRoutes from "../../modules/ops/OpsRoutes";

// Employees get the OPS pages inside their own page shell, like every other
// employee page, so the employee sidebar stays on screen.
export default function EmployeeOps() {
  const { pathname, search } = useLocation();
  const section = pathname.split("/")[3] || "dashboard";
  const processing = section === "cases" && new URLSearchParams(search).get("view") === "processing";
  const activePage = processing ? "ops-case-processing" : `ops-${section}`;

  return (
    <div className="employee-page-shell">
      <EmployeeSidebar activePage={activePage} />
      <div className="employee-page-content">
        <OpsRoutes />
      </div>
    </div>
  );
}
