import EmployeeSidebar from "../../components/EmployeeSidebar";
import Leads from "../../modules/crm/Leads";
import "../../styles/EmployeeSidebar.css";

export default function EmployeeLeads() {
  return (
    <div className="employee-page-shell">
      <EmployeeSidebar activePage="leads" />
      <div className="employee-page-content">
        <Leads />
      </div>
    </div>
  );
}