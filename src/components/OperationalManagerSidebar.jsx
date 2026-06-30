import ManagerSidebar from "./ManagerSidebar";
import { OPERATIONAL_MANAGER_NAV } from "../config/operationalManagerNav";

function OperationalManagerSidebar() {
  return (
    <ManagerSidebar
      navItems={OPERATIONAL_MANAGER_NAV}
      roleLabel="Operational Manager"
      secureCode="OPS"
    />
  );
}

export default OperationalManagerSidebar;
