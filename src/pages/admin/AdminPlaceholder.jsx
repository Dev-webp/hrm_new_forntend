import { useLocation } from "react-router-dom";
import EmptyState from "../../components/EmptyState";
import Navbar from "../../components/Navbar";
import { ADMIN_NAV } from "../../config/adminNav";

function AdminPlaceholder({ branch, month, onBranchChange, onMonthChange }) {
  const location = useLocation();

  const activeItem = ADMIN_NAV.flatMap((section) => section.items).find(
    (item) => item.path === location.pathname
  );

  const title = activeItem?.label || "Admin Module";

  return (
    <>
      <Navbar
        title={title}
        subtitle="This module is being migrated from the legacy HTML frontend"
        branch={branch}
        onBranchChange={onBranchChange}
        month={month}
        onMonthChange={onMonthChange}
      />

      <div className="scroll-content">
        <div className="panel" style={{ padding: "32px" }}>
          <EmptyState
            icon="fa-tools"
            title="Migration in progress"
            message={`${title} will be available in the next conversion step.`}
          />
        </div>
      </div>
    </>
  );
}

export default AdminPlaceholder;
