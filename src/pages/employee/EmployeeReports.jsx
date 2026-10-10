import EmployeeSidebar from "../../components/EmployeeSidebar";
import Reports from "../../modules/invoice/Reports";

export default function EmployeeReports() {
  return (
    <div className="employee-page-shell">
      <EmployeeSidebar activePage="reports" />
      <div className="employee-page-content">
        <Reports />
      </div>
    </div>
  );
}