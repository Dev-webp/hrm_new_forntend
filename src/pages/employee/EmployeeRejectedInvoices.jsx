import EmployeeSidebar from "../../components/EmployeeSidebar";
import RejectedInvoices from "../../modules/invoice/RejectedInvoices";
import "../../styles/EmployeeSidebar.css";

export default function EmployeeRejectedInvoices() {
  return (
    <div className="employee-page-shell">
      <EmployeeSidebar activePage="rejected-invoices" />
      <div className="employee-page-content">
        <RejectedInvoices />
      </div>
    </div>
  );
}
