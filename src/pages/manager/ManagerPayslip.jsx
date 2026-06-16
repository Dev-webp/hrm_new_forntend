import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import { clearAuthSession } from "../../utils/auth";
import "../../styles/EmployeePayslip.css";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

function normalizeArray(raw) {
  if (Array.isArray(raw)) return raw;
  if (raw && Array.isArray(raw.data)) return raw.data;
  return [];
}

async function getPdfError(response, fallback) {
  const data = await response.json().catch(() => null);
  return data?.message || fallback;
}

export default function ManagerPayslip() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const pdfUrlRef = useRef("");
  const toastTimerRef = useRef(null);

  const [allPayslips, setAllPayslips] = useState([]);
  const [currentPayslip, setCurrentPayslip] = useState(null);
  const [pdfUrl, setPdfUrl] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [loadingPayslip, setLoadingPayslip] = useState(false);
  const [toast, setToast] = useState({ msg: "", visible: false, type: "" });

  const revokePdfPreview = useCallback(() => {
    if (pdfUrlRef.current) {
      window.URL.revokeObjectURL(pdfUrlRef.current);
      pdfUrlRef.current = "";
    }
    setPdfUrl("");
  }, []);

  useEffect(() => {
    if (!token) navigate("/login");

    return () => {
      if (pdfUrlRef.current) window.URL.revokeObjectURL(pdfUrlRef.current);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, [token, navigate]);

  const showToast = useCallback((msg, type = "") => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ msg, visible: true, type });
    toastTimerRef.current = setTimeout(() => {
      setToast({ msg: "", visible: false, type: "" });
    }, 3500);
  }, []);

  const handleApiError = useCallback(
    (error, fallback) => {
      const status = error.response?.status;
      if (status === 401) {
        clearAuthSession();
        navigate("/login");
        return;
      }
      showToast(error.response?.data?.message || error.message || fallback, "error");
    },
    [navigate, showToast]
  );

  const monthOptions = useMemo(
    () =>
      Array.from(
        new Set(
          allPayslips
            .filter((payslip) => payslip?.month)
            .map((payslip) => String(payslip.month).slice(0, 7))
        )
      )
        .sort()
        .reverse(),
    [allPayslips]
  );

  const loadPayslipPdfPreview = useCallback(
    async (payslipId) => {
      if (!payslipId || !token) return;

      revokePdfPreview();

      try {
        const response = await fetch(
          `${API_BASE}/payroll/payslip/${payslipId}/download?preview=true`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const contentType = response.headers.get("content-type") || "";

        if (!response.ok || !contentType.includes("application/pdf")) {
          throw new Error(await getPdfError(response, "PDF preview failed"));
        }

        const url = window.URL.createObjectURL(await response.blob());
        pdfUrlRef.current = url;
        setPdfUrl(url);
      } catch (error) {
        revokePdfPreview();
        showToast(error.message || "PDF preview failed", "error");
      }
    },
    [revokePdfPreview, showToast, token]
  );

  const loadPayslipForMonth = useCallback(
    async (month) => {
      if (!month) return;

      setLoadingPayslip(true);
      setCurrentPayslip(null);
      revokePdfPreview();

      try {
        const response = await api.get("/manager/my-payslip", {
          params: { month: `${month}-01` },
        });
        const payslip = response.data;

        if (!payslip?.id) return;

        setCurrentPayslip(payslip);
        await loadPayslipPdfPreview(payslip.id);
      } catch (error) {
        handleApiError(error, "Error loading payslip");
      } finally {
        setLoadingPayslip(false);
      }
    },
    [handleApiError, loadPayslipPdfPreview, revokePdfPreview]
  );

  const loadPayslips = useCallback(async () => {
    setIsLoading(true);

    try {
      const response = await api.get("/manager/my-payslips");
      const payslips = normalizeArray(response.data);
      setAllPayslips(payslips);

      if (payslips.length) {
        const latestMonth = String(payslips[0].month).slice(0, 7);
        setSelectedMonth(latestMonth);
        await loadPayslipForMonth(latestMonth);
      } else {
        setSelectedMonth("");
        setCurrentPayslip(null);
        revokePdfPreview();
      }
    } catch (error) {
      setAllPayslips([]);
      setCurrentPayslip(null);
      revokePdfPreview();
      handleApiError(error, "Error loading payslips");
    } finally {
      setIsLoading(false);
    }
  }, [handleApiError, loadPayslipForMonth, revokePdfPreview]);

  useEffect(() => {
    if (token) loadPayslips();
  }, [loadPayslips, token]);

  const downloadPayslipPdf = async () => {
    if (!currentPayslip?.id) {
      showToast("No payslip selected", "error");
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE}/payroll/payslip/${currentPayslip.id}/download`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const contentType = response.headers.get("content-type") || "";

      if (!response.ok || !contentType.includes("application/pdf")) {
        throw new Error(await getPdfError(response, "Server did not return PDF"));
      }

      const url = window.URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = `payslip_${String(currentPayslip.month).slice(0, 7)}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      showToast(error.message || "Download failed", "error");
    }
  };

  return (
    <main className="main-content manager-portal-page manager-payslip-page">
      <div className="page-header">
        <div className="title">
          <h1>
            <i className="fas fa-file-invoice-dollar" /> My Payslips
          </h1>
          <p>View and download your salary statements</p>
        </div>
      </div>

      <div className="selector-card">
        <div>
          <i className="fas fa-calendar-alt" style={{ color: "var(--gold)" }} />{" "}
          <label htmlFor="managerMonthSelect">Select Month</label>
        </div>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <select
            id="managerMonthSelect"
            className="month-select"
            value={selectedMonth}
            disabled={isLoading || !monthOptions.length}
            onChange={(event) => {
              const month = event.target.value;
              setSelectedMonth(month);
              loadPayslipForMonth(month);
            }}
          >
            {isLoading ? (
              <option value="">Loading months...</option>
            ) : !monthOptions.length ? (
              <option value="">No payslips available</option>
            ) : (
              monthOptions.map((month) => (
                <option key={month} value={month}>
                  {new Date(`${month}-01T00:00:00`).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                  })}
                </option>
              ))
            )}
          </select>

          <button
            type="button"
            className="print-btn"
            onClick={downloadPayslipPdf}
            disabled={!currentPayslip?.id}
          >
            <i className="fas fa-download" /> Download PDF
          </button>
        </div>
      </div>

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
            Please try again or contact HR.
          </p>
        </div>
      )}

      <div
        className={`toast${toast.visible ? " show" : ""}${
          toast.type ? ` ${toast.type}` : ""
        }`}
      >
        {toast.msg}
      </div>
    </main>
  );
}
