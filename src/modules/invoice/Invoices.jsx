import { useState, useEffect } from "react";
import axios from "axios";
import {
  Box, Typography, Grid, Card, CardContent, Button, TextField,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Dialog, DialogTitle, DialogContent, DialogActions,
  MenuItem, Chip, Divider, CircularProgress, Alert, Pagination,
} from "@mui/material";

// ─── API Base — same backend used across the app ─────────────
const API = axios.create({
  baseURL: "http://localhost:5000/api",
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem("vjc_invoice_auth");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── Helpers ────────────────────────────────────────────────
const formatPrice = (value) =>
  Number(value || 0).toLocaleString("en-IN", {
    style: "currency", currency: "INR", maximumFractionDigits: 0,
  });

const STATUS_COLOR = {
  Approved: "info",
  Paid:     "success",
};

// ─── Component ──────────────────────────────────────────────
function Invoices() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");

  const [viewOpen, setViewOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [search, setSearch]     = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [page, setPage] = useState(1);        // NEW — pagination
  const PAGE_SIZE = 25;                        // NEW
  const [yearFilter, setYearFilter] = useState("All");     // NEW
  const [monthFilter, setMonthFilter] = useState("All");   // NEW

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await API.get("/invoices");
      setInvoices(res.data.invoices || res.data.data || []);
    } catch (err) {
      setError("Failed to load invoices — please check the backend connection.");
    } finally {
      setLoading(false);
    }
  };

  // ── Normalize invoice from the real `invoices` table shape ──
  const normalizeInvoice = (inv) => ({
    id:                     inv.id,
    invoiceNo:              inv.invoice_number,
    originalInvoiceNo:      inv.original_invoice_number || "-",
    customerName:           inv.customer_name || "",
    invoiceDate:            (inv.invoice_date || "").slice(0, 10),
    dueDate:                (inv.due_date || "").slice(0, 10),
    subtotal:               Number(inv.subtotal || 0),
    taxAmount:              Number(inv.tax_amount || 0),
    grandTotal:             Number(inv.grand_total || 0),
    paidAmount:             Number(inv.paid_amount || 0),
    balanceAmount:          Number(inv.balance_amount || 0),
    status:                 inv.status || "Approved",
    serviceType:            inv.service_type || "",
    notes:                  inv.notes || "",
  });

  const normalizedInvoices = invoices.map(normalizeInvoice);

  // ── Filter ──
const filtered = normalizedInvoices
    .filter((inv) => {
      const matchSearch =
        (inv.customerName || "").toLowerCase().includes(search.toLowerCase()) ||
        (inv.invoiceNo || "").toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === "All" || inv.status === statusFilter;

      // NEW — Year / Month filter (based on invoiceDate, format YYYY-MM-DD)
      const invYear = inv.invoiceDate ? inv.invoiceDate.slice(0, 4) : "";
      const invMonth = inv.invoiceDate ? inv.invoiceDate.slice(5, 7) : "";
      const matchYear = yearFilter === "All" || invYear === yearFilter;
      const matchMonth = monthFilter === "All" || invMonth === monthFilter;

      return matchSearch && matchStatus && matchYear && matchMonth;
    })
    .sort((a, b) => (a.invoiceNo || "").localeCompare(b.invoiceNo || ""));

  const currentYear = new Date().getFullYear();
  const availableYears = Array.from({ length: 10 }, (_, i) => String(currentYear + 9 - i));
  // e.g. if currentYear = 2026 → ["2035","2034","2033","2032","2031","2030","2029","2028","2027","2026"]
  const MONTHS = [
    { value: "01", label: "January" }, { value: "02", label: "February" },
    { value: "03", label: "March" },   { value: "04", label: "April" },
    { value: "05", label: "May" },     { value: "06", label: "June" },
    { value: "07", label: "July" },    { value: "08", label: "August" },
    { value: "09", label: "September" }, { value: "10", label: "October" },
    { value: "11", label: "November" }, { value: "12", label: "December" },
  ];
  // ── Stats ──
  const totalRevenue = normalizedInvoices.reduce((s, i) => s + (i.grandTotal - i.balanceAmount), 0);
  const partialCount = normalizedInvoices.filter(
    (i) => i.status === "Approved" && i.balanceAmount > 0
  ).length;
  const outstanding = normalizedInvoices.reduce((s, i) => s + i.balanceAmount, 0);

  const handleDownloadPdf = async (invoiceId, customerName) => {
    if (!invoiceId) return;
    try {
      const res = await API.get(`/invoices/${invoiceId}/download-pdf`, {
        responseType: "blob",
      });
      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Invoice-${customerName || "invoice"}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError("Failed to download PDF.");
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" fontWeight="bold" sx={{ mb: 3 }}>Approved Invoices</Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>{error}</Alert>
      )}

      {/* Stats */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {[
          { label: "Total Approved Invoices", value: normalizedInvoices.length,    color: "#1976d2" },
          { label: "Total Revenue",  value: formatPrice(totalRevenue),    color: "#2e7d32" },
          { label: "Partially Paid", value: partialCount,                 color: "#0288d1" },
          { label: "Outstanding",    value: formatPrice(outstanding),     color: "#ed6c02" },
        ].map((s) => (
          <Grid item xs={12} md={3} key={s.label}>
            <Card sx={{ borderLeft: `4px solid ${s.color}` }}>
              <CardContent sx={{ py: 1.5 }}>
                <Typography color="text.secondary" variant="body2">{s.label}</Typography>
                <Typography variant="h6" fontWeight="bold">{s.value}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Search + Filter */}
      <Box sx={{ display: "flex", gap: 2, mb: 3, flexWrap: "wrap" }}>
        <TextField
          label="Search ApprovedInvoice / Customer"
          size="small"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ width: 280 }}
        />
        <TextField
          select size="small" label="Status" value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)} sx={{ width: 160 }}
        >
          {["All", "Approved", "Paid"].map((s) => (
            <MenuItem key={s} value={s}>{s}</MenuItem>
          ))}
        </TextField>
        <TextField
          select size="small" label="Year" value={yearFilter}
          onChange={(e) => setYearFilter(e.target.value)} sx={{ width: 130 }}
        >
          <MenuItem value="All">All</MenuItem>
          {availableYears.map((y) => (
            <MenuItem key={y} value={y}>{y}</MenuItem>
          ))}
        </TextField>
        <TextField
          select size="small" label="Month" value={monthFilter}
          onChange={(e) => setMonthFilter(e.target.value)} sx={{ width: 160 }}
        >
          <MenuItem value="All">All</MenuItem>
          {MONTHS.map((m) => (
            <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>
          ))}
        </TextField>
      </Box>

     {/* Invoice List Table */}
      <TableContainer component={Paper}>
        <Table
          sx={{
            "& th, & td": {
              borderRight: "1px solid #e5e7eb",
            },
            "& th:last-child, & td:last-child": {
              borderRight: "none",
            },
          }}
        >
          <TableHead sx={{ bgcolor: "#f5f5f5" }}>
            <TableRow>
              {["Invoice #", "Original Invoice", "Customer", "Date", "Due Date", "Grand Total", "Balance", "Status", "Actions"].map((h) => (
                <TableCell key={h}><strong>{h}</strong></TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ py: 4, color: "text.secondary" }}>
                  No Approved invoices found
                </TableCell>
              </TableRow>
           ) : filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((inv) => (
              <TableRow key={inv.id} hover>
                <TableCell sx={{ color: "#1976d2", fontWeight: "bold" }}>{inv.invoiceNo}</TableCell>
                <TableCell>{inv.originalInvoiceNo}</TableCell>
                <TableCell>{inv.customerName}</TableCell>
                <TableCell>{inv.invoiceDate}</TableCell>
                <TableCell>{inv.dueDate}</TableCell>
                <TableCell><strong>{formatPrice(inv.grandTotal)}</strong></TableCell>
                <TableCell sx={{ color: inv.balanceAmount > 0 ? "#d32f2f" : "#2e7d32" }}>
                  {formatPrice(inv.balanceAmount)}
                </TableCell>
                <TableCell>
                  <Chip
                    label={inv.balanceAmount > 0 ? "Partially Paid" : "Paid"}
                    color={STATUS_COLOR[inv.status] || "default"}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Button size="small" onClick={() => { setSelected(inv); setViewOpen(true); }}>View</Button>
                  <Button size="small" onClick={() => handleDownloadPdf(inv.id, inv.customerName)}>
                    Download PDF
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {filtered.length > PAGE_SIZE && (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 3 }}>
          <Pagination
            count={Math.ceil(filtered.length / PAGE_SIZE)}
            page={page}
            onChange={(e, value) => setPage(value)}
            color="primary"
          />
        </Box>
      )}

      {/* ── VIEW DIALOG ── */}
      <Dialog open={viewOpen} onClose={() => setViewOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: "#1976d2", color: "white" }}>
          Invoice Details — {selected?.invoiceNo}
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
                <Chip
                  label={selected.balanceAmount > 0 ? "Partially Paid" : "Paid"}
                  color={STATUS_COLOR[selected.status] || "default"}
                />
              </Grid>
              <Grid item xs={4}>
                <Typography color="text.secondary">Invoice Date</Typography>
                <Typography>{selected.invoiceDate}</Typography>
              </Grid>
              <Grid item xs={4}>
                <Typography color="text.secondary">Due Date</Typography>
                <Typography>{selected.dueDate || "—"}</Typography>
              </Grid>
              <Grid item xs={4}>
                <Typography color="text.secondary">Service Type</Typography>
                <Typography>{selected.serviceType || "—"}</Typography>
              </Grid>
            </Grid>

            <Divider sx={{ my: 2 }} />

            <Box sx={{ bgcolor: "#f9f9f9", p: 2, borderRadius: 1 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                <Typography>Sub Total</Typography>
                <Typography>{formatPrice(selected.subtotal)}</Typography>
              </Box>
              <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                <Typography>Tax</Typography>
                <Typography>{formatPrice(selected.taxAmount)}</Typography>
              </Box>
              <Divider sx={{ my: 1 }} />
              <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                <Typography fontWeight="bold">Grand Total</Typography>
                <Typography fontWeight="bold" color="primary">{formatPrice(selected.grandTotal)}</Typography>
              </Box>
              <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                <Typography>Paid Amount</Typography>
                <Typography color="success.main">{formatPrice(selected.paidAmount)}</Typography>
              </Box>
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography>Balance</Typography>
                <Typography color={selected.balanceAmount > 0 ? "error" : "success.main"}>
                  {formatPrice(selected.balanceAmount)}
                </Typography>
              </Box>
            </Box>

            {selected.notes && (
              <Box sx={{ mt: 2 }}>
                <Typography color="text.secondary">Notes</Typography>
                <Typography>{selected.notes}</Typography>
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

export default Invoices;