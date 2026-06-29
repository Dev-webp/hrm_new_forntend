import { useCallback, useEffect, useRef, useState } from "react";
import {
  batchGeneratePayslips,
  downloadPayslipPdf,
  fetchAttendancePreview,
  fetchBranches,
  fetchPayrollEmployees,
  fetchPayslip,
  fetchPayslips,
  generatePayslip,
  updatePayslipStatus,
} from "../../services/payslipApi";
import { fetchDepartments as fetchManagedDepartments } from "../../services/departmentApi";
import "../../styles/adminPayslip.css";

const DEF_MONTH = `${new Date().getFullYear()}-${String(
  new Date().getMonth() + 1
).padStart(2, "0")}`;

// Formatting helpers
const inr = (n) =>
  "₹" +
  Number(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

const inr2 = (n) =>
  "₹" +
  Number(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const esc = (s) =>
  String(s || "").replace(/[&<>]/g, (m) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
  }[m]));

function monthLabel(d) {
  return new Date(d).toLocaleDateString("en-IN", {
    month: "short",
    year: "numeric",
  });
}

function normalizeMonth(value) {
  if (!value) return "";

  const clean = String(value).trim();

  const match = clean.match(/^(\d{4})-(\d{1,2})/);
  if (!match) return "";

  const year = match[1];
  const month = String(Number(match[2])).padStart(2, "0");

  if (Number(month) < 1 || Number(month) > 12) return "";

  return `${year}-${month}`;
}

function AdminPayslip() {
  const [currentBranch, setCurrentBranch] = useState("all");
  const [currentDept, setCurrentDept] = useState("all");
  const [currentSearch, setCurrentSearch] = useState("");
  const [currentMonth, setCurrentMonth] = useState(DEF_MONTH + "-01");
  const [allPayslips, setAllPayslips] = useState([]);
  const [branches, setBranches] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [branchMenuOpen, setBranchMenuOpen] = useState(false);
  const [toast, setToast] = useState({ show: false, message: "", type: "gold" });
  const [generatedMap, setGeneratedMap] = useState(new Map());

  // Generate modal state
  const [genModalOpen, setGenModalOpen] = useState(false);
  const [genMonth, setGenMonth] = useState(DEF_MONTH);
  const [genIncentives, setGenIncentives] = useState(0);
  const [genDeductions, setGenDeductions] = useState(0);
  const [genTax, setGenTax] = useState(0);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [alreadyGenerated, setAlreadyGenerated] = useState(false);
  const [employees, setEmployees] = useState([]);

  // View modal state
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewPayslip, setViewPayslip] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);

  // KPI state
  const [kpi, setKpi] = useState({
    total: 0,
    count: 0,
    deduct: 0,
    avg: 0,
    unpaid: 0,
  });

  const branchDropdownRef = useRef(null);
  const searchDebounceRef = useRef(null);

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

  // Show toast
  const showToast = useCallback((message, type = "gold") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "" }), 3500);
  }, []);

  // Load branches
  const loadBranches = useCallback(async () => {
    try {
      const data = await fetchBranches();
      setBranches(data);
    } catch (e) {
      console.error(e);
    }
  }, []);

  // Load departments
  const loadDepartments = useCallback(async () => {
    try {
      const data = await fetchManagedDepartments({
        branch: currentBranch,
        status: "all",
      });
      setDepartments(["All", ...data.map((dept) => dept.name).filter(Boolean)]);
    } catch (e) {
      console.error(e);
      setDepartments(["All"]);
    }
  }, [currentBranch]);

  // Update KPIs
  const updateKPIs = useCallback((rows) => {
    const safeRows = Array.isArray(rows) ? rows : [];
    const total = safeRows.reduce((s, p) => s + Number(p.net_pay), 0);
    const deduct = safeRows.reduce((s, p) => s + Number(p.deductions), 0);
    const unpaid = safeRows.filter((p) => p.payment_status !== "paid").length;
    const avg = safeRows.length ? total / safeRows.length : 0;
    setKpi({
      total,
      count: safeRows.length,
      deduct,
      avg,
      unpaid,
    });
  }, []);

  // Load payslips
  const loadPayslips = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const filters = {
month: currentMonth.slice(0, 7),
        branch: currentBranch,
        department: currentDept,
        search: currentSearch,
      };
      const data = await fetchPayslips(filters);
      const safePayslips = Array.isArray(data) ? data : [];
      if (!Array.isArray(data)) {
        console.warn("[AdminPayslip] fetchPayslips returned non-array:", data);
      }
      setAllPayslips(safePayslips);

      // Build generated map
      const map = new Map();
      safePayslips.forEach((p) => {
        const monthKey = p.month.slice(0, 7);
        map.set(`${p.user_id}_${monthKey}`, p.id);
      });
      setGeneratedMap(map);

      updateKPIs(safePayslips);
    } catch (err) {
      const message =
        err.response?.data?.message || err.message || "Failed to load payslips";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [currentMonth, currentBranch, currentDept, currentSearch, updateKPIs]);

