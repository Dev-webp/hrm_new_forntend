import { useCallback, useEffect, useMemo, useState } from "react";
import LeaveApprovalPreviewModal, { formatLeaveDuration } from "../../components/leaves/LeaveApprovalPreviewModal";
import {
  createLeaveRequest,
  deleteManagerLeaveRequest,
  fetchManagerLeaveApprovalPreview,
  fetchManagerLeaves,
  fetchMyLeaveBalance,
  fetchMyLeaves,
  updateManagerLeaveStatus,
} from "../../services/managerApi";
import { getStoredUser } from "../../utils/auth";
import DeleteLeaveConfirmModal from "../../components/leaves/DeleteLeaveConfirmModal";
import "./ManagerLeave.css";

const EMPTY_FORM = {
  leaveType: "Unpaid",
  usePaidLeave: false,
  duration: "full_day",
  halfDaySession: "morning",
  leaveFrom: "",
  leaveTo: "",
  reason: "",
};

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function statusLabel(status) {
  return status ? status.charAt(0).toUpperCase() + status.slice(1) : "—";
}



export default function ManagerLeave() {
  const manager = getStoredUser() || {};
  const [teamLeaves, setTeamLeaves] = useState([]);
  const [myLeaves, setMyLeaves] = useState([]);
  const [leaveBalance, setLeaveBalance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [durationFilter, setDurationFilter] = useState("all");
  const [applyOpen, setApplyOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState({ show: false, message: "", type: "" });
  const [approval, setApproval] = useState({ open: false, leave: null, preview: null, loading: false, error: "" });
  const [approving, setApproving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteSaving, setDeleteSaving] = useState(false);

  const showToast = useCallback((message, type = "success") => {
    setToast({ show: true, message, type });
    window.setTimeout(() => setToast({ show: false, message: "", type: "" }), 3200);
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const now = new Date();
      const [team, mine, balance] = await Promise.all([
        fetchManagerLeaves("all"),
        fetchMyLeaves(),
        fetchMyLeaveBalance(now.getFullYear(), now.getMonth() + 1),
      ]);
      setTeamLeaves(team);
      setMyLeaves(mine);
      setLeaveBalance(balance);
    } catch (error) {
      showToast(error.response?.data?.message || error.message || "Failed to load leaves", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { loadData(); }, [loadData]);

  const stats = useMemo(() => ({
    total: teamLeaves.length,
    pending: teamLeaves.filter((leave) => leave.status === "pending").length,
    approved: teamLeaves.filter((leave) => leave.status === "approved").length,
    rejected: teamLeaves.filter((leave) => leave.status === "rejected").length,
  }), [teamLeaves]);

  const filteredLeaves = useMemo(() => {
    const query = search.trim().toLowerCase();
    return teamLeaves.filter((leave) => {
      const duration = leave.leave_duration_type === "half_day"
        ? `half_day_${leave.half_day_session}`
        : "full_day";
      const matchesSearch = !query || [leave.full_name, leave.leave_type, leave.reason, leave.branch]
        .some((value) => String(value || "").toLowerCase().includes(query));
      return matchesSearch
        && (statusFilter === "all" || leave.status === statusFilter)
        && (durationFilter === "all" || duration === durationFilter);
    });
  }, [durationFilter, search, statusFilter, teamLeaves]);

  const openApproval = async (leave) => {
    setApproval({ open: true, leave, preview: null, loading: true, error: "" });
    try {
      const preview = await fetchManagerLeaveApprovalPreview(leave.id);
      setApproval((current) => ({ ...current, preview, loading: false }));
    } catch (error) {
      setApproval((current) => ({
        ...current,
        loading: false,
        error: error.response?.data?.message || "Could not calculate this leave request.",
      }));
    }
  };

  const confirmApproval = async () => {
    if (!approval.leave || !approval.preview) return;
    setApproving(true);
    try {
      const preview = approval.preview;
      await updateManagerLeaveStatus(approval.leave.id, "approved", {
        paid_days: preview.paid_days,
        unpaid_days: preview.unpaid_days,
        salary_deduction_days: preview.salary_deduction_days,
        leave_category: preview.final_category,
        include_sunday_penalty: preview.include_sunday_penalty,
        penalty_days: preview.penalty_days,
      });
      setApproval({ open: false, leave: null, preview: null, loading: false, error: "" });
      showToast(`Leave approved for ${approval.leave.full_name}`);
      await loadData();
    } catch (error) {
      showToast(error.response?.data?.message || "Approval failed", "error");
    } finally {
      setApproving(false);
    }
  };

  const rejectLeave = async (leave) => {
    const reason = window.prompt(`Reason for rejecting ${leave.full_name}'s leave:`);
    if (reason === null) return;
    if (reason.trim().length < 3) {
      showToast("Please enter a clear rejection reason.", "error");
      return;
    }
    try {
      await updateManagerLeaveStatus(leave.id, "rejected", { rejection_reason: reason.trim() });
      showToast(`Leave rejected for ${leave.full_name}`);
      await loadData();
    } catch (error) {
      showToast(error.response?.data?.message || "Rejection failed", "error");
    }
  };

  const submitLeave = async () => {
    const toDate = form.duration === "half_day" ? form.leaveFrom : form.leaveTo;
    if (!form.leaveFrom || !toDate || !form.reason.trim()) {
      showToast("Dates and reason are required.", "error");
      return;
    }
    setSubmitting(true);
    try {
      await createLeaveRequest({
        user_id: manager.id,
        leave_type: form.usePaidLeave ? "Paid" : form.leaveType,
        use_paid_leave: form.usePaidLeave,
        from_date: form.leaveFrom,
        to_date: toDate,
        reason: form.reason.trim(),
        leave_duration_type: form.duration,
        half_day_session: form.duration === "half_day" ? form.halfDaySession : null,
      });
      setApplyOpen(false);
      setForm(EMPTY_FORM);
      showToast("Leave request submitted.");
      await loadData();
    } catch (error) {
      showToast(error.response?.data?.message || error.message || "Submission failed", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget?.id) return;
    setDeleteSaving(true);
    try {
      await deleteManagerLeaveRequest(deleteTarget.id);
      showToast("Leave request deleted.");
      setDeleteTarget(null);
      await loadData();
    } catch (error) {
      showToast(error.response?.data?.message || "Failed to delete leave request", "error");
    } finally {
      setDeleteSaving(false);
    }
  };

  return (
    <div className="manager-leave-page manager-portal-page">
      <header className="manager-leave-header">
        <div><span className="manager-leave-eyebrow">Team operations</span><h1>Leave Management</h1><p>{manager.branch || "Your branch"} · Review team requests and track your leave.</p></div>
        <button type="button" className="manager-leave-apply" onClick={() => setApplyOpen(true)}><i className="fas fa-plus" /> Apply Leave</button>
      </header>

      <section className="manager-leave-kpis" aria-label="Leave summary">
        {[['Total Requests', stats.total, 'fa-layer-group'], ['Pending', stats.pending, 'fa-clock'], ['Approved', stats.approved, 'fa-check-circle'], ['Rejected', stats.rejected, 'fa-times-circle']].map(([label, value, icon]) => (
          <article className="manager-leave-kpi" key={label}><i className={`fas ${icon}`} /><div><span>{label}</span><strong>{loading ? "—" : value}</strong></div></article>
        ))}
      </section>

      <section className="manager-leave-balance">
        <div><span>Available paid leave</span><strong>{leaveBalance?.paid_leave_balance ?? 0}</strong></div>
        <div><span>Paid leave used</span><strong>{leaveBalance?.paid_used ?? 0}</strong></div>
        <div><span>Unpaid leave used</span><strong>{leaveBalance?.unpaid_used ?? 0}</strong></div>
      </section>

      <section className="manager-leave-panel">
        <div className="manager-leave-panel-heading"><div><h2>Team Leave Requests</h2><p>Showing {filteredLeaves.length} of {teamLeaves.length} requests</p></div></div>
        <div className="manager-leave-toolbar">
          <label className="manager-leave-search"><i className="fas fa-search" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search employee, type, or reason" /></label>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filter by status"><option value="all">All Statuses</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option></select>
          <select value={durationFilter} onChange={(event) => setDurationFilter(event.target.value)} aria-label="Filter by duration"><option value="all">All Durations</option><option value="full_day">Full Day</option><option value="half_day_morning">Half Day Morning</option><option value="half_day_afternoon">Half Day Afternoon</option></select>
        </div>

    <div className="manager-leave-table-wrap">
  <table className="manager-leave-table">
    <thead>
      <tr>
        <th>Employee</th>
        <th>Branch</th>
        <th>Leave Type</th>
        <th>Duration</th>
        <th>From</th>
        <th>To</th>
        <th>Requested</th>
        <th>Paid</th>
        <th>Unpaid</th>
        <th>Used Paid</th>
        <th>Paid Balance</th>
        <th>Reason</th>
        <th>Status</th>
        <th>Action</th>
      </tr>
    </thead>

    <tbody>
      {loading ? (
        <tr>
          <td colSpan={14} className="manager-leave-empty">
            <i className="fas fa-spinner fa-spin" /> Loading requests…
          </td>
        </tr>
      ) : filteredLeaves.length ? (
        filteredLeaves.map((leave) => (
          <tr key={leave.id}>
            <td className="employee-cell">
              <i className="fas fa-user-circle" /> {leave.full_name}
            </td>
            <td>{leave.branch || "—"}</td>
            <td>{leave.leave_type}</td>
            <td>{formatLeaveDuration(leave)}</td>
            <td>{formatDate(leave.from_date)}</td>
            <td>{formatDate(leave.to_date)}</td>
            <td>{leave.requested_days ?? leave.days ?? "—"}</td>
            <td>{leave.paid_days ?? "0.0"}</td>
            <td>{leave.unpaid_days ?? "0.0"}</td>
            <td>{leave.use_paid_leave ? "Yes" : "No"}</td>
            <td>{leave.remaining_paid_balance ?? "0.0"}</td>
            <td className="reason-cell">{leave.reason || "—"}</td>
            <td>
              <span className={`manager-leave-status ${leave.status}`}>
                {statusLabel(leave.status)}
              </span>
            </td>
            <td>
              {leave.status === "pending" ? (
                <div className="table-actions">
                  <button
                    type="button"
                    className="approve-icon"
                    onClick={() => openApproval(leave)}
                    title="Approve"
                  >
                    <i className="fas fa-check" />
                  </button>

                  <button
                    type="button"
                    className="reject-icon"
                    onClick={() => rejectLeave(leave)}
                    title="Reject"
                  >
                    <i className="fas fa-times" />
                  </button>
                  <button
                    type="button"
                    className="delete-icon"
                    onClick={() => setDeleteTarget(leave)}
                    title="Delete Leave Request"
                  >
                    <i className="fas fa-trash-alt" />
                  </button>
                </div>
              ) : (
                <>
                <span className="reviewed-text">
                  {leave.approved_by_name || "—"}
                </span>
                <button
                  type="button"
                  className="delete-icon"
                  onClick={() => setDeleteTarget(leave)}
                  title="Delete Leave Request"
                >
                  <i className="fas fa-trash-alt" />
                </button>
                </>
              )}
            </td>
          </tr>
        ))
      ) : (
        <tr>
          <td colSpan="14" className="manager-leave-empty">
            <i className="fas fa-inbox" /> No leave requests match these filters.
          </td>
        </tr>
      )}
    </tbody>
  </table>
</div>

      </section>

<section className="manager-leave-panel manager-my-leaves">
  <div className="manager-leave-panel-heading">
    <div>
      <h2>My Leave History</h2>
      <p>Your latest requests and outcomes</p>
    </div>
  </div>

  <div className="manager-leave-table-wrap">
    <table className="manager-leave-table manager-my-leave-table">
      <thead>
        <tr>
          <th>Leave Type</th>
          <th>Duration</th>
          <th>From</th>
          <th>To</th>
          <th>Requested</th>
          <th>Paid</th>
          <th>Unpaid</th>
          <th>Used Paid</th>
          <th>Paid Balance</th>
          <th>Reason</th>
          <th>Status</th>
          <th>Action</th>
        </tr>
      </thead>

      <tbody>
        {myLeaves.length ? (
          myLeaves.map((leave) => (
            <tr key={leave.id}>
              <td>{leave.leave_type || "—"}</td>
              <td>{formatLeaveDuration(leave)}</td>
              <td>{formatDate(leave.from_date)}</td>
              <td>{formatDate(leave.to_date)}</td>
              <td>{leave.requested_days ?? leave.days ?? "—"}</td>
              <td>{leave.paid_days ?? "0.0"}</td>
              <td>{leave.unpaid_days ?? "0.0"}</td>
              <td>{leave.use_paid_leave ? "Yes" : "No"}</td>
              <td>{leave.remaining_paid_balance ?? "0.0"}</td>
              <td className="reason-cell">{leave.reason || "—"}</td>
              <td>
                <span className={`manager-leave-status ${leave.status}`}>
                  {statusLabel(leave.status)}
                </span>
              </td>
              <td>
                {leave.status === "pending" ? (
                  <button
                    type="button"
                    className="delete-icon"
                    onClick={() => setDeleteTarget(leave)}
                    title="Delete Leave Request"
                  >
                    <i className="fas fa-trash-alt" />
                  </button>
                ) : (
                  "—"
                )}
              </td>
            </tr>
          ))
        ) : (
          <tr>
            <td colSpan={12} className="manager-leave-empty">
              No leave requests yet.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  </div>
</section>




      {applyOpen ? <div className="manager-leave-modal-overlay" onMouseDown={() => setApplyOpen(false)}><section className="manager-leave-apply-modal" onMouseDown={(event) => event.stopPropagation()}><h2>Apply for Leave</h2><div className="manager-leave-form-grid"><label>Leave Type<select value={form.leaveType} onChange={(event) => setForm({ ...form, leaveType: event.target.value })}><option value="Unpaid">Unpaid Leave</option><option value="Sick">Sick Leave</option><option value="Casual">Casual Leave</option><option value="Emergency">Emergency Leave</option></select></label><label>Use my available paid leave?<select value={form.usePaidLeave ? "yes" : "no"} onChange={(event) => setForm({ ...form, usePaidLeave: event.target.value === "yes" })}><option value="no">No</option><option value="yes">Yes</option></select></label><label>Duration<select value={form.duration} onChange={(event) => setForm({ ...form, duration: event.target.value })}><option value="full_day">Full Day</option><option value="half_day">Half Day</option></select></label>{form.duration === "half_day" ? <label>Session<select value={form.halfDaySession} onChange={(event) => setForm({ ...form, halfDaySession: event.target.value })}><option value="morning">Morning</option><option value="afternoon">Afternoon</option></select></label> : null}<label>From Date<input type="date" value={form.leaveFrom} onChange={(event) => setForm({ ...form, leaveFrom: event.target.value })} /></label>{form.duration === "full_day" ? <label>To Date<input type="date" min={form.leaveFrom} value={form.leaveTo} onChange={(event) => setForm({ ...form, leaveTo: event.target.value })} /></label> : null}<label className="wide">Reason<textarea value={form.reason} onChange={(event) => setForm({ ...form, reason: event.target.value })} /></label></div><div className="manager-leave-modal-actions"><button type="button" className="cancel" onClick={() => setApplyOpen(false)}>Cancel</button><button type="button" className="submit" onClick={submitLeave} disabled={submitting}>{submitting ? "Submitting…" : "Submit Request"}</button></div></section></div> : null}

      <LeaveApprovalPreviewModal open={approval.open} preview={approval.preview} loading={approval.loading} error={approval.error} saving={approving} onClose={() => !approving && setApproval({ open: false, leave: null, preview: null, loading: false, error: "" })} onConfirm={confirmApproval} />
      <DeleteLeaveConfirmModal open={Boolean(deleteTarget)} leave={deleteTarget} saving={deleteSaving} onClose={() => !deleteSaving && setDeleteTarget(null)} onConfirm={confirmDelete} />
      {toast.show ? <div className={`manager-leave-toast ${toast.type}`}>{toast.message}</div> : null}
    </div>
  );
}
