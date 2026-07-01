import "./DeleteLeaveConfirmModal.css";

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function DeleteLeaveConfirmModal({
  open,
  leave,
  saving = false,
  onClose,
  onConfirm,
}) {
  if (!open || !leave) return null;

  const employeeName = leave.full_name || leave.employee_name || "this employee";

  return (
    <div className="delete-leave-overlay" role="presentation" onMouseDown={onClose}>
      <section
        className="delete-leave-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-leave-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="delete-leave-icon">
          <i className="fas fa-trash-alt" />
        </div>

        <div className="delete-leave-body">
          <span className="delete-leave-eyebrow">Permanent action</span>
          <h2 id="delete-leave-title">Delete Leave Request</h2>
          <p>
            Are you sure you want to delete this leave request? This action
            cannot be undone.
          </p>

          <div className="delete-leave-summary">
            <div>
              <span>Employee</span>
              <strong>{employeeName}</strong>
            </div>
            <div>
              <span>Leave Type</span>
              <strong>{leave.leave_type || "—"}</strong>
            </div>
            <div>
              <span>Dates</span>
              <strong>
                {formatDate(leave.from_date)} → {formatDate(leave.to_date)}
              </strong>
            </div>
            <div>
              <span>Status</span>
              <strong>{leave.status || "—"}</strong>
            </div>
          </div>
        </div>

        <footer className="delete-leave-actions">
          <button type="button" className="delete-leave-cancel" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="button" className="delete-leave-confirm" onClick={onConfirm} disabled={saving}>
            {saving ? "Deleting..." : "Delete"}
          </button>
        </footer>
      </section>
    </div>
  );
}
