import { useCallback, useEffect, useMemo, useState } from "react";
import EmployeeSidebar from "../../components/EmployeeSidebar";
import { useEmployeeApi } from "../../hooks/useEmployeeApi";
import { parseJwt } from "../../utils/parseJwt";
import { escapeHtml, normalizeArray } from "./employeeUtils";
import { fetchMyLeaveBalance } from "../../services/employeeApi";
import "../../styles/EmployeeLeave.css";

const TYPE_CONFIG = {
  Paid: { icon: "✅", cls: "lc-annual" },
  Unpaid: { icon: "💸", cls: "lc-emergency" },
};

export default function EmployeeLeave() {
  const { apiFetch, navigate } = useEmployeeApi();
  const token = localStorage.getItem("token");
  const decoded = parseJwt(token) || {};
  const userId = decoded.id || 0;

  const [allLeaves, setAllLeaves] = useState([]);
  const [leaveBalance, setLeaveBalance] = useState(null);
  const [currentFilter, setCurrentFilter] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    leaveType: "Unpaid",
    fromDate: "",
    toDate: "",
    reason: "",
  });
  const [calculatedDays, setCalculatedDays] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState({ msg: "", visible: false, type: "" });

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

      if (Number(balance?.paid_leave_balance || 0) > 0) {
        setForm((f) => ({ ...f, leaveType: "Paid" }));
      } else {
        setForm((f) => ({ ...f, leaveType: "Unpaid" }));
      }
    } catch (e) {
      showToast(`Error: ${e.message}`, "error");
    } finally {
      setIsLoading(false);
    }
  }, [apiFetch, showToast]);

  useEffect(() => {
    load();
  }, [load]);

  const balanceCards = useMemo(() => {
    if (!leaveBalance) return [];

    return [
      {
        type: "Paid",
        cfg: TYPE_CONFIG.Paid,
        used: leaveBalance.paid_used || 0,
        avail: leaveBalance.paid_leave_balance || 0,
        max: leaveBalance.total_paid_credited || 0,
      },
      {
        type: "Carry Forward",
        cfg: { icon: "🔁", cls: "lc-annual" },
        used: 0,
        avail: leaveBalance.carry_forward || 0,
        max: leaveBalance.carry_forward || 0,
      },
      {
        type: "Unpaid Taken",
        cfg: TYPE_CONFIG.Unpaid,
        used: leaveBalance.unpaid_used || 0,
        avail: 0,
        max: leaveBalance.unpaid_used || 0,
      },
    ].map((card) => ({
      ...card,
      pct: card.max > 0 ? Math.min(100, (card.used / card.max) * 100) : 0,
    }));
  }, [leaveBalance]);

  const filteredLeaves = useMemo(() => {
    if (currentFilter === "all") return allLeaves;
    return allLeaves.filter((l) => l.status === currentFilter);
  }, [allLeaves, currentFilter]);

  const calcDays = useCallback((from, to) => {
    if (from && to && new Date(to) >= new Date(from)) {
      const d = Math.ceil((new Date(to) - new Date(from)) / 86400000) + 1;
      setCalculatedDays(d);
    } else {
      setCalculatedDays(null);
    }
  }, []);

  useEffect(() => {
    calcDays(form.fromDate, form.toDate);
  }, [form.fromDate, form.toDate, calcDays]);

  const submitLeave = async () => {
    const { leaveType, fromDate, toDate, reason } = form;

    if (!fromDate || !toDate) {
      showToast("Please select dates", "error");
      return;
    }

    if (new Date(toDate) < new Date(fromDate)) {
      showToast("End date must be after start date", "error");
      return;
    }

    const days =
      Math.ceil((new Date(toDate) - new Date(fromDate)) / 86400000) + 1;

    if (
      leaveType === "Paid" &&
      days > Number(leaveBalance?.paid_leave_balance || 0)
    ) {
      showToast(
        `Only ${leaveBalance?.paid_leave_balance || 0} paid leave available`,
        "error"
      );
      return;
    }

    try {
      await apiFetch("/leaves", {
        method: "POST",
        body: {
          user_id: userId,
          leave_type: leaveType,
          from_date: fromDate,
          to_date: toDate,
          days,
          reason: reason.trim(),
        },
      });

      showToast("✅ Leave request submitted!", "success");
      setModalOpen(false);
      setForm({ leaveType: "Unpaid", fromDate: "", toDate: "", reason: "" });
      setCalculatedDays(null);
      load();
    } catch (e) {
      showToast(e.message || "Submit failed", "error");
    }
  };

  return (
    <div className="layout">
      <EmployeeSidebar activePage="leave" />

      <div className="main">
        <div className="topbar">
          <div>
            <h1>My Leave</h1>
            <p>Apply, track, and manage your leave requests</p>
          </div>

          <button
            type="button"
            className="apply-btn"
            onClick={() => setModalOpen(true)}
          >
            <i className="fas fa-plus" /> Apply for Leave
          </button>
        </div>

        <div className="content">
          <div className="leave-info-banner">
            💡 1 paid leave is credited every month after probation. Unused paid
            leaves carry forward. Future month leaves cannot be used.
          </div>

          <div className="leave-balance-grid">
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

          <div className="balance-grid" id="balanceGrid">
            {isLoading ? (
              <div className="bal-card">
                <div style={{ textAlign: "center", padding: 20 }}>
                  <span className="spinner" />
                </div>
              </div>
            ) : (
              balanceCards.map((card) => (
                <div key={card.type} className="bal-card">
                  <div className="bc-type">
                    {card.cfg.icon} {card.type} Leave
                  </div>

                  <div className="bc-bar-wrap">
                    <div className="bc-bar" style={{ width: `${card.pct}%` }} />
                  </div>

                  <div className="bal-numbers">
                    <div className="bal-used">{card.used}</div>
                    <div className="bal-total">/ {card.max} days</div>
                  </div>

                  <div className="bal-avail">✓ {card.avail} days remaining</div>
                </div>
              ))
            )}
          </div>

          <div className="tabs">
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
              filteredLeaves.map((l) => {
                const cfg = TYPE_CONFIG[l.leave_type] || TYPE_CONFIG.Unpaid;

                const statusCls =
                  l.status === "approved"
                    ? "sc-approved"
                    : l.status === "rejected"
                    ? "sc-rejected"
                    : "sc-pending";

                const fromDate = new Date(l.from_date).toLocaleDateString(
                  "en-US",
                  { month: "short", day: "numeric", year: "numeric" }
                );

                const toDate = new Date(l.to_date).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                });

                return (
                  <div key={l.id} className="leave-card">
                    <div className={`lc-type-icon ${cfg.cls}`}>{cfg.icon}</div>

                    <div className="lc-body">
                      <div className="lc-type">{l.leave_type} Leave</div>
                      <div className="lc-dates">
                        {fromDate} → {toDate}
                      </div>
                      {l.reason && (
                        <div className="lc-reason">{escapeHtml(l.reason)}</div>
                      )}
                    </div>

                    <div className="lc-days">
                      <div className="days-num">{l.days}</div>
                      <div className="days-label">days</div>
                    </div>

                    <div className={`status-chip ${statusCls}`}>
                      {l.status.charAt(0).toUpperCase() + l.status.slice(1)}
                    </div>
                  </div>
                );
              })
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
                {Number(leaveBalance?.paid_leave_balance || 0) > 0 && (
                  <option value="Paid">
                    Paid Leave ({leaveBalance.paid_leave_balance} left)
                  </option>
                )}

                <option value="Unpaid">Unpaid Leave</option>
              </select>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="lFrom">From Date</label>
                <input
                  type="date"
                  id="lFrom"
                  min={today}
                  value={form.fromDate}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, fromDate: e.target.value }))
                  }
                />
              </div>

              <div className="form-group">
                <label htmlFor="lTo">To Date</label>
                <input
                  type="date"
                  id="lTo"
                  min={today}
                  value={form.toDate}
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