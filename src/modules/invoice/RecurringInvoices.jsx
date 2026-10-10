// ============================================================
// FILE: VJC-Invoice-frontend/src/pages/RecurringInvoices.jsx
// ============================================================

import { useState, useEffect, useCallback } from "react";
import {
  Box, Typography, Grid, Card, CardContent, Button, TextField,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Dialog, DialogTitle, DialogContent, DialogActions,
  MenuItem, Chip, Divider, IconButton, Alert, Tooltip, Switch,
  FormControlLabel, CircularProgress, Snackbar,
} from "@mui/material";
import AddIcon         from "@mui/icons-material/Add";
import CloseIcon       from "@mui/icons-material/Close";
import DeleteIcon      from "@mui/icons-material/Delete";
import VisibilityIcon  from "@mui/icons-material/Visibility";
import EditIcon        from "@mui/icons-material/Edit";
import StopIcon        from "@mui/icons-material/Stop";
import PlayArrowIcon   from "@mui/icons-material/PlayArrow";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import RepeatIcon      from "@mui/icons-material/Repeat";
import RefreshIcon     from "@mui/icons-material/Refresh";

// ─── Config ──────────────────────────────────────────────────
const API = "http://localhost:5000/api";

const formatPrice = (value) =>
  Number(value || 0).toLocaleString("en-IN", {
    style: "currency", currency: "INR", maximumFractionDigits: 0,
  });

const today = () => new Date().toISOString().split("T")[0];

