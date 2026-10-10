import EmployeeSidebar from "../../components/EmployeeSidebar";
import Invoices from "../../modules/invoice/Invoices";
import "../../styles/EmployeeSidebar.css";

export default function EmployeeInvoices() {
  return (
    <div className="employee-page-shell">
      <EmployeeSidebar activePage="invoices" />
      <div className="employee-page-content">
        <Invoices />
      </div>
    </div>
  );
}