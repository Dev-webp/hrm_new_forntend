import "./LeaveApprovalPreviewModal.css";

export function formatLeaveDuration(leave) {
  if ((leave?.leave_duration_type || "full_day") !== "half_day") return "Full Day";
  return leave.half_day_session === "morning"
    ? "Half Day Morning"
    : "Half Day Afternoon";
}

function PreviewItem({ label, value, tone = "" }) {
  return (
    <div className={`leave-preview-item ${tone}`}>
      <span>{label}</span>
      <strong>{value ?? "—"}</strong>
    </div>
  );
}

export default function LeaveApprovalPreviewModal({
  open,
  preview,
  loading,
  error,
  saving,
  onClose,
  onConfirm,
}) {
  if (!open) return null;
  return (
    <div className="leave-preview-overlay" role="presentation" onMouseDown={onClose}>
      <section
        className="leave-preview-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="leave-preview-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="leave-preview-header">
          <div>
            <span className="leave-preview-eyebrow">Approval review</span>
            <h2 id="leave-preview-title">Leave Balance Preview</h2>
          </div>
          <button type="button" className="leave-preview-close" onClick={onClose} disabled={saving} aria-label="Close">
            <i className="fas fa-times" />
          </button>
        </header>

        {loading ? (
          <div className="leave-preview-state"><i className="fas fa-spinner fa-spin" /> Calculating leave policy…</div>
        ) : error ? (
          <div className="leave-preview-state error">{error}</div>
        ) : preview ? (
          <>
            <div className="leave-preview-employee">
              <div className="leave-preview-avatar"><i className="fas fa-user" /></div>
              <div><span>Employee</span><strong>{preview.employee_name}</strong></div>
              <span className="leave-preview-category">{preview.final_category}</span>
            </div>
            <div className="leave-preview-grid">
              <PreviewItem label="Leave type" value={preview.leave_type} />
              <PreviewItem label="Duration" value={formatLeaveDuration(preview)} />
              <PreviewItem label="Requested leaves" value={preview.requested_days} />
              <PreviewItem label="Available paid balance" value={preview.available_paid_balance} />
              <PreviewItem label="Paid leaves used" value={preview.paid_days} tone="success" />
              <PreviewItem label="Unpaid leaves" value={preview.unpaid_days} tone={preview.unpaid_days > 0 ? "danger" : ""} />
              <PreviewItem label="Salary deduction days" value={preview.salary_deduction_days} tone={preview.salary_deduction_days > 0 ? "danger" : ""} />
              <PreviewItem label="Penalty days" value={preview.penalty_days} />
              <PreviewItem label="Sunday penalty" value={preview.include_sunday_penalty ? "Applied" : "Not applied"} />
              <PreviewItem label="Sudden leave penalty" value={preview.sudden_leave_penalty ? "Applied" : "Not applied"} />
            </div>
            <div className="leave-preview-policy">
              <i className="fas fa-shield-alt" />
              <div><span>Policy reason</span><strong>{preview.policy_reason}</strong></div>
            </div>
            {!preview.can_approve ? (
              <div className="leave-preview-warning">Insufficient paid leave balance. This request cannot be approved.</div>
            ) : null}
          </>
        ) : null}

        <footer className="leave-preview-actions">
          <button type="button" className="leave-preview-cancel" onClick={onClose} disabled={saving}>Cancel</button>
          <button
            type="button"
            className="leave-preview-confirm"
            onClick={onConfirm}
            disabled={saving || loading || Boolean(error) || !preview?.can_approve}
          >
            {saving ? "Approving…" : "Confirm Approve"}
          </button>
        </footer>
      </section>
    </div>
  );
}