useEffect(() => {
  loadBranches();
  loadDepartments();
}, [loadBranches, loadDepartments]);

useEffect(() => {
  loadPayslips();
}, [loadPayslips]);
  // Auto-refresh every 30s
  useEffect(() => {
    const interval = setInterval(() => {
      loadPayslips();
    }, 30000);
    return () => clearInterval(interval);
  }, [loadPayslips]);

  // Branch selection


  // Month change
const handleMonthChange = (e) => {
  const month = normalizeMonth(e.target.value);

  if (!month) {
    showToast("Invalid month selected", "red");
    return;
  }

  setCurrentMonth(`${month}-01`);
};

  // Search debounce
const handleBranchSelect = (branch) => {
  setCurrentBranch(branch);
  setBranchMenuOpen(false);
};

const handleDeptSelect = (dept) => {
  setCurrentDept(dept);
};

const handleSearchChange = (e) => {
  const value = e.target.value;

  clearTimeout(searchDebounceRef.current);
  searchDebounceRef.current = setTimeout(() => {
    setCurrentSearch(value);
  }, 400);
};

  // Toggle status
  const handleToggleStatus = async (id, currentStatus) => {
    const newStatus = currentStatus === "paid" ? "unpaid" : "paid";
    try {
      await updatePayslipStatus(id, newStatus);
      setAllPayslips((prev) => {
        const safePrev = Array.isArray(prev) ? prev : [];
        const next = safePrev.map((p) =>
          p.id === id ? { ...p, payment_status: newStatus } : p
        );
        updateKPIs(next);
        return next;
      });
      showToast(`✅ Marked as ${newStatus}`, "green");
    } catch (e) {
      showToast("Failed: " + e.message, "red");
    }
  };

  // Download payslip
  const handleDownload = async (id) => {
    try {
      const blob = await downloadPayslipPdf(id);
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `payslip_${id}.pdf`;
      a.click();
      URL.revokeObjectURL(a.href);
      showToast("✅ PDF downloaded", "green");
    } catch (e) {
      showToast("Download failed", "red");
    }
  };

  // View payslip
  const handleViewPayslip = async (id) => {
    setViewModalOpen(true);
    setViewLoading(true);
    try {
      const p = await fetchPayslip(id);
      setViewPayslip(p);
    } catch (e) {
      showToast("Failed to load payslip", "red");
    } finally {
      setViewLoading(false);
    }
  };

  // Open generate modal
