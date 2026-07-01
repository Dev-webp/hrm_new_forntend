import { useCallback, useEffect, useMemo, useRef, useState } from "react";


import {
  fetchLeaveRequests,
  fetchLeaveStats,
  updateLeaveRequest,
  fetchLeaveApprovalPreview,
  createLeaveRequest,
  deleteLeaveRequest,
} from "../../services/leaveApi";
import { fetchMyLeaveBalance, fetchMyLeaves } from "../../services/employeeApi";
import LeaveApprovalPreviewModal from "../../components/leaves/LeaveApprovalPreviewModal";
import DeleteLeaveConfirmModal from "../../components/leaves/DeleteLeaveConfirmModal";
import { getStoredUser } from "../../utils/auth";

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
  const currentUser = useMemo(() => getStoredUser(), []);
  const isOperationalManager = currentUser?.role === "OPERATIONAL_MANAGER";
  const [currentBranch, setCurrentBranch] = useState("all");
const [currentDate, setCurrentDate] = useState("");
const [statusFilter, setStatusFilter] = useState("all");
const [durationFilter, setDurationFilter] = useState("all");
const [departmentFilter, setDepartmentFilter] = useState("all");
const [employeeFilter, setEmployeeFilter] = useState("all");


  const [leaveRequests, setLeaveRequests] = useState([]);
  const [myLeaves, setMyLeaves] = useState([]);
  const [myLeaveBalance, setMyLeaveBalance] = useState(null);
  const [myLeaveFilter, setMyLeaveFilter] = useState("all");
  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [applySaving, setApplySaving] = useState(false);
  const [applyForm, setApplyForm] = useState({
    leave_type: "Unpaid",
    leave_duration_type: "full_day",
    half_day_session: "",
    from_date: "",
    to_date: "",
    reason: "",
  });
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [branchMenuOpen, setBranchMenuOpen] = useState(false);
  const [toast, setToast] = useState({ show: false, message: "" });
