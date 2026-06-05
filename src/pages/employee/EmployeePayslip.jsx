import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import EmployeeSidebar from "../../components/EmployeeSidebar";
import { useEmployeeApi } from "../../hooks/useEmployeeApi";
import { escapeHtml, normalizeArray } from "./employeeUtils";
import "../../styles/EmployeePayslip.css";

export default function EmployeePayslip() {
  const { apiFetch, navigate } = useEmployeeApi();
  const token = localStorage.getItem("token");
  const printAreaRef = useRef(null);

  const [allPayslips, setAllPayslips] = useState([]);
  const [currentPayslip, setCurrentPayslip] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [loadingPayslip, setLoadingPayslip] = useState(false);
  const [toast, setToast] = useState({ msg: "", visible: false, type: "" });

  useEffect(() => {
    if (!token) navigate("/login");
  }, [token, navigate]);

  const showToast = useCallback((msg, type = "") => {
    setToast({ msg, visible: true, type });
    const t = setTimeout(
      () => setToast({ msg: "", visible: false, type: "" }),
      3000
    );
    return () => clearTimeout(t);
  }, []);

  const monthOptions = useMemo(() => {
    const monthsSet = new Set();
    allPayslips.forEach((p) => {
      if (p.month) monthsSet.add(p.month.slice(0, 7));
    });
    return Array.from(monthsSet).sort().reverse();
  }, [allPayslips]);

  const loadPayslipForMonth = useCallback(
    async (monthYMD) => {
      if (!monthYMD) return;
      setLoadingPayslip(true);
      try {
        const payslip = await apiFetch(
          `/employee/my-payslip?month=${monthYMD}-01`
        );
        if (!payslip) {
          setCurrentPayslip(null);
        } else {
          setCurrentPayslip(payslip);
        }
      } catch (e) {
        showToast(`Error loading payslip: ${e.message}`, "error");
        setCurrentPayslip(null);
      } finally {
        setLoadingPayslip(false);
      }
    },
    [apiFetch, showToast]
  );

  const loadPayslips = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = normalizeArray(await apiFetch("/employee/my-payslips"));
      setAllPayslips(data);
      if (data.length > 0) {
        const latest = data[0].month.slice(0, 7);
        setSelectedMonth(latest);
        await loadPayslipForMonth(latest);
      } else {
        setSelectedMonth("");
        setCurrentPayslip(null);
      }
    } catch (e) {
      showToast(`Error loading payslips: ${e.message}`, "error");
    } finally {
      setIsLoading(false);
    }
  }, [apiFetch, loadPayslipForMonth, showToast]);

  useEffect(() => {
    loadPayslips();
  }, [loadPayslips]);

  const printPayslip = () => {
    if (!currentPayslip || !printAreaRef.current) {
      showToast("No payslip loaded to print", "error");
      return;
    }
    const originalTitle = document.title;
    document.title = `Payslip_${currentPayslip.full_name}_${currentPayslip.month.slice(0, 7)}`;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <html><head><title>${document.title}</title>
      <link href="https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
      <style>
        body { font-family: 'Sora', sans-serif; padding: 20px; background: white; color: black; }
        .payslip-card { max-width: 800px; margin: 0 auto; border: 1px solid #ccc; border-radius: 16px; padding: 24px; }
        .payslip-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #ccc; padding-bottom: 12px; margin-bottom: 20px; }
        .emp-details-grid { display: grid; grid-template-columns: repeat(2,1fr); gap: 16px; margin-bottom: 24px; }
        .salary-breakdown { border-top: 1px solid #eee; border-bottom: 1px solid #eee; padding: 12px 0; margin: 16px 0; }
        .salary-row { display: flex; justify-content: space-between; padding: 8px 0; }
        .salary-row.total { font-weight: bold; font-size: 1.2rem; border-top: 1px solid #ddd; margin-top: 8px; padding-top: 12px; }
        .attendance-row { display: flex; gap: 20px; flex-wrap: wrap; }
        .status-badge { padding: 2px 10px; border-radius: 20px; background: #f0f0f0; }
      </style>
      </head><body>${printAreaRef.current.outerHTML}</body></html>
    `);
    printWindow.document.close();
    printWindow.print();
    document.title = originalTitle;
  };

  const renderPayslipCard = (p) => {
    const monthDate = new Date(p.month);
    const monthDisplay = monthDate.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
    const statusClass =
      p.payment_status === "paid" ? "status-paid" : "status-unpaid";
    const statusText = p.payment_status === "paid" ? "Paid" : "Unpaid";

    return (
      <div className="payslip-card" id="payslipPrintArea" ref={printAreaRef}>
        <div className="payslip-header">
          <h2>VJC OVERSEAS</h2>
          <div className="payslip-month">
            {monthDisplay}{" "}
            <span className={`status-badge ${statusClass}`}>{statusText}</span>
          </div>
        </div>
        <div className="emp-details-grid">
          <div className="emp-detail-item">
            <div className="label">Employee Name</div>
            <div className="value">{escapeHtml(p.full_name)}</div>
          </div>
          <div className="emp-detail-item">
            <div className="label">Employee ID</div>
            <div className="value">{escapeHtml(p.employee_code || "-")}</div>
          </div>
          <div className="emp-detail-item">
            <div className="label">Department</div>
            <div className="value">{escapeHtml(p.department)}</div>
          </div>
          <div className="emp-detail-item">
            <div className="label">Branch</div>
            <div className="value">{escapeHtml(p.branch)}</div>
          </div>
        </div>
        <div className="salary-breakdown">
          <div className="salary-row">
            <span>Basic Salary</span>
            <span>₹ {Number(p.basic_salary).toLocaleString("en-IN")}</span>
          </div>
          <div className="salary-row">
            <span>Incentives</span>
            <span>₹ {Number(p.incentives).toLocaleString("en-IN")}</span>
          </div>
          <div className="salary-row">
            <span>Deductions</span>
            <span>₹ {Number(p.deductions).toLocaleString("en-IN")}</span>
          </div>
          <div className="salary-row">
            <span>Tax (TDS)</span>
            <span>₹ {Number(p.tax).toLocaleString("en-IN")}</span>
          </div>
          <div className="salary-row total">
            <span>Net Pay</span>
            <span>₹ {Number(p.net_pay).toLocaleString("en-IN")}</span>
          </div>
        </div>
        <div className="attendance-row">
          <span className="attendance-badge">
            <i className="fas fa-calendar-week" /> Working Days: {p.working_days}
          </span>
          <span className="attendance-badge">
            <i className="fas fa-user-check" /> Present Days: {p.present_days}
          </span>
          <span className="attendance-badge">
            <i className="fas fa-user-slash" /> Absent Days:{" "}
            {Math.max(0, p.working_days - p.present_days)}
          </span>
        </div>
        <div
          style={{
            textAlign: "center",
            marginTop: 20,
            fontSize: "0.7rem",
            color: "var(--muted)",
            borderTop: "1px solid var(--border)",
            paddingTop: 16,
          }}
        >
          This is a computer-generated payslip. For any discrepancies, contact HR.
        </div>
      </div>
    );
  };

  return (
    <div className="layout">
      <EmployeeSidebar activePage="payslip" />
      <div className="main">
        <div className="topbar">
          <div>
            <h1>
              <i className="fas fa-coins" style={{ fontSize: "1.3rem" }} /> My
              Payslips
            </h1>
            <p>View, download & print your salary statements</p>
          </div>
        </div>

        <div className="content">
          <div className="selector-card">
            <div>
              <i className="fas fa-calendar-alt" style={{ color: "var(--gold)" }} />{" "}
              <label htmlFor="monthSelect">Select Month</label>
            </div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <select
                id="monthSelect"
                className="month-select"
                value={selectedMonth}
                disabled={isLoading || !monthOptions.length}
                onChange={(e) => {
                  setSelectedMonth(e.target.value);
                  loadPayslipForMonth(e.target.value);
                }}
              >
                {isLoading ? (
                  <option value="">Loading months...</option>
                ) : !monthOptions.length ? (
                  <option value="">No payslips available</option>
                ) : (
                  monthOptions.map((m) => {
                    const date = new Date(`${m}-01`);
                    const display = date.toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                    });
                    return (
                      <option key={m} value={m}>
                        {display}
                      </option>
                    );
                  })
                )}
              </select>
              <button
                type="button"
                id="printPayslipBtn"
                className="print-btn"
                onClick={printPayslip}
              >
                <i className="fas fa-print" /> Print Payslip
              </button>
            </div>
          </div>

          <div id="payslipContainer">
            {isLoading || loadingPayslip ? (
              <div style={{ textAlign: "center", padding: 40 }}>
                <span className="spinner" /> Loading payslip...
              </div>
            ) : !currentPayslip ? (
              <div className="empty-state">
                <i className="fas fa-receipt" />
                <p>No payslips found</p>
                <p style={{ fontSize: "0.75rem", marginTop: 6 }}>
                  Payslips will appear once generated by HR.
                </p>
              </div>
            ) : (
              renderPayslipCard(currentPayslip)
            )}
          </div>
        </div>
      </div>

      <div
        className={`toast${toast.visible ? " show" : ""}${toast.type ? ` ${toast.type}` : ""}`}
      >
        {toast.msg}
      </div>
    </div>
  );
}