const handleOpenGenModal = async () => {
  setGenModalOpen(true);

  // ✅ use selected payroll page month
  setGenMonth(currentMonth.slice(0, 7));

  setGenIncentives(0);
  setGenDeductions(0);
  setGenTax(0);
  setSelectedEmployee(null);
  setPreviewData(null);
  setAlreadyGenerated(false);

  try {
    const emps = await fetchPayrollEmployees();
    setEmployees(Array.isArray(emps) ? emps : []);
  } catch (e) {
    showToast("Failed to load employees", "red");
  }
};



  // Employee select change
  const handleEmployeeSelect = async (e) => {
    const empId = e.target.value;
    if (!empId) {
      setSelectedEmployee(null);
      setPreviewData(null);
      return;
    }

    const opt = e.target.selectedOptions[0];
    const employee = {
      id: empId,
      department: opt.dataset.dept,
      salary: opt.dataset.salary,
      joining_date: opt.dataset.join,
    };
    setSelectedEmployee(employee);

    // Check if already generated
    const alreadyDone = generatedMap.has(`${empId}_${genMonth}`);
    setAlreadyGenerated(alreadyDone);

    await fetchAndRenderPreview(empId, genMonth);
  };

  // Fetch attendance preview
  const fetchAndRenderPreview = async (userId, month) => {
    if (!userId || !month) return;

    setPreviewLoading(true);
    try {
      const data = await fetchAttendancePreview(userId, month);
      setPreviewData(data);
    } catch (e) {
      showToast("Error loading attendance: " + e.message, "red");
    } finally {
      setPreviewLoading(false);
    }
  };

  // Generate payslip
  const handleGenerate = async () => {
    if (!selectedEmployee) {
      showToast("Please select an employee", "red");
      return;
    }

    setGenerating(true);
    try {
      await generatePayslip({
        user_id: selectedEmployee.id,
        month: genMonth,
        incentives: genIncentives,
        deductions: genDeductions,
        tax: genTax,
      });
      showToast("✅ Payslip generated successfully!", "green");
      setGenModalOpen(false);
      setPreviewData(null);
      loadPayslips();
    } catch (e) {
      showToast("Error: " + e.message, "red");
    } finally {
      setGenerating(false);
    }
  };

  // Batch generate
  const handleBatchGenerate = async () => {
    if (!confirm(`Generate payslips for ALL employees in ${monthLabel(currentMonth)}?`)) {
      return;
    }
    try {
      const res = await batchGeneratePayslips({
       month: currentMonth.slice(0, 7),
        branch: currentBranch,
        department: currentDept,
      });
      showToast(`✅ Batch: ${res.generated} generated, ${res.failed} failed`, "green");
      loadPayslips();
    } catch (e) {
      showToast("Batch failed: " + e.message, "red");
    }
  };

  const safePayslips = Array.isArray(allPayslips) ? allPayslips : [];
  const safeEmployees = Array.isArray(employees) ? employees : [];

  // Export CSV
  const handleExportCSV = () => {
    if (!safePayslips.length) {
      showToast("No data to export", "red");
      return;
    }
    const hdr = [
      "Employee",
      "Emp ID",
      "Department",
      "Branch",
      "Month",
      "CTC",
      "Incentives",
      "Deductions",
      "Tax",
      "Net Pay",
      "Status",
    ];
    const rows = safePayslips.map((p) => [
      p.full_name,
      p.employee_code || "",
      p.department,
      p.branch,
      monthLabel(p.month),
      p.basic_salary,
      p.incentives,
      p.deductions,
      p.tax,
      p.net_pay,
      p.payment_status,
    ]);
    const csv = [hdr, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `payslips_${currentMonth.slice(0, 7)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    showToast("✅ CSV exported", "green");
  };


const calculateSalaryPreview = () => {
  if (!previewData || !selectedEmployee) return null;

  const salary = Number(selectedEmployee?.salary || 0);

  const totalDays = Number(
    previewData.calendar?.totalDaysInMonth || 30
  );

  const fullDays = Number(previewData.attendance?.fullDays || 0);
  const halfDays = Number(previewData.attendance?.halfDays || 0);
  const sundays = Number(previewData.calendar?.sundayCount || 0);
  const holidays = Number(previewData.calendar?.holidayCount || 0);
  const paidLeaves = Number(previewData.leave?.paidLeaveUsed || 0);

  const payableDays =
    fullDays +
    sundays +
    holidays +
    paidLeaves +
    halfDays * 0.5;

  const dailyRate = salary / totalDays;

  const earnedBasic = dailyRate * payableDays;

  const leaveDeduction = Math.max(0, salary - earnedBasic);

  const grossPay = earnedBasic + Number(genIncentives || 0);

  const netPay =
    grossPay -
    Number(genDeductions || 0) -
    Number(genTax || 0);

  const unpaidLeaveDays = Math.max(
    0,
    Number(previewData.calendar?.workingDaysCount || 0) -
      fullDays -
      paidLeaves -
      halfDays * 0.5
  );

  return {
    dailyRate,
    payableDays,
    unpaidLeaveDays,
    leaveDeduction,
    earnedBasic,
    grossPay,
    netPay,
  };
};

const salaryPreview = calculateSalaryPreview();





  // Analytics strip
  const deptAnalytics = (() => {
    const deptMap = new Map();
    safePayslips.forEach((p) => {
      const d = p.department;
      if (!deptMap.has(d)) deptMap.set(d, { payout: 0, count: 0 });
      const v = deptMap.get(d);
      v.payout += Number(p.net_pay);
      v.count++;
    });
    return Array.from(deptMap.entries());
  })();

  const branchDisplay =
    currentBranch === "all"
      ? "🌍 All Branches"
      : `🏢 ${currentBranch}`;

  return (
    <div className="admin-payslip-page admin-portal-page">
      <div className="page-header">
        <div>
          <div className="page-title">
            <i className="fas fa-coins" style={{ fontSize: "1.4rem" }}></i> Payroll
            Management
          </div>
          <div className="page-sub">
            Process salaries · Generate payslips · Real-time analytics ·{" "}
            <span id="branchLabel">
              {currentBranch === "all" ? "All Branches" : currentBranch}
            </span>
          </div>
        </div>
        <div className="header-actions">
          <button className="btn-gold" onClick={handleOpenGenModal}>
            <i className="fas fa-plus-circle"></i> Generate Payslip
          </button>
          <button className="btn-outline" onClick={handleBatchGenerate}>
            <i className="fas fa-layer-group"></i> Batch Generate
          </button>
          <div className="branch-wrap" ref={branchDropdownRef}>
            <div
              className="branch-btn"
              onClick={(e) => {
                e.stopPropagation();
                setBranchMenuOpen((open) => !open);
              }}
            >
              <i className="fas fa-store"></i>
              <span>{branchDisplay}</span>
              <i className="fas fa-chevron-down"></i>
            </div>
            {branchMenuOpen && (
              <div className="branch-menu">
                <div
                  className="branch-menu-item"
                  onClick={() => handleBranchSelect("all")}
                >
                  🌍 All Branches
                </div>
                {branches.map((b) => (
                  <div
                    key={b.name}
                    className="branch-menu-item"
                    onClick={() => handleBranchSelect(b.name)}
                  >
                    🏢 {esc(b.name)}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="live-badge">
            <div className="live-dot"></div> LIVE
          </div>
        </div>
      </div>

      <div className="filter-bar">
        <div className="search-box">
          <i className="fas fa-search" style={{ color: "var(--gold)" }}></i>
          <input
            type="text"
            placeholder="Search employee, department…"
            onChange={handleSearchChange}
          />
        </div>
        <input
          type="month"
          className="month-pick"
          defaultValue={DEF_MONTH}
          onChange={handleMonthChange}
        />
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
        {departments.map((d) => {
  const value = d === "All" ? "all" : d;

  return (
    <button
      key={d}
      type="button"
      className={`chip ${currentDept === value ? "active" : ""}`}
      onClick={() => setCurrentDept(value)}
    >
      {d}
    </button>
  );
})}
        </div>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-label">Total Payout</div>
          <div className="kpi-value">{inr(kpi.total)}</div>
          <div className="kpi-sub">Selected month & filters</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Employees</div>
          <div className="kpi-value">{kpi.count}</div>
          <div className="kpi-sub">Payslips generated</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Total Deductions</div>
          <div className="kpi-value" style={{ color: "var(--red)" }}>
            {inr(kpi.deduct)}
          </div>
          <div className="kpi-sub">Across all employees</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Avg Net Salary</div>
          <div className="kpi-value">{inr(kpi.avg)}</div>
          <div className="kpi-sub">Per employee this month</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Unpaid Payslips</div>
          <div className="kpi-value" style={{ color: "var(--amber)" }}>
            {kpi.unpaid}
          </div>
          <div className="kpi-sub">Pending disbursement</div>
        </div>
      </div>

      <div className="analytics-strip">
        {deptAnalytics.map(([dept, v]) => (
          <div key={dept} className="dept-pill">
            <div className="dept-pill-name">{esc(dept)}</div>
            <div className="dept-pill-amt">{inr(v.payout)}</div>
            <div className="dept-pill-count">{v.count} employees</div>
          </div>
        ))}
      </div>

      <div className="table-card">
        <div className="table-header">
          <div className="table-title">
            <i className="fas fa-receipt"></i> Payslip Records
          </div>
          <button className="btn-outline" onClick={handleExportCSV}>
            <i className="fas fa-download"></i> Export CSV
          </button>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table className="payslip-tbl">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Branch / Dept</th>
                <th>Month</th>
                <th>Basic CTC</th>
                <th>Incentives</th>
                <th>Deductions</th>
                <th>Tax</th>
                <th>Net Pay</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr className="empty-row">
                  <td colSpan="10">
                    <span className="spinner"></span> Loading…
                  </td>
                </tr>
              ) : error ? (
                <tr className="empty-row">
                  <td colSpan="10" style={{ color: "var(--red)" }}>
                    Failed: {esc(error)}
                  </td>
                </tr>
              ) : !safePayslips.length ? (
                <tr className="empty-row">
                  <td colSpan="10">No payslips found for the selected filters.</td>
                </tr>
              ) : (
                safePayslips.map((p) => {
                  const isPaid = p.payment_status === "paid";
                  return (
                    <tr key={p.id}>
                      <td>
                        <div className="emp-name">{esc(p.full_name)}</div>
                        <div className="emp-meta">{esc(p.employee_code || "—")}</div>
                      </td>
                      <td>
                        <div>{esc(p.branch)}</div>
                        <div className="emp-meta">{esc(p.department)}</div>
                      </td>
                      <td>{monthLabel(p.month)}</td>
                      <td className="mono">{inr(p.basic_salary)}</td>
                      <td className="mono earning-val">{inr(p.incentives)}</td>
                      <td className="mono deduction-val">{inr(p.deductions)}</td>
                      <td className="mono deduction-val">{inr(p.tax)}</td>
                      <td className="mono net-val">{inr(p.net_pay)}</td>
                      <td>
                        <span className={`status-pill ${isPaid ? "paid" : "unpaid"}`}>
                          <i className={`fas fa-${isPaid ? "check-circle" : "clock"}`}></i>
                          {isPaid ? "Paid" : "Unpaid"}
                        </span>
                      </td>
                      <td>
                        <div className="action-btns">
                          <button
                            className="icon-btn"
                            onClick={() => handleViewPayslip(p.id)}
                            title="View"
                          >
                            <i className="fas fa-eye"></i>
                          </button>
                          <button
                            className="icon-btn"
                            onClick={() => handleDownload(p.id)}
                            title="Download PDF"
                          >
                            <i className="fas fa-download"></i>
                          </button>
                          <button
                            className={`toggle-status-btn ${
                              isPaid ? "mark-unpaid" : "mark-paid"
                            }`}
                            onClick={() => handleToggleStatus(p.id, p.payment_status)}
                            title={isPaid ? "Mark as Unpaid" : "Mark as Paid"}
                          >
                            <i
                              className={`fas fa-${isPaid ? "times-circle" : "check-circle"}`}
                            ></i>
                            {isPaid ? "Mark Unpaid" : "Mark Paid"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Generate Payslip Modal */}
      {genModalOpen && (
        <div
          className="modal-overlay open"
          onClick={() => setGenModalOpen(false)}
        >
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h2>
                <i className="fas fa-file-invoice"></i> Generate Payslip
              </h2>
              <button
                className="modal-close"
                onClick={() => setGenModalOpen(false)}
              >
                &times;
              </button>
            </div>
            <div className="modal-body">
              {alreadyGenerated && (
                <div className="already-notice show">
                  <i className="fas fa-check-circle" style={{ fontSize: "1.1rem" }}></i>
                  <span>
                    A payslip already exists for this employee this month. Generating
                    again will overwrite it.
                  </span>
                </div>
              )}

              <div className="form-grid">
                <div className="form-group full">
                  <label className="form-label">Select Employee *</label>
                  <select
                    className="form-control"
                    onChange={handleEmployeeSelect}
                  >
                    <option value="">── Select Employee ──</option>
                    {safeEmployees.map((e) => {
                      const alreadyDone = generatedMap.has(`${e.id}_${genMonth}`);
                      return (
                        <option
                          key={e.id}
                          value={e.id}
                          data-dept={e.department}
                          data-salary={e.salary}
                          data-join={e.joining_date || ""}
                          className={alreadyDone ? "already-generated" : ""}
                        >
                          {esc(e.full_name)} ({esc(e.department)})
                          {alreadyDone ? " ✓ generated" : ""}
                        </option>
                      );
                    })}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Month *</label>
                  <input
                    type="month"
                    className="form-control"
                    value={genMonth}
                  onChange={async (e) => {
  const month = normalizeMonth(e.target.value);

  if (!month) {
    showToast("Invalid month selected", "red");
    return;
  }

  setGenMonth(month);

  if (selectedEmployee?.id) {
    const alreadyDone = generatedMap.has(`${selectedEmployee.id}_${month}`);
    setAlreadyGenerated(alreadyDone);
    await fetchAndRenderPreview(selectedEmployee.id, month);
  }
}}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Department</label>
                  <input
                    type="text"
                    className="form-control"
                    readOnly
                    value={selectedEmployee?.department || "—"}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Monthly CTC (₹)</label>
                  <input
                    type="text"
                    className="form-control"
                    readOnly
                    value={selectedEmployee ? inr(selectedEmployee.salary) : "—"}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Joining Date</label>
                  <input
                    type="text"
                    className="form-control"
                    readOnly
                    value={selectedEmployee?.joining_date || "—"}
                  />
                </div>
              </div>

              {previewData && (
                <>
                  <div className="att-preview">
                    <div className="att-preview-title">
                      <i className="fas fa-chart-bar"></i> Attendance Summary{" "}
                      {previewLoading && <span className="spinner"></span>}
                    </div>
                    <div className="att-grid">
                      <div className="att-box muted">
                        <div className="att-box-val">
                          {previewData.calendar.totalDaysInMonth}
                        </div>
                        <div className="att-box-label">Total Days</div>
                      </div>
                      <div className="att-box blue">
                        <div className="att-box-val">
                          {previewData.calendar.sundayCount}
                        </div>
                        <div className="att-box-label">Sundays ✓</div>
                      </div>
                      <div className="att-box blue">
                        <div className="att-box-val">
                          {previewData.calendar.holidayCount}
                        </div>
                        <div className="att-box-label">Holidays ✓</div>
                      </div>
                      <div className="att-box gold">
                        <div className="att-box-val">
                          {previewData.calendar.workingDaysCount}
                        </div>
                        <div className="att-box-label">Working Days</div>
                      </div>
                      <div className="att-box green">
                        <div className="att-box-val">
                          {previewData.attendance.fullDays}
                        </div>
                        <div className="att-box-label">Full Days</div>
                      </div>
                      <div className="att-box amber">
                        <div className="att-box-val">
                          {previewData.attendance.halfDays}
                        </div>
                        <div className="att-box-label">Half Days</div>
                      </div>
                      <div className="att-box red">
                        <div className="att-box-val">
                          {previewData.attendance.absentDays}
                        </div>
                        <div className="att-box-label">Absent</div>
                      </div>
                      <div
                        className={`att-box ${
                          previewData.attendance.lateLogins > 6 ? "red" : "amber"
                        }`}
                      >
                        <div className="att-box-val">
                          {previewData.attendance.lateLogins}
                        </div>
                        <div className="att-box-label">Late Logins</div>
                      </div>
                      <div className="att-box green">
                        <div className="att-box-val">
                          {previewData.leave.paidLeaveUsed}
                        </div>
                        <div className="att-box-label">Paid Leave</div>
                      </div>
                      <div className="att-box red">
                        <div className="att-box-val">
                          {previewData.leave.unpaidLeaveDays}
                        </div>
                        <div className="att-box-label">Unpaid Leave</div>
                      </div>
                    </div>
                   <div className="att-note">
  Daily Rate = <span>{inr2(salaryPreview.dailyRate)}</span> ·
  Payable Days = <span>{salaryPreview.payableDays}</span> ·
  Unpaid Leave Days = <span>{salaryPreview.unpaidLeaveDays}</span>
</div>
                    {previewData.leave.eligible ? (
                      <div className="pl-explain">
                        <strong>✓ Paid Leave Eligible</strong> (
                        {previewData.leave.monthsCompleted} months completed)<br />
                        Quota: <strong>{previewData.leave.allowedPaidLeave} paid leave/month</strong>
                        <br />
                        Total absences this month:{" "}
                        <strong>
                          {previewData.leave.totalAbsences ||
                            previewData.attendance.absentDays +
                              (previewData.attendance.formalLeaveCount || 0)}
                        </strong>
                        <br />
                        → <strong>{previewData.leave.paidLeaveUsed} absence(s)</strong>{" "}
                        covered by paid leave quota
                      </div>
                    ) : (
                      <div
                        className="pl-explain"
                        style={{
                          background: "#1a0a0a",
                          borderColor: "rgba(239,68,68,.2)",
                          color: "#fca5a5",
                        }}
                      >
                        <strong style={{ color: "var(--red)" }}>
                          ✗ Not Yet Eligible for Paid Leave
                        </strong>
                        <br />
                        {previewData.leave.monthsCompleted} month(s) completed —
                        eligible after <strong>3 months</strong> from joining date.
                        <br />
                        All{" "}
                        {previewData.leave.totalAbsences ||
                          previewData.attendance.absentDays +
                            (previewData.attendance.formalLeaveCount || 0)}{" "}
                        absence(s) this month are <strong>unpaid</strong>.
                      </div>
                    )}
                  </div>

                  <div className="form-grid" style={{ marginTop: "14px" }}>
                    <div className="form-group">
                      <label className="form-label">Incentives (₹)</label>
                      <input
                        type="number"
                        className="form-control"
                        value={genIncentives}
                        onChange={(e) => setGenIncentives(Number(e.target.value))}
                        min="0"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Other Deductions (₹)</label>
                      <input
                        type="number"
                        className="form-control"
                        value={genDeductions}
                        onChange={(e) => setGenDeductions(Number(e.target.value))}
                        min="0"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Tax / TDS (₹)</label>
                      <input
                        type="number"
                        className="form-control"
                        value={genTax}
                        onChange={(e) => setGenTax(Number(e.target.value))}
                        min="0"
                      />
                    </div>
                  </div>

                  {salaryPreview && (
                    <>
                      <div className="salary-preview">
                        <div className="sal-row section-head">
                          <span>Earnings</span>
                        </div>

<div className="sal-row">
  <span>Monthly Salary</span>
  <span>{inr2(selectedEmployee?.salary)}</span>
</div>

<div className="sal-row">
  <span>Daily Rate</span>
  <span>{inr2(salaryPreview.dailyRate)}</span>
</div>

<div className="sal-row">
  <span>Unpaid Leave Days</span>
  <span>{salaryPreview.unpaidLeaveDays}</span>
</div>

<div className="sal-row">
  <span>Leave Deduction</span>
  <span className="deduction-val">
    - {inr2(salaryPreview.leaveDeduction)}
  </span>
</div>

<div className="sal-row subtotal">
  <span>Salary After Leave Deduction</span>
  <span>{inr2(salaryPreview.earnedBasic)}</span>
</div>

<div className="sal-row">
  <span>Incentives</span>
  <span>
    + {inr2(genIncentives)}
  </span>
</div>

<div className="sal-row subtotal">
  <span>Gross Pay</span>
  <span>{inr2(salaryPreview.grossPay)}</span>
</div>
       



                        <div className="sal-row section-head">
                          <span>Deductions (from Gross)</span>
                        </div>
                        <div className="sal-row">
                          <span>Other Deductions</span>
                          <span className="mono deduction-val">
                            - {inr2(genDeductions)}
                          </span>
                        </div>
                        <div className="sal-row">
                          <span>Tax (TDS)</span>
                          <span className="mono deduction-val">- {inr2(genTax)}</span>
                        </div>
                      </div>
                      <div className="net-box">
                        <div className="net-box-label">
                          <i
                            className="fas fa-rupee-sign"
                            style={{ color: "var(--gold)" }}
                          ></i>{" "}
                          Net Salary (Take Home)
                        </div>
                        <div className="net-box-amount">{inr2(salaryPreview.netPay)}</div>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
            <div className="modal-footer">
              <button
                className="btn-secondary"
                onClick={() => setGenModalOpen(false)}
              >
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={handleGenerate}
                disabled={generating || !selectedEmployee}
              >
                <i className="fas fa-file-pdf"></i> Generate & Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Payslip Modal */}
      {viewModalOpen && (
        <div
          className="modal-overlay open"
          onClick={() => setViewModalOpen(false)}
        >
          <div className="modal-box" style={{ maxWidth: "860px" }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h2>
                <i className="fas fa-eye"></i> Payslip Detail
              </h2>
              <button
                className="modal-close"
                onClick={() => setViewModalOpen(false)}
              >
                &times;
              </button>
            </div>
            {viewLoading ? (
              <div style={{ textAlign: "center", padding: "48px" }}>
                <span className="spinner"></span>
              </div>
            ) : viewPayslip ? (
              <div className="payslip-view">
                {/* Payslip view content would go here - simplified for brevity */}
                <div style={{ padding: "20px" }}>
                  <h3 style={{ color: "var(--gold)" }}>
                    {esc(viewPayslip.full_name)}
                  </h3>
                  <p>Net Pay: {inr2(viewPayslip.net_pay)}</p>
                  <p>Status: {viewPayslip.payment_status}</p>
                </div>
              </div>
            ) : (
              <div style={{ padding: "32px", color: "var(--red)" }}>
                Failed to load payslip
              </div>
            )}
            <div className="modal-footer">
              <button
                className="btn-secondary"
                onClick={() => setViewModalOpen(false)}
              >
                Close
              </button>
              <button
                className="btn-outline"
                onClick={() => handleDownload(viewPayslip?.id)}
              >
                <i className="fas fa-download"></i> Download PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      <div
        className={`toast ${toast.show ? "show" : ""}`}
        style={{
          borderLeftColor:
            toast.type === "green"
              ? "var(--green)"
              : toast.type === "red"
              ? "var(--red)"
              : "var(--gold)",
        }}
      >
        {toast.message}
      </div>
    </div>
  );
}

export default AdminPayslip;
