import DashboardLayout from "../layouts/DashboardLayout";
import EmptyState from "../components/EmptyState";

function Employee() {
  return (
    <DashboardLayout role="employee">
      <div className="scroll-content">
        <div className="panel" style={{ padding: 24 }}>
          <h2>Employee Panel</h2>
          <p style={{ color: "var(--muted)", marginTop: 8 }}>
            View attendance, leave, and payroll.
          </p>
          <EmptyState
            icon="fa-user"
            title="Employee module pending"
            message="The employee portal will be migrated from employeeattendance.html and related pages in a future step."
          />
        </div>
      </div>
    </DashboardLayout>
  );
}

export default Employee;