const [approvalPreview, setApprovalPreview] = useState(null);
const [previewLoading, setPreviewLoading] = useState(false);
const [deleteTarget, setDeleteTarget] = useState(null);
const [deleteSaving, setDeleteSaving] = useState(false);


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

  const loadMyLeaveData = useCallback(async () => {
    if (!isOperationalManager) return;

    try {
      const [leaves, balance] = await Promise.all([
        fetchMyLeaves(),
        fetchMyLeaveBalance(),
      ]);
      setMyLeaves(leaves);
      setMyLeaveBalance(balance);
      setApplyForm((prev) => ({
        ...prev,
        leave_type: Number(balance?.paid_leave_balance || 0) > 0 ? "Paid" : "Unpaid",
      }));
    } catch (err) {
      showToast(err.response?.data?.message || err.message || "Failed to load your leave data");
    }
  }, [isOperationalManager]);

  useEffect(() => {
    loadMyLeaveData();
  }, [loadMyLeaveData]);

  // Show toast
  function showToast(message) {
    setToast({ show: true, message });
    setTimeout(() => setToast({ show: false, message: "" }), 2500);
  }

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

  const handleConfirmDelete = async () => {
    if (!deleteTarget?.id) return;
    setDeleteSaving(true);
    try {
      await deleteLeaveRequest(deleteTarget.id);
      showToast("Leave request deleted");
      setDeleteTarget(null);
      await Promise.all([loadData(), loadMyLeaveData()]);
    } catch (err) {
      showToast(err.response?.data?.message || err.message || "Failed to delete leave request");
    } finally {
      setDeleteSaving(false);
    }
  };

  const employeeOptions = useMemo(() => {
    const map = new Map();
    leaveRequests.forEach((request) => {
      if (request.user_id && request.full_name) {
        map.set(String(request.user_id), request.full_name);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [leaveRequests]);

  const departmentOptions = useMemo(
    () => [
      "all",
      ...new Set(leaveRequests.map((request) => request.department).filter(Boolean)),
    ],
    [leaveRequests]
  );

  const calculateApplyDays = useCallback(() => {
    const { leave_duration_type, from_date, to_date } = applyForm;
    if (!from_date || !to_date) return 0;
    if (leave_duration_type === "half_day") return from_date === to_date ? 0.5 : 0;
    const start = new Date(`${from_date}T00:00:00`);
    const end = new Date(`${to_date}T00:00:00`);
    if (end < start) return 0;
    let days = 0;
    for (const cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
      if (cursor.getDay() !== 0) days += 1;
    }
    return days;
  }, [applyForm]);

  const requestedApplyDays = calculateApplyDays();

  const submitMyLeave = async () => {
    if (!currentUser?.id) return;
    if (!applyForm.from_date || !applyForm.to_date) {
      showToast("Please select From and To dates");
      return;
    }
    if (new Date(applyForm.to_date) < new Date(applyForm.from_date)) {
      showToast("To date cannot be before From date");
      return;
    }
    if (applyForm.leave_duration_type === "half_day") {
      if (applyForm.from_date !== applyForm.to_date) {
        showToast("Half-day leave must be for one date only");
        return;
      }
      if (!applyForm.half_day_session) {
        showToast("Please select Morning or Afternoon session");
        return;
      }
    }
    if (!requestedApplyDays) {
      showToast("Selected dates do not contain leave days");
      return;
    }
    if (
      applyForm.leave_type === "Paid" &&
      requestedApplyDays > Number(myLeaveBalance?.paid_leave_balance || 0)
    ) {
      showToast(`Only ${myLeaveBalance?.paid_leave_balance || 0} paid leave available`);
      return;
    }

    setApplySaving(true);
    try {
      await createLeaveRequest({
        user_id: currentUser.id,
        leave_type: applyForm.leave_type,
        from_date: applyForm.from_date,
        to_date: applyForm.to_date,
        reason: applyForm.reason.trim(),
        leave_duration_type: applyForm.leave_duration_type,
        half_day_session:
          applyForm.leave_duration_type === "half_day"
            ? applyForm.half_day_session
            : null,
      });
      showToast("Leave request submitted");
      setApplyModalOpen(false);
      setApplyForm({
        leave_type: Number(myLeaveBalance?.paid_leave_balance || 0) > 0 ? "Paid" : "Unpaid",
        leave_duration_type: "full_day",
        half_day_session: "",
        from_date: "",
        to_date: "",
        reason: "",
      });
      await Promise.all([loadMyLeaveData(), loadData()]);
    } catch (err) {
      showToast(err.response?.data?.message || err.message || "Failed to submit leave");
    } finally {
      setApplySaving(false);
    }
  };

  const filteredMyLeaves = myLeaves.filter(
    (leave) => myLeaveFilter === "all" || leave.status === myLeaveFilter
  );

  const filteredLeaveRequests = leaveRequests.filter((request) => {
    const statusMatches = statusFilter === "all" || request.status?.toLowerCase() === statusFilter;
    const durationKey = request.leave_duration_type === "half_day"
      ? `half_day_${request.half_day_session}`
      : "full_day";
    const departmentMatches = departmentFilter === "all" || request.department === departmentFilter;
    const employeeMatches = employeeFilter === "all" || String(request.user_id) === employeeFilter;
    return statusMatches &&
      departmentMatches &&
      employeeMatches &&
      (durationFilter === "all" || durationKey === durationFilter);
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

    {isOperationalManager && (
      <section className="operational-my-leave-panel">
        <div className="operational-section-head">
          <div>
            <span>Self service</span>
            <h2>My Leave</h2>
            <p>Apply for leave and track your approval status.</p>
          </div>
          <button
            type="button"
            className="apply-leave-btn"
            onClick={() => setApplyModalOpen(true)}
          >
            <i className="fas fa-plus" /> Apply Leave
          </button>
        </div>

        <div className="operational-leave-balance-grid">
          <div className="operational-balance-card">
            <span>Paid Balance</span>
            <strong>{myLeaveBalance?.paid_leave_balance ?? 0}</strong>
          </div>
          <div className="operational-balance-card">
            <span>Current Month Credit</span>
            <strong>{myLeaveBalance?.current_month_credit ?? 0}</strong>
          </div>
          <div className="operational-balance-card">
            <span>Carry Forward</span>
            <strong>{myLeaveBalance?.carry_forward ?? 0}</strong>
          </div>
          <div className="operational-balance-card">
            <span>Paid Used</span>
            <strong>{myLeaveBalance?.paid_used ?? 0}</strong>
          </div>
          <div className="operational-balance-card">
            <span>Unpaid Used</span>
            <strong>{myLeaveBalance?.unpaid_used ?? 0}</strong>
          </div>
        </div>

        <div className="leave-status-tabs compact-tabs">
          {["all", "pending", "approved", "rejected"].map((status) => (
            <button
              key={status}
              type="button"
              className={`leave-status-tab ${myLeaveFilter === status ? "active" : ""}`}
              onClick={() => setMyLeaveFilter(status)}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>

        <div className="table-wrapper operational-my-leave-table">
          <table className="leave-table">
            <thead>
              <tr>
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
              {filteredMyLeaves.length === 0 ? (
                <tr>
                  <td colSpan="10" style={{ textAlign: "center", padding: "28px" }}>
                    No leave history found
                  </td>
                </tr>
              ) : (
                filteredMyLeaves.map((leave) => (
                  <tr key={leave.id}>
                    <td>{leave.leave_type}</td>
                    <td>{formatLeaveDuration(leave)}</td>
                    <td>{formatDate(leave.from_date)}</td>
                    <td>{formatDate(leave.to_date)}</td>
                    <td>{leave.requested_days ?? leave.days}</td>
                    <td>{leave.paid_days ?? 0}</td>
                    <td>{leave.unpaid_days ?? 0}</td>
                    <td>{leave.reason || "-"}</td>
                    <td>{getStatusBadge(leave.status)}</td>
                    <td>
                      {leave.status === "pending" ? (
                        <button
                          type="button"
                          className="leave-delete-btn"
                          title="Delete Leave Request"
                          onClick={() => setDeleteTarget(leave)}
                        >
                          <i className="fas fa-trash-alt" />
                        </button>
                      ) : (
                        "-"
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    )}

    {isOperationalManager && (
      <div className="operational-section-head management-head">
        <div>
          <span>Operations</span>
          <h2>Employee Leave Management</h2>
          <p>Review employee leave requests across Hyderabad and Bangalore.</p>
        </div>
      </div>
    )}

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

  <label htmlFor="adminLeaveDepartment">Department</label>
  <select id="adminLeaveDepartment" value={departmentFilter} onChange={(event) => {
    setDepartmentFilter(event.target.value);
    setEmployeeFilter("all");
  }}>
    {departmentOptions.map((department) => (
      <option key={department} value={department}>
        {department === "all" ? "All Departments" : department}
      </option>
    ))}
  </select>

  <label htmlFor="adminLeaveEmployee">Employee</label>
  <select id="adminLeaveEmployee" value={employeeFilter} onChange={(event) => setEmployeeFilter(event.target.value)}>
    <option value="all">All Employees</option>
    {employeeOptions.map((employee) => (
      <option key={employee.id} value={employee.id}>
        {employee.name}
      </option>
    ))}
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
                  <div className="leave-row-actions">
                    {request.status === "pending" && (
                      <>
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
                      </>
                    )}
                    <button
                      type="button"
                      className="leave-delete-btn"
                      title="Delete Leave Request"
                      onClick={() => setDeleteTarget(request)}
                      disabled={loading}
                      aria-label={`Delete leave for ${request.full_name}`}
                    >
                      <i className="fas fa-trash-alt" />
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>

    {isOperationalManager && applyModalOpen && (
      <div className="modal show" onClick={() => !applySaving && setApplyModalOpen(false)}>
        <div className="modal-content operational-apply-modal" onClick={(e) => e.stopPropagation()}>
          <h3>
            <i className="fas fa-paper-plane" /> Apply Leave
          </h3>

          <div className="form-group">
            <label>Leave Type</label>
            <select
              value={applyForm.leave_type}
              onChange={(event) => setApplyForm((prev) => ({ ...prev, leave_type: event.target.value }))}
            >
              {Number(myLeaveBalance?.paid_leave_balance || 0) > 0 && (
                <option value="Paid">Paid Leave ({myLeaveBalance?.paid_leave_balance || 0} left)</option>
              )}
              <option value="Unpaid">Unpaid Leave</option>
            </select>
          </div>

          <div className="form-group">
            <label>Duration</label>
            <select
              value={applyForm.leave_duration_type}
              onChange={(event) => {
                const leave_duration_type = event.target.value;
                setApplyForm((prev) => ({
                  ...prev,
                  leave_duration_type,
                  half_day_session: leave_duration_type === "half_day" ? prev.half_day_session : "",
                  to_date: leave_duration_type === "half_day" ? prev.from_date : prev.to_date,
                }));
              }}
            >
              <option value="full_day">Full Day</option>
              <option value="half_day">Half Day</option>
            </select>
          </div>

          {applyForm.leave_duration_type === "half_day" && (
            <div className="form-group">
              <label>Half-Day Session</label>
              <select
                value={applyForm.half_day_session}
                onChange={(event) => setApplyForm((prev) => ({ ...prev, half_day_session: event.target.value }))}
              >
                <option value="">Select session</option>
                <option value="morning">Morning</option>
                <option value="afternoon">Afternoon</option>
              </select>
            </div>
          )}

          <div className="form-row">
            <div className="form-group">
              <label>From Date</label>
              <input
                type="date"
                value={applyForm.from_date}
                onChange={(event) => setApplyForm((prev) => ({
                  ...prev,
                  from_date: event.target.value,
                  to_date: prev.leave_duration_type === "half_day" ? event.target.value : prev.to_date,
                }))}
              />
            </div>
            <div className="form-group">
              <label>To Date</label>
              <input
                type="date"
                value={applyForm.to_date}
                disabled={applyForm.leave_duration_type === "half_day"}
                onChange={(event) => setApplyForm((prev) => ({ ...prev, to_date: event.target.value }))}
              />
            </div>
          </div>

          <div className="operational-days-preview">
            Requested Days: <strong>{requestedApplyDays || "-"}</strong>
            <span>Available Paid Balance: {myLeaveBalance?.paid_leave_balance ?? 0}</span>
          </div>

          <div className="form-group">
            <label>Reason</label>
            <textarea
              rows={3}
              value={applyForm.reason}
              placeholder="Enter leave reason"
              onChange={(event) => setApplyForm((prev) => ({ ...prev, reason: event.target.value }))}
            />
          </div>

          <div className="modal-actions">
            <button className="modal-btn cancel" onClick={() => setApplyModalOpen(false)} disabled={applySaving}>
              Cancel
            </button>
            <button className="modal-btn" onClick={submitMyLeave} disabled={applySaving}>
              {applySaving ? "Submitting..." : "Submit Leave"}
            </button>
          </div>
        </div>
      </div>
    )}

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

    <DeleteLeaveConfirmModal
      open={Boolean(deleteTarget)}
      leave={deleteTarget}
      saving={deleteSaving}
      onClose={() => !deleteSaving && setDeleteTarget(null)}
      onConfirm={handleConfirmDelete}
    />

    <div className={`toast ${toast.show ? "show" : ""}`}>
      {toast.message}
    </div>
  </div>
);
}

export default AdminLeave;
