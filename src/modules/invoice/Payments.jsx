// ============================================================
// FILE: VJC-Invoice-frontend/src/pages/Payments.jsx
// ============================================================

import { useState, useEffect, useCallback } from "react";
import {
  Box, Typography, Grid, Card, CardContent, Button, TextField,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Dialog, DialogTitle, DialogContent, DialogActions,
  MenuItem, Chip, Stepper, Step, StepLabel,
  Tooltip, IconButton, Alert, CircularProgress, Snackbar,
} from "@mui/material";
import AddIcon          from "@mui/icons-material/Add";
import PaymentIcon      from "@mui/icons-material/Payment";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import CreditCardIcon   from "@mui/icons-material/CreditCard";
import PhoneAndroidIcon from "@mui/icons-material/PhoneAndroid";
import ReceiptIcon      from "@mui/icons-material/Receipt";
import SendIcon         from "@mui/icons-material/Send";
import CheckCircleIcon  from "@mui/icons-material/CheckCircle";
import WarningIcon      from "@mui/icons-material/Warning";
import RefreshIcon      from "@mui/icons-material/Refresh";
import CloseIcon        from "@mui/icons-material/Close";

// ─── Config ──────────────────────────────────────────────────
const API = "http://localhost:5000/api";

const formatPrice = (value) =>
  Number(value || 0).toLocaleString("en-IN", {
    style: "currency", currency: "INR", maximumFractionDigits: 0,
  });

const today = () => new Date().toISOString().split("T")[0];

// ── Map DB row (snake_case) → frontend object (camelCase) ────
const mapRow = (r) => ({
  id:              r.payment_no,
  dbId:            r.id,
  invoiceId:       r.invoice_id || "MANUAL",
  customerId:      r.customer_id,
  customerName:    r.customer_name,
  email:           r.email || "",
  requestDate:     r.request_date?.slice(0, 10) || "",
  dueDate:         r.due_date?.slice(0, 10) || "",
  amountDue:       Number(r.amount_due),
  amountReceived:  Number(r.amount_received),
  paymentMethod:   r.payment_method || "",
  txnRef:          r.txn_ref || "",
  paidDate:        r.paid_date?.slice(0, 10) || "",
  status:          r.status,
  notes:           r.notes || "",
  reminderLog:     Array.isArray(r.reminder_log) ? r.reminder_log : [],
});

const PAYMENT_METHODS = [
  { key: "PayPal",      label: "PayPal",           icon: <PaymentIcon />,        color: "#003087" },
  { key: "CreditCard",  label: "Credit Card",      icon: <CreditCardIcon />,     color: "#1976d2" },
  { key: "Bank",        label: "Bank Transfer",    icon: <AccountBalanceIcon />, color: "#2e7d32" },
  { key: "UPI",         label: "UPI / Online",     icon: <PhoneAndroidIcon />,   color: "#9c27b0" },
  { key: "Manual",      label: "Manual / Offline", icon: <ReceiptIcon />,        color: "#757575" },
];

const STATUS_COLOR = {
  "Initial Request": "primary",
  "Reminder 1":      "warning",
  "Reminder 2":      "warning",
  "Overdue":         "error",
  "Paid":            "success",
  "Partially Paid":  "info",
  "Void":            "default",
};

