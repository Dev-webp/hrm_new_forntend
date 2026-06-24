import { useCallback, useEffect, useRef, useState } from "react";


import {
  fetchLeaveRequests,
  fetchLeaveStats,
  updateLeaveRequest,
  fetchLeaveApprovalPreview,
} from "../../services/leaveApi";
import LeaveApprovalPreviewModal from "../../components/leaves/LeaveApprovalPreviewModal";

import "../../styles/adminLeave.css";



function formatDate(dateString) {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatLeaveDuration(request) {
  if ((request.leave_duration_type || "full_day") !== "half_day") return "Full Day";
  return request.half_day_session === "morning"
    ? "Half Day Morning"
    : "Half Day Afternoon";
}

function AdminLeave() {
  const [currentBranch, setCurrentBranch] = useState("all");
const [currentDate, setCurrentDate] = useState("");
const [statusFilter, setStatusFilter] = useState("all");
const [durationFilter, setDurationFilter] = useState("all");


  const [leaveRequests, setLeaveRequests] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [branchMenuOpen, setBranchMenuOpen] = useState(false);
  const [toast, setToast] = useState({ show: false, message: "" });
const [approvalPreview, setApprovalPreview] = useState(null);
const [previewLoading, setPreviewLoading] = useState(false);


  const [actionModal, setActionModal] = useState({
    open: false,
    leaveId: null,
    employeeName: "",
    action: "", // "approve" or "reject"
    reason: "",
  });
  const [saving, setSaving] = useState(false);

  const branchDropdownRef = useRef(null);

  // Close branch menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        branchDropdownRef.current &&
        !branchDropdownRef.current.contains(event.target)
      ) {
        setBranchMenuOpen(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  // Load data
  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [requestsData, statsData] = await Promise.all([
        fetchLeaveRequests(currentDate, currentBranch),
        fetchLeaveStats(currentDate, currentBranch),
      ]);

      setLeaveRequests(requestsData);
      setStats(statsData);
    } catch (err) {
      const message =
        err.response?.data?.message || err.message || "Failed to load data";
      setError(message);
      setLeaveRequests([]);
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [currentDate, currentBranch]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Show toast
  const showToast = (message) => {
    setToast({ show: true, message });
    setTimeout(() => setToast({ show: false, message: "" }), 2500);
  };

  // Branch selection
  const handleBranchSelect = (branch) => {
    setCurrentBranch(branch);
    setBranchMenuOpen(false);
    const display =
      branch === "Hyderabad"
        ? "🏢 Hyderabad Branch"
        : branch === "Bangalore"
        ? "💻 Bangalore Tech Hub"
        : "🌍 All Branches";
    showToast(`Filter: ${display}`);
  };

  // Date change
  const handleDateChange = (e) => {
    setCurrentDate(e.target.value);
    showToast(`📅 Switched to ${e.target.value}`);
  };

const handleOpenAction = async (leaveId, employeeName, action) => {
  setActionModal({
    open: true,
    leaveId,
    employeeName,
    action,
    reason: "",
  });

  setApprovalPreview(null);

  if (action === "approved") {
    setPreviewLoading(true);
    try {
      const preview = await fetchLeaveApprovalPreview(leaveId);
      setApprovalPreview(preview);
    } catch (err) {
      window.alert(
        err.response?.data?.message || "Failed to load approval preview"
      );
    } finally {
      setPreviewLoading(false);
    }
  }
};


  // Close modal
  const handleCloseModal = () => {
    if (!saving) {
      setActionModal((prev) => ({ ...prev, open: false }));
    }
  };

  // Handle action submit
  const handleSubmitAction = async () => {
    if (actionModal.leaveId === null) return;

    setSaving(true);
    try {
      await updateLeaveRequest(
        actionModal.leaveId,
        actionModal.action,
        actionModal.reason,
        actionModal.action === "approved" && approvalPreview ? {
          paid_days: approvalPreview.paid_days,
          unpaid_days: approvalPreview.unpaid_days,
          salary_deduction_days: approvalPreview.salary_deduction_days,
          leave_category: approvalPreview.final_category,
          include_sunday_penalty: approvalPreview.include_sunday_penalty,
          penalty_days: approvalPreview.penalty_days,
        } : {}
      );
   showToast(
  `✅ Leave request ${actionModal.action === "approved" ? "approved" : "rejected"} for ${actionModal.employeeName}`
);
      setActionModal((prev) => ({ ...prev, open: false }));
      await loadData();
    } catch (err) {
const message =
  err.response?.data?.error ||
  err.response?.data?.message ||
  err.message ||
  "Update failed";
      window.alert(`Update failed: ${message}`);
    } finally {
      setSaving(false);
    }
  };

  const branchDisplay =
    currentBranch === "Hyderabad"
      ? "🏢 Hyderabad Branch"
      : currentBranch === "Bangalore"
      ? "💻 Bangalore Tech Hub"
      : "🌍 All Branches";

  const getStatusBadge = (status) => {
    const statusMap = {
      pending: { className: "pending", text: "Pending" },
      approved: { className: "approved", text: "Approved" },
      rejected: { className: "rejected", text: "Rejected" },
    };
    const config = statusMap[status] || statusMap.pending;
    return (
      <span className={`leave-status-badge ${config.className}`}>
        {config.text}
      </span>
    );
  };
  const filteredLeaveRequests = leaveRequests.filter((request) => {
    const statusMatches = statusFilter === "all" || request.status?.toLowerCase() === statusFilter;
    const durationKey = request.leave_duration_type === "half_day"
      ? `half_day_${request.half_day_session}`
      : "full_day";
    return statusMatches && (durationFilter === "all" || durationKey === durationFilter);
  });

  return (
    <div className="admin-leave-page admin-portal-page">
    <div className="header">
      <div className="title">
        <h1>
          <i className="fas fa-umbrella-beach"></i> Leave Management
        </h1>
        <p>Approve or reject employee leave requests</p>
      </div>

      <div className="controls">
        <div className="date-picker-wrapper">
          <i className="fas fa-calendar-alt"></i>

          <input
            type="date"
            id="leaveDate"
            value={currentDate}
            onChange={handleDateChange}
          />

          <button
            type="button"
            onClick={() => {
              setCurrentDate("");
              showToast("Showing all dates");
            }}
            className="all-dates-btn"
          >
            All Dates
          </button>
        </div>

        <div className="branch-dropdown" ref={branchDropdownRef}>
          <button
            type="button"
            className="branch-selector-btn"
            onClick={(e) => {
              e.stopPropagation();
              setBranchMenuOpen((open) => !open);
            }}
          >
            <i className="fas fa-store"></i>{" "}
            <span id="selectedBranchText">{branchDisplay}</span>{" "}
            <i className="fas fa-chevron-down"></i>
          </button>

          {branchMenuOpen && (
            <div className="branch-menu">
              <div className="branch-menu-item" onClick={() => handleBranchSelect("all")}>
                🌍 All Branches
              </div>
              <div className="branch-menu-item" onClick={() => handleBranchSelect("Hyderabad")}>
                🏢 Hyderabad Branch
              </div>
              <div className="branch-menu-item" onClick={() => handleBranchSelect("Bangalore")}>
                💻 Bangalore Tech Hub
              </div>
            </div>
          )}
        </div>
      </div>
    </div>

    <div className="stats-row">
      <div className="stat-card">
        <div className="stat-label">Total Requests</div>
        <div className="stat-number">{loading ? "-" : stats?.total || 0}</div>
      </div>

      <div className="stat-card">
        <div className="stat-label">Pending</div>
        <div className="stat-number">{loading ? "-" : stats?.pending || 0}</div>
      </div>

      <div className="stat-card">
        <div className="stat-label">Approved</div>
        <div className="stat-number">{loading ? "-" : stats?.approved || 0}</div>
      </div>

      <div className="stat-card">
        <div className="stat-label">Rejected</div>
        <div className="stat-number">{loading ? "-" : stats?.rejected || 0}</div>
      </div>
    </div>
<div className="leave-status-tabs">
  {[
    { key: "all", label: "All" },
    { key: "pending", label: "Pending" },
    { key: "approved", label: "Approved" },
    { key: "rejected", label: "Rejected" },
  ].map((tab) => (
    <button
      key={tab.key}
      type="button"
      className={`leave-status-tab ${statusFilter === tab.key ? "active" : ""}`}
      onClick={() => setStatusFilter(tab.key)}
    >
      {tab.label}
    </button>
  ))}
</div>

<div className="admin-leave-duration-filter">
  <label htmlFor="adminLeaveDuration">Duration</label>
  <select id="adminLeaveDuration" value={durationFilter} onChange={(event) => setDurationFilter(event.target.value)}>
    <option value="all">All Durations</option>
    <option value="full_day">Full Day</option>
    <option value="half_day_morning">Half Day Morning</option>
    <option value="half_day_afternoon">Half Day Afternoon</option>
  </select>
</div>



    <div className="table-wrapper">
      <table className="leave-table">
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
            <th>Reason</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>

        <tbody>
          {loading ? (
            <tr>
              <td colSpan="12" style={{ textAlign: "center", padding: "40px" }}>
                Loading leave requests...
              </td>
            </tr>
          ) : error ? (
            <tr>
              <td colSpan="12" style={{ textAlign: "center", padding: "40px" }}>
                Failed to load leave requests: {error}
              </td>
            </tr>
          ) : filteredLeaveRequests.length === 0 ? (
            <tr>
              <td colSpan="12" style={{ textAlign: "center", padding: "40px" }}>
                No leave requests found
              </td>
            </tr>
          ) : (
            filteredLeaveRequests.map((request) => (
              <tr key={request.id}>
                <td>
                  <i className="fas fa-user-circle"></i> {request.full_name}
                </td>
                <td>{request.branch}</td>
                <td>{request.leave_type}</td>
                <td>{formatLeaveDuration(request)}</td>
                <td>{formatDate(request.from_date)}</td>
                <td>{formatDate(request.to_date)}</td>
                <td>{request.requested_days ?? request.days}</td>
                <td>{request.paid_days ?? 0}</td>
                <td>{request.unpaid_days ?? 0}</td>
                <td>{request.reason}</td>
                <td>{getStatusBadge(request.status)}</td>
                <td>
                  {request.status === "pending" && (
                    <div className="leave-row-actions">
                      <button
                        className="edit-btn"
                        onClick={() =>
                          handleOpenAction(request.id, request.full_name, "approved")
                        }
                        disabled={loading}
                        aria-label={`Approve leave for ${request.full_name}`}
                      >
                        <i className="fas fa-check"></i>
                      </button>

                      <button
                        className="edit-btn"
                        onClick={() =>
                          handleOpenAction(request.id, request.full_name, "rejected")
                        }
                        disabled={loading}
                        aria-label={`Reject leave for ${request.full_name}`}
                      >
                        <i className="fas fa-times"></i>
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>

    {actionModal.action !== "approved" ? <div
      className={`modal ${actionModal.open ? "show" : ""}`}
      onClick={handleCloseModal}
    >
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h3>
          {actionModal.action === "approved" ? "Approve" : "Reject"} Leave -{" "}
          {actionModal.employeeName}
        </h3>

        <div className="form-group">
          <label>Reason optional</label>
          <textarea
            placeholder="Enter reason for this action..."
            value={actionModal.reason}
            onChange={(e) =>
              setActionModal((prev) => ({
                ...prev,
                reason: e.target.value,
              }))
            }
          />
        </div>

        <div className="modal-actions">
          <button
            className="modal-btn cancel"
            onClick={handleCloseModal}
            disabled={saving}
          >
            Cancel
          </button>

          <button
            className="modal-btn"
            onClick={handleSubmitAction}
            disabled={saving || (actionModal.action === "approved" && approvalPreview?.can_approve === false)}
            style={{
              background:
                actionModal.action === "approved" ? "#16A34A" : "#DC2626",
            }}
          >
            {saving
              ? "Processing..."
              : actionModal.action === "approved"
              ? "Approve"
              : "Reject"}
          </button>
          {actionModal.action === "approved" && approvalPreview?.can_approve === false && (
            <p style={{ color: "#DC2626", margin: 0 }}>
              Insufficient paid leave balance
            </p>
          )}
        </div>
      </div>
    </div> : null}

    <LeaveApprovalPreviewModal
      open={actionModal.open && actionModal.action === "approved"}
      preview={approvalPreview}
      loading={previewLoading}
      error={!previewLoading && !approvalPreview ? "Preview could not be loaded." : ""}
      saving={saving}
      onClose={handleCloseModal}
      onConfirm={handleSubmitAction}
    />

    <div className={`toast ${toast.show ? "show" : ""}`}>
      {toast.message}
    </div>
  </div>
);
}

export default AdminLeave;
