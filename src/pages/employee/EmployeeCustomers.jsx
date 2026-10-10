import EmployeeSidebar from "../../components/EmployeeSidebar";
import Customers from "../../modules/crm/Customers";

export default function EmployeeCustomers() {
  return (
    <div className="employee-page-shell">
      <EmployeeSidebar activePage="customers" />
      <div className="employee-page-content">
        <Customers />
      </div>
    </div>
  );
}