import EmployeeSidebar from "../../components/EmployeeSidebar";
import Items from "../../modules/invoice/Items";
import "../../styles/EmployeeSidebar.css";

export default function EmployeeItems() {
  return (
    <div className="employee-page-shell">
      <EmployeeSidebar activePage="items" />
      <div className="employee-page-content">
        <Items />
      </div>
    </div>
  );
}