import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import EmployeeSidebar from "../../components/EmployeeSidebar";
import { useEmployeeApi } from "../../hooks/useEmployeeApi";
import { normalizeArray } from "./employeeUtils";
import "../../styles/EmployeePayslip.css";

function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function getStoredUserId() {
  try {
    const stored = JSON.parse(localStorage.getItem("user") || "{}");
    return stored.id || stored.user_id || "";
  } catch {
    return "";
  }
}

function formatMonthLabel(value) {
  if (!value) return "selected month";
  const date = new Date(`${String(value).slice(0, 7)}-01T00:00:00`);
  return date.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

function formatCurrency(value) {
  return `₹${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function normalizePayslip(payslip) {
  if (!payslip) return null;
  return {
    ...payslip,
    employee_id: payslip.employee_id || payslip.user_id,
    employee_code: payslip.employee_code || "",
    month: payslip.month,
    year: payslip.year || Number(String(payslip.month || "").slice(0, 4)),
    status: payslip.status || payslip.payment_status || "unpaid",
    generated_at: payslip.generated_at || payslip.created_at,
    pdf_url: payslip.pdf_url || `/api/payroll/payslip/${payslip.id}/download`,
  };
}

export default function EmployeePayslip({ embedded = false }) {
  const { apiFetch, navigate } = useEmployeeApi();
  const token = localStorage.getItem("token");

  const [allPayslips, setAllPayslips] = useState([]);
  const [currentPayslip, setCurrentPayslip] = useState(null);
  const [pdfUrl, setPdfUrl] = useState("");
  const pdfUrlRef = useRef("");

  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [isLoading, setIsLoading] = useState(true);
  const [loadingPayslip, setLoadingPayslip] = useState(false);
  const [toast, setToast] = useState({ msg: "", visible: false, type: "" });

  useEffect(() => {
    if (!token) navigate("/login");
  }, [token, navigate]);

  useEffect(() => {
    return () => {
      if (pdfUrlRef.current) {
        window.URL.revokeObjectURL(pdfUrlRef.current);
      }
    };
  }, []);

  const showToast = useCallback((msg, type = "") => {
    setToast({ msg, visible: true, type });
    setTimeout(() => {
      setToast({ msg: "", visible: false, type: "" });
    }, 3000);
  }, []);

  const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

  const latestAvailableMonth = useMemo(
    () => (allPayslips[0]?.month ? String(allPayslips[0].month).slice(0, 7) : ""),
    [allPayslips]
  );

  const loadPayslipPdfPreview = useCallback(
    async (payslipId) => {
      if (!payslipId || !token) return;

      try {
        if (pdfUrlRef.current) {
          window.URL.revokeObjectURL(pdfUrlRef.current);
          pdfUrlRef.current = "";
        }

        setPdfUrl("");

        console.log("[EmployeePayslip] PDF Path", `/api/payroll/payslip/${payslipId}/download`);

        const res = await fetch(
          `${API_BASE}/payroll/payslip/${payslipId}/download?preview=true`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const contentType = res.headers.get("content-type") || "";

        if (!res.ok || !contentType.includes("application/pdf")) {
          const errorText = await res.text();
          console.log("PDF preview error:", errorText);
          throw new Error("PDF preview failed");
        }

        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);

        pdfUrlRef.current = url;
        setPdfUrl(url);
      } catch (e) {
        console.error("PDF preview failed:", e);
        showToast(e.message || "PDF preview failed", "error");
        setPdfUrl("");
      }
    },
    [API_BASE, token, showToast]
  );

  const loadPayslipForMonth = useCallback(
    async (monthYMD) => {
      if (!monthYMD) return;

      setLoadingPayslip(true);
      setPdfUrl("");
      const requestedMonth = String(monthYMD).slice(0, 7);
      const requestedYear = requestedMonth.slice(0, 4);

      try {
        const payslip = await apiFetch(
          `/employee/my-payslip?month=${requestedMonth}-01`
        );
        const normalizedPayslip = normalizePayslip(payslip);

        console.log("[EmployeePayslip] Requested Month", requestedMonth);
        console.log("[EmployeePayslip] Requested Year", requestedYear);
        console.log("[EmployeePayslip] Logged-in User ID", getStoredUserId());
        console.log("[EmployeePayslip] Returned Payslip Count", normalizedPayslip?.id ? 1 : 0);
        console.log("[EmployeePayslip] PDF Path", normalizedPayslip?.pdf_url || null);
        console.log("Employee payslip:", normalizedPayslip);

        if (!normalizedPayslip?.id) {
          setCurrentPayslip(null);
          setPdfUrl("");
          return;
        }

        setCurrentPayslip(normalizedPayslip);
        await loadPayslipPdfPreview(normalizedPayslip.id);
      } catch (e) {
        console.error("Error loading payslip:", e);
        showToast(`Error loading payslip: ${e.message}`, "error");
        setCurrentPayslip(null);
        setPdfUrl("");
      } finally {
        setLoadingPayslip(false);
      }
    },
    [apiFetch, loadPayslipPdfPreview, showToast]
  );

  const loadPayslips = useCallback(async () => {
    setIsLoading(true);

    try {
      const data = normalizeArray(await apiFetch("/employee/my-payslips"));
      const normalizedRows = data.map(normalizePayslip).filter(Boolean);
      setAllPayslips(normalizedRows);

      console.log("[EmployeePayslip] Logged-in User ID", getStoredUserId());
      console.log("[EmployeePayslip] Returned Payslip Count", normalizedRows.length);
      console.log("[EmployeePayslip] PDF Path", normalizedRows[0]?.pdf_url || null);

      if (normalizedRows.length > 0) {
        const latest = String(normalizedRows[0].month).slice(0, 7);
        setSelectedMonth(latest);
        await loadPayslipForMonth(latest);
      } else {
        setSelectedMonth(getCurrentMonth());
        setCurrentPayslip(null);
        setPdfUrl("");
      }
    } catch (e) {
      console.error("Error loading payslips:", e);
      showToast(`Error loading payslips: ${e.message}`, "error");
      setAllPayslips([]);
      setCurrentPayslip(null);
      setPdfUrl("");
    } finally {
      setIsLoading(false);
    }
  }, [apiFetch, loadPayslipForMonth, showToast]);

  useEffect(() => {
    loadPayslips();
  }, [loadPayslips]);

  const downloadPayslipPdf = async () => {
    if (!currentPayslip?.id) {
      showToast("No payslip selected", "error");
      return;
    }

    try {
      const res = await fetch(
        `${API_BASE}/payroll/payslip/${currentPayslip.id}/download`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const contentType = res.headers.get("content-type") || "";

      if (!res.ok || !contentType.includes("application/pdf")) {
        const errorText = await res.text();
        console.log("PDF download error:", errorText);
        throw new Error("Server did not return PDF");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `payslip_${String(currentPayslip.month).slice(0, 7)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();

      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error("PDF download failed:", e);
      showToast(e.message || "Download failed", "error");
    }
  };

  const selectedMonthLabel = formatMonthLabel(selectedMonth);
  const hasPayslips = allPayslips.length > 0;

  return (
    <div className={embedded ? "employee-payslip-page" : "layout employee-payslip-page"}>
      {!embedded && <EmployeeSidebar activePage="payslip" />}

      <div className="main">
        <div className="topbar">
          <div>
            <h1>
              <i className="fas fa-coins" style={{ fontSize: "1.3rem" }} /> My
              Payslips
            </h1>
            <p>View and download your salary statements</p>
          </div>
        </div>

        <div className="content">
          <div className="selector-card">
            <div>
              <i
                className="fas fa-calendar-alt"
                style={{ color: "var(--gold)" }}
              />{" "}
              <label htmlFor="monthSelect">Select Month</label>
            </div>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <input
                id="monthSelect"
                type="month"
                className="month-select"
                value={selectedMonth}
                disabled={isLoading}
                onChange={(e) => {
                  const month = e.target.value;
                  setSelectedMonth(month);
                  loadPayslipForMonth(month);
                }}
              />

              <button
                type="button"
                id="downloadPayslipBtn"
                className="print-btn"
                onClick={downloadPayslipPdf}
                disabled={!currentPayslip?.id}
              >
                <i className="fas fa-download" /> Download PDF
              </button>
              <button
                type="button"
                className="print-btn view-btn"
                onClick={() => currentPayslip?.id && loadPayslipPdfPreview(currentPayslip.id)}
                disabled={!currentPayslip?.id || loadingPayslip}
              >
                <i className="fas fa-eye" /> View Payslip
              </button>
            </div>
            {latestAvailableMonth && selectedMonth !== latestAvailableMonth ? (
              <small className="payslip-hint">
                Latest available payslip: {formatMonthLabel(latestAvailableMonth)}
              </small>
            ) : null}
          </div>

          <div id="payslipContainer">
            {isLoading || loadingPayslip ? (
              <div style={{ textAlign: "center", padding: 40 }}>
                <span className="spinner" /> Loading payslip...
              </div>
            ) : !currentPayslip ? (
              <div className="empty-state">
                <i className="fas fa-receipt" />
                <p>No payslip has been generated for the selected month.</p>
                <p style={{ fontSize: "0.75rem", marginTop: 6 }}>
                  {hasPayslips
                    ? `No payslip available for ${selectedMonthLabel}.`
                    : "Payslips will appear once generated by HR."}
                </p>
              </div>
            ) : (
              <>
                <div className="payslip-card">
                  <div className="payslip-header">
                    <div>
                      <h2>{formatMonthLabel(currentPayslip.month)}</h2>
                      <span className="payslip-month">
                        {String(currentPayslip.status).toLowerCase() === "paid" ? "Paid" : "Unpaid"}
                      </span>
                    </div>
                    <div className="payslip-generated">
                      Generated: {formatDate(currentPayslip.generated_at)}
                    </div>
                  </div>
                  <div className="emp-details-grid">
                    <div className="emp-detail-item">
                      <div className="label">Employee</div>
                      <div className="value">{currentPayslip.full_name || "--"}</div>
                    </div>
                    <div className="emp-detail-item">
                      <div className="label">Employee Code</div>
                      <div className="value">{currentPayslip.employee_code || "--"}</div>
                    </div>
                    <div className="emp-detail-item">
                      <div className="label">Basic Salary</div>
                      <div className="value">{formatCurrency(currentPayslip.basic_salary)}</div>
                    </div>
                    <div className="emp-detail-item">
                      <div className="label">Net Salary</div>
                      <div className="value">{formatCurrency(currentPayslip.net_pay)}</div>
                    </div>
                  </div>
                </div>

                {pdfUrl ? (
                  <div className="pdf-preview-card">
                    <iframe
                      src={pdfUrl}
                      title="Generated Payslip PDF"
                      className="pdf-preview-frame"
                    />
                  </div>
                ) : (
                  <div className="empty-state">
                    <i className="fas fa-file-pdf" />
                    <p>PDF preview not available</p>
                    <p style={{ fontSize: "0.75rem", marginTop: 6 }}>
                      Please click Download PDF or check backend permission.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

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
