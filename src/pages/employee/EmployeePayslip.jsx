import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import EmployeeSidebar from "../../components/EmployeeSidebar";
import { useEmployeeApi } from "../../hooks/useEmployeeApi";
import { normalizeArray } from "./employeeUtils";
import "../../styles/EmployeePayslip.css";

export default function EmployeePayslip() {
  const { apiFetch, navigate } = useEmployeeApi();
  const token = localStorage.getItem("token");

  const [allPayslips, setAllPayslips] = useState([]);
  const [currentPayslip, setCurrentPayslip] = useState(null);
  const [pdfUrl, setPdfUrl] = useState("");
  const pdfUrlRef = useRef("");

  const [selectedMonth, setSelectedMonth] = useState("");
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

  const monthOptions = useMemo(() => {
    const monthsSet = new Set();

    allPayslips.forEach((p) => {
      if (p?.month) monthsSet.add(String(p.month).slice(0, 7));
    });

    return Array.from(monthsSet).sort().reverse();
  }, [allPayslips]);

  const loadPayslipPdfPreview = useCallback(
    async (payslipId) => {
      if (!payslipId || !token) return;

      try {
        if (pdfUrlRef.current) {
          window.URL.revokeObjectURL(pdfUrlRef.current);
          pdfUrlRef.current = "";
        }

        setPdfUrl("");

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

      try {
        const payslip = await apiFetch(
          `/employee/my-payslip?month=${monthYMD}-01`
        );

        console.log("Employee payslip:", payslip);

        if (!payslip?.id) {
          setCurrentPayslip(null);
          setPdfUrl("");
          return;
        }

        setCurrentPayslip(payslip);
        await loadPayslipPdfPreview(payslip.id);
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
      setAllPayslips(data);

      if (data.length > 0) {
        const latest = String(data[0].month).slice(0, 7);
        setSelectedMonth(latest);
        await loadPayslipForMonth(latest);
      } else {
        setSelectedMonth("");
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

  return (
    <div className="layout employee-payslip-page">
      <EmployeeSidebar activePage="payslip" />

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
              <select
                id="monthSelect"
                className="month-select"
                value={selectedMonth}
                disabled={isLoading || !monthOptions.length}
                onChange={(e) => {
                  const month = e.target.value;
                  setSelectedMonth(month);
                  loadPayslipForMonth(month);
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
                id="downloadPayslipBtn"
                className="print-btn"
                onClick={downloadPayslipPdf}
                disabled={!currentPayslip?.id}
              >
                <i className="fas fa-download" /> Download PDF
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
            ) : pdfUrl ? (
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