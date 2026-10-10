import { useState, useEffect } from "react";
import axios from "axios";
import {
  Box, Typography, Grid, Card, CardContent, Button, TextField,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Dialog, DialogTitle, DialogContent, DialogActions,
  MenuItem, Chip, Divider, IconButton, CircularProgress, Alert, Pagination,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";

// ─── API Base ────────────────────────────────────────────────
const getToken = () => localStorage.getItem("vjc_invoice_auth");

const API = axios.create({
  baseURL: "http://localhost:5000/api"
});

// Every axios request lo auto token add avutundi
API.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ─── Helpers ────────────────────────────────────────────────
const formatPrice = (value) =>
  Number(value || 0).toLocaleString("en-IN", {
    style: "currency", currency: "INR", maximumFractionDigits: 0,
  });

const today = () => new Date().toISOString().split("T")[0];

const expiryDateCalc = () => {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().split("T")[0];
};

const STATUS_COLOR = {
  Draft:    "default",
  Sent:     "primary",
  Accepted: "success",
  Rejected: "error",
  Invoiced: "secondary",
  Expired:  "warning",
};

const NEXT_STATUS = {
  Draft:    ["Sent", "Expired"],
  Sent:     ["Accepted", "Rejected", "Expired"],
  Accepted: ["Invoiced"],
  Rejected: [],
  Invoiced: [],
  Expired:  [],
};

const SALESPERSONS = [];

const emptyLineItem = () => ({
  _key: Date.now() + Math.random(),
  itemId: "",
  description: "",
  qty: 1,
  rate: 0,
  gst: 18,
  discount: 0,
});

// ─── Component ──────────────────────────────────────────────
function Quotes() {
  const [quotes, setQuotes]       = useState([]);
  const [customers, setCustomers] = useState([]);
  const [itemsList, setItemsList] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");

  // ── UI state ──
  const [open, setOpen]         = useState(false);
  
  const [viewOpen, setViewOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [search, setSearch]     = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  

  // ── Status change dialog ──
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [statusChangeQt, setStatusChangeQt]     = useState(null);
  const [newStatus, setNewStatus]               = useState("");

  const [form, setForm]       = useState(null);
  const [saving, setSaving]   = useState(false);

  // ── Fetch all data on mount ──
  useEffect(() => {
    fetchAll();
  }, [page]);

  const fetchAll = async () => {
    setLoading(true);
    setError("");
    try {
      const [qRes, cRes, iRes] = await Promise.all([
        API.get("/quotes", { params: { page, limit: 25 } }),
        API.get("/customers"),
        API.get("/items"),
      ]);
      setQuotes(qRes.data.data || []);
      setTotalPages(qRes.data.totalPages || 1);
      setCustomers(cRes.data.customers || []);
      setItemsList(iRes.data.items || []);
    } catch (err) {
      setError("Failed to load data  please check the backend connection.");
    } finally {
      setLoading(false);
    }
  };

  // ── Auto Quote Number ──
  // AFTER
const nextQuoteNo = () => {
  const nums = quotes.map((q) => {
    const match = (q.quote_number || "").match(/(\d+)$/);
    return match ? parseInt(match[1], 10) : 0;
  });
  const max = nums.length ? Math.max(...nums) : 0;
  return `QT-${String(max + 1).padStart(6, "0")}`;
};

  const openNew = () => {
    console.log("BUTTON CLICKED");
    setForm({
      id: null,
      quote_number: nextQuoteNo(),
      customerId: "",
      customerName: "",
      reference: "",
      quoteDate: today(),
      expiryDate: expiryDateCalc(),
      salesperson: "",
      lineItems: [emptyLineItem()],
      notes: "Looking forward for your business.",
      termsConditions: "",
      status: "Draft",
    });
    setOpen(true);
  };

  // ── Line item helpers ──
  const updateLine = (key, field, value) => {
    setForm((f) => ({
      ...f,
      lineItems: f.lineItems.map((li) => {
        if (li._key !== key) return li;
        const updated = { ...li, [field]: value };
        if (field === "itemId") {
          const found = itemsList.find(
            (i) => String(i.id) === String(value)
          );
          if (found) {
            updated.description = found.service_name || "";
            updated.rate        = Number(found.price || 0);
            updated.gst         = Number(found.gst || 18);
          }
        }
        return updated;
      }),
    }));
  };

  const addLine    = () => setForm((f) => ({ ...f, lineItems: [...f.lineItems, emptyLineItem()] }));
  const removeLine = (key) => setForm((f) => ({ ...f, lineItems: f.lineItems.filter((l) => l._key !== key) }));

  // ── Calculations ──
  const lineAmount = (li) => {
    const base    = li.qty * li.rate;
    const disc    = base * (li.discount / 100);
    const taxable = base - disc;
    const gstAmt  = taxable * (li.gst / 100);
    return { taxable, gstAmt, total: taxable + gstAmt };
  };

  const totals = (lineItems) => {
    let subTotal = 0, totalGST = 0, grandTotal = 0;
    lineItems.forEach((li) => {
      const a = lineAmount(li);
      subTotal   += a.taxable;
      totalGST   += a.gstAmt;
      grandTotal += a.total;
    });
    return { subTotal, totalGST, grandTotal };
  };

  // ── Normalize quote from API response ──
  const normalizeQuote = (q) => ({
    id:               q.id || q.quote_id,
   quote_number: q.quote_number ?? q.quote_id ?? q.id,
    customerId:       q.customer_id || q.customerId,
    customerName:     q.customer_name || q.customerName || "",
    reference:        q.reference || "",
    quoteDate:        (q.quote_date || q.quoteDate || "").slice(0, 10),
    expiryDate:       (q.expiry_date || q.expiryDate || "").slice(0, 10),
    salesperson:      q.salesperson || "",
    lineItems:        (q.line_items || q.lineItems || []).map((li, idx) => ({
      _key:        li._key || li.id || idx,
      itemId:      li.item_id || li.itemId || "",
      description: li.description || "",
      qty:         Number(li.qty || li.quantity || 1),
      rate:        Number(li.rate || li.unit_price || 0),
      gst:         Number(li.gst || li.tax_rate || 18),
      discount:    Number(li.discount || 0),
    })),
    notes:            q.notes || "",
    termsConditions:  q.terms_conditions || q.termsConditions || "",
    status:           q.status || "Draft",
    totalAmount:      Number(q.total_amount || q.totalAmount || 0),
  });

  // ── Save (Create / Update) ──
  const handleSave = async (status) => {
    if (!form.customerId || form.lineItems.every((l) => !l.itemId && !l.description)) return;
    setSaving(true);
    const { grandTotal } = totals(form.lineItems);

    const payload = {
  
  quote_number:      form.quote_number,
  customer_id: form.customerId,
  customer_name:     form.customerName,
      reference:         form.reference,
      quote_date:        form.quoteDate,
      expiry_date:       form.expiryDate,
      salesperson:       form.salesperson,
      notes:             form.notes,
      terms_conditions:  form.termsConditions,
      status:            status,
      total_amount:      grandTotal,
      line_items:        form.lineItems.map((li) => ({
        item_id:     li.itemId,
        description: li.description,
        qty:         li.qty,
        rate:        li.rate,
        gst:         li.gst,
        discount:    li.discount,
      })),
    };
console.log("QUOTE PAYLOAD", payload);
    try {
      if (form.id) {
        // Update
        await API.put(`/quotes/${form.id}`, payload);
      } else {
        // Create
        await API.post("/quotes", payload);
      }
      await fetchAll();
      setOpen(false);
    } catch (err) {
      setError("Failed to save quote. please Try again.");
    } finally {
      setSaving(false);
    }
  };

  // ── Status change ──
  const handleStatusChange = async () => {
    if (!newStatus) return;
    try {
      await API.put(`/quotes/${statusChangeQt.id}`, { status: newStatus });
      await fetchAll();
    } catch {
      setError("Failde to update quote status.");
    }
    setStatusDialogOpen(false);
    setStatusChangeQt(null);
    setNewStatus("");
  };

  // ── Convert to Invoice ──
  const handleConvertToInvoice = async (quote) => {
    try {
      await API.put(`/quotes/${quote.id}`, { status: "Invoiced" });
      await fetchAll();
      alert(`✅ ${quote.quote_number} → Invoice created successfully!\nIt will automatically appear on the Invoices page.`);
    } catch {
      setError("Convert to invoice failed.");
    }
  };

  // ── Delete ──
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this quote?")) return;
    try {
      await API.delete(`/quotes/${id}`);
      setQuotes((prev) => prev.filter((q) => q.id !== id));
    } catch {
      setError("Failed to delete quote.");
    }
  };

  // ── Download PDF ──
  const handleDownloadPdf = async (id, quoteNumber) => {
    try {
      const res = await API.get(`/quotes/${id}/download-pdf`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `Proforma Invoice-${quoteNumber || id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError("Failed to download PDF.");
    }
  };

  // ── Normalize list for display ──

  // ── Normalize list for display ──
  const normalizedQuotes = quotes.map(normalizeQuote);

  // ── Filter ──
  const filtered = normalizedQuotes.filter((q) => {
    const matchSearch =
      (q.customerName || "").toLowerCase().includes(search.toLowerCase()) ||
      (q.quote_number || "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "All" || q.status === statusFilter;
    return matchSearch && matchStatus;
  });

  // ── Stats ──
  const acceptedCount = normalizedQuotes.filter((q) => q.status === "Accepted").length;
  const rejectedCount = normalizedQuotes.filter((q) => q.status === "Rejected").length;
  const invoicedCount = normalizedQuotes.filter((q) => q.status === "Invoiced").length;
  const totalValue    = normalizedQuotes.reduce((s, q) => s + q.totalAmount, 0);

  // ────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" fontWeight="bold" sx={{ mb: 3 }}> Proforma Invoice</Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>{error}</Alert>
      )}

      {/* ✅ Stats */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {[
          { label: "Total Proforma Invoices", value: normalizedQuotes.length, color: "#1976d2" },
          { label: "Accepted",     value: acceptedCount,           color: "#2e7d32" },
          { label: "Rejected",     value: rejectedCount,           color: "#d32f2f" },
          { label: "Invoiced",     value: invoicedCount,           color: "#7b1fa2" },
          { label: "Total Value",  value: formatPrice(totalValue),  color: "#ed6c02" },
        ].map((s) => (
          <Grid item xs={12} md={2.4} key={s.label}>
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
        <TextField
          label="Search Proforma Invoice / Customer"
          size="small" value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ width: 280 }}
        />
        <TextField
          select size="small" label="Status" value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)} sx={{ width: 160 }}
        >
          {["All", "Draft", "Sent", "Accepted", "Rejected", "Invoiced", "Expired"].map((s) => (
            <MenuItem key={s} value={s}>{s}</MenuItem>
          ))}
        </TextField>
        <Box sx={{ flexGrow: 1 }} />
        <Button variant="contained" startIcon={<AddIcon />} onClick={openNew}>
           New Proforma Invoice
        </Button>
      </Box>

      {/* Quotes Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead sx={{ bgcolor: "#f5f5f5" }}>
            <TableRow>
              {["Proforma Invoice #", "Customer", "Date", "Expiry",  "Amount", "Status", "Actions"].map((h) => (
                <TableCell key={h}><strong>{h}</strong></TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 4, color: "text.secondary" }}>
                  No Proforma Invoices found
                </TableCell>
              </TableRow>
            ) : filtered.map((qt) => (
              <TableRow key={qt.id} hover>
                <TableCell sx={{ color: "#1976d2", fontWeight: "bold" }}>{qt.quote_number}</TableCell>
                <TableCell>{qt.customerName}</TableCell>
                <TableCell>{qt.quoteDate}</TableCell>
                <TableCell
                  sx={{ color: qt.status === "Expired" ? "#d32f2f" : "inherit", fontWeight: qt.status === "Expired" ? "bold" : "normal" }}
                >
                  {qt.expiryDate}
                </TableCell>
              
                <TableCell><strong>{formatPrice(qt.totalAmount)}</strong></TableCell>
                <TableCell>
                  <Chip
                    label={qt.status}
                    color={STATUS_COLOR[qt.status] || "default"}
                    size="small"
                    onClick={() => {
                      if (NEXT_STATUS[qt.status]?.length > 0) {
                        setStatusChangeQt(qt);
                        setNewStatus("");
                        setStatusDialogOpen(true);
                      }
                    }}
                    sx={{ cursor: NEXT_STATUS[qt.status]?.length > 0 ? "pointer" : "default" }}
                  />
                </TableCell>
                <TableCell>
                  <Button size="small" onClick={() => { setSelected(qt); setViewOpen(true); }}>View</Button>
                  <Button size="small" onClick={() => { setForm({ ...qt }); setOpen(true); }}>Edit</Button>
                  <Button size="small" color="primary" onClick={() => handleDownloadPdf(qt.id, qt.quote_number)}>
                    PDF
                  </Button>
                  {qt.status === "Accepted" && (
                    <Button size="small" color="success" variant="outlined"
                      onClick={() => handleConvertToInvoice(qt)}>
                      → Invoice
                    </Button>
                  )}
                  <Button size="small" color="error" onClick={() => handleDelete(qt.id)}>
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
</TableContainer>

      <Box sx={{ display: "flex", justifyContent: "center", mt: 3 }}>
        <Pagination
          count={totalPages}
          page={page}
          onChange={(e, value) => setPage(value)}
          color="primary"
        />
      </Box>

      {/* ✅ STATUS CHANGE DIALOG */}
      <Dialog open={statusDialogOpen} onClose={() => setStatusDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Change Proforma Invoice Status</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Current: <strong>{statusChangeQt?.status}</strong>
          </Typography>

          <TextField
            select fullWidth label="Move to Status"
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value)}
          >
            {(NEXT_STATUS[statusChangeQt?.status] || []).map((s) => (
              <MenuItem key={s} value={s}>
                <Chip label={s} color={STATUS_COLOR[s] || "default"} size="small" sx={{ mr: 1 }} />
                {s}
              </MenuItem>
            ))}
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStatusDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleStatusChange} disabled={!newStatus}>
            Update Status
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── CREATE / EDIT DIALOG ── */}
<Dialog key={form?.id ?? form?.quote_number} open={open} onClose={() => setOpen(false)} maxWidth="lg" fullWidth>        <DialogTitle sx={{ bgcolor: "#1976d2", color: "white" }}>
          {form?.quote_number} — {form?.id ? "Edit Proforma Invoice" : "New Proforma Invoice"}
        </DialogTitle>

        {form && (
          <DialogContent sx={{ mt: 1 }}>
            <Grid container spacing={2} sx={{ mt: 0.5 }}>

              {/* Customer */}
              <Grid item xs={12} md={6}>
                <TextField
  select fullWidth label="Customer Name *"
  value={form.customerId}
  onChange={(e) => {
    const c = customers.find(
      (x) => String(x.customer_id) === String(e.target.value)
    );
    setForm({
      ...form,
      customerId: e.target.value,
      customerName: c?.name || c?.customer_name || c?.display_name || "",
    });
  }}
>
                 {customers.map((c) => {
  const cId   = c.customer_id;
  const cName = c.name || c.customer_name || c.display_name || "";
  const cComp = c.company || c.company_name || "";

  return (
    <MenuItem key={cId} value={cId}>
      {cName}{cComp ? ` — ${cComp}` : ""}
    </MenuItem>
  );
})}
                </TextField>
              </Grid>

              {/* Quote # */}
              <Grid item xs={12} md={3}>
                <TextField fullWidth label="Proforma Invoice #" value={form.quote_number} disabled />
              </Grid>

              {/* Reference */}
              <Grid item xs={12} md={3}>
                <TextField fullWidth label="Reference #"
                  value={form.reference}
                  onChange={(e) => setForm({ ...form, reference: e.target.value })}
                />
              </Grid>

              {/* Dates */}
              <Grid item xs={12} md={4}>
                <TextField fullWidth label="Proforma Invoice Date *" type="date"
                  value={form.quoteDate}
                  onChange={(e) => setForm({ ...form, quoteDate: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <TextField fullWidth label="Expiry Date" type="date"
                  value={form.expiryDate}
                  onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>

              {/* Salesperson */}
              <Grid item xs={12} md={4}>
                <TextField
                  select fullWidth label="Salesperson"
                  value={form.salesperson}
                  onChange={(e) => setForm({ ...form, salesperson: e.target.value })}
                >
                  <MenuItem value="">-- Select --</MenuItem>
                  {SALESPERSONS.map((s) => (
                    <MenuItem key={s} value={s}>{s}</MenuItem>
                  ))}
                </TextField>
              </Grid>
            </Grid>

            {/* ── Item Table ── */}
            <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>Item Table</Typography>
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
                          <TextField
                            select fullWidth size="small" value={li.itemId}
                            onChange={(e) => updateLine(li._key, "itemId", e.target.value)}
                          >
                            <MenuItem value="">-- Select --</MenuItem>
                            {itemsList.map((it) => (
                              <MenuItem key={it.id} value={it.id}>{it.service_name}</MenuItem>
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

            {/* ── Totals ── */}
            {(() => {
              const { subTotal, totalGST, grandTotal } = totals(form.lineItems);
              return (
                <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}>
                  <Box sx={{ width: 320, bgcolor: "#f9f9f9", p: 2, borderRadius: 1 }}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                      <Typography>Sub Total</Typography>
                      <Typography>{formatPrice(subTotal)}</Typography>
                    </Box>
                    <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                      <Typography>GST</Typography>
                      <Typography>{formatPrice(totalGST)}</Typography>
                    </Box>
                    <Divider sx={{ my: 1 }} />
                    <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                      <Typography fontWeight="bold" variant="h6">Total (₹)</Typography>
                      <Typography fontWeight="bold" variant="h6" color="primary">
                        {formatPrice(grandTotal)}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              );
            })()}

            {/* Notes + Terms */}
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth multiline rows={3} label="Customer Notes"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  helperText="Will be displayed on the quote"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth multiline rows={3} label="Terms & Conditions"
                  value={form.termsConditions}
                  onChange={(e) => setForm({ ...form, termsConditions: e.target.value })}
                  helperText="Enter terms and conditions of your business"
                />
              </Grid>
            </Grid>
          </DialogContent>
        )}

        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpen(false)} disabled={saving}>Cancel</Button>
          <Button variant="outlined" onClick={() => handleSave("Draft")} disabled={saving}>
            {saving ? <CircularProgress size={18} /> : "Save as Draft"}
          </Button>
          <Button variant="contained" onClick={() => handleSave("Sent")} disabled={saving}>
            {saving ? <CircularProgress size={18} /> : "Save and Send"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── VIEW DIALOG ── */}
      <Dialog open={viewOpen} onClose={() => setViewOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ bgcolor: "#1976d2", color: "white" }}>
          Proforma Invoice Details — {selected?.quote_number}
        </DialogTitle>

        {selected && (
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={6}>
                <Typography color="text.secondary">Customer</Typography>
                <Typography fontWeight="bold">{selected.customerName}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography color="text.secondary">Status</Typography>
                <Chip label={selected.status} color={STATUS_COLOR[selected.status] || "default"} />
              </Grid>
              <Grid item xs={3}>
                <Typography color="text.secondary">Quote Date</Typography>
                <Typography>{selected.quoteDate}</Typography>
              </Grid>
              <Grid item xs={3}>
                <Typography color="text.secondary">Expiry Date</Typography>
                <Typography>{selected.expiryDate}</Typography>
              </Grid>
              <Grid item xs={3}>
                <Typography color="text.secondary">Salesperson</Typography>
                <Typography>{selected.salesperson || "—"}</Typography>
              </Grid>
              <Grid item xs={3}>
                <Typography color="text.secondary">Reference #</Typography>
                <Typography>{selected.reference || "—"}</Typography>
              </Grid>
            </Grid>

            <Divider sx={{ my: 2 }} />

            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead sx={{ bgcolor: "#f5f5f5" }}>
                  <TableRow>
                    {["Item", "Qty", "Rate", "Discount", "GST", "Amount"].map((h) => (
                      <TableCell key={h}><strong>{h}</strong></TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {selected.lineItems.map((li) => {
                    const amt = lineAmount(li);
                    return (
                      <TableRow key={li._key}>
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

            {(() => {
              const { subTotal, totalGST, grandTotal } = totals(selected.lineItems);
              return (
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
                      <Typography fontWeight="bold">Total</Typography>
                      <Typography fontWeight="bold" color="primary">{formatPrice(grandTotal)}</Typography>
                    </Box>
                  </Box>
                </Box>
              );
            })()}

            {selected.notes && (
              <Box sx={{ mt: 2 }}>
                <Typography color="text.secondary" fontWeight="bold">Customer Notes</Typography>
                <Typography>{selected.notes}</Typography>
              </Box>
            )}

            {selected.termsConditions && (
              <Box sx={{ mt: 1.5 }}>
                <Typography color="text.secondary" fontWeight="bold">Terms & Conditions</Typography>
                <Typography>{selected.termsConditions}</Typography>
              </Box>
            )}

            {selected.status === "Accepted" && (
              <Box sx={{ mt: 2 }}>
                <Button variant="contained" color="success"
                  onClick={() => { handleConvertToInvoice(selected); setViewOpen(false); }}>
                  Convert to Invoice →
                </Button>
              </Box>
            )}
          </DialogContent>
        )}

        <DialogActions>
          <Button onClick={() => setViewOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default Quotes;
