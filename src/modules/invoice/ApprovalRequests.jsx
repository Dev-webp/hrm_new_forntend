import { useState, useEffect } from "react";
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Paper, Button, Chip, CircularProgress, Alert, Dialog,
  DialogTitle, DialogContent, DialogActions, Divider, Grid, Pagination,
} from "@mui/material";

const API = "http://localhost:5000/api";
const fmt = (n) => "₹" + Number(n || 0).toLocaleString("en-IN");

function ApprovalRequests() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(null);

  const [viewInvoice, setViewInvoice] = useState(null);   // NEW — full detail dialog
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [page, setPage] = useState(1);        // NEW — pagination
  const PAGE_SIZE = 25;                        // NEW

  const fetchPending = async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("vjc_invoice_auth");
      const res = await fetch(`${API}/invoices/pending`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setInvoices(data.invoices || []);
      } else {
        setError(data.message || "Failed to load pending invoices");
      }
    } catch (err) {
      setError("Unable to connect to backend server!");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPending();
  }, []);

  const handleViewPdf = async (invoiceId) => {
    try {
      const token = localStorage.getItem("vjc_invoice_auth");
      const res = await fetch(`${API}/invoices/${invoiceId}/download-pdf`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        alert("❌ Failed to load PDF preview");
        return;
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      window.open(url, "_blank");   // opens PDF inline in a new tab, same as client's PDF
    } catch (err) {
      alert("❌ Failed to load PDF preview");
    }
  };

  const handleAction = async (id, action) => {
    setActionLoading(id);
    try {
      const token = localStorage.getItem("vjc_invoice_auth");
      const res = await fetch(`${API}/invoices/${id}/${action}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        alert(action === "approve" ? "✅ Invoice approved! Client mail sent." : "❌ Invoice rejected.");
        fetchPending();
      } else {
        alert("❌ Error: " + data.message);
      }
    } catch (err) {
      alert("❌ Action failed");
    } finally {
      setActionLoading(null);
      setConfirmDialog(null);
      setViewInvoice(null);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  // NEW — detect duplicates: same customer + same grand_total, both still Pending
  const getDuplicateCount = (inv) => {
    return invoices.filter(
      (x) =>
        x.customer_name === inv.customer_name &&
        Number(x.grand_total) === Number(inv.grand_total)
    ).length;
  };

  // NEW — parse pax safely (jsonb comes back as array already, but just in case)
  const getPax = (inv) => {
    try {
      const p = typeof inv.pax === "string" ? JSON.parse(inv.pax) : inv.pax;
      return Array.isArray(p) ? p : [];
    } catch {
      return [];
    }
  };

  return (
    <Box>
      <Typography variant="h4" fontWeight="bold" sx={{ mb: 3 }}>
        Approval Requests
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

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
              <TableCell><strong>Invoice #</strong></TableCell>
              <TableCell><strong>Customer</strong></TableCell>
              <TableCell sx={{ whiteSpace: "nowrap" }}><strong>Sales Consultant</strong></TableCell>
              <TableCell><strong>Service Type</strong></TableCell>
              <TableCell><strong>Grand Total</strong></TableCell>
              <TableCell><strong>Status</strong></TableCell>
              <TableCell><strong>Actions</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {invoices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4, color: "text.secondary" }}>
                  No pending invoices for approval.
                </TableCell>
              </TableRow>
            ) : invoices.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((inv) => (
              <TableRow key={inv.id} hover>
                <TableCell sx={{ color: "#1976d2", fontWeight: "bold" }}>{inv.invoice_number}</TableCell>
                <TableCell>{inv.customer_name}</TableCell>
                <TableCell>{inv.sales_consultant || "—"}</TableCell>
                <TableCell>{inv.service_type || "—"}</TableCell>
                <TableCell><strong>{fmt(inv.grand_total)}</strong></TableCell>
                <TableCell>
                  <Chip label="Pending" color="warning" size="small" />
                  {getDuplicateCount(inv) > 1 && (
                    <Chip
                      label="⚠️ Possible Duplicate"
                      color="error"
                      size="small"
                      sx={{ ml: 0.5 }}
                    />
                  )}
                </TableCell>
<TableCell>
                  <Button size="small" sx={{ mr: 1 }} onClick={() => setViewInvoice(inv)}>
                    View
                  </Button>
                  <Button size="small" sx={{ mr: 1 }} onClick={() => handleViewPdf(inv.id)}>
                    View PDF
                  </Button>
                  <Button
                    size="small" color="success" variant="contained" sx={{ mr: 1 }}
                    disabled={actionLoading === inv.id}
                    onClick={() => setConfirmDialog({ id: inv.id, action: "approve", invoiceNo: inv.invoice_number })}
                  >
                    Approve
                  </Button>
                  <Button
                    size="small" color="error" variant="outlined"
                    disabled={actionLoading === inv.id}
                    onClick={() => setConfirmDialog({ id: inv.id, action: "reject", invoiceNo: inv.invoice_number })}
                  >
                    Reject
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {invoices.length > PAGE_SIZE && (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 3 }}>
          <Pagination
            count={Math.ceil(invoices.length / PAGE_SIZE)}
            page={page}
            onChange={(e, value) => setPage(value)}
            color="primary"
          />
        </Box>
      )}

      {/* NEW — Full detail view, same info as chairman mail */}
      <Dialog open={!!viewInvoice} onClose={() => setViewInvoice(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: "#0f9d94", color: "#fff" }}>
          Invoice Details — {viewInvoice?.invoice_number}
        </DialogTitle>
        {viewInvoice && (
          <DialogContent sx={{ pt: 3 }}>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">Client Name</Typography>
                <Typography fontWeight={600}>{viewInvoice.customer_name}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">Invoice Number</Typography>
                <Typography fontWeight={600}>{viewInvoice.invoice_number}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">Subtotal</Typography>
                <Typography>{fmt(viewInvoice.subtotal)}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">Paid Amount</Typography>
                <Typography color="success.main" fontWeight={600}>{fmt(viewInvoice.paid_amount)}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">Tax %</Typography>
                <Typography>{viewInvoice.tax_percent || 0}%</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">Tax Amount</Typography>
                <Typography>{fmt(viewInvoice.tax_amount)}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">Balance Amount</Typography>
                <Typography color="error.main" fontWeight={600}>{fmt(viewInvoice.balance_amount)}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">Due Date</Typography>
                <Typography>
                  {viewInvoice.due_date
                    ? new Date(viewInvoice.due_date).toLocaleDateString("en-GB")
                    : "—"}
                </Typography>
              </Grid>
            </Grid>

            {getPax(viewInvoice).length > 0 && (
              <>
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>Travelers</Typography>
                {getPax(viewInvoice).map((p, i) => (
                  <Typography key={i} variant="body2">{i + 1}. {p.name}</Typography>
                ))}
              </>
            )}

            {viewInvoice.notes && (
              <>
                <Divider sx={{ my: 2 }} />
                <Typography variant="caption" color="text.secondary">Description</Typography>
                <Typography variant="body2">{viewInvoice.notes}</Typography>
              </>
            )}

            {viewInvoice.screenshot_base64 && (
              <>
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>Payment Screenshot</Typography>
                <img
                  src={viewInvoice.screenshot_base64}
                  alt="Payment proof"
                  style={{ width: "100%", borderRadius: 8, border: "1px solid #ddd" }}
                />
              </>
            )}
          </DialogContent>
        )}
<DialogActions>
          <Button onClick={() => setViewInvoice(null)}>Close</Button>
          {viewInvoice && (
            <>
              <Button
                color="success" variant="contained"
                onClick={() => setConfirmDialog({ id: viewInvoice.id, action: "approve", invoiceNo: viewInvoice.invoice_number })}
              >
                Approve
              </Button>
              <Button
                color="error" variant="outlined"
                onClick={() => setConfirmDialog({ id: viewInvoice.id, action: "reject", invoiceNo: viewInvoice.invoice_number })}
              >
                Reject
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>

      {/* Confirm dialog — unchanged */}
      <Dialog open={!!confirmDialog} onClose={() => setConfirmDialog(null)}>
        <DialogTitle>
          {confirmDialog?.action === "approve" ? "Approve Invoice?" : "Reject Invoice?"}
        </DialogTitle>
        <DialogContent>
          <Typography>
            {confirmDialog?.action === "approve"
              ? `Approve invoice ${confirmDialog?.invoiceNo}? Client will receive the invoice by email.`
              : `Reject invoice ${confirmDialog?.invoiceNo}? This cannot be undone.`}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialog(null)}>Cancel</Button>
          <Button
            variant="contained"
            color={confirmDialog?.action === "approve" ? "success" : "error"}
            onClick={() => handleAction(confirmDialog.id, confirmDialog.action)}
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default ApprovalRequests;