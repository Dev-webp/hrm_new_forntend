// ============================================================
// FILE: VJC-Invoice-frontend/src/pages/Expenses.jsx
// ============================================================

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";

// ─── Config ──────────────────────────────────────────────────
const API = "http://localhost:5000/api";

const CATEGORIES = [
  "Travel", "Food", "Office Supplies", "Rent", "Mobile Recharge",
  "Internet Recharge", "Water Bill", "Electricity Bill", "Petty Cash", "Others",
];

const PAYMENT_METHODS = ["Cash", "Card", "Bank Transfer", "UPI"];
const PAID_BY_OPTIONS  = ["Employee", "Company"];

const emptyForm = {
  date: "", category: "", customer: "VJC", amount: "", billable: "true",
  paymentStatus: "Unpaid", notes: "",
  // NEW fields
    vendorSupplier: "", paymentDate: "", paymentMethod: "", invoiceNumber: "",
  receiptUrl: "", gstApplicable: "false", gstAmount: "",
  department: "", paidBy: "Company", paidByName: "VJC", dueDate: "",
};

const STATUS_BADGE = {
  "Paid":   { bg: "#EAF3DE", color: "#27500A" },
  "Unpaid": { bg: "#FCE8E6", color: "#B42318" },
};

// ── Map DB row (snake_case) → frontend (camelCase) ────────────
const mapRow = (r) => ({
  id:            r.id,
  expenseNo:     r.expense_no,
  date:          r.date?.slice(0, 10) || "",
  category:      r.category,
  customer:      r.customer || "VJC",
  amount:        Number(r.amount),
  billable:      r.billable,
  status:        r.status,
  paymentStatus: r.payment_status || "Unpaid",
  notes:         r.notes || "",
  // NEW fields
  vendorSupplier: r.vendor_supplier || "",
  paymentDate:    r.payment_date?.slice(0, 10) || "",
  paymentMethod:  r.payment_method || "",
  invoiceNumber:  r.invoice_number || "",
  receiptUrl:     r.receipt_url || "",
  gstApplicable:  !!r.gst_applicable,
  gstAmount:      Number(r.gst_amount || 0),
  department:     r.department || "",
  paidBy:         r.paid_by || "Company",
  paidByName:     r.paid_by_name || "VJC",
  dueDate:        r.due_date?.slice(0, 10) || "",
});


// ─── Badge ───────────────────────────────────────────────────
function Badge({ status }) {
  const s = STATUS_BADGE[status] || { bg: "#F1EFE8", color: "#444441" };
  return (
    <span style={{
      display: "inline-block", padding: "3px 10px", borderRadius: 99,
      fontSize: 12, fontWeight: 500, background: s.bg, color: s.color,
      whiteSpace: "nowrap"
    }}>
      {status}
    </span>
  );
}

// ─── Modal ───────────────────────────────────────────────────
function Modal({ open, onClose, title, children, width = 480 }) {
  if (!open) return null;
  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
      zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center"
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: "#fff", borderRadius: 16, padding: "32px 36px 28px",
        width, maxWidth: "95vw", maxHeight: "90vh", overflowY: "auto",
        boxShadow: "0 8px 40px rgba(0,0,0,0.18)",
        border: "0.5px solid #e0e0e0"
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <span style={{ fontSize: 17, fontWeight: 600, color: "#1a1a1a" }}>{title}</span>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "#888", lineHeight: 1 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── Toast ───────────────────────────────────────────────────
function Toast({ message }) {
  if (!message) return null;
  return (
    <div style={{
      position: "fixed", bottom: 24, right: 24, zIndex: 300,
      background: "#1a1a2e", color: "#fff", padding: "11px 20px",
      borderRadius: 8, fontSize: 13, fontWeight: 500,
      boxShadow: "0 4px 16px rgba(0,0,0,0.2)", pointerEvents: "none"
    }}>
      {message}
    </div>
  );
}

// ─── SectionHeader — teal accent bar, matches the Add Enquiry look ──────
function SectionHeader({ icon, label }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8,
      background: "#e6f3f2", borderLeft: "4px solid #0f9b8e",
      padding: "9px 14px", borderRadius: "6px 6px 0 0", margin: "18px 0 14px",
    }}>
      <span style={{ fontSize: 14 }}>{icon}</span>
      <span style={{ fontSize: 12.5, fontWeight: 700, color: "#0f6f65", letterSpacing: 0.2 }}>{label}</span>
    </div>
  );
}

