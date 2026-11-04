import EmployeeSidebar from "../../components/EmployeeSidebar";
import Quotes from "../../modules/invoice/Quotes";
import "../../styles/EmployeeSidebar.css";

export default function EmployeeQuotes() {
  return (
    <div className="employee-page-shell">
      <EmployeeSidebar activePage="quotes" />
      <div className="employee-page-content">
        <Quotes />
      </div>
    </div>
  );
}