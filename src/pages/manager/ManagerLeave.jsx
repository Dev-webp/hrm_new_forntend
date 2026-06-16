import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  createLeaveRequest,
  fetchManagerLeaves,
  fetchMyLeaves,
  fetchMyLeaveBalance,
  updateManagerLeaveStatus,
} from "../../services/managerApi";
import "./ManagerLeave.css";

function escapeHtml(str) {
  return str?.replace(/[&<>]/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[m])) || "";
}

function formatDate(s) {
  return s ? new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";
}

function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : "";
}

function parseJwt(token) {
  try {
    return JSON.parse(atob(token.split(".")[1]));
  } catch (e) {
    return null;
  }
}

export default function ManagerLeave() {
  const navigate = useNavigate();
  const [currentStatus, setCurrentStatus] = useState("pending");
  const [allTeamLeaves, setAllTeamLeaves] = useState([]);
  const [filteredTeamLeaves, setFilteredTeamLeaves] = useState([]);
  const [myLeaves, setMyLeaves] = useState([]);
  const [leaveBalance, setLeaveBalance] = useState(null);

  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [toast, setToast] = useState({ show: false, message: "", type: "" });

  const [formData, setFormData] = useState({
    leaveType: "Sick",
    leaveFrom: "",
    leaveTo: "",
    reason: "",
  });

  const token = localStorage.getItem("token");
  const decoded = parseJwt(token);
  const managerBranch = decoded?.branch || "Hyderabad";
  const managerId = decoded?.id;
  const managerName = decoded?.full_name || "Manager";

  const showToast = useCallback((msg, type = "") => {
    setToast({ show: true, message: msg, type });
    setTimeout(() => setToast({ show: false, message: "", type: "" }), 3000);
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
     const now = new Date();

const [teamAll, teamFiltered, my, balance] = await Promise.all([
  fetchManagerLeaves("all"),
  fetchManagerLeaves(currentStatus),
  fetchMyLeaves(),
  fetchMyLeaveBalance(
    now.getFullYear(),
    now.getMonth() + 1
  ),
]);

setAllTeamLeaves(teamAll);
setFilteredTeamLeaves(teamFiltered);
setMyLeaves(my);
setLeaveBalance(balance);
    } catch (err) {
      showToast("Error loading data: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  }, [currentStatus, showToast]);

  const handleStatusChange = (status) => {
    setCurrentStatus(status);
  };

  const handleUpdateLeave = async (id, status) => {
    try {
      await updateManagerLeaveStatus(id, status);
      showToast(status === "approved" ? "✅ Leave approved" : "❌ Leave rejected", status === "approved" ? "success" : "error");
      loadAll();
    } catch (err) {
      showToast("Failed: " + err.message, "error");
    }
  };

  const handleApplyLeave = () => {
    setShowModal(true);
    setFormData({
      leaveType: "Sick",
      leaveFrom: "",
      leaveTo: "",
      reason: "",
    });
  };

  const handleSubmitLeave = async () => {
    const { leaveType, leaveFrom, leaveTo, reason } = formData;
    if (!leaveFrom || !leaveTo) {
      showToast("Select dates", "error");
      return;
    }
    if (new Date(leaveTo) < new Date(leaveFrom)) {
      showToast("End date must be after start date", "error");
      return;
    }
    const days = Math.ceil((new Date(leaveTo) - new Date(leaveFrom)) / 86400000) + 1;

    const payload = {
      user_id: managerId,
      leave_type: leaveType,
      from_date: leaveFrom,
      to_date: leaveTo,
      days: days,
      reason: reason,
    };

    try {
      await createLeaveRequest(payload);
      showToast("✅ Leave request submitted", "success");
      setShowModal(false);
      setFormData({
        leaveType: "Sick",
        leaveFrom: "",
        leaveTo: "",
        reason: "",
      });
      loadAll();
    } catch (err) {
      showToast("Failed: " + err.message, "error");
    }
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const getDaysPreview = () => {
    const { leaveFrom, leaveTo } = formData;
    if (leaveFrom && leaveTo && new Date(leaveTo) >= new Date(leaveFrom)) {
      const days = Math.ceil((new Date(leaveTo) - new Date(leaveFrom)) / 86400000) + 1;
      return `📅 ${days} day${days > 1 ? "s" : ""} of leave`;
    }
    return "Select dates to see duration";
  };

  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const pendingCount = allTeamLeaves.filter((l) => l.status === "pending").length;
  const approvedCount = allTeamLeaves.filter((l) => l.status === "approved").length;
  const latestMyLeave = myLeaves[0];

  return (
    <>
      <div className="main-content manager-portal-page manager-leave-page">
        <div className="page-header">
          <div className="title">
            <h1>
              <i className="fas fa-umbrella-beach"></i> Leave Management
            </h1>
            <p>
              Branch: <span>{managerBranch}</span> · Manage team leaves & apply for your own
            </p>
          </div>
          <button className="apply-btn" onClick={handleApplyLeave}>
            <i className="fas fa-plus"></i> Apply Leave
          </button>
        </div>

        {pendingCount > 0 && (
          <div className="notification-bar">
            <i className="fas fa-bell"></i>
            <span>
              You have <strong>{pendingCount}</strong> pending leave request(s) awaiting your approval.
            </span>
          </div>
        )}

        <div className="stats-row">
          {leaveBalance && (
  <div className="stats-row">
    <div className="stat-card">
      <div className="stat-label">Sick Balance</div>
      <div className="stat-number">
        {leaveBalance.sick_available}
      </div>
    </div>

    <div className="stat-card">
      <div className="stat-label">Casual Balance</div>
      <div className="stat-number">
        {leaveBalance.casual_available}
      </div>
    </div>

    <div className="stat-card">
      <div className="stat-label">Paid Taken</div>
      <div className="stat-number">
        {leaveBalance.paid_taken}
      </div>
    </div>

    <div className="stat-card">
      <div className="stat-label">Unpaid Taken</div>
      <div className="stat-number">
        {leaveBalance.unpaid_taken}
      </div>
    </div>
  </div>
)}
          <div className="stat-card">
            <div className="stat-label">Pending (Team)</div>
            <div className="stat-number">{pendingCount}</div>
            <div className="stat-sub">Awaiting approval</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Approved (Team)</div>
            <div className="stat-number">{approvedCount}</div>
            <div className="stat-sub">This month</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">My Leaves</div>
            <div className="stat-number">{myLeaves.length}</div>
            <div className="stat-sub">Total applied</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">My Status</div>
            <div
              className="stat-number"
              style={{ fontSize: "20px", paddingTop: "6px", color: latestMyLeave ? (latestMyLeave.status === "approved" ? "#16A34A" : latestMyLeave.status === "rejected" ? "#DC2626" : "#FF8C00") : "#FF8C00" }}
            >
              {latestMyLeave ? latestMyLeave.status.toUpperCase() : "—"}
            </div>
            <div className="stat-sub">Latest request</div>
          </div>
        </div>

        <div className="section-title">
          <i className="fas fa-user"></i> My Leave History
        </div>
        <div className="table-card" style={{ marginBottom: "28px" }}>
          <div style={{ overflowX: "auto" }}>
            <table className="leave-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>From</th>
                  <th>To</th>
                  <th>Days</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th>Approved/Rejected By</th>
                  <th>Approved/Rejected On</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr className="loading-row">
                    <td colSpan="8">
                      <span className="spinner"></span> Loading...
                    </td>
                  </tr>
                ) : !myLeaves.length ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign: "center", padding: "30px", color: "#64748B" }}>
                      No leave applications yet
                    </td>
                  </tr>
                ) : (
                  myLeaves.map((l) => (
                    <tr key={l.id}>
                      <td>{escapeHtml(l.leave_type)}</td>
                      <td>{formatDate(l.from_date)}</td>
                      <td>{formatDate(l.to_date)}</td>
                      <td>{l.days}</td>
                      <td>{escapeHtml(l.reason || "—")}</td>
                      <td>
                        <span className={`status-${l.status}`}>{capitalize(l.status)}</span>
                      </td>
                      <td>{escapeHtml(l.approved_by_name || "—")}</td>
                      <td>{l.approved_at ? new Date(l.approved_at).toLocaleString() : "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="tabs-container">
          {["pending", "approved", "rejected", "all"].map((status) => (
            <button
              key={status}
              className={`tab-btn ${currentStatus === status ? "active" : ""}`}
              onClick={() => handleStatusChange(status)}
            >
              {capitalize(status)}
            </button>
          ))}
        </div>

        <div className="section-title">
          <i className="fas fa-users"></i> Team Leave Requests
        </div>
        <div className="table-card">
          <div style={{ overflowX: "auto" }}>
            <table className="leave-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Type</th>
                  <th>From</th>
                  <th>To</th>
                  <th>Days</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th>Actions</th>
                  <th>Approved/Rejected By</th>
                  <th>Approved/Rejected On</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr className="loading-row">
                    <td colSpan="10">
                      <span className="spinner"></span> Loading...
                    </td>
                  </tr>
                ) : !filteredTeamLeaves.length ? (
                  <tr>
                    <td colSpan="10" style={{ textAlign: "center", padding: "40px", color: "#64748B" }}>
                      No {currentStatus} leave requests
                    </td>
                  </tr>
                ) : (
                  filteredTeamLeaves.map((l) => (
                    <tr key={l.id}>
                      <td>
                        <i className="fas fa-user-circle" style={{ color: "#FF8C00", marginRight: "6px" }}></i>
                        {escapeHtml(l.full_name)}
                      </td>
                      <td>{escapeHtml(l.leave_type)}</td>
                      <td>{formatDate(l.from_date)}</td>
                      <td>{formatDate(l.to_date)}</td>
                      <td>{l.days}</td>
                      <td>{escapeHtml(l.reason || "—")}</td>
                      <td>
                        <span className={`status-${l.status}`}>{capitalize(l.status)}</span>
                      </td>
                      <td>
                        {l.status === "pending" ? (
                          <>
                            <button className="action-btn approve" onClick={() => handleUpdateLeave(l.id, "approved")}>
                              <i className="fas fa-check"></i> Approve
                            </button>
                            <button className="action-btn reject" onClick={() => handleUpdateLeave(l.id, "rejected")}>
                              <i className="fas fa-times"></i> Reject
                            </button>
                          </>
                        ) : (
                          <span style={{ color: "#64748B", fontSize: "11px" }}>—</span>
                        )}
                      </td>
                      <td>{escapeHtml(l.approved_by_name || "—")}</td>
                      <td>{l.approved_at ? new Date(l.approved_at).toLocaleString() : "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="modal" style={{ display: "flex" }} onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>
              <i className="fas fa-calendar-plus"></i> Apply for Leave
            </h3>
            <div className="form-group">
              <label>Leave Type</label>
            <select
  name="leaveType"
  value={formData.leaveType}
  onChange={handleInputChange}
>
  <option
    value="Sick"
    disabled={!leaveBalance?.sick_available}
  >
    Sick Leave{" "}
    {leaveBalance?.sick_available > 0
      ? `(${leaveBalance.sick_available} paid left)`
      : "(No paid balance)"}
  </option>

  <option
    value="Casual"
    disabled={!leaveBalance?.casual_available}
  >
    Casual Leave{" "}
    {leaveBalance?.casual_available > 0
      ? `(${leaveBalance.casual_available} paid left)`
      : "(No paid balance)"}
  </option>

  <option value="Unpaid">
    Unpaid Leave
  </option>
</select>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>From Date</label>
                <input type="date" name="leaveFrom" value={formData.leaveFrom} onChange={handleInputChange} min={today} />
              </div>
              <div className="form-group">
                <label>To Date</label>
                <input type="date" name="leaveTo" value={formData.leaveTo} onChange={handleInputChange} min={today} />
              </div>
            </div>
            <div className="days-preview">{getDaysPreview()}</div>
            <div className="form-group" style={{ marginTop: "12px" }}>
              <label>Reason</label>
              <textarea name="reason" value={formData.reason} onChange={handleInputChange} placeholder="Briefly describe your reason..."></textarea>
            </div>
            <div className="modal-actions">
              <button className="modal-btn cancel" onClick={() => setShowModal(false)}>
                Cancel
              </button>
              <button className="modal-btn" onClick={handleSubmitLeave}>
                Submit Request
              </button>
            </div>
          </div>
        </div>
      )}

      {toast.show && (
        <div className={`toast show ${toast.type}`}>
          {toast.message}
        </div>
      )}
    </>
  );
}
