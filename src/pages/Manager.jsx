import DashboardLayout from "../layouts/DashboardLayout";
import EmptyState from "../components/EmptyState";

function Manager() {
  return (
    <DashboardLayout role="manager">
      <div className="scroll-content">
        <div className="panel" style={{ padding: 24 }}>
          <h2>Manager Controls</h2>
          <p style={{ color: "var(--muted)", marginTop: 8 }}>
            Approve attendance and leaves.
          </p>
          <EmptyState
            icon="fa-hard-hat"
            title="Manager module pending"
            message="The manager dashboard will be migrated from managerattendance.html and related pages in a future step."
          />
        </div>
      </div>
    </DashboardLayout>
  );
}

export default Manager;
