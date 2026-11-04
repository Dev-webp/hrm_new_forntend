import EmployeeSidebar from "../../components/EmployeeSidebar";
import Payments from "../../modules/invoice/Payments";
import "../../styles/EmployeeSidebar.css";

export default function EmployeePayments() {
  return (
    <div className="employee-page-shell">
      <EmployeeSidebar activePage="payments" />
      <div className="employee-page-content">
        <Payments />
      </div>
    </div>
  );
}