const formatDate = (dateStr) => {
  if (!dateStr) return "--";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const calcNextDate = (lastDate, frequency) => {
  if (!lastDate) return null;
  const d = new Date(lastDate);
  switch (frequency) {
    case "Weekly":     d.setDate(d.getDate() + 7);         break;
    case "Monthly":    d.setMonth(d.getMonth() + 1);       break;
    case "Quarterly":  d.setMonth(d.getMonth() + 3);       break;
    case "HalfYearly": d.setMonth(d.getMonth() + 6);       break;
    case "Yearly":     d.setFullYear(d.getFullYear() + 1); break;
    default: break;
  }
  return d.toISOString().split("T")[0];
};

// ── Map DB row (snake_case) → frontend (camelCase) ────────────
const mapRow = (r) => ({
  id:                r.profile_no,
  dbId:              r.id,
  profileName:       r.profile_name,
  customerId:        r.customer_id,
  customerName:      r.customer_name,
  frequency:         r.frequency,
  paymentTerms:      r.payment_terms,
  startDate:         r.start_date?.slice(0, 10) || "",
  endDate:           r.end_date?.slice(0, 10)   || "",
  noEndDate:         r.no_end_date,
  lastInvoiceDate:   r.last_invoice_date?.slice(0, 10) || "",
  nextInvoiceDate:   r.next_invoice_date?.slice(0, 10) || "",
  status:            r.status,
  notes:             r.notes || "",
  lineItems:         Array.isArray(r.line_items)         ? r.line_items         : [],
  generatedInvoices: Array.isArray(r.generated_invoices) ? r.generated_invoices : [],
});

// ─── Constants ───────────────────────────────────────────────
const FREQUENCIES = [
  { key: "Weekly",      label: "Weekly"      },
  { key: "Monthly",     label: "Monthly"     },
  { key: "Quarterly",   label: "Quarterly"   },
  { key: "HalfYearly",  label: "Half Yearly" },
  { key: "Yearly",      label: "Yearly"      },
];

const PAYMENT_TERMS = [
  "Net 15", "Net 30", "Net 45", "Net 60", "Due on Receipt",
];

const STATUS_COLOR = {
  Active:  "success",
  Stopped: "error",
  Expired: "warning",
};

const emptyLineItem = () => ({
  _key:        Date.now() + Math.random(),
  itemId:      "",
  description: "",
  qty:         1,
  rate:        0,
  gst:         18,
  discount:    0,
});

// ─── Line item calculation ────────────────────────────────────
const lineAmount = (li) => {
  const base    = li.qty * li.rate;
  const disc    = base * (li.discount / 100);
  const taxable = base - disc;
  const gstAmt  = taxable * (li.gst / 100);
  return { taxable, gstAmt, total: taxable + gstAmt };
};

const totals = (lineItems) => {
  let subTotal = 0, totalGST = 0, grandTotal = 0;
  (lineItems || []).forEach((li) => {
    const a = lineAmount(li);
    subTotal   += a.taxable;
    totalGST   += a.gstAmt;
    grandTotal += a.total;
  });
  return { subTotal, totalGST, grandTotal };
};

// ─── Generated Invoices Dialog ────────────────────────────────
function GeneratedInvoicesDialog({ open, onClose, profile }) {
  if (!profile) return null;
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ bgcolor: "#1976d2", color: "white", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        Generated Invoices — {profile.profileName}
        <IconButton size="small" onClick={onClose} sx={{ color: "white" }}><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent sx={{ mt: 2 }}>
        {profile.generatedInvoices?.length > 0 ? (
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead sx={{ bgcolor: "#f5f5f5" }}>
                <TableRow>
                  {["Invoice #", "Date", "Amount", "Status"].map(h => (
                    <TableCell key={h}><strong>{h}</strong></TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {profile.generatedInvoices.map((inv, i) => (
                  <TableRow key={i} hover>
                    <TableCell sx={{ color: "#1976d2", fontWeight: "bold" }}>{inv.id}</TableCell>
                    <TableCell>{formatDate(inv.date)}</TableCell>
                    <TableCell><strong>{formatPrice(inv.amount)}</strong></TableCell>
                    <TableCell>
                      <Chip label={inv.status} size="small"
                        color={inv.status === "Paid" ? "success" : inv.status === "Sent" ? "primary" : "default"} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Alert severity="info">No invoices generated yet for this profile.</Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── View Profile Dialog ──────────────────────────────────────
function ViewProfileDialog({ open, onClose, profile, onStop, onResume }) {
  if (!profile) return null;
  const { subTotal, totalGST, grandTotal } = totals(profile.lineItems);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ bgcolor: "#1976d2", color: "white", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        Recurring Profile — {profile.profileName}
        <IconButton size="small" onClick={onClose} sx={{ color: "white" }}><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent sx={{ mt: 2 }}>
        <Alert
          severity={profile.status === "Active" ? "success" : profile.status === "Stopped" ? "error" : "warning"}
          sx={{ mb: 2 }}
          action={
            profile.status === "Active" ? (
              <Button size="small" color="error" startIcon={<StopIcon />}
                onClick={() => { onStop(profile); onClose(); }}>Stop</Button>
            ) : profile.status === "Stopped" ? (
              <Button size="small" color="success" startIcon={<PlayArrowIcon />}
                onClick={() => { onResume(profile); onClose(); }}>Resume</Button>
            ) : null
          }
        >
          Status: <strong>{profile.status}</strong>
          {profile.status === "Active" && ` — Next invoice on ${formatDate(profile.nextInvoiceDate)}`}
        </Alert>

        <Grid container spacing={2}>
          {[
            ["Profile Name",      profile.profileName],
            ["Customer",          profile.customerName],
            ["Frequency",         profile.frequency],
            ["Payment Terms",     profile.paymentTerms],
            ["Start Date",        formatDate(profile.startDate)],
            ["End Date",          profile.endDate ? formatDate(profile.endDate) : "No end date"],
            ["Last Invoice Date", formatDate(profile.lastInvoiceDate)],
            ["Next Invoice Date", profile.status === "Active" ? formatDate(profile.nextInvoiceDate) : "--"],
          ].map(([label, val]) => (
            <Grid item xs={6} md={3} key={label}>
              <Typography color="text.secondary" variant="body2">{label}</Typography>
              <Typography fontWeight={["Profile Name","Customer"].includes(label) ? "bold" : "normal"}
                sx={{ color: label === "Next Invoice Date" && profile.status === "Active" ? "#2e7d32" : "inherit" }}>
                {val}
              </Typography>
            </Grid>
          ))}
        </Grid>

        <Divider sx={{ my: 2 }} />

        <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>Services / Items</Typography>
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead sx={{ bgcolor: "#f5f5f5" }}>
              <TableRow>
                {["Item", "Qty", "Rate", "Discount", "GST", "Amount"].map(h => (
                  <TableCell key={h}><strong>{h}</strong></TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {profile.lineItems.map((li, i) => {
                const amt = lineAmount(li);
                return (
                  <TableRow key={i}>
                    <TableCell>{li.description}</TableCell>
                    <TableCell>{li.qty}</TableCell>
                    <TableCell>{formatPrice(li.rate)}</TableCell>
                    <TableCell>{li.discount}%</TableCell>
                    <TableCell>{li.gst}%</TableCell>
                    <TableCell><strong>{formatPrice(amt.total)}</strong></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>

        <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}>
          <Box sx={{ width: 300, bgcolor: "#f9f9f9", p: 2, borderRadius: 1 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
              <Typography>Sub Total</Typography><Typography>{formatPrice(subTotal)}</Typography>
            </Box>
            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
              <Typography>GST</Typography><Typography>{formatPrice(totalGST)}</Typography>
            </Box>
            <Divider sx={{ my: 1 }} />
            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
              <Typography fontWeight="bold">Total (per cycle)</Typography>
              <Typography fontWeight="bold" color="primary">{formatPrice(grandTotal)}</Typography>
            </Box>
          </Box>
        </Box>

        {profile.notes && (
          <Box sx={{ mt: 2 }}>
            <Typography color="text.secondary" variant="body2" fontWeight="bold">Notes</Typography>
            <Typography>{profile.notes}</Typography>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── Profile Form Dialog ──────────────────────────────────────
function ProfileFormDialog({ open, onClose, onSave, editData, customers, items }) {
  const isEdit = !!editData;

  const defaultForm = {
    profileName:  "",
    customerId:   "",
    customerName: "",
    frequency:    "Monthly",
    paymentTerms: "Net 30",
    startDate:    today(),
    endDate:      "",
    noEndDate:    true,
    lineItems:    [emptyLineItem()],
    notes:        "",
  };

  const [form, setForm]       = useState(defaultForm);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) setForm(editData || defaultForm);
  }, [open, editData]);

  const updateLine = (key, field, value) => {
    setForm((f) => ({
      ...f,
      lineItems: f.lineItems.map((li) => {
        if (li._key !== key) return li;
        const updated = { ...li, [field]: value };
        if (field === "itemId") {
          const found = items.find((i) => String(i.id) === String(value));
          if (found) {
            updated.description = found.service_name || found.serviceName || found.name || "";
            updated.rate        = Number(found.price || found.rate || 0);
            updated.gst         = Number(found.gst_rate || found.gst || 18);
          }
        }
        return updated;
      }),
    }));
  };

  const addLine    = () => setForm((f) => ({ ...f, lineItems: [...f.lineItems, emptyLineItem()] }));
  const removeLine = (key) => setForm((f) => ({ ...f, lineItems: f.lineItems.filter((l) => l._key !== key) }));

  const { subTotal, totalGST, grandTotal } = totals(form.lineItems);

  const handleSave = async () => {
    if (!form.customerId || !form.profileName) return;
    setLoading(true);
    await onSave(form, isEdit);
    setLoading(false);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ bgcolor: "#1976d2", color: "white", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        {isEdit ? `Edit Profile — ${form.profileName}` : "New Recurring Invoice Profile"}
        <IconButton size="small" onClick={onClose} sx={{ color: "white" }}><CloseIcon /></IconButton>
      </DialogTitle>

      <DialogContent sx={{ mt: 1 }}>
        <Grid container spacing={2} sx={{ mt: 0.5 }}>

          <Grid item xs={12} md={6}>
            <TextField fullWidth label="Profile Name *"
              value={form.profileName}
              onChange={(e) => setForm({ ...form, profileName: e.target.value })}
              placeholder="e.g. Monthly Consultation — Rahul" />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField select fullWidth label="Customer *"
              value={form.customerId}
              onChange={(e) => {
                const c = customers.find(x => String(x.id) === String(e.target.value));
                setForm({ ...form, customerId: e.target.value, customerName: c?.customer_name || c?.name || "" });
              }}>
              {customers.length === 0
                ? <MenuItem value="">No customers found</MenuItem>
                : customers.map((c) => (
                  <MenuItem key={c.id} value={String(c.id)}>
                    {c.customer_name || c.name} — {c.email || ""}
                  </MenuItem>
                ))
              }
            </TextField>
          </Grid>

          <Grid item xs={12} md={4}>
            <TextField select fullWidth label="Frequency *"
              value={form.frequency}
              onChange={(e) => setForm({ ...form, frequency: e.target.value })}>
              {FREQUENCIES.map((f) => (
                <MenuItem key={f.key} value={f.key}>{f.label}</MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid item xs={12} md={4}>
            <TextField select fullWidth label="Payment Terms"
              value={form.paymentTerms}
              onChange={(e) => setForm({ ...form, paymentTerms: e.target.value })}>
              {PAYMENT_TERMS.map((t) => (
                <MenuItem key={t} value={t}>{t}</MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid item xs={12} md={4}>
            <TextField fullWidth label="Start Date *" type="date"
              value={form.startDate}
              onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              InputLabelProps={{ shrink: true }} />
          </Grid>

          <Grid item xs={12} md={6}>
            <FormControlLabel
              control={
                <Switch checked={form.noEndDate}
                  onChange={(e) => setForm({ ...form, noEndDate: e.target.checked, endDate: "" })} />
              }
              label="No End Date (runs indefinitely)" />
          </Grid>

          {!form.noEndDate && (
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="End Date" type="date"
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                InputLabelProps={{ shrink: true }} />
            </Grid>
          )}
        </Grid>

        <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>Items / Services</Typography>
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead sx={{ bgcolor: "#f5f5f5" }}>
              <TableRow>
                <TableCell width="25%"><strong>Item</strong></TableCell>
                <TableCell width="20%"><strong>Description</strong></TableCell>
                <TableCell width="8%"><strong>Qty</strong></TableCell>
                <TableCell width="12%"><strong>Rate (₹)</strong></TableCell>
                <TableCell width="8%"><strong>Disc %</strong></TableCell>
                <TableCell width="8%"><strong>GST %</strong></TableCell>
                <TableCell width="12%"><strong>Amount</strong></TableCell>
                <TableCell width="7%"></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {form.lineItems.map((li) => {
                const amt = lineAmount(li);
                return (
                  <TableRow key={li._key}>
                    <TableCell>
                      <TextField select fullWidth size="small" value={li.itemId}
                        onChange={(e) => updateLine(li._key, "itemId", e.target.value)}>
                        <MenuItem value="">-- Select --</MenuItem>
                        {items.map((it) => (
                          <MenuItem key={it.id} value={String(it.id)}>
                            {it.service_name || it.serviceName || it.name}
                          </MenuItem>
                        ))}
                      </TextField>
                    </TableCell>
                    <TableCell>
                      <TextField size="small" fullWidth value={li.description}
                        onChange={(e) => updateLine(li._key, "description", e.target.value)} />
                    </TableCell>
                    <TableCell>
                      <TextField size="small" type="number" value={li.qty} sx={{ width: 60 }}
                        onChange={(e) => updateLine(li._key, "qty", Number(e.target.value))} />
                    </TableCell>
                    <TableCell>
                      <TextField size="small" type="number" value={li.rate} sx={{ width: 90 }}
                        onChange={(e) => updateLine(li._key, "rate", Number(e.target.value))} />
                    </TableCell>
                    <TableCell>
                      <TextField size="small" type="number" value={li.discount} sx={{ width: 60 }}
                        onChange={(e) => updateLine(li._key, "discount", Number(e.target.value))} />
                    </TableCell>
                    <TableCell>
                      <TextField size="small" type="number" value={li.gst} sx={{ width: 60 }}
                        onChange={(e) => updateLine(li._key, "gst", Number(e.target.value))} />
                    </TableCell>
                    <TableCell>
                      <Typography fontWeight="bold">{formatPrice(amt.total)}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        GST: {formatPrice(amt.gstAmt)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <IconButton size="small" color="error"
                        onClick={() => removeLine(li._key)}
                        disabled={form.lineItems.length === 1}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>

        <Button startIcon={<AddIcon />} sx={{ mt: 1 }} onClick={addLine}>
          Add New Row
        </Button>

        <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}>
          <Box sx={{ width: 320, bgcolor: "#f9f9f9", p: 2, borderRadius: 1 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
              <Typography>Sub Total</Typography><Typography>{formatPrice(subTotal)}</Typography>
            </Box>
            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
              <Typography>GST</Typography><Typography>{formatPrice(totalGST)}</Typography>
            </Box>
            <Divider sx={{ my: 1 }} />
            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
              <Typography fontWeight="bold" variant="h6">Total per cycle (₹)</Typography>
              <Typography fontWeight="bold" variant="h6" color="primary">{formatPrice(grandTotal)}</Typography>
            </Box>
          </Box>
        </Box>

        <TextField fullWidth multiline rows={2} label="Notes" sx={{ mt: 2 }}
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          helperText="Internal notes for this recurring profile" />
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={loading}>Cancel</Button>
        <Button variant="contained" onClick={handleSave}
          disabled={!form.customerId || !form.profileName || loading}
          startIcon={loading ? <CircularProgress size={16} /> : <RepeatIcon />}>
          {isEdit ? "Update Profile" : "Create Recurring Profile"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── Main Component ───────────────────────────────────────────
function RecurringInvoices() {
  const [profiles,     setProfiles]     = useState([]);
  const [customers,    setCustomers]    = useState([]);
  const [items,        setItems]        = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [formOpen,     setFormOpen]     = useState(false);
  const [viewOpen,     setViewOpen]     = useState(false);
  const [genInvOpen,   setGenInvOpen]   = useState(false);
  const [selected,     setSelected]     = useState(null);
  const [editData,     setEditData]     = useState(null);
  const [search,       setSearch]       = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [snack,        setSnack]        = useState({ open: false, msg: "", severity: "success" });

  const showSnack = (msg, severity = "success") =>
    setSnack({ open: true, msg, severity });

  // ── Fetch Profiles ──
  const fetchProfiles = useCallback(async () => {
    try {
      setLoading(true);
      const res  = await fetch(`${API}/recurring-invoices`);
      const data = await res.json();
      setProfiles(Array.isArray(data) ? data.map(mapRow) : []);
    } catch (err) {
      showSnack("Failed to load profiles", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Fetch Customers ──
  const fetchCustomers = useCallback(async () => {
    try {
      const res  = await fetch(`${API}/customers`);
      const data = await res.json();
      setCustomers(Array.isArray(data) ? data : (data.customers || []));
    } catch (err) {
      console.error("fetchCustomers error:", err);
    }
  }, []);

  // ── Fetch Items ──
  const fetchItems = useCallback(async () => {
    try {
      const res  = await fetch(`${API}/items`);
      const data = await res.json();
      setItems(Array.isArray(data) ? data : (data.items || []));
    } catch (err) {
      console.error("fetchItems error:", err);
    }
  }, []);

  useEffect(() => {
    fetchProfiles();
    fetchCustomers();
    fetchItems();
  }, [fetchProfiles, fetchCustomers, fetchItems]);

  // ── Create / Update ──
  const handleSave = async (form, isEdit) => {
    const nextDate = calcNextDate(form.startDate, form.frequency);
    const payload  = {
      profile_name:       form.profileName,
      customer_id:        form.customerId,
      customer_name:      form.customerName,
      frequency:          form.frequency,
      payment_terms:      form.paymentTerms,
      start_date:         form.startDate,
      end_date:           form.noEndDate ? null : (form.endDate || null),
      no_end_date:        form.noEndDate,
      next_invoice_date:  nextDate,
      notes:              form.notes,
      line_items:         form.lineItems,
    };

    try {
      if (isEdit) {
        const res = await fetch(`${API}/recurring-invoices/${form.dbId}`, {
          method:  "PUT",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(await res.text());
        showSnack("Profile updated!");
      } else {
        const res = await fetch(`${API}/recurring-invoices`, {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(await res.text());
        showSnack("Profile created!");
      }
      await fetchProfiles();
    } catch (err) {
      showSnack("Failed to save: " + err.message, "error");
    }
  };

  // ── Stop ──
  const handleStop = async (profile) => {
    try {
      const res = await fetch(`${API}/recurring-invoices/${profile.dbId}/stop`, { method: "PUT" });
      if (!res.ok) throw new Error(await res.text());
      await fetchProfiles();
      showSnack(`${profile.profileName} stopped`);
    } catch (err) {
      showSnack("Failed to stop: " + err.message, "error");
    }
  };

  // ── Resume ──
  const handleResume = async (profile) => {
    const nextDate = calcNextDate(profile.lastInvoiceDate, profile.frequency);
    try {
      const res = await fetch(`${API}/recurring-invoices/${profile.dbId}/resume`, {
        method:  "PUT",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ next_invoice_date: nextDate }),
      });
      if (!res.ok) throw new Error(await res.text());
      await fetchProfiles();
      showSnack(`${profile.profileName} resumed!`);
    } catch (err) {
      showSnack("Failed to resume: " + err.message, "error");
    }
  };

  // ── Delete ──
  const handleDelete = async (profile) => {
    if (!window.confirm(`"${profile.profileName}" delete చేయాలా?`)) return;
    try {
      const res = await fetch(`${API}/recurring-invoices/${profile.dbId}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
      await fetchProfiles();
      showSnack(`${profile.profileName} deleted`);
    } catch (err) {
      showSnack("Failed to delete: " + err.message, "error");
    }
  };

  // ── Filter ──
  const filtered = profiles.filter((p) => {
    const q = search.toLowerCase();
    const matchSearch =
      p.customerName.toLowerCase().includes(q) ||
      p.profileName.toLowerCase().includes(q)  ||
      p.id.toLowerCase().includes(q);
    const matchStatus = statusFilter === "All" || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  // ── Stats ──
  const activeCount  = profiles.filter(p => p.status === "Active").length;
  const stoppedCount = profiles.filter(p => p.status === "Stopped").length;
  const totalGenInv  = profiles.reduce((s, p) => s + (p.generatedInvoices?.length || 0), 0);
  const totalValue   = profiles.reduce((s, p) => {
    const { grandTotal } = totals(p.lineItems || []);
    return s + grandTotal;
  }, 0);

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">Recurring Invoices</Typography>
        <IconButton onClick={fetchProfiles} title="Refresh"><RefreshIcon /></IconButton>
      </Box>

      {/* Stats */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {[
          { label: "Total Profiles",      value: profiles.length,        color: "#1976d2" },
          { label: "Active",              value: activeCount,             color: "#2e7d32" },
          { label: "Stopped",             value: stoppedCount,            color: "#d32f2f" },
          { label: "Invoices Generated",  value: totalGenInv,             color: "#7b1fa2" },
          { label: "Total Value / Cycle", value: formatPrice(totalValue), color: "#ed6c02" },
        ].map((s) => (
          <Grid item xs={12} md={2.4} key={s.label}>
            <Card>
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
        <TextField label="Search Profile / Customer" size="small"
          value={search} onChange={(e) => setSearch(e.target.value)}
          sx={{ width: 280 }} />
        <TextField select size="small" label="Status" value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)} sx={{ width: 160 }}>
          {["All", "Active", "Stopped", "Expired"].map((s) => (
            <MenuItem key={s} value={s}>{s}</MenuItem>
          ))}
        </TextField>
        <Box sx={{ flexGrow: 1 }} />
        <Button variant="contained" startIcon={<AddIcon />}
          onClick={() => { setEditData(null); setFormOpen(true); }}>
          + New
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
                {["Customer Name", "Profile Name", "Frequency", "Last Invoice Date", "Next Invoice Date", "Status", "Actions"].map((h) => (
                  <TableCell key={h}><strong>{h}</strong></TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4, color: "text.secondary" }}>
                    No profiles found
                  </TableCell>
                </TableRow>
              ) : filtered.map((p) => (
                <TableRow key={p.id} hover>
                  <TableCell>{p.customerName}</TableCell>
                  <TableCell>
                    <Typography sx={{ color: "#1976d2", fontWeight: "bold", cursor: "pointer", "&:hover": { textDecoration: "underline" } }}
                      onClick={() => { setSelected(p); setViewOpen(true); }}>
                      {p.profileName}
                    </Typography>
                  </TableCell>
                  <TableCell>{p.frequency}</TableCell>
                  <TableCell>{formatDate(p.lastInvoiceDate)}</TableCell>
                  <TableCell>
                    <Typography sx={{ color: p.status === "Active" ? "#2e7d32" : "text.secondary", fontWeight: p.status === "Active" ? "bold" : "normal" }}>
                      {p.status === "Active" ? formatDate(p.nextInvoiceDate) : "--"}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label={p.status} color={STATUS_COLOR[p.status] || "default"} size="small" />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                      <Tooltip title="View Profile">
                        <IconButton size="small" color="primary"
                          onClick={() => { setSelected(p); setViewOpen(true); }}>
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Edit Profile">
                        <IconButton size="small"
                          onClick={() => { setEditData({ ...p }); setFormOpen(true); }}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="View Generated Invoices">
                        <IconButton size="small" color="secondary"
                          onClick={() => { setSelected(p); setGenInvOpen(true); }}>
                          <ReceiptLongIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      {p.status === "Active" ? (
                        <Tooltip title="Stop Recurring">
                          <IconButton size="small" color="error" onClick={() => handleStop(p)}>
                            <StopIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      ) : p.status === "Stopped" ? (
                        <Tooltip title="Resume Recurring">
                          <IconButton size="small" color="success" onClick={() => handleResume(p)}>
                            <PlayArrowIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      ) : null}
                      <Tooltip title="Delete Profile">
                        <IconButton size="small" color="error" onClick={() => handleDelete(p)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Dialogs */}
      <ProfileFormDialog
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditData(null); }}
        onSave={handleSave}
        editData={editData}
        customers={customers}
        items={items}
      />
      <ViewProfileDialog
        open={viewOpen}
        onClose={() => setViewOpen(false)}
        profile={selected}
        onStop={handleStop}
        onResume={handleResume}
      />
      <GeneratedInvoicesDialog
        open={genInvOpen}
        onClose={() => setGenInvOpen(false)}
        profile={selected}
      />

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

export default RecurringInvoices;