// ─── BoxedField — icon-in-box wrapper, matches the Add Enquiry look ─────
function BoxedField({ icon, label, required, error, children }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: "#555", marginBottom: 6 }}>
        {label}{required && <span style={{ color: "#d32f2f" }}> *</span>}
      </div>
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        border: `1px solid ${error ? "#e24b4a" : "#d9dee3"}`,
        borderRadius: 9, padding: "11px 14px", background: "#fff",
        transition: "border-color 0.15s",
      }}>
        <span style={{ color: "#7b8794", fontSize: 14, flexShrink: 0, width: 16, textAlign: "center" }}>{icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
      </div>
      {error && <div style={{ fontSize: 11, color: "#e24b4a", marginTop: 3 }}>{error}</div>}
    </div>
  );
}

const plainInputStyle = {
  width: "100%", border: "none", outline: "none", background: "transparent",
  fontSize: 13.5, color: "#1a1a1a", fontFamily: "inherit", padding: 0,
};

// ─── Expense Due Notification Bell — fixed top-right, polls + plays a
//     short beep (Web Audio API, no external sound file needed) whenever
//     the due/unpaid count goes UP since the last check. ─────────────────
function ExpenseDueBell() {
  const [dueList, setDueList] = useState([]);
  const [open, setOpen] = useState(false);
  const prevCount = useRef(0);
  const firstLoad = useRef(true);

  const playBeep = () => {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      const ctx = new Ctx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch {
      // silent — some browsers block audio before any user interaction
    }
  };

  const fetchDue = async () => {
    try {
      const token = localStorage.getItem("vjc_invoice_auth");
      const res = await fetch(`${API}/expenses/notifications/due`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      if (!firstLoad.current && list.length > prevCount.current) {
        playBeep();
      }
      prevCount.current = list.length;
      firstLoad.current = false;
      setDueList(list);
    } catch {
      // silent — don't disrupt the page if this fails
    }
  };

  useEffect(() => {
    fetchDue();
    const interval = setInterval(fetchDue, 30000); // poll every 30s
    return () => clearInterval(interval);
  }, []);

    return (
    <div style={{ position: "relative", zIndex: 500 }}>
      <button onClick={() => setOpen(o => !o)} title="Due / Unpaid Expenses" style={{
        position: "relative", background: "#fff", border: "1px solid #e0e0e0",
        borderRadius: "50%", width: 42, height: 42, cursor: "pointer",
        fontSize: 18, boxShadow: "0 2px 10px rgba(0,0,0,0.12)",
      }}>
        🔔
        {dueList.length > 0 && (
          <span style={{
            position: "absolute", top: -3, right: -3, background: "#e24b4a",
            color: "#fff", borderRadius: 99, fontSize: 10, fontWeight: 700,
            minWidth: 17, height: 17, display: "flex", alignItems: "center",
            justifyContent: "center", padding: "0 3px", border: "2px solid #fff",
          }}>{dueList.length}</span>
        )}
      </button>

      {open && (
        <div style={{
          position: "absolute", right: 0, top: 50, width: 310, maxHeight: 380,
          overflowY: "auto", background: "#fff", borderRadius: 12,
          boxShadow: "0 10px 36px rgba(0,0,0,0.18)", border: "0.5px solid #e0e0e0",
        }}>
          <div style={{ padding: "12px 16px", borderBottom: "0.5px solid #eee", fontWeight: 700, fontSize: 13, color: "#1a1a2e" }}>
            Due / Unpaid Expenses
          </div>
          {dueList.length === 0 && (
            <div style={{ padding: 18, fontSize: 13, color: "#aaa" }}>No due payments 🎉</div>
          )}
          {dueList.map(e => (
            <div key={e.id} style={{ padding: "10px 16px", borderBottom: "0.5px solid #f5f5f5" }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#1a1a2e" }}>
                {e.expense_no} — ₹{Number(e.amount).toLocaleString("en-IN")}
              </div>
              <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>
                {e.category} · Due {e.due_date ? e.due_date.slice(0, 10) : "—"}
                {e.vendor_supplier ? ` · ${e.vendor_supplier}` : ""}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────
export default function Expenses() {
  const [expenses,        setExpenses]        = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [showAdd,         setShowAdd]         = useState(false);
  const [editId,          setEditId]          = useState(null);
  const [deleteId,        setDeleteId]        = useState(null);
  const [form,            setForm]            = useState(emptyForm);
  const [formErrors,      setFormErrors]      = useState({});
  const [search,          setSearch]          = useState("");
  const [filterStatus,    setFilterStatus]    = useState("");
  const [filterCategory,  setFilterCategory]  = useState("");
  const [toast,           setToast]           = useState("");
  const [uploading,       setUploading]       = useState(false);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  };

  // ── Fetch Expenses ──
  const fetchExpenses = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("vjc_invoice_auth");
      const res = await fetch(`${API}/expenses`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setExpenses(Array.isArray(data) ? data.map(mapRow) : []);
    } catch (err) {
      showToast("Failed to load expenses");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchExpenses(); }, [fetchExpenses]);

  // ── Stats ──
  const stats = useMemo(() => {
    const total       = expenses.reduce((s, e) => s + Number(e.amount), 0);
    const billableAmt = expenses.filter(e => e.billable).reduce((s, e) => s + Number(e.amount), 0);
    const nonBillable = expenses.filter(e => !e.billable).length;
    const reimbursed  = expenses.filter(e => e.status === "Reimbursed").length;
    const invoiced    = expenses.filter(e => e.status === "Invoiced").length;
    const dueCount     = expenses.filter(e => e.paymentStatus === "Unpaid" && e.dueDate && e.dueDate <= new Date().toISOString().slice(0, 10)).length;
    return { total, billableAmt, nonBillable, reimbursed, invoiced, dueCount };
  }, [expenses]);

  // ── Filter ──
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return expenses.filter(e => {
      const matchQ = !q ||
        e.expenseNo.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q)  ||
        (e.customer || "").toLowerCase().includes(q) ||
        (e.vendorSupplier || "").toLowerCase().includes(q);
      const matchS = !filterStatus || e.paymentStatus === filterStatus;
      const matchC = !filterCategory || e.category === filterCategory;
      return matchQ && matchS && matchC;
    });
  }, [expenses, search, filterStatus, filterCategory]);

  const cats = CATEGORIES;

  // ── Open Add ──
  const openAdd = () => {
    setEditId(null);
    setForm(emptyForm);
    setFormErrors({});
    setShowAdd(true);
  };

  // ── Open Edit ──
  const openEdit = (id) => {
    const e = expenses.find(x => x.id === id);
    if (!e) return;
    setEditId(id);
    setForm({
      date:           e.date,
      category:       e.category,
      customer:       e.customer === "-" ? "VJC" : e.customer,
      amount:         String(e.amount),
      billable:       e.billable ? "true" : "false",
      paymentStatus:  e.paymentStatus || "Unpaid",
      notes:          e.notes || "",
      vendorSupplier: e.vendorSupplier || "",
      paymentDate:    e.paymentDate || e.date,
      paymentMethod:  e.paymentMethod || "",
      invoiceNumber:  e.invoiceNumber || "",
      receiptUrl:     e.receiptUrl || "",
      gstApplicable:  e.gstApplicable ? "true" : "false",
      gstAmount:      e.gstAmount ? String(e.gstAmount) : "",
      department:     e.department || "",
      paidBy:         e.paidBy || "Company",
      paidByName:     e.paidByName || (e.paidBy === "Employee" ? "" : "VJC"),
      dueDate:        e.dueDate || "",
    });
    setFormErrors({});
    setShowAdd(true);
  };

  // ── Validate ──
  const validate = () => {
    const errs = {};
    if (!form.category.trim()) errs.category = "Required";
    if (!form.amount || isNaN(Number(form.amount)) || Number(form.amount) <= 0)
      errs.amount = "Enter a valid amount";
       if (!form.date) errs.date = "Required";
    if (form.paidBy === "Employee" && !form.paidByName.trim()) errs.paidByName = "Enter employee name";
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ── Receipt Upload ──
  const handleReceiptUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const token = localStorage.getItem("vjc_invoice_auth");
      const fd = new FormData();
      fd.append("receipt", file);
      const res = await fetch(`${API}/expenses/upload-receipt`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setForm(f => ({ ...f, receiptUrl: data.url }));
      showToast("Receipt uploaded ✅");
    } catch (err) {
      showToast("Upload failed: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  // ── Save (Create / Update) ──
  const saveExpense = async () => {
    if (!validate()) return;
    const billable = form.billable === "true";

    const payload = {
      date:            form.date,
      category:        form.category,
      customer:        form.customer.trim() || "VJC",
      amount:          Number(form.amount),
      billable,
      payment_status:  form.paymentStatus,
      notes:           form.notes,
      // NEW fields
      vendor_supplier: form.vendorSupplier.trim() || null,
      payment_date:    form.paymentDate || form.date,
      payment_method:  form.paymentMethod || null,
      invoice_number:  form.invoiceNumber.trim() || null,
      receipt_url:     form.receiptUrl || null,
      gst_applicable:  form.gstApplicable === "true",
      gst_amount:      form.gstAmount ? Number(form.gstAmount) : 0,
            department:      form.department.trim() || null,
      paid_by:         form.paidBy,
      paid_by_name:    form.paidBy === "Employee" ? (form.paidByName.trim() || null) : "VJC",
      due_date:        form.dueDate || null,
    };

    try {
      const token = localStorage.getItem("vjc_invoice_auth");
      if (editId) {
        const res = await fetch(`${API}/expenses/${editId}`, {
          method:  "PUT",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body:    JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(await res.text());
        showToast("Expense updated successfully ✅");
      } else {
        const res = await fetch(`${API}/expenses`, {
          method:  "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body:    JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(await res.text());
        showToast("Expense added successfully ✅");
      }
      await fetchExpenses();
      setShowAdd(false);
    } catch (err) {
      showToast("Failed to save: " + err.message);
    }
  };

  // ── Delete ──
  const confirmDelete = async () => {
    try {
      const token = localStorage.getItem("vjc_invoice_auth");
      const res = await fetch(`${API}/expenses/${deleteId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(await res.text());
      await fetchExpenses();
      setDeleteId(null);
      showToast("Expense deleted ✅");
    } catch (err) {
      showToast("Failed to delete: " + err.message);
    }
  };

  // ── Convert to Invoice ──
  const convertToInvoice = async (id) => {
    try {
      const token = localStorage.getItem("vjc_invoice_auth");
      const res = await fetch(`${API}/expenses/${id}/convert`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(await res.text());
      await fetchExpenses();
      showToast("Converted to Invoice ✅");
    } catch (err) {
      showToast("Failed: " + err.message);
    }
  };

  // ── Reimburse ──
  const reimburse = async (id) => {
    try {
      const token = localStorage.getItem("vjc_invoice_auth");
      const res = await fetch(`${API}/expenses/${id}/reimburse`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(await res.text());
      await fetchExpenses();
      showToast("Marked as Reimbursed ✅");
    } catch (err) {
      showToast("Failed: " + err.message);
    }
  };

  // ── Input helper (borderless — used inside BoxedField) ──
  const inp = (field) => ({
    value:    form[field],
    onChange: e => setForm(f => ({ ...f, [field]: e.target.value })),
    style: plainInputStyle,
  });

  const isOverdue = (e) =>
    e.paymentStatus === "Unpaid" && e.dueDate && e.dueDate <= new Date().toISOString().slice(0, 10);

  // ─── Render ───────────────────────────────────────────────
  return (
    <div style={{ padding: "24px 28px", background: "#f4f6fb", minHeight: "100vh", fontFamily: "Inter, -apple-system, sans-serif" }}>

           {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#1a1a2e", margin: 0 }}>Expenses</h1>
          <p style={{ fontSize: 13, color: "#888", margin: "4px 0 0" }}>Track and manage all business expenses</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {/* Due/unpaid notification bell — now sits right next to the button
              instead of floating fixed top-right */}
          <ExpenseDueBell />
          <button onClick={openAdd} style={{
            background: "#185FA5", color: "#fff", border: "none", borderRadius: 8,
            padding: "10px 18px", fontSize: 14, fontWeight: 600, cursor: "pointer",
            display: "flex", alignItems: "center", gap: 7
          }}>
            + New Expense
          </button>
        </div>
      </div>
      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 14, marginBottom: 24 }}>
        {[
          { label: "Total Expenses",  value: `₹${stats.total.toLocaleString("en-IN")}`,       color: "#185FA5", bg: "#E6F1FB" },
          { label: "Billable Amount", value: `₹${stats.billableAmt.toLocaleString("en-IN")}`, color: "#3B6D11", bg: "#EAF3DE" },
          { label: "Non Billable",    value: stats.nonBillable,                                color: "#854F0B", bg: "#FAEEDA" },
          { label: "Invoiced",        value: stats.invoiced,                                   color: "#534AB7", bg: "#EEEDFE" },
          { label: "Reimbursed",      value: stats.reimbursed,                                 color: "#993556", bg: "#FBEAF0" },
          { label: "Due / Unpaid",    value: stats.dueCount,                                   color: "#B42318", bg: "#FCE8E6" },
        ].map(s => (
          <div key={s.label} style={{
            background: "#fff", borderRadius: 12, padding: "16px 18px",
            border: "0.5px solid #e8e8e8", boxShadow: "0 1px 4px rgba(0,0,0,0.05)"
          }}>
            <div style={{ fontSize: 12, color: "#888", marginBottom: 6, fontWeight: 500 }}>{s.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ marginTop: 8, height: 3, borderRadius: 99, background: s.bg }} />
          </div>
        ))}
      </div>

      {/* Expense List */}
      <div style={{ background: "#fff", borderRadius: 14, border: "0.5px solid #e8e8e8", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
        <div style={{ padding: "18px 20px 14px", borderBottom: "0.5px solid #f0f0f0", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: "#1a1a2e" }}>All Expenses</span>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <input type="text" placeholder="Search expense, category, customer, vendor..."
              value={search} onChange={e => setSearch(e.target.value)}
              style={{ padding: "7px 12px", border: "1px solid #ddd", borderRadius: 8, fontSize: 13, outline: "none", width: 260, background: "#fafafa" }}
            />
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              style={{
                padding: "7px 11px", border: "1px solid #ddd", borderRadius: 8,
                fontSize: 13, background: "#fafafa", outline: "none", color: "#1a1a1a"
              }}
            >
              <option value="">All Payment Status</option>
              <option value="Paid">Paid</option>
              <option value="Unpaid">Unpaid</option>
            </select>
            <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
              style={{ padding: "7px 11px", border: "1px solid #ddd", borderRadius: 8, fontSize: 13, background: "#fafafa", outline: "none", color: "#1a1a1a" }}>
              <option value="">All Categories</option>
              {cats.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          {loading ? (
            <div style={{ padding: "40px 16px", textAlign: "center", color: "#aaa", fontSize: 14 }}>
              Loading...
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#f8f9fb" }}>
                  {["Expense No", "Date", "Category", "Vendor", "Amount", "Due Date", "Status", "Workflow", "Actions"].map(h => (
                    <th key={h} style={{
                      padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 600,
                      color: "#888", textTransform: "uppercase", letterSpacing: "0.04em",
                      whiteSpace: "nowrap", borderBottom: "0.5px solid #f0f0f0"
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ padding: "40px 16px", textAlign: "center", color: "#aaa", fontSize: 14 }}>
                      No expenses found
                    </td>
                  </tr>
                ) : filtered.map(e => (
                  <tr key={e.id} style={{ borderBottom: "0.5px solid #f5f5f5" }}
                    onMouseEnter={ev => ev.currentTarget.style.background = "#fafbff"}
                    onMouseLeave={ev => ev.currentTarget.style.background = ""}>
                    <td style={{ padding: "12px 16px", fontWeight: 600, color: "#185FA5" }}>{e.expenseNo}</td>
                    <td style={{ padding: "12px 16px", color: "#555" }}>{e.date}</td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{ background: "#f4f6fb", padding: "3px 10px", borderRadius: 6, fontSize: 12, color: "#444", fontWeight: 500 }}>
                        {e.category}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px", color: e.vendorSupplier ? "#333" : "#bbb" }}>{e.vendorSupplier || "—"}</td>
                    <td style={{ padding: "12px 16px", fontWeight: 600, color: "#1a1a2e" }}>
                      ₹{Number(e.amount).toLocaleString("en-IN")}
                    </td>
                    <td style={{ padding: "12px 16px", color: isOverdue(e) ? "#B42318" : "#555", fontWeight: isOverdue(e) ? 700 : 400 }}>
                      {e.dueDate || "—"}{isOverdue(e) ? " ⚠️" : ""}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <Badge status={e.paymentStatus} />
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      {e.status === "Billable" && (
                        <button onClick={() => convertToInvoice(e.id)} style={{
                          background: "#E6F1FB", color: "#0C447C", border: "1px solid #B5D4F4",
                          borderRadius: 7, padding: "5px 12px", fontSize: 12, fontWeight: 600,
                          cursor: "pointer", whiteSpace: "nowrap"
                        }}>Convert to Invoice</button>
                      )}
                      {e.status === "Invoiced" && (
                        <button onClick={() => reimburse(e.id)} style={{
                          background: "#EAF3DE", color: "#27500A", border: "1px solid #C0DD97",
                          borderRadius: 7, padding: "5px 12px", fontSize: 12, fontWeight: 600,
                          cursor: "pointer", whiteSpace: "nowrap"
                        }}>Reimburse</button>
                      )}
                      {e.status === "Non Billable" && (
                        <span style={{ fontSize: 12, color: "#bbb" }}>Closed</span>
                      )}
                      {e.status === "Reimbursed" && (
                        <span style={{ fontSize: 12, color: "#534AB7", fontWeight: 600 }}>✓ Completed</span>
                      )}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => openEdit(e.id)} title="Edit"
                          style={{ background: "none", border: "1px solid #ddd", borderRadius: 6, padding: "5px 8px", cursor: "pointer", fontSize: 13, color: "#555" }}>
                          ✏️
                        </button>
                        <button onClick={() => setDeleteId(e.id)} title="Delete"
                          style={{ background: "none", border: "1px solid #f5c1c1", borderRadius: 6, padding: "5px 8px", cursor: "pointer", fontSize: 13, color: "#e24b4a" }}>
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div style={{ padding: "12px 20px", borderTop: "0.5px solid #f0f0f0", fontSize: 12, color: "#aaa" }}>
          Showing {filtered.length} of {expenses.length} expenses
        </div>
      </div>

      {/* Add / Edit Modal — redesigned to match the "Add Enquiry" boxed-field look */}
<Modal open={showAdd} onClose={() => setShowAdd(false)} title={editId ? "Edit Expense" : "New Expense"} width={760}>
        <SectionHeader icon="📋" label="Expense Details" />
<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 24px" }}>
          <BoxedField icon="📅" label="Date" required error={formErrors.date}>
            <input type="date" {...inp("date")} />
          </BoxedField>

          <BoxedField icon="🏷️" label="Expense Type" required error={formErrors.category}>
            <select {...inp("category")}>
              <option value="">Select category</option>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </BoxedField>

          <BoxedField icon="🏢" label="Consumer Name">
            <input type="text" {...inp("customer")} placeholder="VJC" />
          </BoxedField>

          <BoxedField icon="🚚" label="Vendor / Supplier">
            <input type="text" {...inp("vendorSupplier")} placeholder="Who you bought from" />
          </BoxedField>

          <BoxedField icon="💰" label="Amount (₹)" required error={formErrors.amount}>
            <input type="number" {...inp("amount")} placeholder="0.00" min="0" />
          </BoxedField>

          <BoxedField icon="🧮" label="Tax / GST (₹)">
            <input type="number" {...inp("gstAmount")} placeholder="0.00" min="0" />
          </BoxedField>

          <BoxedField icon="✅" label="GST Applicable">
            <select {...inp("gstApplicable")}>
              <option value="false">No</option>
              <option value="true">Yes</option>
            </select>
          </BoxedField>

          <BoxedField icon="📦" label="Type">
            <select {...inp("billable")}>
              <option value="true">Billable</option>
              <option value="false">Non Billable</option>
            </select>
          </BoxedField>
        </div>

        <SectionHeader icon="💳" label="Payment Details" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
          <BoxedField icon="📅" label="Payment Date">
            <input type="date" {...inp("paymentDate")} />
          </BoxedField>

          <BoxedField icon="💳" label="Payment Method">
            <select {...inp("paymentMethod")}>
              <option value="">Select method</option>
              {PAYMENT_METHODS.map(m => <option key={m}>{m}</option>)}
            </select>
          </BoxedField>

          <BoxedField icon="🧾" label="Invoice / Bill Number">
            <input type="text" {...inp("invoiceNumber")} placeholder="e.g. INV-1042" />
          </BoxedField>

          <BoxedField icon="⏰" label="Due Date">
            <input type="date" {...inp("dueDate")} />
          </BoxedField>

          <BoxedField icon="✔️" label="Payment Status">
            <select {...inp("paymentStatus")}>
              <option value="Unpaid">Unpaid</option>
              <option value="Paid">Paid</option>
            </select>
          </BoxedField>

          <BoxedField icon="👤" label="Paid By">
            <select
              value={form.paidBy}
              onChange={e => {
                const val = e.target.value;
                setForm(f => ({
                  ...f,
                  paidBy: val,
                  paidByName: val === "Company" ? "VJC" : "",
                }));
              }}
              style={plainInputStyle}
            >
              {PAID_BY_OPTIONS.map(p => <option key={p}>{p}</option>)}
            </select>
          </BoxedField>

          {form.paidBy === "Employee" ? (
            <BoxedField icon="🧑‍💼" label="Employee Name" required error={formErrors.paidByName}>
              <input
                type="text"
                value={form.paidByName}
                onChange={e => setForm(f => ({ ...f, paidByName: e.target.value }))}
                placeholder="Enter employee name"
                style={plainInputStyle}
              />
            </BoxedField>
          ) : (
            <BoxedField icon="🏢" label="Paid By (Company)">
              <input type="text" value="VJC" readOnly style={{ ...plainInputStyle, color: "#888" }} />
            </BoxedField>
          )}

          <BoxedField icon="🏬" label="Department / Project">
            <input type="text" {...inp("department")} placeholder="e.g. Germany OC Team" />
          </BoxedField>

          <BoxedField icon="📎" label="Receipt Upload">
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input type="file" onChange={handleReceiptUpload} style={{ fontSize: 12, width: "100%" }} accept="image/*,application/pdf" />
            </div>
          </BoxedField>
        </div>

        {form.receiptUrl && (
          <div style={{ fontSize: 12, color: "#0f9b8e", marginBottom: 10 }}>
            ✓ Receipt attached — <a href={form.receiptUrl} target="_blank" rel="noreferrer" style={{ color: "#0f9b8e" }}>view file</a>
          </div>
        )}
        {uploading && <div style={{ fontSize: 12, color: "#888", marginBottom: 10 }}>Uploading receipt...</div>}

        <SectionHeader icon="📝" label="Notes" />
        <div style={{ marginBottom: 4 }}>
          <BoxedField icon="📝" label="Description / Notes">
            <textarea {...inp("notes")} placeholder="Optional notes..." rows={2}
              style={{ ...plainInputStyle, resize: "vertical", fontFamily: "inherit" }} />
          </BoxedField>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 18 }}>
          <button onClick={() => setShowAdd(false)} style={{
            background: "none", border: "1px solid #ddd", borderRadius: 8,
            padding: "9px 18px", fontSize: 14, cursor: "pointer", color: "#555"
          }}>Cancel</button>
          <button onClick={saveExpense} style={{
            background: "#185FA5", color: "#fff", border: "none", borderRadius: 8,
            padding: "9px 20px", fontSize: 14, fontWeight: 600, cursor: "pointer"
          }}>
            {editId ? "Update Expense" : "Save Expense"}
          </button>
        </div>
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="Delete Expense">
        <p style={{ fontSize: 14, color: "#555", marginBottom: 20, lineHeight: 1.6 }}>
          Are you sure you want to delete this expense? This action cannot be undone.
        </p>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button onClick={() => setDeleteId(null)} style={{
            background: "none", border: "1px solid #ddd", borderRadius: 8,
            padding: "9px 18px", fontSize: 14, cursor: "pointer", color: "#555"
          }}>Cancel</button>
          <button onClick={confirmDelete} style={{
            background: "#e24b4a", color: "#fff", border: "none", borderRadius: 8,
            padding: "9px 20px", fontSize: 14, fontWeight: 600, cursor: "pointer"
          }}>Delete</button>
        </div>
      </Modal>

      <Toast message={toast} />
    </div>
  );
}
