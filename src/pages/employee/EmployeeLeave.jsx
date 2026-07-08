import { useCallback, useEffect, useMemo, useState } from "react";
import EmployeeSidebar from "../../components/EmployeeSidebar";
import { useEmployeeApi } from "../../hooks/useEmployeeApi";
import { parseJwt } from "../../utils/parseJwt";
import { escapeHtml, normalizeArray } from "./employeeUtils";
import { fetchMyLeaveBalance } from "../../services/employeeApi";
import DeleteLeaveConfirmModal from "../../components/leaves/DeleteLeaveConfirmModal";
import "../../styles/EmployeeLeave.css";

export default function EmployeeLeave({ embedded = false }) {
  const { apiFetch, navigate } = useEmployeeApi();
  const token = localStorage.getItem("token");
  const decoded = parseJwt(token) || {};
  const userId = decoded.id || 0;
  const storedUser = (() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
      return {};
    }
  })();
  const storedRole = localStorage.getItem("role") || storedUser.role || decoded.role || "";
  const isSubAdminLeave = embedded && storedRole === "SUB_ADMIN";

  const [allLeaves, setAllLeaves] = useState([]);
  const [leaveBalance, setLeaveBalance] = useState(null);
  const [currentFilter, setCurrentFilter] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    leaveType: "Unpaid",
    usePaidLeave: false,
    leaveDurationType: "full_day",
    halfDaySession: "",
    fromDate: "",
    toDate: "",
    reason: "",
  });
  const [calculatedDays, setCalculatedDays] = useState(null);
  const [holidayDates, setHolidayDates] = useState(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState({ msg: "", visible: false, type: "" });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteSaving, setDeleteSaving] = useState(false);

  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    if (!token) navigate("/login");
  }, [token, navigate]);

  const showToast = useCallback((msg, type = "") => {
    setToast({ msg, visible: true, type });
    setTimeout(() => {
      setToast({ msg: "", visible: false, type: "" });
    }, 3000);
  }, []);

  const load = useCallback(async () => {
    setIsLoading(true);

    try {
      const leaves = normalizeArray(await apiFetch("/leaves/my"));
      setAllLeaves(leaves);

      const balance = await fetchMyLeaveBalance();
      setLeaveBalance(balance);

      setForm((f) => ({ ...f, leaveType: "Unpaid", usePaidLeave: false }));
    } catch (e) {
      showToast(`Error: ${e.message}`, "error");
    } finally {
      setIsLoading(false);
    }
  }, [apiFetch, showToast]);

  useEffect(() => {
    load();
  }, [load]);

  const filteredLeaves = useMemo(() => {
    if (currentFilter === "all") return allLeaves;
    return allLeaves.filter((l) => l.status === currentFilter);
  }, [allLeaves, currentFilter]);

  const leaveStats = useMemo(() => {
    const total = allLeaves.length;
    const pending = allLeaves.filter((l) => l.status === "pending").length;
    const approved = allLeaves.filter((l) => l.status === "approved").length;
    const rejected = allLeaves.filter((l) => l.status === "rejected").length;
    const requestedDays = allLeaves.reduce(
      (sum, leave) => sum + Number(leave.requested_days ?? leave.days ?? 0),
      0
    );

    return { total, pending, approved, rejected, requestedDays };
  }, [allLeaves]);

  const formatLeaveDuration = (leave) => {
    if ((leave.leave_duration_type || "full_day") !== "half_day") return "Full Day";
    return `Half Day ${leave.half_day_session === "morning" ? "Morning" : "Afternoon"}`;
  };

  const formatLeaveDate = (value) =>
    value
      ? new Date(value).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : "—";

  useEffect(() => {
    if (!form.fromDate) {
      setHolidayDates(new Set());
      return;
    }

    const start = new Date(`${form.fromDate}T00:00:00`);
    const end = new Date(`${form.toDate || form.fromDate}T00:00:00`);
    const months = [];
    for (const cursor = new Date(start.getFullYear(), start.getMonth(), 1); cursor <= end; cursor.setMonth(cursor.getMonth() + 1)) {
      months.push([cursor.getFullYear(), cursor.getMonth() + 1]);
    }

    let active = true;
    Promise.all(months.map(([year, month]) => apiFetch(`/holidays?year=${year}&month=${month}`)))
      .then((responses) => {
        if (!active) return;
        const dates = new Set(
          responses.flatMap(normalizeArray)
            .filter((holiday) =>
              holiday.type === "holiday" &&
              (!holiday.branch || holiday.branch.toLowerCase() === "all" || holiday.branch === decoded.branch)
            )
            .map((holiday) => String(holiday.date).slice(0, 10))
        );
        setHolidayDates(dates);
      })
      .catch(() => active && setHolidayDates(new Set()));

    return () => { active = false; };
  }, [apiFetch, decoded.branch, form.fromDate, form.toDate]);

  const calcDays = useCallback((from, to, durationType) => {
    if (durationType === "half_day" && from && to && from === to) {
      setCalculatedDays(0.5);
      return;
    }
    if (from && to && new Date(to) >= new Date(from)) {
      let workingDays = 0;
      for (const day = new Date(`${from}T00:00:00`); day <= new Date(`${to}T00:00:00`); day.setDate(day.getDate() + 1)) {
        const dateString = day.toISOString().slice(0, 10);
        if (day.getDay() !== 0 && !holidayDates.has(dateString)) workingDays += 1;
      }
      setCalculatedDays(workingDays);
    } else {
      setCalculatedDays(null);
    }
  }, [holidayDates]);

  useEffect(() => {
    calcDays(form.fromDate, form.toDate, form.leaveDurationType);
  }, [form.fromDate, form.toDate, form.leaveDurationType, calcDays]);

  const submitLeave = async () => {
    const { leaveType, usePaidLeave, leaveDurationType, halfDaySession, fromDate, toDate, reason } = form;

    if (!fromDate || !toDate) {
      showToast("Please select dates", "error");
      return;
    }

    if (new Date(toDate) < new Date(fromDate)) {
      showToast("End date must be after start date", "error");
      return;
    }

    if (leaveDurationType === "half_day" && fromDate !== toDate) {
      showToast("Half-day leave must be for a single date", "error");
      return;
    }

    if (leaveDurationType === "half_day" && !halfDaySession) {
      showToast("Please select morning or afternoon", "error");
      return;
    }

    try {
      await apiFetch("/leaves", {
        method: "POST",
        body: {
          user_id: userId,
          leave_type: usePaidLeave ? "Paid" : leaveType,
          use_paid_leave: usePaidLeave,
          from_date: fromDate,
          to_date: toDate,
          reason: reason.trim(),
          leave_duration_type: leaveDurationType,
          half_day_session: leaveDurationType === "half_day" ? halfDaySession : null,
        },
      });

      showToast("✅ Leave request submitted!", "success");
      setModalOpen(false);
      setForm({
        leaveType: "Unpaid",
        usePaidLeave: false,
        leaveDurationType: "full_day",
        halfDaySession: "",
        fromDate: "",
        toDate: "",
        reason: "",
      });
      setCalculatedDays(null);
      load();
    } catch (e) {
      showToast(e.message || "Submit failed", "error");
    }
  };

  const confirmDeleteLeave = async () => {
    if (!deleteTarget?.id) return;
    setDeleteSaving(true);
    try {
      await apiFetch(`/leave/${deleteTarget.id}`, { method: "DELETE" });
      showToast("Leave request deleted successfully.", "success");
      setDeleteTarget(null);
      await load();
    } catch (e) {
      showToast(e.message || "Failed to delete leave request", "error");
    } finally {
      setDeleteSaving(false);
    }
  };

  return (
    <div
      className={[
        embedded ? "employee-leave-page" : "layout employee-leave-page",
        isSubAdminLeave ? "subadmin-leave-page" : "",
      ].filter(Boolean).join(" ")}
    >
      {!embedded && <EmployeeSidebar activePage="leave" />}

      <div className="main">
        <div className="topbar employee-leave-topbar subadmin-leave-topbar">
          <div>
            {isSubAdminLeave && <span className="subadmin-page-kicker">Self-service leave desk</span>}
            <h1>My Leaves</h1>
            <p>Track leave balance, requests, and approval status</p>
          </div>

          <button
            type="button"
            className="apply-btn"
            onClick={() => setModalOpen(true)}
          >
            <i className="fas fa-plus" /> Apply Leave
          </button>
        </div>

        <div className="content subadmin-leave-content">
          <div className="leave-info-banner">
            💡 1 paid leave is credited every month after probation. Unused paid
            leaves carry forward. Future month leaves cannot be used.
          </div>

          <div className="employee-leave-kpis subadmin-leave-kpis">
              <div className="employee-leave-kpi subadmin-leave-kpi blue">
                <span><i className="fas fa-wallet" /></span>
                <small>Paid Leave Balance</small>
                <strong>{leaveBalance?.paid_leave_balance || 0}</strong>
              </div>
              <div className="employee-leave-kpi subadmin-leave-kpi orange">
                <span><i className="fas fa-hourglass-half" /></span>
                <small>Pending Requests</small>
                <strong>{leaveStats.pending}</strong>
              </div>
              <div className="employee-leave-kpi subadmin-leave-kpi green">
                <span><i className="fas fa-circle-check" /></span>
                <small>Approved Leaves</small>
                <strong>{leaveStats.approved}</strong>
              </div>
              <div className="employee-leave-kpi subadmin-leave-kpi red">
                <span><i className="fas fa-circle-xmark" /></span>
                <small>Rejected Leaves</small>
                <strong>{leaveStats.rejected}</strong>
              </div>
            </div>

          <div className="leave-balance-grid subadmin-balance-grid">
            <div className="balance-card paid">
              <div className="balance-icon">✅</div>
              <h3>Paid Leave Balance</h3>
              <span>{leaveBalance?.paid_leave_balance || 0}</span>
              <p>Available paid leaves</p>
            </div>

            <div className="balance-card paid">
              <div className="balance-icon">📅</div>
              <h3>Current Month Credit</h3>
              <span>{leaveBalance?.current_month_credit || 0}</span>
              <p>This month credited leave</p>
            </div>

            <div className="balance-card paid">
              <div className="balance-icon">🔁</div>
              <h3>Carry Forward</h3>
              <span>{leaveBalance?.carry_forward || 0}</span>
              <p>Unused previous paid leaves</p>
            </div>

            <div className="balance-card used">
              <div className="balance-icon">📌</div>
              <h3>Paid Used</h3>
              <span>{leaveBalance?.paid_used || 0}</span>
              <p>Paid leaves already used</p>
            </div>

            <div className="balance-card unpaid">
              <div className="balance-icon">💸</div>
              <h3>Unpaid Used</h3>
              <span>{leaveBalance?.unpaid_used || 0}</span>
              <p>Salary deduction leaves</p>
            </div>

            <div className="balance-card eligibility">
              <div className="balance-icon">🛡️</div>
              <h3>Eligibility</h3>
              <span>{leaveBalance?.eligible ? "Eligible" : "Probation"}</span>
              <p>{leaveBalance?.probationMonths || 3} months probation rule</p>
            </div>
          </div>


          <div className="subadmin-leave-section-head">
            <div>
              <h2>Leave History</h2>
              <p>All your submitted leave requests and current approval status.</p>
            </div>

            <div className="tabs subadmin-leave-tabs">
              {["all", "pending", "approved", "rejected"].map((status) => (
                <button
                  key={status}
                  type="button"
                  className={`tab${currentFilter === status ? " active" : ""}`}
                  onClick={() => setCurrentFilter(status)}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="leave-list" id="leaveList">
            {isLoading ? (
              <div style={{ textAlign: "center", padding: 40 }}>
                <span className="spinner" />
              </div>
            ) : !filteredLeaves.length ? (
              <div className="empty-state">
                <i className="fas fa-umbrella-beach" />
                <p>
                  No {currentFilter === "all" ? "" : currentFilter} leave
                  requests found
                </p>
              </div>
            ) : (
              <div className="subadmin-leave-table-wrap">
                <table className="subadmin-leave-table">
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
                    {filteredLeaves.map((l) => {
                      const status = String(l.status || "pending");
                      const statusCls =
                        status === "approved"
                          ? "sc-approved"
                          : status === "rejected"
                          ? "sc-rejected"
                          : "sc-pending";

                      return (
                        <tr key={l.id}>
                          <td>
                            <div className="subadmin-leave-type-cell">
                              <span className={l.leave_type === "Paid" ? "paid" : "unpaid"}>
                                <i className={`fas ${l.leave_type === "Paid" ? "fa-check" : "fa-indian-rupee-sign"}`} />
                              </span>
                              <strong>{l.leave_type} Leave</strong>
                            </div>
                          </td>
                          <td>{formatLeaveDuration(l)}</td>
                          <td>{formatLeaveDate(l.from_date)}</td>
                          <td>{formatLeaveDate(l.to_date)}</td>
                          <td>
                            <strong>{l.requested_days ?? l.days}</strong>
                            <small> day(s)</small>
                          </td>
                          <td>{l.paid_days ?? "0.0"}</td>
                          <td>{l.unpaid_days ?? "0.0"}</td>
                          <td>{l.use_paid_leave ? "Yes" : "No"}</td>
                          <td>{l.remaining_paid_balance ?? "0.0"}</td>
                          <td className="subadmin-leave-reason">{escapeHtml(l.reason || "—")}</td>
                          <td>
                            <span className={`status-chip ${statusCls}`}>
                              {status.charAt(0).toUpperCase() + status.slice(1)}
                            </span>
                          </td>
                          <td>
                            {status === "pending" ? (
                              <button
                                type="button"
                                className="employee-leave-delete-btn"
                                title="Delete Leave Request"
                                onClick={() => setDeleteTarget(l)}
                              >
                                <i className="fas fa-trash-alt" />
                              </button>
                            ) : (
                              "—"
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {modalOpen && (
        <div
          id="applyModal"
          className="modal"
          style={{ display: "flex" }}
          onClick={(e) => {
            if (e.target.id === "applyModal") setModalOpen(false);
          }}
          role="presentation"
        >
          <div className="modal-box">
            <h3>
              <i className="fas fa-paper-plane" /> Apply for Leave
            </h3>

            <div className="form-group">
              <label htmlFor="lType">Leave Type</label>
              <select
                id="lType"
                value={form.leaveType}
                onChange={(e) =>
                  setForm((f) => ({ ...f, leaveType: e.target.value }))
                }
              >
                <option value="Unpaid">Unpaid Leave</option>
                <option value="Sick">Sick Leave</option>
                <option value="Casual">Casual Leave</option>
                <option value="Emergency">Emergency Leave</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="usePaidLeave">Use my available paid leave?</label>
              <select
                id="usePaidLeave"
                value={form.usePaidLeave ? "yes" : "no"}
                onChange={(e) =>
                  setForm((f) => ({ ...f, usePaidLeave: e.target.value === "yes" }))
                }
              >
                <option value="no">No</option>
                <option value="yes">Yes</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="lDuration">Leave Duration</label>
              <select
                id="lDuration"
                value={form.leaveDurationType}
                onChange={(e) => {
                  const leaveDurationType = e.target.value;
                  setForm((f) => ({
                    ...f,
                    leaveDurationType,
                    halfDaySession: leaveDurationType === "half_day" ? f.halfDaySession : "",
                    toDate: leaveDurationType === "half_day" ? f.fromDate : f.toDate,
                  }));
                }}
              >
                <option value="full_day">Full Day</option>
                <option value="half_day">Half Day</option>
              </select>
            </div>

            {form.leaveDurationType === "half_day" && (
              <div className="form-group">
                <label htmlFor="lSession">Half-Day Session</label>
                <select
                  id="lSession"
                  value={form.halfDaySession}
                  onChange={(e) => setForm((f) => ({ ...f, halfDaySession: e.target.value }))}
                >
                  <option value="">Select session</option>
                  <option value="morning">Morning Half Day</option>
                  <option value="afternoon">Afternoon Half Day</option>
                </select>
              </div>
            )}

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="lFrom">From Date</label>
                <input
                  type="date"
                  id="lFrom"
                  min={today}
                  value={form.fromDate}
                  onChange={(e) => setForm((f) => ({
                    ...f,
                    fromDate: e.target.value,
                    toDate: f.leaveDurationType === "half_day" ? e.target.value : f.toDate,
                  }))}
                />
              </div>

              <div className="form-group">
                <label htmlFor="lTo">To Date</label>
                <input
                  type="date"
                  id="lTo"
                  min={today}
                  value={form.toDate}
                  disabled={form.leaveDurationType === "half_day"}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, toDate: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="days-badge">
              {calculatedDays
                ? `📅 ${calculatedDays} day${
                    calculatedDays > 1 ? "s" : ""
                  } of leave requested`
                : "Select dates to calculate duration"}
            </div>

            <div className="days-badge" style={{ marginTop: 10 }}>
              Available paid leave: {Number(leaveBalance?.paid_leave_balance || 0).toFixed(1)} days
              <br />Two half-day leaves will consume one full paid leave.
            </div>

            <div className="form-group" style={{ marginTop: 14 }}>
              <label htmlFor="lReason">Reason</label>
              <textarea
                id="lReason"
                placeholder="Please describe your reason..."
                value={form.reason}
                onChange={(e) =>
                  setForm((f) => ({ ...f, reason: e.target.value }))
                }
              />
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="mbtn mbtn-cancel"
                onClick={() => setModalOpen(false)}
              >
                Cancel
              </button>

              <button
                type="button"
                className="mbtn mbtn-primary"
                onClick={submitLeave}
              >
                <i className="fas fa-paper-plane" /> Submit
              </button>
            </div>
          </div>
        </div>
      )}

      <DeleteLeaveConfirmModal
        open={Boolean(deleteTarget)}
        leave={deleteTarget}
        saving={deleteSaving}
        onClose={() => !deleteSaving && setDeleteTarget(null)}
        onConfirm={confirmDeleteLeave}
      />

      <div
        className={`toast${toast.visible ? " show" : ""}${
          toast.type ? ` ${toast.type}` : ""
        }`}
      >
        {toast.msg}
      </div>
    </div>
  );
}
