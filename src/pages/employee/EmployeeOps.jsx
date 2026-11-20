import { useLocation } from "react-router-dom";
import OpsRoutes from "../../modules/ops/OpsRoutes";

export default function EmployeeOps() {
  const { pathname, search } = useLocation();
  const section = pathname.split("/")[3] || "dashboard";
  const processing = section === "cases" && new URLSearchParams(search).get("view") === "processing";
  const activePage = processing ? "ops-case-processing" : `ops-${section}`;

  return (
    <div className="employee-page-content">
      <OpsRoutes />
    </div>
  );
}