// ─── Send Reminder Dialog ─────────────────────────────────────
function SendReminderDialog({ open, onClose, payment, onSend }) {
  const [method, setMethod] = useState("email");
  const [note, setNote]     = useState("");
  const [loading, setLoading] = useState(false);

  const reminderStage =
    payment?.status === "Initial Request" ? "Reminder 1" :
    payment?.status === "Reminder 1"      ? "Reminder 2" :
    payment?.status === "Reminder 2"      ? "Overdue"    : null;

  const handleSend = async () => {
    setLoading(true);
    await onSend(payment, reminderStage || payment?.status, method, note);
    setNote("");
    setLoading(false);
    onClose();
  };

  if (!payment) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ bgcolor: "#ed6c02", color: "white", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        Send Reminder — {payment.id}
        <IconButton size="small" onClick={onClose} sx={{ color: "white" }}><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent sx={{ mt: 2 }}>
        {reminderStage && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Status moves to <strong>{reminderStage}</strong>
          </Alert>
        )}
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField fullWidth disabled label="Customer" value={payment.customerName} size="small" />
          </Grid>
          <Grid item xs={6}>
            <TextField fullWidth disabled label="Invoice #" value={payment.invoiceId} size="small" />
          </Grid>
          <Grid item xs={6}>
            <TextField fullWidth disabled label="Amount Due" value={formatPrice(payment.amountDue)} size="small" />
          </Grid>
          <Grid item xs={12}>
            <TextField select fullWidth label="Send Via" value={method}
              onChange={(e) => setMethod(e.target.value)} size="small">
              <MenuItem value="email">📧 Email</MenuItem>
              <MenuItem value="sms">📱 SMS</MenuItem>
              <MenuItem value="whatsapp">💬 WhatsApp</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12}>
            <TextField fullWidth multiline rows={3} label="Reminder Message"
              value={note} onChange={(e) => setNote(e.target.value)}
              placeholder={`Dear ${payment.customerName}, your invoice ${payment.invoiceId} of ${formatPrice(payment.amountDue)} is due. Please make the payment at the earliest.`}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={loading}>Cancel</Button>
        <Button variant="contained" color="warning" startIcon={loading ? <CircularProgress size={16} /> : <SendIcon />}
          onClick={handleSend} disabled={loading}>
          Send Reminder
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── Record Payment Dialog ────────────────────────────────────
function RecordPaymentDialog({ open, onClose, payment, onRecord }) {
  const [form, setForm] = useState({
    paymentDate: today(), paymentMethod: "Bank",
    amountReceived: "", reference: "", reference: "", notes: "",
  });
  const [loading, setLoading] = useState(false);

  const handleRecord = async () => {
    if (!form.amountReceived) return;
    setLoading(true);
    await onRecord(payment, form);
    setForm({ paymentDate: today(), paymentMethod: "Bank", amountReceived: "", reference: "", notes: "" });
    setLoading(false);
    onClose();
  };

  if (!payment) return null;
  const amountDue  = payment?.amountDue || 0;
  const received   = Number(form.amountReceived || 0);
  const newStatus  = received >= amountDue ? "Paid" : received > 0 ? "Partially Paid" : payment?.status;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ bgcolor: "#2e7d32", color: "white", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        Record Payment — {payment.id}
        <IconButton size="small" onClick={onClose} sx={{ color: "white" }}><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent sx={{ mt: 2 }}>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField fullWidth disabled label="Customer" value={payment.customerName} size="small" />
          </Grid>
          <Grid item xs={6}>
            <TextField fullWidth disabled label="Invoice #" value={payment.invoiceId} size="small" />
          </Grid>
          <Grid item xs={6}>
            <TextField fullWidth disabled label="Total Due" value={formatPrice(amountDue)} size="small" />
          </Grid>
          <Grid item xs={6}>
            <TextField fullWidth label="Payment Date *" type="date"
              value={form.paymentDate}
              onChange={(e) => setForm({ ...form, paymentDate: e.target.value })}
              InputLabelProps={{ shrink: true }} size="small" />
          </Grid>
          <Grid item xs={6}>
            <TextField select fullWidth label="Payment Method *"
              value={form.paymentMethod}
              onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
              size="small">
              {PAYMENT_METHODS.map((m) => (
                <MenuItem key={m.key} value={m.key}>{m.label}</MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={6}>
            <TextField fullWidth label="Amount Received (₹) *" type="number"
              value={form.amountReceived}
              onChange={(e) => setForm({ ...form, amountReceived: e.target.value })}
              size="small" />
          </Grid>
          <Grid item xs={6}>
            <TextField fullWidth label="Reference / TXN ID"
              value={form.reference}
              onChange={(e) => setForm({ ...form, reference: e.target.value })}
              size="small" />
          </Grid>
          <Grid item xs={12}>
            <TextField fullWidth multiline rows={2} label="Notes"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              size="small" />
          </Grid>
          {form.amountReceived && (
            <Grid item xs={12}>
              <Alert severity={received >= amountDue ? "success" : received > 0 ? "info" : "warning"}
                icon={received >= amountDue ? <CheckCircleIcon /> : <WarningIcon />}>
                Status → <strong>{newStatus}</strong>
                {received < amountDue && received > 0 && (
                  <> &nbsp;| Balance: <strong>{formatPrice(amountDue - received)}</strong></>
                )}
              </Alert>
            </Grid>
          )}
        </Grid>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={loading}>Cancel</Button>
        <Button variant="contained" color="success"
          startIcon={loading ? <CircularProgress size={16} /> : <CheckCircleIcon />}
          onClick={handleRecord} disabled={!form.amountReceived || loading}>
          Record Payment
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── View Dialog ──────────────────────────────────────────────
function ViewPaymentDialog({ open, onClose, payment }) {
  if (!payment) return null;
  const stageIndex = ["Initial Request", "Reminder 1", "Reminder 2", "Overdue"].indexOf(payment.status);
  const isPaid     = ["Paid", "Partially Paid"].includes(payment.status);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ bgcolor: "#1976d2", color: "white", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        Payment Details — {payment.id}
        <IconButton size="small" onClick={onClose} sx={{ color: "white" }}><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent sx={{ mt: 2 }}>
        {!isPaid && payment.status !== "Void" && stageIndex >= 0 && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>
              Payment Life Cycle Progress
            </Typography>
            <Stepper activeStep={stageIndex} alternativeLabel>
              {["Initial Request", "Reminder 1", "Reminder 2", "Overdue"].map((label) => (
                <Step key={label}><StepLabel>{label}</StepLabel></Step>
              ))}
            </Stepper>
          </Box>
        )}
        {isPaid && (
          <Alert severity="success" icon={<CheckCircleIcon />} sx={{ mb: 2 }}>
            Payment {payment.status === "Paid" ? "fully" : "partially"} received
            via <strong>{PAYMENT_METHODS.find(m => m.key === payment.paymentMethod)?.label || payment.paymentMethod}</strong>
            {payment.paidDate && <> on <strong>{payment.paidDate}</strong></>}
          </Alert>
        )}
        <Grid container spacing={2}>
          {[
            ["Payment ID",       payment.id],
            ["Invoice #",        payment.invoiceId],
            ["Customer",         payment.customerName],
            ["Status",           null],
            ["Request Date",     payment.requestDate],
            ["Due Date",         payment.dueDate],
            ["Amount Due",       formatPrice(payment.amountDue)],
            ["Amount Received",  formatPrice(payment.amountReceived)],
          ].map(([label, val]) => (
            <Grid item xs={6} md={3} key={label}>
              <Typography color="text.secondary" variant="body2">{label}</Typography>
              {label === "Status"
                ? <Chip label={payment.status} color={STATUS_COLOR[payment.status] || "default"} size="small" />
                : <Typography fontWeight={["Payment ID","Customer","Amount Due","Amount Received"].includes(label) ? "bold" : "normal"}
                    sx={{ color: label === "Due Date" && payment.status === "Overdue" ? "#d32f2f" : "inherit" }}>
                    {val}
                  </Typography>
              }
            </Grid>
          ))}
          {payment.paymentMethod && (
            <Grid item xs={6} md={3}>
              <Typography color="text.secondary" variant="body2">Payment Method</Typography>
              <Typography>{PAYMENT_METHODS.find(m => m.key === payment.paymentMethod)?.label || payment.paymentMethod}</Typography>
            </Grid>
          )}
          {payment.txnRef && (
            <Grid item xs={6} md={3}>
              <Typography color="text.secondary" variant="body2">TXN Reference</Typography>
              <Typography>{payment.txnRef}</Typography>
            </Grid>
          )}
          {payment.notes && (
            <Grid item xs={12}>
              <Typography color="text.secondary" variant="body2">Notes</Typography>
              <Typography>{payment.notes}</Typography>
            </Grid>
          )}
        </Grid>

        {payment.reminderLog?.length > 0 && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>Reminder History</Typography>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead sx={{ bgcolor: "#f5f5f5" }}>
                  <TableRow>
                    {["Stage", "Sent On", "Method", "Note"].map(h => (
                      <TableCell key={h}><strong>{h}</strong></TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {payment.reminderLog.map((log, i) => (
                    <TableRow key={i}>
                      <TableCell><Chip label={log.stage} size="small" color="warning" /></TableCell>
                      <TableCell>{log.date}</TableCell>
                      <TableCell>{log.method}</TableCell>
                      <TableCell>{log.note || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── Main Component ───────────────────────────────────────────
function PaymentsReceived() {
  const [payments,     setPayments]     = useState([]);
  const [customers,    setCustomers]    = useState([]);
  const [invoices,     setInvoices]     = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [newOpen,      setNewOpen]      = useState(false);
  const [viewOpen,     setViewOpen]     = useState(false);
  const [reminderOpen, setReminderOpen] = useState(false);
  const [recordOpen,   setRecordOpen]   = useState(false);
  const [selected,     setSelected]     = useState(null);
  const [search,       setSearch]       = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [snack,        setSnack]        = useState({ open: false, msg: "", severity: "success" });

 const [newForm, setNewForm] = useState({
  paymentType: "Payment Request",
  invoiceId: "",
  customerId: "",
  customerName: "",
  email: "",
  dueDate: "",
  amountDue: "",

  amountReceived: "",
  paymentMethod: "Bank",
  paymentDate: today(),
  reference: "",
  notes: "",
});

  // ── Fetch payments from backend ──
  const fetchPayments = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("vjc_invoice_auth");
const res  = await fetch(`${API}/payments`, {
  headers: { Authorization: `Bearer ${token}` },
});
const data = await res.json();

const list = Array.isArray(data)
  ? data
  : (data.data || []);

setPayments(list.map(mapRow));
    } catch (err) {
      console.error("fetchPayments error:", err);
      showSnack("Failed to load payments", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Fetch customers from backend ──
  const fetchCustomers = useCallback(async () => {
    try {
const token = localStorage.getItem("vjc_invoice_auth");
const res  = await fetch(`${API}/customers`, {
  headers: { Authorization: `Bearer ${token}` },
});
      const data = await res.json();
      // Support both array and { customers: [] } shape
      const list = Array.isArray(data) ? data : (data.customers || []);
      setCustomers(list);
    } catch (err) {
      console.error("fetchCustomers error:", err);
    }
  }, []);

  // ── Fetch invoices from backend ──
  const fetchInvoices = useCallback(async () => {
    try {
      const res  = await fetch(`${API}/sales-invoices`);
      const data = await res.json();
     const list = Array.isArray(data)
  ? data
  : (data.data || data.invoices || []);

console.log("SALES INVOICES API:", list);

setInvoices(list);
    } catch (err) {
      console.error("fetchInvoices error:", err);
    }
  }, []);

  useEffect(() => {
    fetchPayments();
    fetchCustomers();
    fetchInvoices();
  }, [fetchPayments, fetchCustomers, fetchInvoices]);

  const showSnack = (msg, severity = "success") =>
    setSnack({ open: true, msg, severity });

  // ── Create Payment ──
  const handleCreatePayment = async () => {
  if (
  newForm.paymentType === "Payment Request" &&
  (!newForm.customerId || !newForm.amountDue)
)
  return;

if (
  newForm.paymentType === "Full Paid" &&
  (!newForm.customerId || !newForm.amountReceived)
)
  return;
    try {
     const token = localStorage.getItem("vjc_invoice_auth");
const res = await fetch(`${API}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
  paymentType: newForm.paymentType,

  invoice_id: newForm.invoiceId || null,
  customer_id: newForm.customerId,
  customer_name: newForm.customerName,
  email: newForm.email,

  due_date:
    newForm.paymentType === "Payment Request"
      ? newForm.dueDate || null
      : null,

  amount_due:
    newForm.paymentType === "Payment Request"
      ? Number(newForm.amountDue)
      : Number(newForm.amountReceived),

  amount_received:
    newForm.paymentType === "Full Paid"
      ? Number(newForm.amountReceived)
      : 0,

  payment_method:
    newForm.paymentType === "Full Paid"
      ? newForm.paymentMethod
      : "",

  payment_date:
    newForm.paymentType === "Full Paid"
      ? newForm.paymentDate
      : null,

  reference:
    newForm.paymentType === "Full Paid"
      ? newForm.reference
      : "",

  notes: newForm.notes,
}),
      });
      if (!res.ok) throw new Error(await res.text());
      await fetchPayments();
      setNewOpen(false);
     setNewForm({
  paymentType: "Payment Request",
  invoiceId: "",
  customerId: "",
  customerName: "",
  email: "",
  dueDate: "",
  amountDue: "",
  amountReceived: "",
  paymentMethod: "Bank",
  paymentDate: today(),
  reference: "",
  notes: "",
});
      showSnack("Payment request created!");
    } catch (err) {
      showSnack("Failed to create payment: " + err.message, "error");
    }
  };

  // ── Send Reminder ──
  const handleSendReminder = async (payment, newStage, method, note) => {
    try {
      const token = localStorage.getItem("vjc_invoice_auth");
const res = await fetch(`${API}/payments/${payment.dbId}/reminder`, {
  method: "PUT",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify({ newStage, method, note }),
});
      if (!res.ok) throw new Error(await res.text());
      await fetchPayments();
      showSnack(`Reminder sent! Status → ${newStage}`);
    } catch (err) {
      showSnack("Failed to send reminder: " + err.message, "error");
    }
  };

  // ── Record Payment ──
  const handleRecordPayment = async (payment, form) => {
    try {
      const token = localStorage.getItem("vjc_invoice_auth");
const res = await fetch(`${API}/payments/${payment.dbId}/record`, {
  method: "PUT",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify(form),
});
      if (!res.ok) throw new Error(await res.text());
      await fetchPayments();
      showSnack("Payment recorded!");
    } catch (err) {
      showSnack("Failed to record payment: " + err.message, "error");
    }
  };

  // ── Void ──
  const handleVoid = async (payment) => {
    if (!window.confirm(`Do you want to void ${payment.id}?`)) return;
    try {
const token = localStorage.getItem("vjc_invoice_auth");
const res = await fetch(`${API}/payments/${payment.dbId}/void`, {
  method: "PUT",
  headers: { Authorization: `Bearer ${token}` },
});      if (!res.ok) throw new Error(await res.text());
      await fetchPayments();
      showSnack(`${payment.id} voided`);
    } catch (err) {
      showSnack("Failed to void: " + err.message, "error");
    }
  };

  // ── Filter ──
  const filtered = payments.filter((p) => {
    const q = search.toLowerCase();
    const matchSearch =
      p.customerName.toLowerCase().includes(q) ||
      p.id.toLowerCase().includes(q) ||
      p.invoiceId.toLowerCase().includes(q);
    const matchStatus = statusFilter === "All" || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  // ── Stats ──
  const totalReceived = payments.filter(p => p.status === "Paid").reduce((s, p) => s + p.amountReceived, 0);
  const pendingAmount = payments.filter(p => !["Paid","Void"].includes(p.status)).reduce((s, p) => s + (p.amountDue - p.amountReceived), 0);
  const overdueCount  = payments.filter(p => p.status === "Overdue").length;
  const paidCount     = payments.filter(p => p.status === "Paid").length;
  const partialCount  = payments.filter(p => p.status === "Partially Paid").length;

  // ── Customer dropdown options ──
  const customerOptions = customers.map(c => ({
    id:    c.id || c.customer_id || c._id || String(c.id),
    name:  c.customer_name || c.name || c.customerName || "",
    email: c.email || "",
  }));

  // ── Invoice dropdown options ──
const invoiceOptions = invoices.map(inv => ({
id: inv.invoice_id || inv.invoice_number || inv.invoice_no || inv.id || "",  customerName: inv.customer_name || inv.customerName || "",
  amount: Number(inv.grand_total || inv.total_amount || 0),
  due: inv.due_date?.slice(0,10) || "",
  paid: Number(inv.paid_amount || 0),
  balance: Number(inv.balance_amount || 0),
}));

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">Payments Received</Typography>
        <IconButton onClick={fetchPayments} title="Refresh">
          <RefreshIcon />
        </IconButton>
      </Box>

      {/* Stats */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {[
          { label: "Total Payments", value: payments.length,            color: "#1976d2" },
          { label: "Paid",           value: paidCount,                  color: "#2e7d32" },
          { label: "Partially Paid", value: partialCount,               color: "#0288d1" },
          { label: "Overdue",        value: overdueCount,               color: "#d32f2f" },
          { label: "Total Received", value: formatPrice(totalReceived), color: "#2e7d32" },
          { label: "Pending Amount", value: formatPrice(pendingAmount), color: "#ed6c02" },
        ].map((s) => (
          <Grid item xs={12} md={2} key={s.label}>
            <Card sx={{ borderLeft: `4px solid ${s.color}` }}>
              <CardContent sx={{ py: 1.5 }}>
                <Typography color="text.secondary" variant="body2">{s.label}</Typography>
                <Typography variant="h6" fontWeight="bold">{s.value}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Search + Filter + New */}
      <Box sx={{ display: "flex", gap: 2, mb: 3, flexWrap: "wrap" }}>
        <TextField label="Search Payment / Customer / Invoice"
          size="small" value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ width: 320 }} />
        <TextField select size="small" label="Status" value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)} sx={{ width: 180 }}>
          {["All","Initial Request","Reminder 1","Reminder 2","Overdue","Paid","Partially Paid","Void"].map((s) => (
            <MenuItem key={s} value={s}>{s}</MenuItem>
          ))}
        </TextField>
        <Box sx={{ flexGrow: 1 }} />
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setNewOpen(true)}>
          + New Payment Request
        </Button>
      </Box>

      {/* Table */}
      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead sx={{ bgcolor: "#f5f5f5" }}>
              <TableRow>
                {["Payment #","Invoice #","Customer","Due Date","Amount Due","Received","Payment Method","Status","Actions"].map((h) => (
                  <TableCell key={h}><strong>{h}</strong></TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 4, color: "text.secondary" }}>
                    No payments found
                  </TableCell>
                </TableRow>
              ) : filtered.map((pay) => {
                const method    = PAYMENT_METHODS.find(m => m.key === pay.paymentMethod);
                const canRemind = ["Initial Request","Reminder 1","Reminder 2"].includes(pay.status);
                const canRecord = !["Paid","Void"].includes(pay.status);

                return (
                  <TableRow key={pay.id} hover>
                    <TableCell sx={{ color: "#1976d2", fontWeight: "bold" }}>{pay.id}</TableCell>
                    <TableCell sx={{ color: "#555" }}>{pay.invoiceId}</TableCell>
                    <TableCell>{pay.customerName}</TableCell>
                    <TableCell sx={{
                      color: pay.status === "Overdue" ? "#d32f2f" : "inherit",
                      fontWeight: pay.status === "Overdue" ? "bold" : "normal",
                    }}>
                      {pay.dueDate}
                      {pay.status === "Overdue" && <WarningIcon sx={{ fontSize: 14, ml: 0.5, verticalAlign: "middle" }} />}
                    </TableCell>
                    <TableCell><strong>{formatPrice(pay.amountDue)}</strong></TableCell>
                    <TableCell>
                      <Typography fontWeight="bold"
                        color={pay.amountReceived > 0 ? "success.main" : "text.secondary"}>
                        {formatPrice(pay.amountReceived)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {method ? (
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                          <Box sx={{ color: method.color, display: "flex", alignItems: "center" }}>
                            {method.icon}
                          </Box>
                          <Typography variant="body2">{method.label}</Typography>
                        </Box>
                      ) : "—"}
                    </TableCell>
                    <TableCell>
                      <Chip label={pay.status}
                        color={STATUS_COLOR[pay.status] || "default"} size="small" />
                      {pay.reminderLog?.length > 0 && (
                        <Chip
                          label={`${pay.reminderLog.length} reminder${pay.reminderLog.length > 1 ? "s" : ""}`}
                          size="small" variant="outlined"
                          sx={{ ml: 0.5, fontSize: 10 }} />
                      )}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                        <Button size="small"
                          onClick={() => { setSelected(pay); setViewOpen(true); }}>
                          View
                        </Button>
                        {canRemind && (
                          <Tooltip title="Send Reminder">
                            <Button size="small" color="warning" variant="outlined"
                              startIcon={<SendIcon sx={{ fontSize: 14 }} />}
                              onClick={() => { setSelected(pay); setReminderOpen(true); }}>
                              Remind
                            </Button>
                          </Tooltip>
                        )}
                        {canRecord && (
                          <Tooltip title="Record Payment">
                            <Button size="small" color="success" variant="outlined"
                              startIcon={<CheckCircleIcon sx={{ fontSize: 14 }} />}
                              onClick={() => { setSelected(pay); setRecordOpen(true); }}>
                              Record
                            </Button>
                          </Tooltip>
                        )}
                        {!["Paid","Void"].includes(pay.status) && (
                          <Button size="small" color="error" onClick={() => handleVoid(pay)}>
                            Void
                          </Button>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* ── NEW PAYMENT DIALOG ── */}
      <Dialog open={newOpen} onClose={() => setNewOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: "#1976d2", color: "white" }}>
          New Payment Request
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
  <TextField
    select
    fullWidth
    label="Payment Type"
    value={newForm.paymentType}
    onChange={(e) =>
      setNewForm({
        ...newForm,
        paymentType: e.target.value,
      })
    }
    size="small"
  >
    <MenuItem value="Payment Request">
      Payment Request
    </MenuItem>

    <MenuItem value="Full Paid">
      Full Paid
    </MenuItem>
  </TextField>
</Grid>
            <Grid item xs={12}>
              <TextField select fullWidth label="Customer *"
                value={newForm.customerId}
                onChange={(e) => {
                  const c = customerOptions.find(x => x.id === e.target.value);
                  setNewForm({ ...newForm, customerId: e.target.value,
                    customerName: c?.name || "", email: c?.email || "" });
                }} size="small">
                {customerOptions.length === 0
                  ? <MenuItem value="">No customers found</MenuItem>
                  : customerOptions.map((c) => (
                    <MenuItem key={c.id} value={c.id}>{c.name} — {c.email}</MenuItem>
                  ))
                }
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField select fullWidth label="Link to Invoice (optional)"
                value={newForm.invoiceId}
                onChange={(e) => {
                  const inv = invoiceOptions.find(i => i.id === e.target.value);
                  setNewForm({ ...newForm, invoiceId: e.target.value,
amountDue: inv?.balance?.toString() || newForm.amountDue,
                    dueDate:   inv?.due || newForm.dueDate,
                  });
                }} size="small">
                <MenuItem value="">-- No Invoice --</MenuItem>
                {invoiceOptions.map((inv) => (
                  <MenuItem key={inv.id} value={inv.id}>
                    {inv.id} — {inv.customerName} — {formatPrice(inv.amount)}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            {newForm.paymentType === "Payment Request" && (
  <Grid item xs={6}>
    <TextField
      fullWidth
      label="Amount Due (₹) *"
      type="number"
      value={newForm.amountDue}
      onChange={(e) =>
        setNewForm({
          ...newForm,
          amountDue: e.target.value,
        })
      }
      size="small"
    />
  </Grid>
)}
            {newForm.paymentType === "Payment Request" && (
  <Grid item xs={6}>
    <TextField
      fullWidth
      sx={{ minWidth: 220 }}
      label="Due Date"
      type="date"
      value={newForm.dueDate}
      onChange={(e) =>
        setNewForm({
          ...newForm,
          dueDate: e.target.value,
        })
      }
      InputLabelProps={{ shrink: true }}
      size="small"
    />
  </Grid>
)}
{newForm.paymentType === "Full Paid" && (
  <>
    <Grid item xs={6}>
      <TextField
        fullWidth
        label="Amount Received (₹) *"
        type="number"
        value={newForm.amountReceived}
        onChange={(e) =>
          setNewForm({
            ...newForm,
            amountReceived: e.target.value,
          })
        }
        size="small"
      />
    </Grid>

    <Grid item xs={6}>
      <TextField
        select
        fullWidth
        label="Payment Method"
        value={newForm.paymentMethod}
        onChange={(e) =>
          setNewForm({
            ...newForm,
            paymentMethod: e.target.value,
          })
        }
        size="small"
      >
        {PAYMENT_METHODS.map((m) => (
          <MenuItem key={m.key} value={m.key}>
            {m.label}
          </MenuItem>
        ))}
      </TextField>
    </Grid>

    <Grid item xs={6}>
      <TextField
        fullWidth
        label="Payment Date"
        type="date"
        value={newForm.paymentDate}
        onChange={(e) =>
          setNewForm({
            ...newForm,
            paymentDate: e.target.value,
          })
        }
        InputLabelProps={{ shrink: true }}
        size="small"
      />
    </Grid>

    <Grid item xs={6}>
      <TextField
        fullWidth
        label="Transaction Reference"
        value={newForm.reference || ""}
        onChange={(e) =>
          setNewForm({
            ...newForm,
            reference: e.target.value,
          })
        }
        size="small"
      />
    </Grid>
  </>
)}
            <Grid item xs={12}>
              <TextField fullWidth multiline rows={2} label="Notes"
                value={newForm.notes}
                onChange={(e) => setNewForm({ ...newForm, notes: e.target.value })}
                size="small" />
            </Grid>
          </Grid>
          
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setNewOpen(false)}>Cancel</Button>
          <Button
  variant="contained"
  onClick={handleCreatePayment}
  disabled={
    newForm.paymentType === "Payment Request"
      ? !newForm.customerId || !newForm.amountDue
      : !newForm.customerId || !newForm.amountReceived
  }
>
  {newForm.paymentType === "Payment Request"
    ? "Create Payment Request"
    : "Record Full Payment"}
</Button>
        </DialogActions>
      </Dialog>

      {/* Dialogs */}
      <SendReminderDialog open={reminderOpen} onClose={() => setReminderOpen(false)}
        payment={selected} onSend={handleSendReminder} />
      <RecordPaymentDialog open={recordOpen} onClose={() => setRecordOpen(false)}
        payment={selected} onRecord={handleRecordPayment} />
      <ViewPaymentDialog open={viewOpen} onClose={() => setViewOpen(false)}
        payment={selected} />

      {/* Snackbar */}
      <Snackbar open={snack.open} autoHideDuration={3000}
        onClose={() => setSnack({ ...snack, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}>
        <Alert severity={snack.severity} onClose={() => setSnack({ ...snack, open: false })}>
          {snack.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default PaymentsReceived;
