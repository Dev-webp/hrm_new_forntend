import { useCallback, useEffect, useRef, useState } from "react";
import {
  batchGeneratePayslips,
  downloadPayslipPdf,
  fetchAttendancePreview,
  fetchBranches,
  fetchIndividualAttendanceAnalysis,
  fetchPayrollEmployees,
  fetchPayslip,
  fetchPayslipByEmployeeMonth,
  fetchPayslips,
  generatePayslip,
  updatePayslipAdjustments,
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
  const [monthMenuOpen, setMonthMenuOpen] = useState(false);
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
  const [attendanceRecords, setAttendanceRecords] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [alreadyGenerated, setAlreadyGenerated] = useState(false);
  const [employees, setEmployees] = useState([]);

  // View modal state
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewPayslip, setViewPayslip] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);

  // Edit incentives/deductions modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editPayslip, setEditPayslip] = useState(null);
  const [editIncentives, setEditIncentives] = useState(0);
  const [editDeductions, setEditDeductions] = useState(0);
  const [editTax, setEditTax] = useState(0);
  const [editSaving, setEditSaving] = useState(false);

  // KPI state
  const [kpi, setKpi] = useState({
    total: 0,
    count: 0,
    deduct: 0,
    avg: 0,
    unpaid: 0,
  });

  const branchDropdownRef = useRef(null);
  const monthDropdownRef = useRef(null);
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
      if (
        monthDropdownRef.current &&
        !monthDropdownRef.current.contains(event.target)
      ) {
        setMonthMenuOpen(false);
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
      // Ensure month is in YYYY-MM format
      const monthParts = currentMonth.split('-');
      if (monthParts.length < 2) {
        throw new Error(`Invalid currentMonth format: ${currentMonth}`);
      }
      const year = monthParts[0];
      const month = monthParts[1];
      const monthStr = `${year}-${month}`; // YYYY-MM format
      
      console.log("[AdminPayslip] currentMonth:", currentMonth);
      console.log("[AdminPayslip] monthStr:", monthStr);
      
      const filters = {
        month: monthStr,
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

// Load employees by default on page load
useEffect(() => {
  const loadEmployees = async () => {
    try {
      const emps = await fetchPayrollEmployees();
      setEmployees(Array.isArray(emps) ? emps : []);
    } catch (e) {
      console.error("Failed to load employees:", e);
    }
  };
  loadEmployees();
}, []);

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

// Month selection from dropdown
const handleMonthSelect = (year, month) => {
  const monthStr = `${year}-${String(month).padStart(2, '0')}`;
  setCurrentMonth(`${monthStr}-01`);
  setMonthMenuOpen(false);
};

// Toggle month menu
const toggleMonthMenu = (e) => {
  e.stopPropagation();
  setMonthMenuOpen(!monthMenuOpen);
};

// Navigate year
const prevYear = () => {
  const currentYear = parseInt(currentMonth.slice(0, 4));
  const newYear = currentYear - 1;
  setCurrentMonth(`${newYear}-${currentMonth.slice(5, 7)}-01`);
};

const nextYear = () => {
  const currentYear = parseInt(currentMonth.slice(0, 4));
  const newYear = currentYear + 1;
  setCurrentMonth(`${newYear}-${currentMonth.slice(5, 7)}-01`);
};

// Get available months (current year)
const getAvailableMonths = () => {
  const currentYear = new Date().getFullYear();
  const months = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' }
  ];

  return months.map(m => ({
    ...m,
    year: currentYear,
    monthKey: `${currentYear}-${String(m.value).padStart(2, '0')}`
  }));
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
    const action = newStatus === "paid" ? "mark as paid" : "mark as unpaid";
    
    if (!confirm(`Are you sure you want to ${action} this payslip?`)) {
      return;
    }
    
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

  // Open edit incentives/deductions modal
  const handleOpenEditModal = async (p) => {
    setEditModalOpen(true);
    setEditPayslip(p);
    setEditIncentives(Number(p.incentives || 0));
    setEditDeductions(Number(p.deductions || 0));
    setEditTax(Number(p.tax || 0));
  };

  // Save incentives/deductions
  const handleSaveAdjustments = async () => {
    if (!editPayslip) return;
    
    setEditSaving(true);
    try {
      await updatePayslipAdjustments(
        editPayslip.id,
        editIncentives,
        editDeductions,
        editTax
      );
      showToast("✅ Adjustments saved successfully!", "green");
      setEditModalOpen(false);
      loadPayslips(); // Refresh the table
    } catch (e) {
      showToast("Failed to save adjustments: " + e.message, "red");
    } finally {
      setEditSaving(false);
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
  setAttendanceRecords(null);
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
  const fetchAndRenderPreview = useCallback(async (userId, month) => {
    if (!userId || !month) return;

    setPreviewLoading(true);
    try {
      const data = await fetchAttendancePreview(userId, month);
      setPreviewData(data);

      // Also fetch detailed attendance records from individual analysis
      const attendanceData = await fetchIndividualAttendanceAnalysis(userId, month);
      setAttendanceRecords(attendanceData.records || []);

      // Check if payslip already exists and populate editable fields
      const alreadyDone = generatedMap.has(`${userId}_${month}`);
      if (alreadyDone) {
        // Fetch existing payslip to get saved incentives/deductions/tax
        try {
          const existingPayslip = await fetchPayslipByEmployeeMonth(userId, month);
          if (existingPayslip) {
            setGenIncentives(Number(existingPayslip.incentives || 0));
            setGenDeductions(Number(existingPayslip.deductions || 0));
            setGenTax(Number(existingPayslip.tax || 0));
          }
        } catch (e) {
          // If fetch fails, keep values at 0
          console.log('Could not fetch existing payslip values:', e);
        }
      }
    } catch (e) {
      showToast("Error loading attendance: " + e.message, "red");
    } finally {
      setPreviewLoading(false);
    }
  }, [showToast, generatedMap]);

  // Fetch preview when modal opens or employee/month changes
  useEffect(() => {
    if (genModalOpen && selectedEmployee?.id && genMonth) {
      // Reset editable fields when employee or month changes
      setGenIncentives(0);
      setGenDeductions(0);
      setGenTax(0);
      fetchAndRenderPreview(selectedEmployee.id, genMonth);
    }
  }, [genModalOpen, selectedEmployee?.id, genMonth, fetchAndRenderPreview]);

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
      setAttendanceRecords(null);
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
      "Branch",
      "Department",
      "Basic CTC",
      "Daily Rate",
      "Present",
      "Absent",
      "Half Days",
      "Late Logins",
      "Paid Leave",
      "Auth AWI",
      "Unauth Absent",
      "Paid Sundays",
      "Unpaid Sundays",
      "Holidays",
      "Payable Days",
      "Net Pay",
      "Status",
    ];
    const rows = safePayslips.map((p) => {
      const awiDays = Number(p.awi_deduction_days || 0);
      const authAwi = Math.floor(awiDays / 2);
      const unauthAbsent = awiDays - authAwi;
      return [
        p.full_name,
        p.employee_code || "",
        p.branch,
        p.department,
        p.basic_salary,
        p.basic_salary / 30,
        p.full_days || 0,
        p.absent_days || 0,
        p.half_days || 0,
        p.late_login_count || 0,
        p.paid_leave || 0,
        p.auth_awi || 0,
        p.unauth_awi || 0,
        p.paid_sundays || 0,
        p.unpaid_sundays || 0,
        p.holidays || 0,
        p.total_paid_days || 0,
        p.net_pay,
        p.payment_status,
      ];
    });
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
      <div className="content-wrapper">
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
                  All Branches
                </div>
                {branches.map((b) => (
                  <div
                    key={b}
                    className="branch-menu-item"
                    onClick={() => handleBranchSelect(b)}
                  >
                    {b}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="scrollable-content">
      <div className="payroll-dashboard-container">
        <div className="payroll-filter-row">
          <div className="payroll-search-container">
            <i className="fas fa-search payroll-search-icon"></i>
            <input
              type="text"
              className="payroll-search-input"
              placeholder="Search employee by name, email or employee ID..."
              onChange={handleSearchChange}
            />
          </div>
          <div className="payroll-department-container">
            <i className="fas fa-building payroll-department-icon"></i>
            <select
              value={currentDept}
              onChange={(e) => setCurrentDept(e.target.value)}
              className="payroll-department-select"
            >
              <option value="">All Departments</option>
              {departments.map((d) => {
                const value = d === "All" ? "all" : d;
                return (
                  <option key={d} value={value}>
                    {d}
                  </option>
                );
              })}
            </select>
            <i className="fas fa-chevron-down payroll-department-arrow"></i>
          </div>
          <div className="payroll-month-container" ref={monthDropdownRef}>
            <div
              className="payroll-month-selector"
              onClick={(e) => toggleMonthMenu(e)}
            >
              <i className="fas fa-calendar payroll-month-icon"></i>
              <span className="payroll-month-text">{monthLabel(currentMonth)}</span>
              <i className="fas fa-chevron-down payroll-month-arrow"></i>
            </div>
            {monthMenuOpen && (
              <div className="payroll-month-popover">
                <div className="payroll-month-header">
                  <i className="fas fa-chevron-left payroll-nav-arrow" onClick={(e) => { e.stopPropagation(); prevYear(); }}></i>
                  <span className="payroll-year-display">{currentMonth.slice(0, 4)}</span>
                  <i className="fas fa-chevron-right payroll-nav-arrow" onClick={(e) => { e.stopPropagation(); nextYear(); }}></i>
                </div>
                <div className="payroll-month-grid">
                  {getAvailableMonths().map((m) => (
                    <div
                      key={m.monthKey}
                      className={`payroll-month-item ${currentMonth.slice(0, 7) === m.monthKey ? 'payroll-month-active' : ''}`}
                      onClick={() => handleMonthSelect(m.year, m.value)}
                    >
                      {m.label}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="payroll-kpi-row">
          <div className="payroll-kpi-card payroll-kpi-blue">
            <div className="payroll-kpi-icon-container">
              <i className="fas fa-coins payroll-kpi-icon"></i>
            </div>
            <div className="payroll-kpi-content">
              <div className="payroll-kpi-label">Total Payroll</div>
              <div className="payroll-kpi-value">{inr(kpi.total)}</div>
            </div>
            <div className="payroll-kpi-wave payroll-wave-blue"></div>
          </div>
          <div className="payroll-kpi-card payroll-kpi-green">
            <div className="payroll-kpi-icon-container">
              <i className="fas fa-users payroll-kpi-icon"></i>
            </div>
            <div className="payroll-kpi-content">
              <div className="payroll-kpi-label">Active Employees</div>
              <div className="payroll-kpi-value">{kpi.count}</div>
            </div>
            <div className="payroll-kpi-wave payroll-wave-green"></div>
          </div>
          <div className="payroll-kpi-card payroll-kpi-purple">
            <div className="payroll-kpi-icon-container">
              <i className="fas fa-calendar-check payroll-kpi-icon"></i>
            </div>
            <div className="payroll-kpi-content">
              <div className="payroll-kpi-label">Total Present Days</div>
              <div className="payroll-kpi-value">{safePayslips.reduce((sum, p) => sum + (Number(p.present_days) || 0), 0)}</div>
            </div>
            <div className="payroll-kpi-wave payroll-wave-purple"></div>
          </div>
          <div className="payroll-kpi-card payroll-kpi-orange">
            <div className="payroll-kpi-icon-container">
              <i className="fas fa-minus-circle payroll-kpi-icon"></i>
            </div>
            <div className="payroll-kpi-content">
              <div className="payroll-kpi-label">Total Deductions</div>
              <div className="payroll-kpi-value">{inr(kpi.deduct)}</div>
            </div>
            <div className="payroll-kpi-wave payroll-wave-orange"></div>
          </div>
          <div className="payroll-kpi-card payroll-kpi-pink">
            <div className="payroll-kpi-icon-container">
              <i className="fas fa-clock payroll-kpi-icon"></i>
            </div>
            <div className="payroll-kpi-content">
              <div className="payroll-kpi-label">Unpaid Payslips</div>
              <div className="payroll-kpi-value">{kpi.unpaid}</div>
            </div>
            <div className="payroll-kpi-wave payroll-wave-pink"></div>
          </div>
        </div>
      </div>

      <div className="table-container-modern">
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
                <th>Basic CTC</th>
                <th>Daily Rate</th>
                <th>Present</th>
                <th>Absent</th>
                <th>Half Days</th>
                <th>Late Logins</th>
                <th>Paid Leave</th>
                <th>Auth AWI</th>
                <th>Unauth Absent</th>
                <th>Paid Sundays</th>
                <th>Unpaid Sundays</th>
                <th>Holidays</th>
                <th>Payable Days</th>
                <th>Net Pay</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr className="empty-row">
                  <td colSpan="18">
                    Loading…
                  </td>
                </tr>
              ) : error ? (
                <tr className="empty-row">
                  <td colSpan="18" style={{ color: "var(--red)" }}>
                    Failed: {esc(error)}
                  </td>
                </tr>
              ) : safePayslips.length === 0 ? (
                <tr className="empty-row">
                  <td colSpan="18" style={{ color: "#71829D", fontStyle: "italic" }}>
                    No payslips generated for this month yet. Click "Generate Payslip" or "Batch Generate" to create payslips.
                  </td>
                </tr>
              ) : (
                safePayslips.map((p) => {
                  const isPaid = p.payment_status === "paid";
                  const perDay = Number(p.basic_salary || 0) / 30;
                  // Use the saved net_pay from database instead of recalculating
                  const netSalary = Number(p.net_pay || 0);

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
                      <td className="mono">{inr(p.basic_salary)}</td>
                      <td className="mono">{inr(p.basic_salary / 30)}</td>
                      <td className="mono" style={{color: 'var(--green)'}}>{p.full_days || 0}</td>
                      <td className="mono" style={{color: 'var(--red)'}}>{p.absent_days || 0}</td>
                      <td className="mono" style={{color: '#F59E0B'}}>{p.half_days || 0}</td>
                      <td className="mono" style={{color: '#7C3AED'}}>{p.late_login_count || 0}</td>
                      <td className="mono" style={{color: 'var(--green)'}}>{p.paid_leave || 0}</td>
                      <td className="mono" style={{color: '#F59E0B', fontWeight: 'bold'}}>{p.auth_awi || 0}</td>
                      <td className="mono" style={{color: 'var(--red)', fontWeight: 'bold'}}>{p.unauth_awi || 0}</td>
                      <td className="mono" style={{color: '#3B82F6'}}>{p.paid_sundays || 0}</td>
                      <td className="mono" style={{color: 'var(--red)'}}>{p.unpaid_sundays || 0}</td>
                      <td className="mono" style={{color: 'var(--green)'}}>{p.holidays || 0}</td>
                      <td className="mono" style={{fontWeight: 'bold', color: (p.total_paid_days || 0) > 0 ? 'var(--green)' : 'var(--red)'}}>{p.total_paid_days || 0}</td>
                      <td className="mono net-val" style={{color: (netSalary || 0) > 0 ? 'var(--green)' : 'var(--red)'}}>{inr(netSalary)}</td>
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
                            onClick={() => handleOpenEditModal(p)}
                            title="Edit Incentives/Deductions"
                          >
                            <i className="fas fa-edit"></i>
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
      </div>
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
                <div className="form-group">
                  <label className="form-label">Incentives (₹)</label>
                  <input
                    type="number"
                    className="form-control"
                    placeholder="Enter incentives amount"
                    value={genIncentives}
                    onChange={(e) => setGenIncentives(Number(e.target.value) || 0)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Deductions (₹)</label>
                  <input
                    type="number"
                    className="form-control"
                    placeholder="Enter deductions amount"
                    value={genDeductions}
                    onChange={(e) => setGenDeductions(Number(e.target.value) || 0)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Tax/TDS (₹)</label>
                  <input
                    type="number"
                    className="form-control"
                    placeholder="Enter tax amount"
                    value={genTax}
                    onChange={(e) => setGenTax(Number(e.target.value) || 0)}
                  />
                </div>
              </div>

              {previewData && (
                <>
                  <div className="att-preview">
                    <div className="att-preview-title">
                      <i className="fas fa-chart-bar"></i> Attendance Summary{" "}
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
                        <div className="att-box-label">Total Sundays</div>
                      </div>
                      <div className="att-box blue">
                        <div className="att-box-val">
                          {previewData.calendar.holidayCount}
                        </div>
                        <div className="att-box-label">Total Holidays</div>
                      </div>
                      <div className="att-box gold">
                        <div className="att-box-val">
                          {previewData.calendar.workingDaysCount}
                        </div>
                        <div className="att-box-label">Working Days</div>
                      </div>
                    </div>
                   <div className="att-note">
  Daily Rate = <span>{inr2(previewData.salary?.dailyRate || 0)}</span> ·
  Payable Days = <span>{Number(previewData.salary?.payableDays || 0).toFixed(1)}</span> ·
  Sandwich Days = <span>0</span>
</div>
                    {previewData.leave.eligible ? (
                      <div className="pl-explain">
                        <strong>✓ Paid Leave Eligible</strong> (
                        {previewData.leave.daysCompleted} days completed)<br />
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
                        {previewData.leave.daysCompleted} day(s) completed —
                        eligible after <strong>90 days</strong> from joining date.
                        <br />
                        All{" "}
                        {previewData.leave.totalAbsences ||
                          previewData.attendance.absentDays +
                            (previewData.attendance.formalLeaveCount || 0)}{" "}
                        absence(s) this month are <strong>unpaid</strong>.
                      </div>
                    )}
                  </div>

                  {attendanceRecords && (
                    <>
                      <div className="salary-preview">
                        <div className="sal-row section-head">
                          <span>Attendance Details (from Analysis)</span>
                        </div>

{/* Calculate from attendanceRecords instead of previewData */}
{(() => {
  const fullDays = attendanceRecords.filter(r => r.status === 'full_day' || r.status === 'present').length;
  const halfDays = attendanceRecords.filter(r => r.status === 'half_day').length;
  const absent = attendanceRecords.filter(r => r.status === 'absent').length;
  const unpaidLeaves = attendanceRecords.filter(r => r.status === 'unpaid_leave').length;
  const noRecord = attendanceRecords.filter(r => r.status === 'no_record').length;
  const paidLeaves = Number(
    previewData?.leave?.paidLeaveUsed ??
      attendanceRecords.filter(r => r.status === 'paid_leave').length
  );
  const authAwi = attendanceRecords.filter(r => r.status === 'authorized_absence').length;
  const unauthAbsent = attendanceRecords.filter(r => r.status === 'unauthorized_absence').length;
  const paidSundays = attendanceRecords.filter(r => r.status === 'sunday' && !r.sandwich_rule_applied).length;
  const unpaidSundays = attendanceRecords.filter(r => r.status === 'sunday' && r.sandwich_rule_applied).length;
  const holidays = attendanceRecords.filter(r => r.status === 'holiday').length;
  const lateLogins = attendanceRecords.filter(r => r.lateMinutes > 0).length;
  
  const totalAbsences = Number(
    previewData?.leave?.totalAbsences ??
      (absent + unpaidLeaves + noRecord + paidLeaves)
  );
  const totalAbsentDays = Math.max(0, totalAbsences - paidLeaves);
  
  const payableDays = Number(previewData?.salary?.payableDays || 0);
  const finalPayableDays = Math.max(0, payableDays - unauthAbsent - lateLogins);
  
  return (
    <>
<div className="sal-row">
  <span>Present Days</span>
  <span style={{ color: '#16A34A' }}>{fullDays}</span>
</div>

<div className="sal-row">
  <span>Absent Days</span>
  <span className="deduction-val" style={{ color: '#DC2626' }}>{totalAbsentDays}</span>
</div>

<div className="sal-row">
  <span>Half Days</span>
  <span style={{ color: '#16A34A' }}>{halfDays}</span>
</div>

<div className="sal-row">
  <span>Late Logins</span>
  <span style={{color: '#DC2626'}}>{lateLogins}</span>
</div>

<div className="sal-row">
  <span>Paid Leaves</span>
  <span style={{ color: '#16A34A' }}>{paidLeaves}</span>
</div>

<div className="sal-row">
  <span>Auth AWI</span>
  <span style={{ color: '#DC2626' }}>{authAwi}</span>
</div>

<div className="sal-row">
  <span>Unauth Absent</span>
  <span className="deduction-val" style={{ color: '#DC2626' }}>{unauthAbsent}</span>
</div>

<div className="sal-row">
  <span>Paid Sundays</span>
  <span style={{ color: '#16A34A' }}>{paidSundays}</span>
</div>

<div className="sal-row">
  <span>Unpaid Sundays</span>
  <span className="deduction-val" style={{ color: '#DC2626' }}>{unpaidSundays}</span>
</div>

<div className="sal-row">
  <span>Holidays</span>
  <span style={{ color: '#16A34A' }}>{holidays}</span>
</div>

<div className="sal-row subtotal">
  <span>Total Payable Days</span>
  <span style={{ color: '#16A34A' }}>{finalPayableDays.toFixed(1)}</span>
</div>
    </>
  );
})()}

                        <div className="sal-row section-head">
                          <span>Earnings</span>
                        </div>

{(() => {
  const payableDays = Number(previewData?.salary?.payableDays || 0);
  const dailyRate = Number(previewData?.salary?.dailyRate || 0);
  // Use the same values as the attendance details section for consistency
  const unauthorizedDays = Number(
    attendanceRecords?.filter(r => r.status === 'unauthorized_absence').length || 0
  );
  const lateLoginDays = Number(
    attendanceRecords?.filter(r => r.lateMinutes > 0).length || 0
  );
  const finalPayableDays = Math.max(0, payableDays - unauthorizedDays - lateLoginDays);
  const calculatedSalary = dailyRate * finalPayableDays;
  const netSalary = calculatedSalary + Number(genIncentives) - Number(genDeductions) - Number(genTax);
  
  return (
    <>
<div className="sal-row">
  <span>Monthly Salary</span>
  <span>{inr2(selectedEmployee?.salary)}</span>
</div>

<div className="sal-row">
  <span>Daily Rate</span>
  <span>{inr2(dailyRate)}</span>
</div>

<div className="sal-row">
  <span>Salary Calculation</span>
  <span>{inr2(dailyRate)} × {finalPayableDays.toFixed(1)}</span>
</div>

<div className="sal-row">
  <span>Calculated Salary</span>
  <span>{inr2(calculatedSalary)}</span>
</div>

<div className="sal-row">
  <span style={{ color: '#10B981' }}>+ Incentives</span>
  <input
    type="number"
    className="salary-input"
    value={genIncentives}
    onInput={(e) => setGenIncentives(Number(e.target.value) || 0)}
    style={{ width: '120px', padding: '4px 8px', borderRadius: '4px', border: '1px solid #10B981', background: '#1a0a0a', color: '#10B981' }}
  />
</div>

<div className="sal-row">
  <span style={{ color: '#DC2626' }}>- Deductions</span>
  <input
    type="number"
    className="salary-input"
    value={genDeductions}
    onInput={(e) => setGenDeductions(Number(e.target.value) || 0)}
    style={{ width: '120px', padding: '4px 8px', borderRadius: '4px', border: '1px solid #DC2626', background: '#1a0a0a', color: '#DC2626' }}
  />
</div>

<div className="sal-row">
  <span style={{ color: '#F59E0B' }}>- Tax (TDS)</span>
  <input
    type="number"
    className="salary-input"
    value={genTax}
    onInput={(e) => setGenTax(Number(e.target.value) || 0)}
    style={{ width: '120px', padding: '4px 8px', borderRadius: '4px', border: '1px solid #F59E0B', background: '#1a0a0a', color: '#F59E0B' }}
  />
</div>

<div className="sal-row subtotal" style={{ fontSize: '1.1em', fontWeight: 'bold', background: 'rgba(16, 163, 74, 0.1)', border: '1px solid rgba(16, 163, 74, 0.3)' }}>
  <span>Net Salary (Take Home)</span>
  <span style={{ color: '#10B981' }}>{inr2(netSalary)}</span>
</div>
    </>
  );
})()}



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

                      {/* Detailed Attendance Table */}
                      {attendanceRecords && attendanceRecords.length > 0 && (
                        <div className="att-preview">
                          <div className="att-preview-title">
                            <i className="fas fa-table"></i> Detailed Attendance Log
                          </div>
                          <div style={{ overflowX: "auto", marginTop: "12px" }}>
                            <table className="data-table">
                              <thead>
                                <tr>
                                  <th>Date</th>
                                  <th>Status</th>
                                  <th>Login</th>
                                  <th>Logout</th>
                                  <th>Hours</th>
                                  <th>Late</th>
                                  <th>Break (min)</th>
                                </tr>
                              </thead>
                              <tbody>
                                {attendanceRecords.map((r) => {
                                  const statusColor = r.status === 'unauthorized_absence' ? '#DC2626' :
                                    r.status === 'authorized_absence' ? '#F59E0B' :
                                    r.status === 'sunday' ? '#3B82F6' :
                                    r.status === 'holiday' ? '#8B5CF6' :
                                    r.status === 'paid_leave' ? '#10B981' :
                                    r.status === 'unpaid_leave' ? '#EF4444' :
                                    r.status === 'half_day' ? '#F59E0B' :
                                    r.status === 'absent' ? '#EF4444' : '#6B7280';
                                  
                                  const displayStatus = r.display_status || r.computed_status || r.status;
                                  
                                  const formatTime = (t) => t === '--' ? '--' : t;
                                  
                                  return (
                                    <tr key={r.date}>
                                      <td style={{ color: "#FF8C00" }}>
                                        {new Date(r.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                                      </td>
                                      <td>
                                        <span style={{ color: statusColor, fontWeight: 500 }}>
                                          {displayStatus}
                                        </span>
                                      </td>
                                      <td>{formatTime(r.checkIn)}</td>
                                      <td>{formatTime(r.checkOut)}</td>
                                      <td style={{ fontWeight: 700 }}>
                                        {r.workHours > 0 ? r.workHours.toFixed(1) : '--'}
                                      </td>
                                      <td style={{ color: r.lateMinutes > 0 ? "#FF8C00" : "#7B8199" }}>
                                        {r.lateMinutes > 0 ? `${r.lateMinutes} min` : '--'}
                                      </td>
                                      <td style={{ color: r.breaks > 60 ? "#DC2626" : "#16A34A" }}>
                                        {r.breaks > 0 ? r.breaks : '--'}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                      <div className="net-box">
                        <div className="net-box-label">
                          <i
                            className="fas fa-rupee-sign"
                            style={{ color: "var(--gold)" }}
                          ></i>{" "}
                          Net Salary (Take Home)
                        </div>
                        <div className="net-box-amount">{inr2(
                          // Use the same calculation as the preview section
                          (() => {
                            const payableDays = Number(previewData?.salary?.payableDays || 0);
                            const dailyRate = Number(previewData?.salary?.dailyRate || 0);
                            const unauthorizedDays = Number(
                              attendanceRecords?.filter(r => r.status === 'unauthorized_absence').length || 0
                            );
                            const lateLoginDays = Number(
                              attendanceRecords?.filter(r => r.lateMinutes > 0).length || 0
                            );
                            const finalPayableDays = Math.max(0, payableDays - unauthorizedDays - lateLoginDays);
                            return (finalPayableDays * dailyRate) + Number(genIncentives || 0) - Number(genDeductions || 0) - Number(genTax || 0);
                          })()
                        )}</div>
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
                Loading...
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
                  {(viewPayslip.awi_deduction_days > 0 || viewPayslip.awi_deduction > 0) && (
                    <div style={{ marginTop: "16px", padding: "12px", backgroundColor: "var(--light-red)", borderRadius: "8px" }}>
                      <p style={{ margin: "0", fontWeight: "bold", color: "var(--red)" }}>
                        AWI Deduction: {viewPayslip.awi_deduction_days || 0} days = {inr(viewPayslip.awi_deduction)}
                      </p>
                    </div>
                  )}
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

      {/* Edit Incentives/Deductions Modal */}
      {editModalOpen && editPayslip && (
        <div
          className="modal-overlay open"
          onClick={() => setEditModalOpen(false)}
        >
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h2>
                <i className="fas fa-edit"></i> Edit Adjustments
              </h2>
              <button
                className="modal-close"
                onClick={() => setEditModalOpen(false)}
              >
                &times;
              </button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group full">
                  <label className="form-label">Employee</label>
                  <input
                    type="text"
                    className="form-control"
                    readOnly
                    value={editPayslip.full_name}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Month</label>
                  <input
                    type="text"
                    className="form-control"
                    readOnly
                    value={monthLabel(editPayslip.month)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Current Net Pay</label>
                  <input
                    type="text"
                    className="form-control"
                    readOnly
                    value={inr2(editPayslip.net_pay)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Incentives (₹)</label>
                  <input
                    type="number"
                    className="form-control"
                    value={editIncentives}
                    onChange={(e) => setEditIncentives(Number(e.target.value))}
                    min="0"
                    step="100"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Deductions (₹)</label>
                  <input
                    type="number"
                    className="form-control"
                    value={editDeductions}
                    onChange={(e) => setEditDeductions(Number(e.target.value))}
                    min="0"
                    step="100"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Tax/TDS (₹)</label>
                  <input
                    type="number"
                    className="form-control"
                    value={editTax}
                    onChange={(e) => setEditTax(Number(e.target.value))}
                    min="0"
                    step="100"
                  />
                </div>
              </div>
              
              <div style={{ marginTop: "16px", padding: "16px", backgroundColor: "var(--light-blue)", borderRadius: "8px" }}>
                <strong>Preview Calculation:</strong>
                <div style={{ marginTop: "8px" }}>
                  Basic Salary: {inr2(editPayslip.basic_salary)}<br />
                  Current Net Pay: {inr2(editPayslip.net_pay)}<br />
                  New Net Pay: {inr2(
                    (editPayslip.basic_salary / (editPayslip.working_days || 30)) * (editPayslip.working_days || 30) +
                    editIncentives -
                    editDeductions -
                    editTax
                  )}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn-secondary"
                onClick={() => setEditModalOpen(false)}
                disabled={editSaving}
              >
                Cancel
              </button>
              <button
                className="btn-gold"
                onClick={handleSaveAdjustments}
                disabled={editSaving}
              >
                {editSaving ? "Saving..." : "Save Changes"}
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
